import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, Image, ImageStyle, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { chatService } from '../../services/api/chatService';
import { ChatThread } from '../../types/chat.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Props = NativeStackScreenProps<any, 'Chat'>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a human-readable relative timestamp matching WhatsApp/iMessage UX */
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// ─────────────────────────────────────────────────────────────────────────────
// ThreadRow
// ─────────────────────────────────────────────────────────────────────────────

interface ThreadRowProps {
  thread: ChatThread;
  myId: string;
  onPress: () => void;
}

const ThreadRow: React.FC<ThreadRowProps> = React.memo(({ thread, myId, onPress }) => {
  const otherIdx = thread.participantIds[0] === myId ? 1 : 0;
  const otherName   = thread.participantNames[otherIdx];
  const otherAvatar = thread.participantAvatars[otherIdx];
  const hasUnread   = thread.unreadCount > 0;
  const isOwn       = thread.lastMessage?.senderId === myId;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[rowS.wrap, hasUnread && rowS.wrapUnread]}
    >
      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <View style={rowS.avatarWrap}>
        <Image source={{ uri: otherAvatar }} style={rowS.avatar as ImageStyle} />
        {/* Green dot = has unread (not online status — backend needed for that) */}
        {hasUnread && <View style={rowS.unreadRing} />}
      </View>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <View style={rowS.content}>
        {/* Row 1: name + timestamp */}
        <View style={rowS.topRow}>
          <Text
            style={[rowS.name, !hasUnread && rowS.nameRead]}
            numberOfLines={1}
          >
            {otherName}
          </Text>
          <Text style={[rowS.time, hasUnread && rowS.timeUnread]}>
            {thread.lastMessage ? formatTime(thread.lastMessage.timestamp) : ''}
          </Text>
        </View>

        {/* Row 2: preview + badge */}
        <View style={rowS.bottomRow}>
          <Text
            style={[rowS.preview, hasUnread && rowS.previewUnread]}
            numberOfLines={1}
          >
            {isOwn ? 'You: ' : ''}
            {thread.lastMessage?.text ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={rowS.badge}>
              <Text style={rowS.badgeText}>
                {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const rowS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingVertical: 14,
    gap: SPACING.MD,
    backgroundColor: COLORS.DARK_BG,
  } as ViewStyle,
  // Very subtle highlight on unread rows (≈4% white tint)
  wrapUnread: { backgroundColor: 'rgba(79,70,229,0.06)' } as ViewStyle,

  // Avatar
  avatarWrap: { position: 'relative', flexShrink: 0 } as ViewStyle,
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: COLORS.CARD_BORDER,
  } as ImageStyle,
  unreadRing: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.SECONDARY,
    borderWidth: 2.5, borderColor: COLORS.DARK_BG,
  } as ViewStyle,

  // Content block
  content: { flex: 1, gap: 5 } as ViewStyle,
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.SM,
  } as ViewStyle,

  // Name: bold white when unread, muted gray when read
  name: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  nameRead: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  } as TextStyle,

  // Timestamp: primary-colored when unread
  time: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
    flexShrink: 0,
  } as TextStyle,
  timeUnread: { color: COLORS.PRIMARY } as TextStyle,

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  // Preview: brighter + semi-bold when unread
  preview: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY,
    flex: 1,
  } as TextStyle,
  previewUnread: {
    color: COLORS.TEXT_SECONDARY,
    fontFamily: FONT_FAMILY.BODY_SEMI,
  } as TextStyle,

  // Unread count badge
  badge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.SM,
  } as ViewStyle,
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 11,
    fontFamily: FONT_FAMILY.MONO,
    fontWeight: '800',
    lineHeight: 14,
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Separator (left-aligned to clear the avatar)
// ─────────────────────────────────────────────────────────────────────────────

const SEPARATOR_LEFT = SPACING.SCREEN_H_PAD + 56 + SPACING.MD; // avatar + gap

