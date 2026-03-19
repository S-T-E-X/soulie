import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  giftId?: string;
  timestamp: number;
};

export type Conversation = {
  id: string;
  characterId: string;
  title: string;
  messages: Message[];
  lastMessage?: string;
  updatedAt: number;
  createdAt: number;
};

const STORAGE_KEY = "soulie_conversations_v2";
const ARCHIVE_KEY = "soulie_archive_msgs_v1";
const MAX_DB_MESSAGES = 50;
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function isWithinTwoWeeks(updatedAt: number): boolean {
  return Date.now() - updatedAt < TWO_WEEKS_MS;
}

async function syncChatToServer(
  userId: string,
  conv: { id: string; characterId: string; messages: unknown[]; updatedAt: number }
): Promise<void> {
  try {
    await apiRequest("POST", "/api/chats/sync", {
      userId,
      characterId: conv.characterId,
      conversationId: conv.id,
      messages: conv.messages,
      updatedAt: conv.updatedAt,
    });
  } catch {}
}

async function deleteChatFromServer(userId: string, conversationId: string): Promise<void> {
  try {
    const url = new URL(`/api/chats/${userId}/${conversationId}`, getApiUrl());
    await fetch(url.toString(), { method: "DELETE" });
  } catch {}
}

async function fetchChatsFromServer(userId: string): Promise<Conversation[]> {
  try {
    const url = new URL(`/api/chats/${userId}`, getApiUrl());
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.chats ?? []).map((row: any) => ({
      id: row.id,
      characterId: row.character_id,
      title: row.character_id,
      messages: typeof row.messages === "string" ? JSON.parse(row.messages) : row.messages ?? [],
      updatedAt: new Date(row.updated_at).getTime(),
      createdAt: new Date(row.created_at ?? row.updated_at).getTime(),
      lastMessage: undefined as string | undefined,
    }));
  } catch {
    return [];
  }
}

