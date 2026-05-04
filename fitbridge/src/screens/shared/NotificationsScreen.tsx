import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useNotificationStore } from '../../store/notificationStore';
import { notificationService } from '../../services/api/notificationService';
import { useAuthStore } from '../../store/authStore';
import { Notification, NotificationType } from '../../types/notification.types';

type Props = NativeStackScreenProps<any, 'Notifications'>;

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  booking_confirmed: { icon: '📅', color: COLORS.SECONDARY },
  session_reminder:  { icon: '⏰', color: COLORS.WARNING },
  new_message:       { icon: '💬', color: COLORS.PRIMARY },
  content_moderated: { icon: '⚠️', color: COLORS.ERROR },
  review_received:   { icon: '⭐', color: COLORS.WARNING },
  payout_processed:  { icon: '💰', color: COLORS.SECONDARY },
  campaign_approved: { icon: '🚀', color: COLORS.PRIMARY },
  general:           { icon: '🔔', color: COLORS.TEXT_SECONDARY },
};

// ─────────────────────────────────────────────────────────────────────────────
// Time helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatRelative = (iso: string): string => {
  const diffMs  = Date.now() - new Date(iso).getTime();
  const mins    = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  if (hrs < 48)  return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/** Returns 'today' | 'yesterday' | 'earlier' for grouping */
const getBucket = (iso: string): 'today' | 'yesterday' | 'earlier' => {
  const diffMs   = Date.now() - new Date(iso).getTime();
  const diffDays = diffMs / 86_400_000;
  if (diffDays < 1)  return 'today';
  if (diffDays < 2)  return 'yesterday';
  return 'earlier';
};

const BUCKET_LABELS: Record<string, string> = {
  today:     'Today',
  yesterday: 'Yesterday',
  earlier:   'Earlier',
};

// ─────────────────────────────────────────────────────────────────────────────
// List item types (union for FlashList)
// ─────────────────────────────────────────────────────────────────────────────

type SectionHeader = { _type: 'header'; bucket: string };
type NotifItem     = { _type: 'notif'; data: Notification };
type ListItem      = SectionHeader | NotifItem;

/** Builds a flat list with section header objects injected */
const buildList = (notifications: Notification[]): ListItem[] => {
  const bucketOrder: Array<'today' | 'yesterday' | 'earlier'> = ['today', 'yesterday', 'earlier'];
  const groups: Record<string, Notification[]> = { today: [], yesterday: [], earlier: [] };

  notifications.forEach((n) => groups[getBucket(n.createdAt)].push(n));

  const result: ListItem[] = [];
  bucketOrder.forEach((bucket) => {
    if (groups[bucket].length === 0) return;
    result.push({ _type: 'header', bucket });
    groups[bucket].forEach((n) => result.push({ _type: 'notif', data: n }));
  });
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Section header row
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeaderRow: React.FC<{ bucket: string }> = ({ bucket }) => (
  <View style={shS.wrap}>
    <Text style={shS.label}>{BUCKET_LABELS[bucket] ?? bucket}</Text>
    <View style={shS.line} />
  </View>
);

const shS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.SM,
    gap: SPACING.MD,
  } as ViewStyle,
  label: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    flexShrink: 0,
  } as TextStyle,
  line: { flex: 1, height: 1, backgroundColor: COLORS.DIVIDER } as ViewStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification row
// ─────────────────────────────────────────────────────────────────────────────

interface NotifRowProps {
  notif: Notification;
  onPress: () => void;
}

const NotifRow: React.FC<NotifRowProps> = React.memo(({ notif, onPress }) => {
  const cfg = TYPE_CONFIG[notif.type];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[rowS.wrap, !notif.isRead && rowS.wrapUnread]}
    >
      {/* Left accent bar for unread */}
      {!notif.isRead && <View style={[rowS.accentBar, { backgroundColor: COLORS.PRIMARY }]} />}

      {/* Type icon bubble */}
      <View style={[rowS.iconBubble, { backgroundColor: `${cfg.color}18` }]}>
        <Text style={rowS.icon}>{cfg.icon}</Text>
        {!notif.isRead && (
          <View style={[rowS.unreadDot, { backgroundColor: cfg.color }]} />
        )}
      </View>

      {/* Content */}
      <View style={rowS.content}>
        <View style={rowS.topRow}>
          <Text
            style={[rowS.title, notif.isRead && rowS.titleRead]}
            numberOfLines={1}
          >
            {notif.title}
          </Text>
          <Text style={rowS.time}>{formatRelative(notif.createdAt)}</Text>
        </View>
        <Text style={rowS.body} numberOfLines={2}>{notif.body}</Text>

        {/* Action hint */}
        {notif.actionRoute && (
          <Text style={rowS.actionHint}>Tap to view →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const rowS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: SPACING.SCREEN_H_PAD,
    paddingLeft: SPACING.SCREEN_H_PAD,
    paddingVertical: SPACING.MD,
    gap: SPACING.MD,
    backgroundColor: COLORS.DARK_BG,
    position: 'relative',
  } as ViewStyle,

  // Subtle highlight background on unread
  wrapUnread: {
    backgroundColor: `${COLORS.PRIMARY}07`,
  } as ViewStyle,

  // 3px left accent bar — hallmark of unread state
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  } as ViewStyle,

  // Icon
  iconBubble: {
    width: 48, height: 48,
    borderRadius: TYPOGRAPHY.RADIUS.MD,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  } as ViewStyle,
  icon: { fontSize: 22 } as TextStyle,
  unreadDot: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: COLORS.DARK_BG,
  } as ViewStyle,

  // Text content
  content: { flex: 1, gap: 4 } as ViewStyle,
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.SM,
  } as ViewStyle,
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  titleRead: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  } as TextStyle,
  time: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
    flexShrink: 0,
  } as TextStyle,
  body: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY,
    lineHeight: 19,
  } as TextStyle,
  actionHint: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
    fontWeight: '600',
    marginTop: 2,
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState = () => (
  <View style={emS.wrap}>
    <Text style={emS.emoji}>🎉</Text>
    <Text style={emS.title}>You're all caught up!</Text>
    <Text style={emS.body}>No new notifications. Check back later.</Text>
  </View>
);

