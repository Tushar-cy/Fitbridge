import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { SectionHeader } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

const { width: W } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const MONTHLY_EARNINGS = [18200, 21500, 19800, 24600, 22100, 26800, 24600];

// Bar chart
const EarningsBarChart: React.FC = () => {
  const maxVal = Math.max(...MONTHLY_EARNINGS);
  const chartH = 140;
  const barW = (W - 48) / 7 - 6;

  return (
    <View style={ecStyles.wrap}>
      {MONTHS.map((month, i) => {
        const barH = (MONTHLY_EARNINGS[i] / maxVal) * chartH;
        const isMax = MONTHLY_EARNINGS[i] === maxVal;
        const isCurrent = i === MONTHS.length - 1;
        return (
          <View key={month} style={ecStyles.col}>
            <Text style={[ecStyles.topLabel, isCurrent && ecStyles.topLabelActive]}>
              {isCurrent ? `₹${(MONTHLY_EARNINGS[i] / 1000).toFixed(0)}K` : ''}
            </Text>
            <View style={[ecStyles.barBg, { height: chartH }]}>
              <LinearGradient
                colors={isCurrent ? COLORS.GRADIENT_PRIMARY : isMax ? ['#3A2E6E', '#2A1E5E'] : [COLORS.SURFACE_3, COLORS.SURFACE_2]}
                style={[ecStyles.bar, { height: barH }]}
              />
            </View>
            <Text style={[ecStyles.monthLabel, isCurrent && ecStyles.activeMLabel]}>{month}</Text>
          </View>
        );
      })}
    </View>
  );
};

const ecStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' } as ViewStyle,
  col: { flex: 1, alignItems: 'center', gap: 5 } as ViewStyle,
  topLabel: { color: COLORS.TEXT_MUTED, fontSize: 8, height: 14, textAlign: 'center' } as TextStyle,
  topLabelActive: { color: COLORS.PRIMARY, fontWeight: '800' } as TextStyle,
  barBg: { width: '100%', borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' } as ViewStyle,
  bar: { width: '100%', borderRadius: 8 } as ViewStyle,
  monthLabel: { color: COLORS.TEXT_MUTED, fontSize: 8, fontWeight: '600' } as TextStyle,
  activeMLabel: { color: COLORS.PRIMARY } as TextStyle,
});

const SESSIONS_BREAKDOWN = [
  { date: 'Apr 11', trainee: 'Alex Johnson', type: 'Online', amount: 1800, status: 'Paid' },
  { date: 'Apr 10', trainee: 'Priya Nair', type: 'In-Person', amount: 2200, status: 'Paid' },
  { date: 'Apr 09', trainee: 'Rohit Sharma', type: 'Online', amount: 1800, status: 'Pending' },
  { date: 'Apr 08', trainee: 'Sanya Gupta', type: 'Online', amount: 1500, status: 'Paid' },
  { date: 'Apr 07', trainee: 'Karan Mehta', type: 'In-Person', amount: 2500, status: 'Paid' },
];