let msgCounter = 0;
export function generateId(): string {
  msgCounter++;
  return `id-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

async function loadArchive(): Promise<Record<string, Message[]>> {
  try {
    const raw = await AsyncStorage.getItem(ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveArchive(archive: Record<string, Message[]>): Promise<void> {
  try {
    await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
}

function splitMessages(messages: Message[]): { recent: Message[]; archived: Message[] } {
  if (messages.length <= MAX_DB_MESSAGES) {
    return { recent: messages, archived: [] };
  }
  return {
    recent: messages.slice(-MAX_DB_MESSAGES),
    archived: messages.slice(0, -MAX_DB_MESSAGES),
  };
}

interface ChatContextValue {
  conversations: Conversation[];
  isLoaded: boolean;
  loadConversations: () => Promise<void>;
  createConversation: (characterId: string, characterName: string) => Conversation;
  createConversationWithMessages: (characterId: string, characterName: string, messages: Message[]) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  getConversation: (id: string) => Conversation | undefined;
  getConversationByCharacter: (characterId: string) => Conversation | undefined;
  updateConversation: (id: string, messages: Message[]) => Promise<void>;
  loadArchivedMessages: (characterId: string) => Promise<Message[]>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const didMergeServerRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const local: Conversation[] = stored ? JSON.parse(stored) : [];
      setConversations(local);
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    didMergeServerRef.current = false;
    setConversations([]);
    setIsLoaded(false);
    if (userId) {
      loadConversations();
    }
  }, [userId, loadConversations]);

  useEffect(() => {
    if (!userId || !isLoaded || didMergeServerRef.current) return;
    didMergeServerRef.current = true;
    fetchChatsFromServer(userId).then((serverConvs) => {
      if (serverConvs.length === 0) return;
      setConversations((prev) => {
        const map = new Map<string, Conversation>();
        for (const c of prev) map.set(c.characterId, c);
        for (const sc of serverConvs) {
          const existing = map.get(sc.characterId);
          if (!existing || sc.updatedAt > existing.updatedAt) {
            const lastMsg = sc.messages[sc.messages.length - 1] as Message | undefined;
            map.set(sc.characterId, {
              ...sc,
              title: existing?.title ?? sc.characterId,
              lastMessage: lastMsg?.content?.slice(0, 60),
            });
          }
        }
        const merged = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    }).catch(() => {});
  }, [userId, isLoaded]);

  const save = useCallback(async (convs: Conversation[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  }, []);

  const saveWithArchive = useCallback(async (convs: Conversation[], characterId: string, allMessages: Message[]) => {
    const { recent, archived } = splitMessages(allMessages);

    const convsCapped = convs.map((c) => {
      if (c.characterId !== characterId) return c;
      return { ...c, messages: recent };
    });

    await save(convsCapped);

    if (archived.length > 0) {
      const archive = await loadArchive();
      const existing = archive[characterId] ?? [];
      const newIds = new Set(archived.map((m) => m.id));
      const merged = [...existing.filter((m) => !newIds.has(m.id)), ...archived].sort((a, b) => a.timestamp - b.timestamp);
      archive[characterId] = merged;
      await saveArchive(archive);
    }

    return convsCapped;
  }, [save]);

  const loadArchivedMessages = useCallback(async (characterId: string): Promise<Message[]> => {
    const archive = await loadArchive();
    return archive[characterId] ?? [];
  }, []);

  const updateConversation = useCallback(
    async (id: string, messages: Message[]) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      const lastMsg = messages[messages.length - 1];
      const now = Date.now();
      const updated = conversations.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          messages,
          lastMessage: lastMsg?.content.slice(0, 60),
          updatedAt: now,
        };
      });
      setConversations(updated);
      await saveWithArchive(updated, conv.characterId, messages);
      if (userId && isWithinTwoWeeks(now)) {
        syncChatToServer(userId, { id, characterId: conv.characterId, messages, updatedAt: now }).catch(() => {});
      }
    },
    [conversations, saveWithArchive, userId]
  );

  const createConversation = useCallback(
    (characterId: string, characterName: string): Conversation => {
      const existing = conversations.find((c) => c.characterId === characterId);
      if (existing) return existing;

      const newConv: Conversation = {
        id: generateId(),
        characterId,
        title: characterName,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newConv, ...conversations];
      setConversations(updated);
      save(updated);
      return newConv;
    },
    [conversations, save]
  );

  const createConversationWithMessages = useCallback(
    async (characterId: string, characterName: string, messages: Message[]): Promise<Conversation> => {
      const existing = conversations.find((c) => c.characterId === characterId);
      const lastMsg = messages[messages.length - 1];

      if (existing) {
        const { recent } = splitMessages(messages);
        const updated = conversations.map((c) => {
          if (c.id !== existing.id) return c;
          return {
            ...c,
            messages: recent,
            lastMessage: lastMsg?.content.slice(0, 60),
            updatedAt: Date.now(),
          };
        });
        setConversations(updated);
        await saveWithArchive(updated, characterId, messages);
        return existing;
      }

      const { recent } = splitMessages(messages);
      const newConv: Conversation = {
        id: generateId(),
        characterId,
        title: characterName,
        messages: recent,
        lastMessage: lastMsg?.content.slice(0, 60),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newConv, ...conversations];
      setConversations(updated);
      await saveWithArchive(updated, characterId, messages);
      return newConv;
    },
    [conversations, saveWithArchive]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const conv = conversations.find((c) => c.id === id);
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      await save(updated);

      if (conv) {
        const archive = await loadArchive();
        delete archive[conv.characterId];
        await saveArchive(archive);
        if (userId) {
          deleteChatFromServer(userId, id).catch(() => {});
        }
      }
    },
    [conversations, save, userId]
  );

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const getConversationByCharacter = useCallback(
    (characterId: string) => conversations.find((c) => c.characterId === characterId),
    [conversations]
  );

  const value = useMemo(
    () => ({
      conversations,
      isLoaded,
      loadConversations,
      createConversation,
      createConversationWithMessages,
      deleteConversation,
      getConversation,
      getConversationByCharacter,
      updateConversation,
      loadArchivedMessages,
    }),
    [
      conversations,
      isLoaded,
      loadConversations,
      createConversation,
      createConversationWithMessages,
      deleteConversation,
      getConversation,
      getConversationByCharacter,
      updateConversation,
      loadArchivedMessages,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
