import React, { useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ImageStyle, Image, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useBrandStore } from '../../store/brandStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Skeleton } from '../../components/ui/Skeleton';
import { SectionHeader, Badge } from '../../components/ui/Badge';
import { Campaign } from '../../types/user.types';

type Props = NativeStackScreenProps<any, 'BrandDashboard'>;

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

/** ₹1,23,456 → "₹1.23L" for lakhs; ₹99,999 → "₹99.9K" */
const formatINR = (n: number): string => {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

const formatLarge = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const statusBadge = (s: Campaign['status']): 'success' | 'warning' | 'ghost' | 'error' | 'primary' => {
  const map: Record<Campaign['status'], 'success' | 'warning' | 'ghost' | 'error' | 'primary'> = {
    active: 'success', pending_approval: 'warning',
    completed: 'ghost', draft: 'ghost', paused: 'warning', rejected: 'error',
  };
  return map[s] ?? 'primary';
};

const statusLabel = (s: Campaign['status']): string => ({
  active: 'Active', pending_approval: 'Pending', completed: 'Completed',
  draft: 'Draft', paused: 'Paused', rejected: 'Rejected',
}[s] ?? s);

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton layout
// ─────────────────────────────────────────────────────────────────────────────

const DashboardSkeleton = () => (
  <View style={{ gap: SPACING.LG, padding: SPACING.SCREEN_H_PAD }}>
    <View style={{ flexDirection: 'row', gap: SPACING.MD }}>
      <Skeleton width={60} height={60} borderRadius={16} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={13} />
      </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD }}>
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} width="47%" height={96} borderRadius={16} />)}
    </View>
    <Skeleton height={130} borderRadius={16} />
    <Skeleton height={130} borderRadius={16} />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Metric card
// ─────────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  trend?: number; // positive = up, negative = down, 0 = neutral
  mono?: boolean;
  accent: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, trend, mono, accent }) => (
  <View style={[mcS.card, { borderColor: `${accent}22` }]}>
    <LinearGradient colors={[`${accent}14`, 'transparent']} style={mcS.gradient} />
    <View style={mcS.iconRow}>
      <View style={[mcS.iconBubble, { backgroundColor: `${accent}18` }]}>
        <Text style={mcS.icon}>{icon}</Text>
      </View>
      {trend !== undefined && trend !== 0 && (
        <View style={[mcS.trendChip, { backgroundColor: trend > 0 ? `${COLORS.SECONDARY}18` : `${COLORS.ERROR}18` }]}>
          <Text style={[mcS.trendText, { color: trend > 0 ? COLORS.SECONDARY : COLORS.ERROR }]}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
    <Text style={[mcS.value, mono && { fontFamily: FONT_FAMILY.MONO, color: accent }]}>{value}</Text>
    <Text style={mcS.label}>{label}</Text>
  </View>
);

const mcS = StyleSheet.create({
  card: {
    width: '48%', backgroundColor: COLORS.SURFACE_1, borderRadius: 16,
    borderWidth: 1, padding: SPACING.MD, gap: 6, overflow: 'hidden',
  } as ViewStyle,
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 } as ViewStyle,
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' } as ViewStyle,
  iconBubble: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  icon: { fontSize: 18 } as TextStyle,
  trendChip: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 } as ViewStyle,
  trendText: { fontSize: 10, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  value: {
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -0.5,
  } as TextStyle,
  label: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Campaign card (horizontal scroll)
// ─────────────────────────────────────────────────────────────────────────────

const CampaignCard: React.FC<{ campaign: Campaign; onPress: () => void }> = ({ campaign, onPress }) => {
  const progress = campaign.budget > 0 ? campaign.spentBudget / campaign.budget : 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / 86_400_000));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={ccS.card}>
      <LinearGradient colors={COLORS.GRADIENT_CARD} style={ccS.gradient} />
      <View style={ccS.topRow}>
        <Text style={ccS.name} numberOfLines={2}>{campaign.title}</Text>
        <Badge label={statusLabel(campaign.status)} variant={statusBadge(campaign.status)} />
      </View>

      {/* Budget progress bar */}
      <View style={ccS.progressSection}>
        <View style={ccS.progressLabel}>
          <Text style={ccS.progressText}>Budget used</Text>
          <Text style={ccS.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={ccS.track}>
          <View style={[ccS.fill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: progress > 0.9 ? COLORS.ERROR : COLORS.PRIMARY }]} />
        </View>
        <View style={ccS.budgetRow}>
          <Text style={ccS.spent}>{formatINR(campaign.spentBudget)}</Text>
          <Text style={ccS.total}>/ {formatINR(campaign.budget)}</Text>
        </View>
      </View>

      <Text style={ccS.deadline}>
        {campaign.status === 'completed' ? '✅ Ended' : daysLeft > 0 ? `⏱ ${daysLeft}d left` : '⚠️ Ending today'}
      </Text>
    </TouchableOpacity>
  );
};

