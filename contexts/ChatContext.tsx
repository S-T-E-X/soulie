import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setConversations(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

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
      const updated = conversations.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          messages,
          lastMessage: lastMsg?.content.slice(0, 60),
          updatedAt: Date.now(),
        };
      });
      setConversations(updated);
      await saveWithArchive(updated, conv.characterId, messages);
    },
    [conversations, saveWithArchive]
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
      }
    },
    [conversations, save]
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
