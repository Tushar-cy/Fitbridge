import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, Image, ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useChatStore } from '../../store/chatStore';
import { ChatThread } from '../../types/chat.types';

type Props = NativeStackScreenProps<any, 'Chat'>;

// ── Time formatter ─────────────────────────────────────────────────────────────
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// ── Thread row ─────────────────────────────────────────────────────────────────
const ThreadRow: React.FC<{ thread: ChatThread; myId: string; onPress: () => void }> = ({
  thread, myId, onPress,
}) => {
  const otherIdx = thread.participantIds[0] === myId ? 1 : 0;
  const otherName = thread.participantNames[otherIdx];
  const otherAvatar = thread.participantAvatars[otherIdx];
  const hasUnread = thread.unreadCount > 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={rowStyles.wrap}>
      {/* Avatar */}
      <View style={rowStyles.avatarWrap}>
        <Image source={{ uri: otherAvatar }} style={rowStyles.avatar as ImageStyle} />
        {hasUnread && <View style={rowStyles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={rowStyles.content}>
        <View style={rowStyles.topRow}>
          <Text style={rowStyles.name} numberOfLines={1}>{otherName}</Text>
          <Text style={[rowStyles.time, hasUnread && rowStyles.timeUnread]}>
            {thread.lastMessage ? formatTime(thread.lastMessage.timestamp) : ''}
          </Text>
        </View>
        <View style={rowStyles.bottomRow}>
          <Text
            style={[rowStyles.preview, hasUnread && rowStyles.previewUnread]}
            numberOfLines={1}
          >
            {thread.lastMessage?.senderId === myId ? 'You: ' : ''}
            {thread.lastMessage?.text ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={rowStyles.badge}>
              <Text style={rowStyles.badgeText}>{thread.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingVertical: SPACING.MD,
    gap: SPACING.MD,
  } as ViewStyle,
  avatarWrap: { position: 'relative' } as ViewStyle,
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: COLORS.CARD_BORDER } as ImageStyle,
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: COLORS.SECONDARY,
    borderWidth: 2, borderColor: COLORS.DARK_BG,
  } as ViewStyle,
  content: { flex: 1, gap: 4 } as ViewStyle,
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  name: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '600', flex: 1 } as TextStyle,
  time: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  timeUnread: { color: COLORS.PRIMARY } as TextStyle,
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  preview: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY, flex: 1 } as TextStyle,
  previewUnread: { color: COLORS.TEXT_SECONDARY, fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: SPACING.SM,
  } as ViewStyle,
  badgeText: { color: COLORS.WHITE, fontSize: 10, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
});

// ── Screen ─────────────────────────────────────────────────────────────────────
export const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { threads, unreadTotal } = useChatStore();
  // In real app, replace 'me' with useAuthStore().user?.id
  const MY_ID = 'me';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Messages</Text>
          {unreadTotal > 0 && (
            <Text style={s.unreadSub}>{unreadTotal} unread</Text>
          )}
        </View>
        <TouchableOpacity
          style={s.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={s.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Thread list */}
      {threads.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>💬</Text>
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptyBody}>
            Book a session with a trainer to start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThreadRow
              thread={item}
              myId={MY_ID}
              onPress={() => navigation.navigate('ChatThread', { threadId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.TAB_HEIGHT + SPACING.XL }}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.SM,
  } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -0.5 } as TextStyle,
  unreadSub: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginTop: 2 } as TextStyle,
  notifBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  notifIcon: { fontSize: 20 } as TextStyle,
  divider: { height: 1, backgroundColor: COLORS.DIVIDER, marginTop: SPACING.XS } as ViewStyle,
  separator: { height: 1, backgroundColor: COLORS.DIVIDER, marginLeft: 54 + SPACING.SCREEN_H_PAD + SPACING.MD } as ViewStyle,
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 } as ViewStyle,
  emptyEmoji: { fontSize: 56 } as TextStyle,
  emptyTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', textAlign: 'center' } as TextStyle,
  emptyBody: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 22 } as TextStyle,
});

export default ChatListScreen;
