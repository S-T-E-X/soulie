import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

export async function logEvent(
  userId: string,
  eventType: "screen_view" | "action" | "session_start" | "session_end" | "chat_start" | "chat_message" | "error",
  screen?: string,
  action?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!userId) return;
  try {
    const url = new URL("/api/users/log-event", getApiUrl());
    await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        eventType,
        screen: screen ?? null,
        action: action ?? null,
        metadata: metadata ?? {},
        platform: Platform.OS,
      }),
    });
  } catch {
  }
}
