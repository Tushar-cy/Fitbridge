import { create } from 'zustand';
import { Message, ChatThread } from '../types/chat.types';
import { mockChatThreads, mockChatMessages } from '../utils/mockData/mockChat';

// ─────────────────────────────────────────────────────────────────────────────
// ChatStore — manages real-time chat state for FitBridge
//
// Seeded with mock data so ChatScreen renders immediately without a backend.
// When real WebSocket/Socket.io integration lands (Phase 2), replace the
// initial seed values and wire setConnected / addMessage to socket events.
// ─────────────────────────────────────────────────────────────────────────────

interface ChatState {
  // ── State ──────────────────────────────────────────────────────────────────

  /** All chat threads, sorted descending by updatedAt */
  threads: ChatThread[];

  /** The thread currently open in ChatScreen (null = thread list view) */
  activeThreadId: string | null;

  /** Messages keyed by threadId — lazy-loaded per thread */
  messages: Record<string, Message[]>;

  /** True when the WebSocket connection is established */
  isConnected: boolean;

  /** Per-thread typing indicator — true when the other participant is typing */
  isTyping: Record<string, boolean>;

  /** Sum of unreadCount across all threads — shown on tab badge */
  unreadTotal: number;

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Replace the full thread list (e.g. after fetching from API).
   * Recalculates unreadTotal automatically.
   */
  setThreads: (threads: ChatThread[]) => void;

  /**
   * Set the active thread and clear its unread badge.
   * Pass null to return to the thread list.
   */
  setActiveThread: (id: string | null) => void;

  /**
   * Append a new message to a thread.
   * Updates the thread's lastMessage, updatedAt, and unreadCount
   * (only increments unread if the message is from another user and
   * the thread is not currently active).
   */
  addMessage: (threadId: string, message: Message) => void;

  /**
   * Mark all messages in a thread as read and reset its unreadCount to 0.
   * Recalculates unreadTotal.
   */
  markThreadRead: (threadId: string) => void;

  /**
   * Set or clear the typing indicator for a specific thread.
   */
  setTyping: (threadId: string, typing: boolean) => void;

  /**
   * Update the WebSocket connection status.
   */
  setConnected: (connected: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calculate the total unread count across all threads */
const calcUnreadTotal = (threads: ChatThread[]): number =>
  threads.reduce((sum, t) => sum + t.unreadCount, 0);

/** Sort threads newest-first by updatedAt */
const sortThreads = (threads: ChatThread[]): ChatThread[] =>
  [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  // Seeded with mock data — swap these for empty arrays when real API is ready
  threads: sortThreads(mockChatThreads),
  activeThreadId: null,
  messages: mockChatMessages,
  isConnected: false,
  isTyping: {},
  unreadTotal: calcUnreadTotal(mockChatThreads),

  // ── setThreads ─────────────────────────────────────────────────────────────
  setThreads: (threads) =>
    set({
      threads: sortThreads(threads),
      unreadTotal: calcUnreadTotal(threads),
    }),

  // ── setActiveThread ────────────────────────────────────────────────────────
  setActiveThread: (id) => {
    set({ activeThreadId: id });
    // Auto-clear unread badge when opening a thread
    if (id) get().markThreadRead(id);
  },

  // ── addMessage ─────────────────────────────────────────────────────────────
  addMessage: (threadId, message) =>
    set((state) => {
      // Append message to thread's message list
      const existing = state.messages[threadId] ?? [];
      const messages = {
        ...state.messages,
        [threadId]: [...existing, message],
      };

      // Determine if this message should increment unread
      const isActiveThread = state.activeThreadId === threadId;
      const isOwnMessage = message.senderId === 'me'; // MY_ID constant
      const shouldIncrementUnread = !isActiveThread && !isOwnMessage;

      // Update the relevant thread's metadata
      const threads = sortThreads(
        state.threads.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            lastMessage: {
              text: message.text,
              timestamp: message.timestamp,
              senderId: message.senderId,
              isRead: isActiveThread,
            },
            unreadCount: shouldIncrementUnread
              ? t.unreadCount + 1
              : t.unreadCount,
            updatedAt: message.timestamp,
          };
        }),
      );

      return {
        messages,
        threads,
        unreadTotal: calcUnreadTotal(threads),
      };
    }),

  // ── markThreadRead ─────────────────────────────────────────────────────────
  markThreadRead: (threadId) =>
    set((state) => {
      // Mark every message in the thread as read
      const messages = {
        ...state.messages,
        [threadId]: (state.messages[threadId] ?? []).map((m) => ({
          ...m,
          isRead: true,
        })),
      };

      // Reset the thread's unread badge
      const threads = state.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              unreadCount: 0,
              lastMessage: t.lastMessage
                ? { ...t.lastMessage, isRead: true }
                : undefined,
            }
          : t,
      );

      return {
        messages,
        threads,
        unreadTotal: calcUnreadTotal(threads),
      };
    }),

  // ── setTyping ──────────────────────────────────────────────────────────────
  setTyping: (threadId, typing) =>
    set((state) => ({
      isTyping: { ...state.isTyping, [threadId]: typing },
    })),

  // ── setConnected ───────────────────────────────────────────────────────────
  setConnected: (connected) => set({ isConnected: connected }),
}));
