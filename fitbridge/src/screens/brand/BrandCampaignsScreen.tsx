import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useBrandStore } from '../../store/brandStore';
import { Badge } from '../../components/ui/Badge';
import { Campaign } from '../../types/user.types';

type Props = NativeStackScreenProps<any, 'BrandCampaigns'>;

// ─────────────────────────────────────────────────────────────────────────────
// Types & config
// ─────────────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'active' | 'pending' | 'completed';

interface TabConfig {
  key: FilterTab;
  label: string;
  statuses: Campaign['status'][];
  emptyIcon: string;
  emptyText: string;
}

const TABS: TabConfig[] = [
  {
    key: 'all',
    label: 'All',
    statuses: ['active', 'pending_approval', 'completed', 'draft', 'paused', 'rejected'],
    emptyIcon: '📣',
    emptyText: "No campaigns yet. Launch your first one!",
  },
  {
    key: 'active',
    label: 'Active',
    statuses: ['active', 'paused'],
    emptyIcon: '🚀',
    emptyText: "No active campaigns right now.",
  },
  {
    key: 'pending',
    label: 'Pending',
    statuses: ['pending_approval', 'draft'],
    emptyIcon: '⏳',
    emptyText: "No campaigns pending review.",
  },
  {
    key: 'completed',
    label: 'Completed',
    statuses: ['completed', 'rejected'],
    emptyIcon: '✅',
    emptyText: "No completed campaigns yet.",
  },
];