const emS = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 48,
  } as ViewStyle,
  emoji: { fontSize: 56 } as TextStyle,
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontFamily: FONT_FAMILY.HEADING,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  body: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, unreadCount, markRead, markAllRead, clearAll, setNotifications } =
    useNotificationStore();
  const userId = useAuthStore((s) => s.user?.id);

  // Build sectioned list (memoised — only rebuilds when notifications change)
  const listData = useMemo(() => buildList(notifications), [notifications]);

  const [refreshing, setRefreshing] = React.useState(false);

  // Initial load
  useEffect(() => {
    if (userId) {
      notificationService.fetchNotifications(userId).then(setNotifications);
    }
  }, [userId, setNotifications]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    const freshNotifs = await notificationService.fetchNotifications(userId);
    setNotifications(freshNotifs);
    setRefreshing(false);
  }, [userId, setNotifications]);

  const handlePress = useCallback(
    (notif: Notification) => {
      markRead(notif.id);
      notificationService.markAsRead(notif.id); // Sync to DB

      if (notif.actionRoute) {
        navigation.navigate(notif.actionRoute, notif.actionParams ?? {});
      }
    },
    [markRead, navigation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
    if (userId) notificationService.markAllAsRead(userId);
  }, [markAllRead, userId]);

  const handleClearAll = useCallback(() => {
    clearAll();
    if (userId) notificationService.clearAll(userId);
  }, [clearAll, userId]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item._type === 'header') {
        return <SectionHeaderRow bucket={item.bucket} />;
      }
      return (
        <NotifRow
          notif={item.data}
          onPress={() => handlePress(item.data)}
        />
      );
    },
    [handlePress],
  );

  // FlashList needs a stable type discriminator for heterogeneous items
  const getItemType = useCallback(
    (item: ListItem) => item._type,
    [],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        {/* Back */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>

        {/* Title + badge */}
        <View style={s.titleRow}>
          <Text style={s.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Mark all / Clear all */}
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={s.action} activeOpacity={0.7}>
            <Text style={s.actionText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleClearAll} style={s.action} activeOpacity={0.7}>
            <Text style={[s.actionText, s.actionMuted]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.divider} />

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {listData.length === 0 ? (
        <EmptyState />
      ) : (
        <FlashList
          data={listData}
          keyExtractor={(item, idx) =>
            item._type === 'header' ? `header_${item.bucket}` : item.data.id
          }
          renderItem={renderItem}
          getItemType={getItemType}
          // Section headers are short; notification rows are taller
          // @ts-ignore
          estimatedItemSize={72 as any}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.XXXL }}
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
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.MD,
    gap: SPACING.MD,
  } as ViewStyle,

  backBtn: {
    width: 38, height: 38,
    borderRadius: TYPOGRAPHY.RADIUS.MD,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  backArrow: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,

  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  } as ViewStyle,
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontFamily: FONT_FAMILY.HEADING,
    fontWeight: '700',
    letterSpacing: -0.4,
  } as TextStyle,

  badge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: TYPOGRAPHY.RADIUS.ROUND,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  } as ViewStyle,
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 11,
    fontFamily: FONT_FAMILY.MONO,
    fontWeight: '800',
  } as TextStyle,

  action: { paddingHorizontal: 4, paddingVertical: 6 } as ViewStyle,
  actionText: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '700',
  } as TextStyle,
  actionMuted: { color: COLORS.TEXT_MUTED } as TextStyle,

  divider: { height: 1, backgroundColor: COLORS.DIVIDER } as ViewStyle,
});

export default NotificationsScreen;