const Separator = () => (
  <View style={{ height: 1, backgroundColor: COLORS.DIVIDER, marginLeft: SEPARATOR_LEFT }} />
);

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onExplore: () => void }> = ({ onExplore }) => (
  <View style={emptyS.wrap}>
    {/* Illustration — concentric ring + emoji */}
    <View style={emptyS.illustration}>
      <View style={emptyS.ring3} />
      <View style={emptyS.ring2} />
      <View style={emptyS.ring1} />
      <Text style={emptyS.emoji}>💬</Text>
    </View>

    <Text style={emptyS.title}>No conversations yet</Text>
    <Text style={emptyS.body}>
      Book a session with a trainer and your chat thread will appear here automatically.
    </Text>

    <TouchableOpacity onPress={onExplore} activeOpacity={0.85} style={emptyS.btnWrap}>
      <LinearGradient
        colors={COLORS.GRADIENT_PRIMARY}
        style={emptyS.btn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={emptyS.btnText}>🔍  Explore Trainers</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const emptyS = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingHorizontal: 40,
  } as ViewStyle,
  // Concentric pulsing rings (static decorative)
  illustration: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  } as ViewStyle,
  ring3: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: `${COLORS.PRIMARY}08`,
  } as ViewStyle,
  ring2: {
    position: 'absolute', width: 88, height: 88, borderRadius: 44,
    backgroundColor: `${COLORS.PRIMARY}14`,
  } as ViewStyle,
  ring1: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${COLORS.PRIMARY}22`,
  } as ViewStyle,
  emoji: { fontSize: 36, zIndex: 1 } as TextStyle,

  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontFamily: FONT_FAMILY.HEADING,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  } as TextStyle,
  body: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  btnWrap: { borderRadius: 16, overflow: 'hidden', marginTop: 4 } as ViewStyle,
  btn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 } as ViewStyle,
  btnText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '700',
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { threads, unreadTotal, markThreadRead, setThreads } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const myId = user?.id ?? 'me';

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Load threads from Supabase ──────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    try {
      const fresh = await chatService.getThreads();
      // Merge into store — setThreads replaces the list
      (useChatStore.getState() as any).setThreads?.(fresh);
    } catch (err) {
      console.warn('[ChatListScreen] loadThreads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();

    // Subscribe to chat_threads changes (unread count updates)
    channelRef.current = chatService.subscribeToThreadList(
      (_threadId: string) => {
        // Re-fetch the full list when any thread changes
        // (lightweight — threads list is usually small)
        loadThreads();
      },
    );

    return () => {
      if (channelRef.current) {
        chatService.unsubscribeFromThread(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadThreads]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const handleThreadPress = useCallback(
    (thread: ChatThread) => {
      const otherIdx = thread.participantIds[0] === myId ? 1 : 0;
      markThreadRead(thread.id);

      if (thread.isAiSession && thread.trainerId) {
        navigation.navigate('AITrainerChat', {
          trainerId: thread.trainerId,
          trainerName: thread.participantNames[otherIdx].replace(' (AI)', ''),
          trainerAvatar: thread.participantAvatars[otherIdx],
          trainerSpeciality: 'Fitness',
        });
      } else {
        navigation.navigate('ChatThread', {
          threadId:        thread.id,
          participantName: thread.participantNames[otherIdx],
          participantAvatar: thread.participantAvatars[otherIdx],
        });
      }
    },
    [myId, markThreadRead, navigation],
  );

  const handleExplore = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>Messages</Text>
          {unreadTotal > 0 && (
            <View style={s.unreadChip}>
              <Text style={s.unreadChipText}>{unreadTotal} unread</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={s.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.8}
        >
          <Text style={s.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* ── Thin top divider ───────────────────────────────────────────────── */}
      <View style={s.topDivider} />

      {/* ── Thread list (FlashList) ────────────────────────────────────────── */}
      {threads.length === 0 ? (
        <EmptyState onExplore={handleExplore} />
      ) : (
        <FlashList
          data={threads}
          // @ts-ignore - types are mismatched
          estimatedItemSize={85 as any}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThreadRow
              thread={item}
              myId={myId}
              onPress={() => handleThreadPress(item)}
            />
          )}
          ItemSeparatorComponent={Separator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.TAB_HEIGHT + SPACING.XL }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.SM,
  } as ViewStyle,

  headerLeft: { gap: 4 } as ViewStyle,

  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontFamily: FONT_FAMILY.HEADING,   // Poppins_600SemiBold
    fontWeight: '700',
    letterSpacing: -0.8,
  } as TextStyle,

  unreadChip: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.PRIMARY}22`,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.PRIMARY}44`,
    paddingHorizontal: 10,
    paddingVertical: 3,
  } as ViewStyle,

  unreadChipText: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
    fontWeight: '600',
  } as TextStyle,

  notifBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,

  notifIcon: { fontSize: 20 } as TextStyle,

  topDivider: {
    height: 1,
    backgroundColor: COLORS.DIVIDER,
    marginTop: SPACING.XS,
  } as ViewStyle,
});

export default ChatListScreen;
