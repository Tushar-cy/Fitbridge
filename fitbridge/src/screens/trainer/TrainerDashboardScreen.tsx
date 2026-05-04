import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, Image, ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { SectionHeader, PulseDot } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { supabaseService, BookingRecord } from '../../services/api/supabaseService';


const QUICK_ACTIONS = [
  { icon: '➕', label: 'Add Slot', color: COLORS.PRIMARY },
  { icon: '📸', label: 'Create Post', color: COLORS.SECONDARY },
  { icon: '💰', label: 'Earnings', color: COLORS.ACCENT_GREEN },
  { icon: '👥', label: 'Trainees', color: COLORS.WARNING },
];

export const TrainerDashboardScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const { user } = useAuth();

  const [bookings, setBookings]   = useState<BookingRecord[]>([]);
  const [loading, setLoading]     = useState(true);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await supabaseService.getMyBookings(user.id, 'trainer');
      setBookings(data);
    } catch (err) {
      console.warn('[TrainerDashboardScreen] loadBookings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Fallback to empty array if no real data yet
  const todaySessions: any[] = bookings.length > 0
    ? bookings.slice(0, 3).map(b => ({
        ...b,
        time: b.sessionDate.split('T')[1]?.slice(0, 5) || '10:00',
        duration: 60,
      }))
    : [];

  // ── Dynamic stats from real DB bookings ──────────────────────────────
  const validBookings = bookings.filter((b) => b.paymentStatus === 'paid' || b.status === 'confirmed');
  const totalEarnings = validBookings.reduce((sum, b) => sum + b.amount, 0);

  // This month
  const now = new Date();
  const thisMonthBookings = validBookings.filter((b) => {
    const d = new Date(b.sessionDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthEarnings = thisMonthBookings.reduce((sum, b) => sum + b.amount, 0);
  const monthClients = new Set(thisMonthBookings.map((b) => b.traineeId)).size;
  const totalClients = new Set(validBookings.map((b) => b.traineeId)).size;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Trainer Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good morning 🏅</Text>
            <Text style={s.name}>{user?.name ?? 'Trainer'}</Text>
          </View>
          <Image source={{ uri: user?.avatar ?? 'https://picsum.photos/seed/trainer1/80/80' }} style={s.avatar as ImageStyle} />
        </View>

        {/* Earnings Hero Card */}
        <View style={s.section}>
          <LinearGradient
            colors={COLORS.GRADIENT_VIOLET}
            style={s.earningCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Background decoration */}
            <View style={s.cardCircle1} />
            <View style={s.cardCircle2} />

            <View style={s.earningTop}>
              <View>
                <Text style={s.earningLabel}>Total Earnings</Text>
                <Text style={s.earningTotal}>₹{totalEarnings.toLocaleString()}</Text>
              </View>
              <View style={s.earningRight}>
                <Text style={s.monthLabel}>This Month</Text>
                <Text style={s.monthAmount}>₹{monthEarnings.toLocaleString()}</Text>
                {monthEarnings > 0 && (
                  <View style={s.growthChip}>
                    <Text style={s.growthText}>Active</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.earningBottom}>
              {[
                { label: 'Sessions', value: validBookings.length.toString() },
                { label: 'Clients', value: totalClients.toString() },
                { label: 'Avg Rating', value: '4.9 ★' },
              ].map((stat) => (
                <View key={stat.label} style={s.earningStatItem}>
                  <Text style={s.earningStatVal}>{stat.value}</Text>
                  <Text style={s.earningStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Pending requests */}
        <View style={[s.section, s.row]}>
          <TouchableOpacity style={s.pendingCard} onPress={() => navigation.navigate('Trainees')}>
            <Text style={s.pendingNum}>{bookings.filter(b => b.status === 'pending').length}</Text>
            <Text style={s.pendingLabel}>Pending Requests</Text>
            <Text style={s.pendingArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.reviewCard}>
            <Text style={s.reviewNum}>{totalClients}</Text>
            <Text style={s.reviewLabel}>Active Clients</Text>
            <Text style={s.reviewStars}>{'👥'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={s.section}>
          <SectionHeader title="Quick Actions" />
          <View style={s.qaRow}>
            {QUICK_ACTIONS.map((qa) => (
              <TouchableOpacity
                key={qa.label}
                style={s.qaBtn}
                onPress={() => {
                  if (qa.label === 'Create Post') navigation.navigate('CreatePost');
                  else if (qa.label === 'Earnings') navigation.navigate('Earnings');
                  else if (qa.label === 'Trainees') navigation.navigate('Trainees');
                }}
              >
                <LinearGradient
                  colors={[`${qa.color}22`, `${qa.color}10`]}
                  style={s.qaIconWrap}
                >
                  <Text style={s.qaIcon}>{qa.icon}</Text>
                </LinearGradient>
                <Text style={s.qaLabel}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's schedule timeline */}
        <View style={s.section}>
          <SectionHeader title="Today's Schedule" rightAction={{ label: 'Full Schedule →', onPress: () => navigation.navigate('Schedule') }} />
          {todaySessions.map((sess, i) => (
            <TouchableOpacity
              key={sess.id}
              style={s.timelineItem}
              onPress={() => navigation.navigate('Session', { sessionId: sess.id })}
            >
              <View style={s.timelineTime}>
                <Text style={s.timeText}>{sess.time}</Text>
                <View style={[s.timelineBar, i < todaySessions.length - 1 && s.timelineBarFull]} />
              </View>
              <View style={[s.scheduleCard, sess.status === 'live' && s.scheduleCardLive]}>
                {sess.status === 'live' && (
                  <View style={s.liveChip}>
                    <PulseDot color={COLORS.SUCCESS} size={6} />
                    <Text style={s.liveChipText}>LIVE</Text>
                  </View>
                )}
                <View style={s.scheduleRow}>
                  <Image source={{ uri: sess.traineeAvatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(sess.traineeName ?? 'User')}` }} style={s.traineePhoto as ImageStyle} />
                  <View style={s.scheduleInfo}>
                    <Text style={s.scheduleName}>{sess.traineeName ?? 'Client'}</Text>
                    <Text style={s.scheduleSpec}>{sess.sessionType ?? 'Personal Training'} · {sess.durationMinutes ?? 60} mins</Text>
                    <Text style={s.scheduleMode}>{sess.status}</Text>
                  </View>
                  <Text style={s.schedulePrice}>₹{(sess.amount ?? 0).toLocaleString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: SPACING.TAB_HEIGHT + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, paddingBottom: SPACING.MD } as ViewStyle,
  greeting: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  name: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -0.5 } as TextStyle,
  avatar: { width: 48, height: 48, borderRadius: 16, borderWidth: 2, borderColor: COLORS.PRIMARY } as ImageStyle,
  section: { paddingHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.XL } as ViewStyle,
  earningCard: { borderRadius: 22, padding: SPACING.XL, overflow: 'hidden', gap: SPACING.LG, position: 'relative' } as ViewStyle,
  cardCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40 } as ViewStyle,
  cardCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20 } as ViewStyle,
  earningTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' } as ViewStyle,
  earningLabel: { color: 'rgba(255,255,255,0.65)', fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  earningTotal: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.HERO, fontFamily: FONT_FAMILY.MONO, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  earningRight: { alignItems: 'flex-end', gap: 4 } as ViewStyle,
  monthLabel: { color: 'rgba(255,255,255,0.65)', fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  monthAmount: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.MONO, fontWeight: '900' } as TextStyle,
  growthChip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 } as ViewStyle,
  growthText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  earningBottom: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: SPACING.MD } as ViewStyle,
  earningStatItem: { flex: 1, alignItems: 'center', gap: 3 } as ViewStyle,
  earningStatVal: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.MONO, fontWeight: '900' } as TextStyle,
  earningStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  row: { flexDirection: 'row', gap: SPACING.SM } as ViewStyle,
  pendingCard: { flex: 1, backgroundColor: `${COLORS.SECONDARY}18`, borderRadius: 16, borderWidth: 1, borderColor: `${COLORS.SECONDARY}30`, padding: SPACING.MD, gap: 4 } as ViewStyle,
  pendingNum: { color: COLORS.SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.DISPLAY, fontFamily: FONT_FAMILY.MONO, fontWeight: '900' } as TextStyle,
  pendingLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  pendingArrow: { color: COLORS.SECONDARY, fontSize: 20, fontWeight: '700' } as TextStyle,
  reviewCard: { flex: 1, backgroundColor: `${COLORS.WARNING}18`, borderRadius: 16, borderWidth: 1, borderColor: `${COLORS.WARNING}30`, padding: SPACING.MD, gap: 4 } as ViewStyle,
  reviewNum: { color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.DISPLAY, fontFamily: FONT_FAMILY.MONO, fontWeight: '900' } as TextStyle,
  reviewLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  reviewStars: { color: COLORS.WARNING, fontSize: 13 } as TextStyle,
  qaRow: { flexDirection: 'row', gap: SPACING.SM } as ViewStyle,
  qaBtn: { flex: 1, alignItems: 'center', gap: 8 } as ViewStyle,
  qaIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  qaIcon: { fontSize: 26 } as TextStyle,
  qaLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY, fontWeight: '600', textAlign: 'center' } as TextStyle,
  timelineItem: { flexDirection: 'row', gap: SPACING.MD, marginBottom: SPACING.SM } as ViewStyle,
  timelineTime: { width: 52, alignItems: 'center', gap: 4 } as ViewStyle,
  timeText: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  timelineBar: { width: 2, flex: 1, backgroundColor: COLORS.SURFACE_3 } as ViewStyle,
  timelineBarFull: { minHeight: 40 } as ViewStyle,
  scheduleCard: { flex: 1, backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  scheduleCardLive: { borderColor: `${COLORS.SUCCESS}44`, backgroundColor: `${COLORS.SUCCESS}08` } as ViewStyle,
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  liveChipText: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', letterSpacing: 0.5 } as TextStyle,
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  traineePhoto: { width: 44, height: 44, borderRadius: 12 } as ImageStyle,
  scheduleInfo: { flex: 1, gap: 2 } as ViewStyle,
  scheduleName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
  scheduleSpec: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  scheduleMode: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  schedulePrice: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.MONO, fontWeight: '900' } as TextStyle,
});

export default TrainerDashboardScreen;
