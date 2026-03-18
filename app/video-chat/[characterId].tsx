import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Platform,
  Animated,
  StatusBar,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { getCharacter } from "@/constants/characters";
import { getApiUrl } from "@/lib/query-client";
import { useGifts } from "@/contexts/GiftContext";
import { useI18n } from "@/hooks/useI18n";

const { width: W, height: H } = Dimensions.get("window");

const SILENCE_THRESHOLD = -40;
const SILENCE_DURATION_MS = 1600;

type CallState = "idle" | "listening" | "processing" | "speaking";

function AnimatedWaveform({
  active,
  color,
  barCount = 7,
}: {
  active: boolean;
  color: string;
  barCount?: number;
}) {
  const bars = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.15))
  ).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => Animated.timing(b, { toValue: 0.15, duration: 200, useNativeDriver: true }).start());
      return;
    }
    const loops = bars.map((bar, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.timing(bar, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 300 + Math.random() * 300,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.1 + Math.random() * 0.3,
            duration: 200 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [active]);

  return (
    <View style={waveStyles.container}>
      {bars.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 48,
  },
  bar: {
    width: 4,
    height: 48,
    borderRadius: 3,
  },
});

function LipSyncOverlay({ speaking, color }: { speaking: boolean; color: string }) {
  const glow = useRef(new Animated.Value(0)).current;
  const mouthScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!speaking) {
      Animated.timing(glow, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.timing(mouthScale, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 180, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.9, duration: 220, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.1, duration: 150, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 160, useNativeDriver: true }),
      ])
    );

    const mouthLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthScale, { toValue: 1.08, duration: 220, useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 0.94, duration: 160, useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 0.96, duration: 180, useNativeDriver: true }),
      ])
    );

    glowLoop.start();
    mouthLoop.start();
    return () => {
      glowLoop.stop();
      mouthLoop.stop();
    };
  }, [speaking]);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }),
            backgroundColor: color,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.mouthGlow,
          {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
            transform: [{ scaleX: mouthScale }, { scaleY: mouthScale }],
            shadowColor: color,
            shadowOpacity: 1,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />
    </>
  );
}

const FREE_CALL_SECONDS = 5 * 60;
const COINS_PER_MINUTE = 100;