const ccS = StyleSheet.create({
  card: {
    width: 220, backgroundColor: COLORS.SURFACE_1, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD,
    gap: 10, marginRight: SPACING.MD, overflow: 'hidden',
  } as ViewStyle,
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle,
  topRow: { gap: 8 } as ViewStyle,
  name: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', lineHeight: 19 } as TextStyle,
  progressSection: { gap: 4 } as ViewStyle,
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  progressText: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  progressPct: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  track: { height: 5, backgroundColor: COLORS.SURFACE_3, borderRadius: 3, overflow: 'hidden' } as ViewStyle,
  fill: { height: 5, borderRadius: 3 } as ViewStyle,
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 } as ViewStyle,
  spent: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  total: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  deadline: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Quick action button
// ─────────────────────────────────────────────────────────────────────────────

const QuickAction: React.FC<{ icon: string; label: string; onPress: () => void; accent?: string }> = ({
  icon, label, onPress, accent = COLORS.PRIMARY,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={qaS.btn}>
    <LinearGradient colors={[`${accent}22`, `${accent}08`]} style={qaS.gradient} />
    <Text style={qaS.icon}>{icon}</Text>
    <Text style={qaS.label}>{label}</Text>
  </TouchableOpacity>
);

const qaS = StyleSheet.create({
  btn: {
    flex: 1, backgroundColor: COLORS.SURFACE_1, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    paddingVertical: SPACING.MD, alignItems: 'center', gap: 6, overflow: 'hidden',
  } as ViewStyle,
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle,
  icon: { fontSize: 22 } as TextStyle,
  label: { color: COLORS.TEXT_SECONDARY, fontSize: 11, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, textAlign: 'center' } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock recent activity
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY = [
  { id: '1', icon: '📈', text: 'Summer Shred reached 140K impressions', time: '2h ago', color: COLORS.PRIMARY },
  { id: '2', icon: '🤝', text: 'Arjun Mehta accepted collaboration request', time: '5h ago', color: COLORS.SECONDARY },
  { id: '3', icon: '💰', text: '₹12,500 payout processed to account', time: 'Yesterday', color: COLORS.SECONDARY },
  { id: '4', icon: '📣', text: 'Move in Style submitted for review', time: 'Yesterday', color: COLORS.WARNING },
  { id: '5', icon: '⭐', text: 'Campaign Run to the Top marked completed', time: '3 days ago', color: COLORS.TEXT_MUTED },
];

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export const BrandDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { campaigns, analytics, isLoading, setLoading } = useBrandStore();
  const user        = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [refreshing, setRefreshing] = React.useState(false);

  // Simulate initial load
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, [setLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'pending_approval');

  // ── Trend values (static for mock — backend will supply deltas) ─────────────
  const TRENDS = { impressions: 18, clicks: -4, conversions: 11, spend: 0 };

  if (isLoading) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <DashboardSkeleton />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} colors={[COLORS.PRIMARY]} />
        }
      >

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <LinearGradient colors={[`${COLORS.PRIMARY}20`, 'transparent']} style={s.headerGradient} />
          <View style={s.headerContent}>
            {/* Logo avatar */}
            <View style={s.logoWrap}>
              <Text style={s.logoInitial}>
                {(user?.name ?? 'B')[0].toUpperCase()}
              </Text>
            </View>
            <View style={s.headerText}>
              <Text style={s.companyName} numberOfLines={1}>
                {user?.name ?? 'Brand Partner'}
              </Text>
              <Text style={s.companyRole}>Brand Portal</Text>
            </View>
            {/* Notification bell */}
            <TouchableOpacity
              style={s.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Text style={s.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Analytics 2x2 grid ───────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Analytics" subtitle="All campaigns · All time" />
          <View style={s.metricGrid}>
            <MetricCard
              icon="👁️" label="Impressions"
              value={formatLarge(analytics?.totalImpressions ?? 0)}
              trend={TRENDS.impressions} accent={COLORS.PRIMARY}
            />
            <MetricCard
              icon="🖱️" label="Clicks"
              value={formatLarge(analytics?.totalClicks ?? 0)}
              trend={TRENDS.clicks} accent={COLORS.INFO}
            />
            <MetricCard
              icon="🎯" label="Conversions"
              value={formatLarge(analytics?.totalConversions ?? 0)}
              trend={TRENDS.conversions} accent={COLORS.SECONDARY}
            />
            <MetricCard
              icon="💰" label="Total Spend"
              value={formatINR(analytics?.totalSpend ?? 0)}
              mono accent={COLORS.WARNING}
            />
          </View>
        </View>

        {/* ── Active campaigns horizontal scroll ──────────────────────────── */}
        <View style={s.section}>
          <SectionHeader
            title="Campaigns"
            rightAction={{ label: 'View all →', onPress: () => navigation.navigate('BrandCampaigns') }}
          />
          {activeCampaigns.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>📣</Text>
              <Text style={s.emptyText}>No active campaigns. Launch one to start reaching trainees.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
              {activeCampaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onPress={() => navigation.navigate('CampaignDetail', { campaignId: c.id })}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Quick Actions" />
          <View style={s.quickRow}>
            <QuickAction icon="📣" label="New Campaign" onPress={() => navigation.navigate('CreateCampaign')} accent={COLORS.PRIMARY} />
            <QuickAction icon="🔍" label="Find Trainers" onPress={() => navigation.navigate('BrandTrainers')} accent={COLORS.SECONDARY} />
            <QuickAction icon="📊" label="Reports" onPress={() => navigation.navigate('BrandCampaigns')} accent={COLORS.WARNING} />
          </View>
        </View>

        {/* ── Recent activity ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Recent Activity" />
          <View style={s.activityFeed}>
            {ACTIVITY.map((a, idx) => (
              <React.Fragment key={a.id}>
                <View style={s.activityRow}>
                  <View style={[s.activityIcon, { backgroundColor: `${a.color}18` }]}>
                    <Text>{a.icon}</Text>
                  </View>
                  <View style={s.activityText}>
                    <Text style={s.activityBody}>{a.text}</Text>
                    <Text style={s.activityTime}>{a.time}</Text>
                  </View>
                </View>
                {idx < ACTIVITY.length - 1 && <View style={s.activityDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll: { paddingBottom: SPACING.TAB_HEIGHT + SPACING.XL } as ViewStyle,

  // Header
  header: { overflow: 'hidden', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.MD, paddingBottom: SPACING.LG } as ViewStyle,
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle,
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  logoWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: COLORS.PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: `${COLORS.PRIMARY}60`,
  } as ViewStyle,
  logoInitial: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,
  headerText: { flex: 1 } as ViewStyle,
  companyName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,
  companyRole: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginTop: 2 } as TextStyle,
  bellBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  } as ViewStyle,
  bellIcon: { fontSize: 20 } as TextStyle,
  bellBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.ERROR, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.DARK_BG,
  } as ViewStyle,
  bellBadgeText: { color: COLORS.WHITE, fontSize: 8, fontFamily: FONT_FAMILY.MONO, fontWeight: '900' } as TextStyle,

  // Sections
  section: { paddingHorizontal: SPACING.SCREEN_H_PAD, marginTop: SPACING.LG } as ViewStyle,
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD } as ViewStyle,
  hScroll: { marginLeft: -SPACING.SCREEN_H_PAD, paddingLeft: SPACING.SCREEN_H_PAD } as ViewStyle,
  quickRow: { flexDirection: 'row', gap: SPACING.MD } as ViewStyle,

  // Empty
  emptyCard: {
    backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    padding: SPACING.XL, alignItems: 'center', gap: 10,
  } as ViewStyle,
  emptyEmoji: { fontSize: 32 } as TextStyle,
  emptyText: { color: COLORS.TEXT_SECONDARY, fontFamily: FONT_FAMILY.BODY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, textAlign: 'center', lineHeight: 20 } as TextStyle,

  // Activity feed
  activityFeed: {
    backgroundColor: COLORS.SURFACE_1, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER, overflow: 'hidden',
  } as ViewStyle,
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.MD, padding: SPACING.MD } as ViewStyle,
  activityIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  activityText: { flex: 1, gap: 3 } as ViewStyle,
  activityBody: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY, lineHeight: 19 } as TextStyle,
  activityTime: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  activityDivider: { height: 1, backgroundColor: COLORS.DIVIDER, marginLeft: 38 + SPACING.MD + SPACING.MD } as ViewStyle,
});

export default BrandDashboardScreen;
