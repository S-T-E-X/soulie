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

const STORAGE_KEY = "lumina_conversations_v2";

let msgCounter = 0;
export function generateId(): string {
  msgCounter++;
  return `id-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
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

  const updateConversation = useCallback(
    async (id: string, messages: Message[]) => {
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
      await save(updated);
    },
    [conversations, save]
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
      if (existing) {
        const lastMsg = messages[messages.length - 1];
        const updated = conversations.map((c) => {
          if (c.id !== existing.id) return c;
          return {
            ...c,
            messages,
            lastMessage: lastMsg?.content.slice(0, 60),
            updatedAt: Date.now(),
          };
        });
        setConversations(updated);
        await save(updated);
        return existing;
      }

      const newConv: Conversation = {
        id: generateId(),
        characterId,
        title: characterName,
        messages,
        lastMessage: messages[messages.length - 1]?.content.slice(0, 60),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newConv, ...conversations];
      setConversations(updated);
      await save(updated);
      return newConv;
    },
    [conversations, save]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      await save(updated);
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
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