// Status → Badge variant + display label
const STATUS_DISPLAY: Record<Campaign['status'], {
  variant: 'success' | 'warning' | 'ghost' | 'error' | 'primary';
  label: string;
}> = {
  active:           { variant: 'success',  label: '● Active' },
  pending_approval: { variant: 'warning',  label: '◌ Pending' },
  completed:        { variant: 'ghost',    label: '✓ Completed' },
  draft:            { variant: 'ghost',    label: '✎ Draft' },
  paused:           { variant: 'warning',  label: '⏸ Paused' },
  rejected:         { variant: 'error',    label: '✕ Rejected' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

const fmtINR = (n: number): string => {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

const fmtLarge = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtCTR = (ctr: number): string => `${(ctr * 100).toFixed(2)}%`;

const daysRemaining = (endDate: string): string => {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return 'Ended';
  if (diff === 0) return 'Ends today';
  return `${diff}d left`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Filter tab bar
// ─────────────────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: FilterTab;
  counts: Record<FilterTab, number>;
  onChange: (t: FilterTab) => void;
}

const FilterTabBar: React.FC<TabBarProps> = ({ active, counts, onChange }) => (
  <View style={tbS.wrap}>
    {TABS.map((tab) => {
      const isFocused = active === tab.key;
      const count = counts[tab.key];
      return (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.75}
          style={[tbS.tab, isFocused && tbS.tabActive]}
        >
          {isFocused && (
            <LinearGradient
              colors={[`${COLORS.PRIMARY}30`, `${COLORS.PRIMARY}10`]}
              style={tbS.tabGradient}
            />
          )}
          <Text style={[tbS.label, isFocused && tbS.labelActive]}>{tab.label}</Text>
          {count > 0 && (
            <View style={[tbS.badge, isFocused && tbS.badgeActive]}>
              <Text style={[tbS.badgeText, isFocused && tbS.badgeTextActive]}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const tbS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: TYPOGRAPHY.RADIUS.ROUND,
    gap: 5,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  } as ViewStyle,
  tabActive: {
    borderColor: `${COLORS.PRIMARY}44`,
  } as ViewStyle,
  tabGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  } as ViewStyle,
  label: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
    fontWeight: '600',
  } as TextStyle,
  labelActive: { color: COLORS.PRIMARY } as TextStyle,
  badge: {
    backgroundColor: COLORS.SURFACE_3,
    borderRadius: 8, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  } as ViewStyle,
  badgeActive: { backgroundColor: `${COLORS.PRIMARY}30` } as ViewStyle,
  badgeText: {
    color: COLORS.TEXT_MUTED, fontSize: 10,
    fontFamily: FONT_FAMILY.MONO, fontWeight: '700',
  } as TextStyle,
  badgeTextActive: { color: COLORS.PRIMARY } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Campaign card
// ─────────────────────────────────────────────────────────────────────────────

const CampaignCard: React.FC<{ campaign: Campaign; onPress: () => void }> = React.memo(
  ({ campaign, onPress }) => {
    const progress     = campaign.budget > 0 ? campaign.spentBudget / campaign.budget : 0;
    const statusCfg    = STATUS_DISPLAY[campaign.status];
    const barColor     = progress > 0.9 ? COLORS.ERROR : progress > 0.7 ? COLORS.WARNING : COLORS.PRIMARY;
    const isActive     = campaign.status === 'active';

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={cS.wrap}
      >
        {/* Left accent bar — color-coded by status */}
        <View style={[cS.accentBar, {
          backgroundColor:
            campaign.status === 'active'           ? COLORS.SECONDARY :
            campaign.status === 'pending_approval' ? COLORS.WARNING :
            campaign.status === 'rejected'         ? COLORS.ERROR :
                                                     COLORS.SURFACE_3,
        }]} />

        <View style={cS.inner}>

          {/* ── Row 1: title + badge ──────────────────────────────────────── */}
          <View style={cS.titleRow}>
            <Text style={cS.title} numberOfLines={1}>{campaign.title}</Text>
            <Badge label={statusCfg.label} variant={statusCfg.variant} />
          </View>

          {/* ── Row 2: brand name + deadline ─────────────────────────────── */}
          <View style={cS.subRow}>
            <Text style={cS.brandName}>{campaign.brandName}</Text>
            <Text style={[cS.deadline, isActive && { color: COLORS.SECONDARY }]}>
              {daysRemaining(campaign.endDate)}
            </Text>
          </View>

          {/* ── Row 3: description ───────────────────────────────────────── */}
          <Text style={cS.description} numberOfLines={2}>
            {campaign.description}
          </Text>

          {/* ── Row 4: budget progress ────────────────────────────────────── */}
          <View style={cS.budgetSection}>
            <View style={cS.budgetLabelRow}>
              <Text style={cS.budgetLabel}>Budget</Text>
              <Text style={cS.budgetPct}>{Math.round(progress * 100)}% used</Text>
            </View>
            <View style={cS.track}>
              <View style={[cS.fill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: barColor }]} />
            </View>
            <View style={cS.budgetNumbers}>
              <Text style={cS.spent}>{fmtINR(campaign.spentBudget)}</Text>
              <Text style={cS.budgetSep}>/</Text>
              <Text style={cS.total}>{fmtINR(campaign.budget)}</Text>
            </View>
          </View>

          {/* ── Row 5: metrics chips ─────────────────────────────────────── */}
          <View style={cS.metricsRow}>
            <MetricChip icon="👁️" value={fmtLarge(campaign.metrics.impressions)} label="Impressions" />
            <MetricChip icon="🖱️" value={fmtCTR(campaign.metrics.ctr)} label="CTR" mono />
            <MetricChip icon="👥" value={String(campaign.trainerCollaborators.length)} label="Trainers" />
          </View>

        </View>
      </TouchableOpacity>
    );
  }
);

// Mini metric chip within a card
const MetricChip: React.FC<{ icon: string; value: string; label: string; mono?: boolean }> = ({
  icon, value, label, mono,
}) => (
  <View style={mcS.wrap}>
    <Text style={mcS.icon}>{icon}</Text>
    <Text style={[mcS.value, mono && { fontFamily: FONT_FAMILY.MONO }]}>{value}</Text>
    <Text style={mcS.label}>{label}</Text>
  </View>
);

const mcS = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', gap: 2,
    backgroundColor: COLORS.SURFACE_2, borderRadius: 10,
    paddingVertical: SPACING.SM,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  icon: { fontSize: 14 } as TextStyle,
  value: {
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700',
  } as TextStyle,
  label: { color: COLORS.TEXT_MUTED, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
});

const cS = StyleSheet.create({
  wrap: {
    marginHorizontal: SPACING.SCREEN_H_PAD,
    marginVertical: SPACING.SM,
    backgroundColor: COLORS.SURFACE_1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    flexDirection: 'row',
    overflow: 'hidden',
  } as ViewStyle,
  // 3px accent bar on the left edge
  accentBar: {
    width: 3, flexShrink: 0,
  } as ViewStyle,
  inner: {
    flex: 1, padding: SPACING.MD, gap: SPACING.SM,
  } as ViewStyle,

  // Title row
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.SM } as ViewStyle,
  title: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', letterSpacing: -0.2,
  } as TextStyle,

  // Sub row
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  brandName: {
    color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY,
  } as TextStyle,
  deadline: {
    color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
  } as TextStyle,

  // Description
  description: {
    color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY, lineHeight: 19,
  } as TextStyle,

  // Budget
  budgetSection: { gap: 5 } as ViewStyle,
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  budgetLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  budgetPct: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  track: { height: 5, backgroundColor: COLORS.SURFACE_3, borderRadius: 3, overflow: 'hidden' } as ViewStyle,
  fill: { height: 5, borderRadius: 3 } as ViewStyle,
  budgetNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 3 } as ViewStyle,
  spent: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  budgetSep: { color: COLORS.TEXT_MUTED, fontFamily: FONT_FAMILY.MONO, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  total: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,

  // Metrics
  metricsRow: { flexDirection: 'row', gap: SPACING.SM } as ViewStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: string; text: string; onCTA: () => void }> = ({
  icon, text, onCTA,
}) => (
  <View style={emS.wrap}>
    <View style={emS.ring}>
      <Text style={emS.icon}>{icon}</Text>
    </View>
    <Text style={emS.text}>{text}</Text>
    <TouchableOpacity onPress={onCTA} activeOpacity={0.85} style={emS.btnWrap}>
      <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={emS.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={emS.btnText}>+ Create Campaign</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const emS = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 48 } as ViewStyle,
  ring: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: `${COLORS.PRIMARY}14`,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  icon: { fontSize: 40 } as TextStyle,
  text: {
    color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 22,
  } as TextStyle,
  btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 4 } as ViewStyle,
  btn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 } as ViewStyle,
  btnText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// FAB
// ─────────────────────────────────────────────────────────────────────────────

const FAB: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={fabS.wrap}>
    <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={fabS.btn}>
      <Text style={fabS.plus}>+</Text>
      <Text style={fabS.label}>New Campaign</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const fabS = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: SPACING.TAB_HEIGHT + SPACING.MD,
    right: SPACING.SCREEN_H_PAD,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  } as ViewStyle,
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
  } as ViewStyle,
  plus: { color: COLORS.WHITE, fontSize: 22, lineHeight: 24, fontWeight: '300' } as TextStyle,
  label: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export const BrandCampaignsScreen: React.FC<Props> = ({ navigation }) => {
  const { campaigns } = useBrandStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Count per tab
  const counts = useMemo<Record<FilterTab, number>>(() => {
    const result = {} as Record<FilterTab, number>;
    TABS.forEach((tab) => {
      result[tab.key] = campaigns.filter((c) => tab.statuses.includes(c.status)).length;
    });
    return result;
  }, [campaigns]);

  // Filtered list for active tab
  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab)!;
    return campaigns.filter((c) => tab.statuses.includes(c.status));
  }, [campaigns, activeTab]);

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 700));
    setRefreshing(false);
  }, []);

  const handleCardPress = useCallback((campaign: Campaign) => {
    navigation.navigate('CampaignDetail', { campaignId: campaign.id });
  }, [navigation]);

  const handleCreatePress = useCallback(() => {
    navigation.navigate('CreateCampaign');
  }, [navigation]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.title}>Campaigns</Text>
        <View style={s.headerRight}>
          <Text style={s.count}>{counts[activeTab]} results</Text>
        </View>
      </View>

      {/* ── Filter tab bar ─────────────────────────────────────────────────── */}
      <FilterTabBar active={activeTab} counts={counts} onChange={setActiveTab} />

      {/* ── List / empty state ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={currentTab.emptyIcon}
          text={currentTab.emptyText}
          onCTA={handleCreatePress}
        />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          // @ts-ignore
          estimatedItemSize={260 as any}
          renderItem={({ item }) => (
            <CampaignCard
              campaign={item}
              onPress={() => handleCardPress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
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

      {/* ── FAB ────────────────────────────────────────────────────────────── */}
      <FAB onPress={handleCreatePress} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.SM,
  } as ViewStyle,
  title: {
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -0.8,
  } as TextStyle,
  headerRight: { alignItems: 'flex-end' } as ViewStyle,
  count: {
    color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
  } as TextStyle,
  listContent: {
    paddingTop: SPACING.SM,
    paddingBottom: SPACING.TAB_HEIGHT + 80, // room for FAB
  } as ViewStyle,
});

export default BrandCampaignsScreen;