export default function VideoChatScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacter(characterId ?? "");
  const insets = useSafeAreaInsets();
  const { spendCoins } = useGifts();
  const { t } = useI18n();

  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [userText, setUserText] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  const timerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const meteringPollRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const isMutedRef = useRef(false);
  const conversationHistoryRef = useRef<{ role: string; content: string }[]>([]);
  const sendRecordingRef = useRef<() => Promise<void>>(async () => {});

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const listeningPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  useEffect(() => {
    if (callDuration <= FREE_CALL_SECONDS) return;
    const extra = callDuration - FREE_CALL_SECONDS;
    if (extra > 0 && extra % 60 === 0) {
      spendCoins(COINS_PER_MINUTE).then((ok) => {
        if (!ok) {
          Alert.alert(
            t("videoChat.noCoins"),
            t("videoChat.noCoinsMessage"),
            [{ text: t("common.ok"), onPress: () => handleEndCall() }]
          );
        }
      });
    }
  }, [callDuration]);

  useEffect(() => {
    mountedRef.current = true;
    timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.025, duration: 3500, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
      ])
    );
    breatheLoop.start();

    setupAndStartListening();

    return () => {
      mountedRef.current = false;
      breatheLoop.stop();
      clearInterval(timerRef.current);
      clearTimeout(silenceTimerRef.current);
      clearInterval(meteringPollRef.current);
      if (abortRef.current) abortRef.current.abort();
      stopRecordingCleanup();
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (callState === "listening") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(listeningPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(listeningPulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); listeningPulse.setValue(0); };
    }
  }, [callState]);

  const stopRecordingCleanup = async () => {
    clearTimeout(silenceTimerRef.current);
    clearInterval(meteringPollRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  };

  const setupAndStartListening = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("videoChat.micPermission"),
          t("videoChat.micPermissionMessage"),
          [{ text: t("common.ok"), onPress: () => handleEndCall() }]
        );
        return;
      }
      startListening();
    } catch (e) {
      console.error("Audio setup error:", e);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!mountedRef.current || isMutedRef.current) return;

    try {
      const { recording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: ".m4a",
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".caf",
          audioQuality: 127,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });

      recordingRef.current = recording;
      if (mountedRef.current) setCallState("listening");

      let silenceSince: number | null = null;
      let hasSpeech = false;
      let meteringUnavailableCount = 0;
      const recordingStart = Date.now();

      meteringPollRef.current = setInterval(async () => {
        if (!recordingRef.current || !mountedRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (!status.isRecording) return;

          const level = (status as any).metering;

          if (level === undefined || level === null) {
            meteringUnavailableCount++;
            if (meteringUnavailableCount > 30 && Date.now() - recordingStart > 20000) {
              clearInterval(meteringPollRef.current);
              sendRecordingRef.current();
            }
            return;
          }

          if (level > SILENCE_THRESHOLD) {
            hasSpeech = true;
            silenceSince = null;
          } else if (hasSpeech) {
            if (silenceSince === null) {
              silenceSince = Date.now();
            } else if (Date.now() - silenceSince >= SILENCE_DURATION_MS) {
              clearInterval(meteringPollRef.current);
              sendRecordingRef.current();
            }
          } else if (Date.now() - recordingStart > 25000) {
            clearInterval(meteringPollRef.current);
            sendRecordingRef.current();
          }
        } catch {}
      }, 150);
    } catch (e) {
      console.error("Recording error:", e);
    }
  }, []);

  const sendRecording = useCallback(async () => {
    if (!recordingRef.current || !mountedRef.current) return;

    const rec = recordingRef.current;
    recordingRef.current = null;

    try {
      if (mountedRef.current) setCallState("processing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const uri = rec.getURI();
      await rec.stopAndUnloadAsync().catch(() => {});

      if (!uri || !mountedRef.current) {
        if (mountedRef.current) startListening();
        return;
      }

      let base64Audio: string;

      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] || result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const FileSystem = await import("expo-file-system/legacy");
        base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!mountedRef.current) return;

      abortRef.current = new AbortController();
      const apiUrl = getApiUrl();
      const url = new URL("/api/voice-chat", apiUrl).toString();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          characterId,
          userLevel: 5,
          userLanguage: "tr",
          conversationHistory: conversationHistoryRef.current,
        }),
        signal: abortRef.current.signal,
      });

      if (!mountedRef.current) return;
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Voice chat failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      if (data.userTranscript) setUserText(data.userTranscript);
      if (data.responseText) setTranscript(data.responseText);

      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: data.userTranscript || "" },
        { role: "assistant", content: data.responseText || "" },
      ]);

      if (data.audio) {
        await playAudioResponse(data.audio, data.audioFormat || "mp3");
      } else {
        if (mountedRef.current) startListening();
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Voice chat error:", e);
      if (mountedRef.current) {
        setCallState("idle");
        setTranscript("Hata: " + (e?.message || "Bilinmeyen hata"));
        setTimeout(() => { if (mountedRef.current) startListening(); }, 2500);
      }
    }
  }, [characterId]);

  useEffect(() => {
    sendRecordingRef.current = sendRecording;
  }, [sendRecording]);

  const playAudioResponse = useCallback(async (base64Audio: string, format: string) => {
    if (!mountedRef.current) return;
    try {
      setCallState("speaking");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      let sourceUri: string;
      if (Platform.OS !== "web") {
        const FileSystem = await import("expo-file-system/legacy");
        const filePath = `${FileSystem.cacheDirectory}soulie_voice_${Date.now()}.${format}`;
        await FileSystem.writeAsStringAsync(filePath, base64Audio, {
          encoding: FileSystem.EncodingType.Base64,
        });
        sourceUri = filePath;
      } else {
        sourceUri = `data:audio/${format};base64,${base64Audio}`;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: sourceUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve();
          }
        });
      });

      await sound.unloadAsync().catch(() => {});
      soundRef.current = null;

      if (mountedRef.current && !isMutedRef.current) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        setTimeout(() => { if (mountedRef.current) startListening(); }, 600);
      } else if (mountedRef.current) {
        setCallState("idle");
      }
    } catch (e) {
      console.error("Playback error:", e);
      if (mountedRef.current) {
        setCallState("idle");
        setTimeout(() => { if (mountedRef.current) startListening(); }, 1000);
      }
    }
  }, []);

  const handleScreenTap = useCallback(() => {
    if (callState === "listening") {
      clearInterval(meteringPollRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendRecordingRef.current();
    } else if (callState === "idle" && !isMutedRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      startListening();
    }
  }, [callState]);

  const toggleMute = useCallback(async () => {
    const nowMuted = !isMuted;
    setIsMuted(nowMuted);
    isMutedRef.current = nowMuted;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (nowMuted && callState === "listening") {
      await stopRecordingCleanup();
      if (mountedRef.current) setCallState("idle");
    } else if (!nowMuted && callState === "idle") {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      startListening();
    }
  }, [isMuted, callState]);

  const handleEndCall = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    mountedRef.current = false;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    clearInterval(meteringPollRef.current);
    clearTimeout(silenceTimerRef.current);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!character) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Pressable onPress={handleEndCall} style={{ padding: 20 }}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const grad = character.gradientColors;
  const isListening = callState === "listening";
  const isSpeaking = callState === "speaking";
  const isProcessing = callState === "processing";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const statusLabel = isListening
    ? t("videoChat.listening")
    : isProcessing
    ? t("videoChat.thinking")
    : isSpeaking
    ? t("videoChat.speaking")
    : isMuted
    ? t("videoChat.muted")
    : t("videoChat.starting");

  const statusColor = isListening
    ? "#34C759"
    : isProcessing
    ? "#FFD700"
    : isSpeaking
    ? grad[0]
    : "#8E8E93";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />

      {character.image ? (
        <Animated.Image
          source={character.image}
          style={[styles.fullImage, { transform: [{ scale: breatheAnim }] }]}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
      )}

      {character.image && isSpeaking && (
        <LipSyncOverlay speaking={isSpeaking} color={grad[0]} />
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "transparent", "transparent", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={handleEndCall} style={styles.headerBackBtn} hitSlop={12}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <Feather name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerMeta}>
          <Text style={styles.headerName}>{character.name}</Text>
          <Text style={styles.headerTimer}>{formatTime(callDuration)}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <Pressable style={styles.centerContent} onPress={handleScreenTap}>
        <AnimatedWaveform
          active={isListening || isSpeaking}
          color={isSpeaking ? grad[0] : "#fff"}
          barCount={9}
        />
        <View style={styles.statusRow}>
          <Animated.View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusColor,
                opacity: isListening
                  ? listeningPulse
                  : 1,
              },
            ]}
          />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>
        {isListening && (
          <Text style={styles.tapHint}>{t("videoChat.hint")}</Text>
        )}
      </Pressable>

      {(!!userText || !!transcript) ? (
        <View style={styles.transcriptBox} pointerEvents="none">
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          {!!userText && (
            <Text style={styles.userLine} numberOfLines={2}>
              <Text style={styles.userPrefix}>{"Sen:  "}</Text>
              {userText}
            </Text>
          )}
          {!!transcript && (
            <Text style={styles.aiLine} numberOfLines={3}>
              <Text style={[styles.aiPrefix, { color: grad[0] }]}>{`${character.name}:  `}</Text>
              {transcript}
            </Text>
          )}
        </View>
      ) : null}

      <View style={[styles.controls, { paddingBottom: botPad + 16 }]}>
        <Pressable onPress={toggleMute} style={styles.muteBtn}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <Feather
            name={isMuted ? "mic-off" : "mic"}
            size={22}
            color={isMuted ? "#FF3B30" : "rgba(255,255,255,0.85)"}
          />
          <Text style={styles.controlLabel}>{isMuted ? "Sessiz" : "Mikrofon"}</Text>
        </Pressable>

        <Pressable onPress={handleEndCall} style={styles.endBtn}>
          <LinearGradient colors={["#FF3B30", "#FF6060"]} style={StyleSheet.absoluteFill} />
          <Feather name="phone-off" size={26} color="#fff" />
          <Text style={styles.endLabel}>Kapat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullImage: {
    position: "absolute",
    width: W,
    height: H,
    top: 0,
    left: 0,
  },
  mouthGlow: {
    position: "absolute",
    bottom: "18%",
    left: "30%",
    right: "30%",
    height: 60,
    borderRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerMeta: {
    flex: 1,
    alignItems: "center",
  },
  headerName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerTimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  headerSpacer: {
    width: 36,
  },
  centerContent: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 24,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  transcriptBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 5,
  },
  userLine: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },
  userPrefix: {
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.45)",
  },
  aiLine: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    lineHeight: 20,
  },
  aiPrefix: {
    fontFamily: "Inter_600SemiBold",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 40,
    gap: 40,
  },
  muteBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  endBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  controlLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  endLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  tapHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
