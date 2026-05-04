/**
 * chatService.ts — Supabase Realtime chat for FitBridge.
 *
 * Replaces the Socket.IO plan from Phase 2.
 *
 * Architecture:
 *   REST layer  → supabase.from('messages').select() / .insert()
 *   Realtime    → supabase.channel().on('postgres_changes', ...)
 *   Unread sync → mark_thread_read() RPC + realtime chat_threads updates
 *
 * Thread model (Supabase):
 *   chat_threads { id, trainee_id, trainer_id, last_message, trainee_unread, trainer_unread }
 *   messages     { id, thread_id, sender_id, text, media_url, media_type, is_ai_insight, is_read }
 *
 * App model (chat.types.ts):
 *   ChatThread { id, participantIds, participantNames, participantAvatars, lastMessage, unreadCount }
 *   Message    { id, threadId, senderId, senderName, senderAvatar, text, timestamp, isRead }
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { ChatThread, Message } from '../../types/chat.types';

// ── DB row → App type mappers ─────────────────────────────────────────────────

/**
 * Maps a chat_threads row (with joined profile data) into our ChatThread shape.
 * Supabase returns profiles via a join alias:
 *   trainee:profiles!chat_threads_trainee_id_fkey(...)
 *   trainer:profiles!chat_threads_trainer_id_fkey(...)
 */
function mapThreadRow(row: any, myId: string): ChatThread {
  const isTrainee = row.trainee_id === myId;

  const myName   = isTrainee ? (row.trainee?.full_name ?? 'You')
                             : (row.trainer?.full_name ?? 'You');
  const myAvatar = isTrainee ? (row.trainee?.avatar_url ?? '')
                             : (row.trainer?.avatar_url ?? '');

  const otherName   = isTrainee ? (row.trainer?.full_name ?? 'Trainer')
                                : (row.trainee?.full_name ?? 'Trainee');
  const otherAvatar = isTrainee ? (row.trainer?.avatar_url ?? `https://picsum.photos/seed/${row.trainer_id}/200/200`)
                                : (row.trainee?.avatar_url ?? `https://picsum.photos/seed/${row.trainee_id}/200/200`);

  const unreadCount = isTrainee ? (row.trainee_unread ?? 0)
                                : (row.trainer_unread ?? 0);

  return {
    id:               row.id,
    participantIds:   [myId, isTrainee ? row.trainer_id : row.trainee_id] as [string, string],
    participantNames: [myName, otherName] as [string, string],
    participantAvatars: [myAvatar, otherAvatar] as [string, string],
    lastMessage: row.last_message ? {
      text:      row.last_message,
      timestamp: row.last_message_at ?? row.created_at,
      senderId:  '',       // not stored separately in the thread row
      isRead:    unreadCount === 0,
    } : undefined,
    unreadCount,
    updatedAt: row.last_message_at ?? row.updated_at ?? row.created_at,
  };
}

function mapMessageRow(row: any): Message {
  return {
    id:           row.id,
    threadId:     row.thread_id,
    senderId:     row.sender_id,
    senderName:   row.profiles?.full_name ?? 'User',
    senderAvatar: row.profiles?.avatar_url ?? `https://picsum.photos/seed/${row.sender_id}/200/200`,
    text:         row.text ?? '',
    mediaUrl:     row.media_url,
    mediaType:    row.media_type,
    timestamp:    row.created_at,
    isRead:       row.is_read ?? false,
    isAIInsight:  row.is_ai_insight ?? false,
  };
}

// ── Thread queries ────────────────────────────────────────────────────────────

/**
 * Fetch all chat threads for the current user with profile data joined.
 * Returns sorted by last_message_at DESC (most recent first).
 */
async function getThreads(): Promise<ChatThread[]> {
  const myId = useAuthStore.getState().user?.id;
  if (!myId) return [];

  const { data, error } = await supabase
    .from('chat_threads')
    .select(`
      *,
      trainee:profiles!chat_threads_trainee_id_fkey (
        full_name, avatar_url
      ),
      trainer:profiles!chat_threads_trainer_id_fkey (
        full_name, avatar_url
      )
    `)
    .or(`trainee_id.eq.${myId},trainer_id.eq.${myId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.warn('[chatService.getThreads] Normal threads error:', error.message);
  }

  const normalThreads = (!error && data ? data : []).map((row: any) => mapThreadRow(row, myId));

  // Fetch AI chat sessions to show them in the message list
  const { data: aiData, error: aiError } = await supabase
    .from('ai_chat_sessions')
    .select(`
      *,
      trainer:trainers ( id, name, avatar_url )
    `)
    .eq('user_id', myId)
    .order('created_at', { ascending: false });

  const aiThreads: ChatThread[] = [];
  if (!aiError && aiData) {
    for (const aiRow of aiData) {
      const myProfile = useAuthStore.getState().user;
      const trainerName = aiRow.trainer?.name || 'AI Trainer';
      const trainerAvatar = aiRow.trainer?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(trainerName)}&background=4F46E5&color=fff&size=200`;

      // Fetch the latest message for this AI session
      let lastMsgText = 'Tap to continue your AI chat session';
      let lastMsgAt = aiRow.created_at;
      try {
        const { data: msgs } = await supabase
          .from('ai_chat_messages')
          .select('content, created_at, role')
          .eq('session_id', aiRow.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (msgs && msgs.length > 0) {
          lastMsgText = msgs[0].content?.substring(0, 80) || lastMsgText;
          lastMsgAt = msgs[0].created_at;
        }
      } catch (_) {}

      aiThreads.push({
        id: `ai_${aiRow.id}`,
        isAiSession: true,
        trainerId: aiRow.trainer_id,
        participantIds: [myId, aiRow.trainer_id ?? 'ai'],
        participantNames: [myProfile?.name || 'You', `${trainerName} (AI)`],
        participantAvatars: [myProfile?.avatar || '', trainerAvatar],
        unreadCount: 0,
        updatedAt: lastMsgAt,
        lastMessage: {
          text: lastMsgText,
          timestamp: lastMsgAt,
          senderId: aiRow.trainer_id ?? 'ai',
          isRead: true,
        },
      });
    }
  } else if (aiError) {
    console.warn('[chatService.getThreads] AI sessions error:', aiError.message);
  }

  const allThreads = [...normalThreads, ...aiThreads].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return allThreads;
}

