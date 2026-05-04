import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useNotificationStore } from '../../store/notificationStore';
import { Notification, NotificationType } from '../../types/notification.types';

type Props = NativeStackScreenProps<any, 'Notifications'>;

// ── Icon + tint per notification type ─────────────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  booking_confirmed:  { icon: '✅', color: COLORS.SECONDARY },
  session_reminder:   { icon: '⏰', color: COLORS.WARNING },
  new_message:        { icon: '💬', color: COLORS.PRIMARY },
  content_moderated:  { icon: '⚠️', color: COLORS.ERROR },
  review_received:    { icon: '⭐', color: COLORS.WARNING },
  payout_processed:   { icon: '💰', color: COLORS.SECONDARY },
  campaign_approved:  { icon: '🚀', color: COLORS.PRIMARY },
  general:            { icon: '🔔', color: COLORS.TEXT_SECONDARY },
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// ── Notification row ───────────────────────────────────────────────────────────
const NotifRow: React.FC<{ notif: Notification; onPress: () => void }> = ({ notif, onPress }) => {
  const cfg = TYPE_CONFIG[notif.type];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[rowStyles.wrap, !notif.isRead && rowStyles.wrapUnread]}
    >
      {/* Type icon */}
      <View style={[rowStyles.iconWrap, { backgroundColor: `${cfg.color}18` }]}>
        <Text style={rowStyles.icon}>{cfg.icon}</Text>
        {!notif.isRead && <View style={[rowStyles.unreadDot, { backgroundColor: cfg.color }]} />}
      </View>

      {/* Text */}
      <View style={rowStyles.body}>
        <View style={rowStyles.titleRow}>
          <Text style={rowStyles.title} numberOfLines={1}>{notif.title}</Text>
          <Text style={rowStyles.time}>{formatTime(notif.createdAt)}</Text>
        </View>
        <Text style={rowStyles.bodyText} numberOfLines={2}>{notif.body}</Text>
      </View>
    </TouchableOpacity>
  );
};

const rowStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, gap: SPACING.MD } as ViewStyle,
  wrapUnread: { backgroundColor: `${COLORS.PRIMARY}07` } as ViewStyle,
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 } as ViewStyle,
  icon: { fontSize: 22 } as TextStyle,
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: COLORS.DARK_BG } as ViewStyle,
  body: { flex: 1, gap: 4 } as ViewStyle,
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.SM } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '600', flex: 1 } as TextStyle,
  time: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, flexShrink: 0 } as TextStyle,
  bodyText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY, lineHeight: 18 } as TextStyle,
});

// ── Screen ─────────────────────────────────────────────────────────────────────
export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotificationStore();

  const handlePress = (notif: Notification) => {
    markRead(notif.id);
    if (notif.actionRoute) {
      navigation.navigate(notif.actionRoute, notif.actionParams);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={s.action}>
            <Text style={s.actionText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={clearAll} style={s.action}>
            <Text style={[s.actionText, { color: COLORS.TEXT_MUTED }]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.divider} />

      {/* List */}
      {notifications.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🔔</Text>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyBody}>No notifications right now.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotifRow notif={item} onPress={() => handlePress(item)} />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.XL }}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, gap: SPACING.MD } as ViewStyle,
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,
  badge: { backgroundColor: COLORS.PRIMARY, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 } as ViewStyle,
  badgeText: { color: COLORS.WHITE, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  action: { paddingVertical: 6, paddingHorizontal: 4 } as ViewStyle,
  actionText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '600' } as TextStyle,
  divider: { height: 1, backgroundColor: COLORS.DIVIDER } as ViewStyle,
  separator: { height: 1, backgroundColor: COLORS.DIVIDER } as ViewStyle,
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 } as ViewStyle,
  emptyEmoji: { fontSize: 52 } as TextStyle,
  emptyTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,
  emptyBody: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY } as TextStyle,
});

export default NotificationsScreen;
