// ─────────────────────────────────────────────────────────────────────────────
// FitBridge Chat Types
// Used by: chatStore, ChatScreen, MessageBubble, ThreadList
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single message within a chat thread.
 *   isAIInsight — true when the message is a FitBridge AI suggestion/tip,
 *                 rendered with a distinct AI bubble style.
 */
export interface Message {
  id: string;
  threadId: string;
  senderId: string;         // User.id of the sender
  senderName: string;
  senderAvatar: string;     // URI string
  text: string;
  mediaUrl?: string;        // optional image or video attachment
  mediaType?: 'image' | 'video';
  timestamp: string;        // ISO timestamp
  isRead: boolean;
  isAIInsight?: boolean;    // true → render as AI system bubble
}

/**
 * A conversation thread between exactly two participants.
 * Always has exactly 2 entries in participantIds/Names/Avatars.
 */
export interface ChatThread {
  id: string;
  participantIds: [string, string];     // [myUserId, otherUserId]
  participantNames: [string, string];   // [myName, otherName]
  participantAvatars: [string, string]; // [myAvatar, otherAvatar]
  lastMessage?: Pick<Message, 'text' | 'timestamp' | 'senderId' | 'isRead'>;
  unreadCount: number;
  updatedAt: string;        // ISO timestamp — used to sort thread list
  isAiSession?: boolean;    // true if this is an AITrainerChat
  trainerId?: string;       // the trainer's ID (used for AI chat routing)
}