/**
 * Create or fetch an existing thread between the current user and a participant.
 * Uses upsert on the UNIQUE(trainee_id, trainer_id) constraint.
 */
async function createOrGetThread(
  traineeId: string,
  trainerId: string,
): Promise<ChatThread | null> {
  const myId = useAuthStore.getState().user?.id;
  if (!myId) return null;

  const { data, error } = await supabase
    .from('chat_threads')
    .upsert(
      { trainee_id: traineeId, trainer_id: trainerId },
      { onConflict: 'trainee_id,trainer_id', ignoreDuplicates: false },
    )
    .select(`
      *,
      trainee:profiles!chat_threads_trainee_id_fkey (full_name, avatar_url),
      trainer:profiles!chat_threads_trainer_id_fkey (full_name, avatar_url)
    `)
    .single();

  if (error) {
    console.warn('[chatService.createOrGetThread]', error.message);
    return null;
  }

  return mapThreadRow(data, myId);
}

// ── Message queries ───────────────────────────────────────────────────────────

/**
 * Load message history for a thread (oldest → newest).
 * Paginated: pass cursor (ISO timestamp) to load older pages.
 */
async function getMessages(
  threadId: string,
  limit = 50,
  before?: string,          // ISO timestamp — load messages older than this
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select(`
      *,
      profiles (
        full_name, avatar_url
      )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[chatService.getMessages]', error.message);
    return [];
  }

  return (data ?? []).map(mapMessageRow);
}

/**
 * Insert a new message into a thread.
 * The DB trigger (handle_new_message) automatically updates chat_threads
 * last_message + unread counter.
 *
 * Returns the server-created message (with id and created_at).
 */
async function sendMessage(
  threadId: string,
  text?: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video',
): Promise<Message> {
  const myId = useAuthStore.getState().user?.id;
  if (!myId) throw new Error('Not authenticated');
  if (!text && !mediaUrl) throw new Error('Message must have text or media');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id:  threadId,
      sender_id:  myId,
      text:       text ?? null,
      media_url:  mediaUrl ?? null,
      media_type: mediaType ?? null,
    })
    .select(`
      *,
      profiles (
        full_name, avatar_url
      )
    `)
    .single();

  if (error) throw new Error(`Failed to send message: ${error.message}`);
  return mapMessageRow(data);
}

// ── Realtime subscription ─────────────────────────────────────────────────────

/**
 * Subscribe to new messages on a thread via Supabase Realtime.
 *
 * Uses postgres_changes with a filter so only events for this specific
 * thread_id are delivered to this subscription.
 *
 * @param threadId   - The thread to watch
 * @param onMessage  - Callback invoked with the mapped Message on each INSERT
 * @returns          The RealtimeChannel — pass to unsubscribeFromThread on unmount
 */
function subscribeToThread(
  threadId: string,
  onMessage: (msg: Message) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`thread-${threadId}`)
    .on(
      'postgres_changes' as any,
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `thread_id=eq.${threadId}`,
      },
      async (payload: any) => {
        // payload.new is the raw DB row — fetch sender profile separately
        // to get senderName / senderAvatar for the bubble
        const row = payload.new;

        // Enrich with profile data (one small extra query per incoming message)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', row.sender_id)
          .single();

        onMessage(mapMessageRow({ ...row, profiles: profile }));
      },
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to chat_threads table changes for real-time unread badge updates.
 * Used by ChatListScreen to refresh the thread list when new messages arrive.
 *
 * @param myId          - Current user ID (filter to relevant threads)
 * @param onThreadChange - Called with the updated thread id
 * @returns RealtimeChannel
 */
function subscribeToThreadList(
  onThreadChange: (threadId: string) => void,
): RealtimeChannel {
  const myId = useAuthStore.getState().user?.id ?? '';

  const channel = supabase
    .channel('chat-thread-list')
    .on(
      'postgres_changes' as any,
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'chat_threads',
      },
      (payload: any) => {
        const row = payload.new;
        // Only trigger if the current user is a participant
        if (row.trainee_id === myId || row.trainer_id === myId) {
          onThreadChange(row.id);
        }
      },
    )
    .subscribe();

  return channel;
}

/** Unsubscribe from a Realtime channel. Call on screen unmount. */
async function unsubscribeFromThread(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}

// ── Unread management ─────────────────────────────────────────────────────────

/**
 * Zero out the unread counter for the current user's role in a thread,
 * and mark all unread messages as read.
 * Calls the mark_thread_read() RPC defined in schema.sql.
 */
async function markThreadRead(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read' as any, {
    p_thread_id: threadId,
  });

  if (error) {
    console.warn('[chatService.markThreadRead]', error.message);
  }
}

// ── Exported service ──────────────────────────────────────────────────────────

export const chatService = {
  // Thread management
  getThreads,
  createOrGetThread,
  // Messages
  getMessages,
  sendMessage,
  // Realtime
  subscribeToThread,
  subscribeToThreadList,
  unsubscribeFromThread,
  // Unread
  markThreadRead,
};

export default chatService;

// Re-export types for screen imports
export interface SendMessagePayload {
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}
