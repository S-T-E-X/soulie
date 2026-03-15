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
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { getCharacter } from "@/constants/characters";
import { getApiUrl } from "@/lib/query-client";

const { width: W, height: H } = Dimensions.get("window");

type CallState = "idle" | "recording" | "processing" | "speaking";

function PulseRing({ delay = 0, color = "rgba(255,255,255,0.15)", active = true }: { delay?: number; color?: string; active?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      opacity.setValue(0.3);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.2, duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { backgroundColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

function SpeakingWave({ amplitude, color }: { amplitude: Animated.Value; color: string }) {
  return (
    <Animated.View
      style={[
        styles.speakingWave,
        {
          borderColor: color,
          transform: [{ scale: amplitude.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
          opacity: amplitude.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] }),
        },
      ]}
    />
  );
}

export default function VideoChatScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacter(characterId ?? "");
  const insets = useSafeAreaInsets();

  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [userText, setUserText] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  const timerRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const mouthAnim = useRef(new Animated.Value(0)).current;
  const speakPulse = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mountedRef.current = true;
    timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (callState === "speaking") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0.8, duration: 180, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0.2, duration: 130, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0.9, duration: 220, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        ])
      );
      loop.start();

      const waveLoop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(waveAnim1, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      const waveLoop2 = Animated.loop(
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(waveAnim2, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(waveAnim2, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      );
      const waveLoop3 = Animated.loop(
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(waveAnim3, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(waveAnim3, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      );
      waveLoop1.start();
      waveLoop2.start();
      waveLoop3.start();

      return () => {
        loop.stop();
        waveLoop1.stop();
        waveLoop2.stop();
        waveLoop3.stop();
        mouthAnim.setValue(0);
        waveAnim1.setValue(0);
        waveAnim2.setValue(0);
        waveAnim3.setValue(0);
      };
    }
  }, [callState]);

  useEffect(() => {
    if (callState === "recording") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(speakPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(speakPulse, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); speakPulse.setValue(0); };
    }
  }, [callState]);

  const setupAudio = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (e) {
      console.warn("Audio setup error:", e);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      await setupAudio();
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Mikrofon izni gerekli", "Sesli sohbet icin mikrofon erisimi vermelisiniz.");
        return;
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setCallState("recording");
      setUserText("");
      setTranscript("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.error("Recording start error:", e);
      Alert.alert("Hata", "Ses kaydi baslatılamadı.");
    }
  }, []);

  const stopRecordingAndSend = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      setCallState("processing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setCallState("idle");
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
            const b64 = result.split(",")[1] || result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const FileSystem = await import("expo-file-system");
        base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      abortRef.current = new AbortController();
      const apiUrl = getApiUrl();
      const url = new URL("/api/voice-chat", apiUrl).toString();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          characterId: characterId,
          userLevel: 5,
          userLanguage: "tr",
          conversationHistory,
        }),
        signal: abortRef.current.signal,
      });

      if (!mountedRef.current) return;

      if (!res.ok) {
        throw new Error("Voice chat request failed");
      }

      const data = await res.json();

      if (!mountedRef.current) return;

      setUserText(data.userTranscript || "");
      setTranscript(data.responseText || "");

      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: data.userTranscript },
        { role: "assistant", content: data.responseText },
      ]);

      if (data.audio) {
        await playAudioResponse(data.audio, data.audioFormat || "mp3");
      } else {
        setCallState("idle");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Voice chat error:", e);
      if (mountedRef.current) {
        setCallState("idle");
        setTranscript("Bir hata olustu, tekrar deneyin.");
      }
    }
  }, [characterId, conversationHistory]);

  const playAudioResponse = useCallback(async (base64Audio: string, format: string) => {
    try {
      if (!mountedRef.current) return;
      setCallState("speaking");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      let sourceUri: string;

      if (Platform.OS !== "web") {
        const FileSystem = await import("expo-file-system");
        const filePath = `${FileSystem.cacheDirectory}voice_response_${Date.now()}.${format}`;
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

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          if (mountedRef.current) {
            setCallState("idle");
          }
        }
      });
    } catch (e) {
      console.error("Audio playback error:", e);
      if (mountedRef.current) setCallState("idle");
    }
  }, []);

  const handleMicPress = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      return;
    }
    if (callState === "idle") {
      startRecording();
    } else if (callState === "recording") {
      stopRecordingAndSend();
    }
  }, [callState, isMuted, startRecording, stopRecordingAndSend]);

  const handleEndCall = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!character) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={{ padding: 20 }}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const gradColors = character.gradientColors;
  const isSpeaking = callState === "speaking";
  const isRecording = callState === "recording";
  const isProcessing = callState === "processing";

  const stateLabel = isRecording
    ? "Dinliyorum..."
    : isProcessing
    ? "Dusunuyor..."
    : isSpeaking
    ? "Konusuyor..."
    : "Konusmak icin mikrofona basin";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {character.image && (
        <Image source={character.image} style={styles.bgImage} blurRadius={30} />
      )}
      <LinearGradient
        colors={[`${gradColors[0]}BB`, `${gradColors[1]}DD`, "#000000DD"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={handleEndCall}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Feather name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{character.name}</Text>
          <Text style={styles.headerStatus}>{formatTime(callDuration)}</Text>
        </View>
        <View style={styles.headerBtn}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Ionicons name="volume-high" size={18} color={isSpeakerOn ? "#fff" : "rgba(255,255,255,0.4)"} />
        </View>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {isSpeaking && (
            <>
              <SpeakingWave amplitude={waveAnim1} color={gradColors[0]} />
              <SpeakingWave amplitude={waveAnim2} color={gradColors[1]} />
              <SpeakingWave amplitude={waveAnim3} color={gradColors[0]} />
            </>
          )}

          <PulseRing delay={0} color={`${gradColors[0]}30`} active={isSpeaking || isRecording} />
          <PulseRing delay={500} color={`${gradColors[1]}20`} active={isSpeaking || isRecording} />

          <Animated.View style={[styles.avatarWrapper, {
            transform: [{
              scale: isSpeaking
                ? mouthAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] })
                : breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }),
            }],
          }]}>
            {character.image ? (
              <Image source={character.image} style={styles.avatar} />
            ) : (
              <LinearGradient colors={gradColors} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{character.name[0]}</Text>
              </LinearGradient>
            )}
            <LinearGradient
              colors={[`${gradColors[0]}60`, `${gradColors[1]}60`]}
              style={styles.avatarGlow}
            />
          </Animated.View>

          {isSpeaking && (
            <Animated.View style={[styles.speakingIndicator, {
              opacity: mouthAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [{ scale: mouthAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }],
            }]}>
              <View style={[styles.soundBar, { height: 12 }]} />
              <View style={[styles.soundBar, { height: 20 }]} />
              <View style={[styles.soundBar, { height: 16 }]} />
              <View style={[styles.soundBar, { height: 24 }]} />
              <View style={[styles.soundBar, { height: 14 }]} />
            </Animated.View>
          )}
        </View>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, {
            backgroundColor: isRecording ? "#FF3B30" : isSpeaking ? "#34C759" : isProcessing ? "#FFD700" : "#8E8E93",
          }]} />
          <Text style={styles.statusText}>{stateLabel}</Text>
        </View>

        {(!!transcript || !!userText) ? (
          <View style={styles.transcriptContainer}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            {!!userText && (
              <Text style={styles.userTranscript}>
                <Text style={{ color: "rgba(255,255,255,0.5)" }}>{"Sen: "}</Text>
                {userText}
              </Text>
            )}
            {!!transcript && (
              <Text style={styles.aiTranscript}>
                <Text style={{ color: gradColors[0] }}>{`${character.name}: `}</Text>
                {transcript}
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.processingText}>Yanit hazirlaniyor...</Text>
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }]}>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsMuted((v) => !v);
            }}
            style={styles.controlBtnWrap}
          >
            <View style={[styles.controlBtn, isMuted && styles.controlBtnOff]}>
              <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
              <Feather name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "rgba(255,255,255,0.4)" : "#fff"} />
            </View>
            <Text style={styles.controlLabel}>{isMuted ? "Acik" : "Sessiz"}</Text>
          </Pressable>

          <Pressable
            onPress={handleMicPress}
            onLongPress={callState === "idle" ? startRecording : undefined}
            disabled={isProcessing || isSpeaking}
            style={styles.controlBtnWrap}
          >
            <Animated.View style={[styles.micMainBtn, isRecording && {
              transform: [{ scale: speakPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
            }]}>
              <LinearGradient
                colors={isRecording ? ["#FF3B30", "#FF6B60"] : isProcessing || isSpeaking ? ["#555", "#666"] : gradColors}
                style={StyleSheet.absoluteFill}
              />
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather
                  name={isRecording ? "square" : "mic"}
                  size={isRecording ? 24 : 28}
                  color="#fff"
                />
              )}
            </Animated.View>
            <Text style={styles.controlLabel}>
              {isRecording ? "Durdur" : isProcessing ? "Bekle" : isSpeaking ? "Dinle" : "Konuş"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleEndCall}
            style={styles.controlBtnWrap}
          >
            <View style={styles.endCallBtn}>
              <LinearGradient colors={["#FF3B30", "#FF6B60"]} style={StyleSheet.absoluteFill} />
              <Feather name="phone-off" size={22} color="#fff" />
            </View>
            <Text style={styles.controlLabel}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D1A",
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: W,
    height: H,
    resizeMode: "cover",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  avatarSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  avatarContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  speakingWave: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  avatarGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
  },
  speakingIndicator: {
    position: "absolute",
    bottom: -8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  soundBar: {
    width: 4,
    backgroundColor: "#34C759",
    borderRadius: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  transcriptContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    maxWidth: W - 48,
    width: "100%",
  },
  userTranscript: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
  },
  aiTranscript: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    lineHeight: 20,
  },
  processingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  processingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  controls: {
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-evenly",
  },
  controlBtnWrap: {
    alignItems: "center",
    gap: 8,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlBtnOff: {
    borderColor: "rgba(255,255,255,0.08)",
  },
  micMainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  endCallBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
});