export const EarningsScreen: React.FC<NativeStackScreenProps<any>> = () => {
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setWithdrawing(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Title */}
        <View style={s.header}>
          <Text style={s.title}>Earnings</Text>
          <View style={s.monthBadge}>
            <Text style={s.monthText}>Apr 2024</Text>
          </View>
        </View>

        {/* Hero balance card */}
        <LinearGradient colors={COLORS.GRADIENT_VIOLET} style={s.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.cardCircle1} />
          <View style={s.cardCircle2} />
          <Text style={s.availableLabel}>Available to Withdraw</Text>
          <Text style={s.balanceAmount}>₹18,450</Text>
          <View style={s.balanceStats}>
            <View style={s.balanceStat}>
              <Text style={s.balanceStatVal}>₹1,84,500</Text>
              <Text style={s.balanceStatLabel}>Total Earnings</Text>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceStat}>
              <Text style={s.balanceStatVal}>₹6,050</Text>
              <Text style={s.balanceStatLabel}>Pending</Text>
            </View>
          </View>
          <Button
            title={withdrawing ? 'Processing...' : '🏦 Withdraw to Bank'}
            onPress={handleWithdraw}
            loading={withdrawing}
            fullWidth
            size="md"
            variant="ghost"
            style={s.withdrawBtn}
          />
        </LinearGradient>

        {/* Monthly stat chips */}
        <View style={s.statsRow}>
          {[
            { icon: '📅', label: 'Sessions', value: '14', color: COLORS.PRIMARY },
            { icon: '💰', label: 'This Month', value: '₹24.6K', color: COLORS.SUCCESS },
            { icon: '📈', label: 'Growth', value: '+18%', color: COLORS.WARNING },
          ].map((stat) => (
            <View key={stat.label} style={[s.statChip, { borderColor: `${stat.color}30` }]}>
              <Text style={s.statChipIcon}>{stat.icon}</Text>
              <Text style={[s.statChipVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statChipLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Monthly chart */}
        <View style={s.section}>
          <SectionHeader title="Monthly Earnings" />
          <View style={s.chartCard}>
            <EarningsBarChart />
          </View>
        </View>

        {/* Session breakdown */}
        <View style={s.section}>
          <SectionHeader title="Session Breakdown" />
          {SESSIONS_BREAKDOWN.map((sess, i) => (
            <View key={i} style={s.sessionRow}>
              <View style={s.sessLeft}>
                <Text style={s.sessDate}>{sess.date}</Text>
                <Text style={s.sessTrainee}>{sess.trainee}</Text>
                <Text style={s.sessType}>{sess.type}</Text>
              </View>
              <View style={s.sessRight}>
                <Text style={s.sessAmount}>₹{sess.amount.toLocaleString()}</Text>
                <View style={[s.sessStatusChip, { backgroundColor: sess.status === 'Paid' ? `${COLORS.SUCCESS}22` : `${COLORS.WARNING}22` }]}>
                  <Text style={[s.sessStatus, { color: sess.status === 'Paid' ? COLORS.SUCCESS : COLORS.WARNING }]}>
                    {sess.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Payout info */}
        <View style={s.payoutCard}>
          <Text style={s.payoutTitle}>💳 Payout Details</Text>
          <View style={s.payoutRow}>
            <Text style={s.payoutLabel}>Bank</Text>
            <Text style={s.payoutVal}>HDFC Bank •••• 4281</Text>
          </View>
          <View style={s.payoutRow}>
            <Text style={s.payoutLabel}>UPI ID</Text>
            <Text style={s.payoutVal}>arjun.mehta@upi</Text>
          </View>
          <TouchableOpacity style={s.updatePayoutBtn}>
            <Text style={s.updatePayoutText}>Update Payout Details</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.TAB_HEIGHT + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG } as ViewStyle,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.LG } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  monthBadge: { backgroundColor: COLORS.SURFACE_2, borderRadius: 20, borderWidth: 1, borderColor: COLORS.CARD_BORDER, paddingHorizontal: 12, paddingVertical: 5 } as ViewStyle,
  monthText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  balanceCard: { borderRadius: 24, padding: SPACING.XL, gap: SPACING.MD, overflow: 'hidden', position: 'relative', marginBottom: SPACING.LG } as ViewStyle,
  cardCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50 } as ViewStyle,
  cardCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20 } as ViewStyle,
  availableLabel: { color: 'rgba(255,255,255,0.65)', fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  balanceAmount: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.HERO, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  balanceStats: { flexDirection: 'row', gap: SPACING.LG } as ViewStyle,
  balanceStat: { gap: 2 } as ViewStyle,
  balanceStatVal: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '900' } as TextStyle,
  balanceStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' } as ViewStyle,
  withdrawBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' } as ViewStyle,
  statsRow: { flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.XL } as ViewStyle,
  statChip: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2, padding: SPACING.MD, alignItems: 'center', gap: 3 } as ViewStyle,
  statChipIcon: { fontSize: 20 } as TextStyle,
  statChipVal: { fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '900' } as TextStyle,
  statChipLabel: { color: COLORS.TEXT_MUTED, fontSize: 10 } as TextStyle,
  section: { marginBottom: SPACING.XL } as ViewStyle,
  chartCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.LG } as ViewStyle,
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.MD, backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, marginBottom: SPACING.SM } as ViewStyle,
  sessLeft: { gap: 3 } as ViewStyle,
  sessDate: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  sessTrainee: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  sessType: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  sessRight: { alignItems: 'flex-end', gap: 5 } as ViewStyle,
  sessAmount: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '900' } as TextStyle,
  sessStatusChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 } as ViewStyle,
  sessStatus: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  payoutCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  payoutTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800' } as TextStyle,
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  payoutLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  payoutVal: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  updatePayoutBtn: { paddingTop: SPACING.SM, borderTopWidth: 1, borderTopColor: COLORS.CARD_BORDER, alignItems: 'center' } as ViewStyle,
  updatePayoutText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
});

export default EarningsScreen;
