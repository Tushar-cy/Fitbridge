/**
 * ProgressScreen.tsx — Real data from Supabase body_scans table.
 * Falls back to empty state UI if no scans exist.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle,
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { SectionHeader } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { supabaseService, BodyScan } from '../../services/api/supabaseService';

const { width: W } = Dimensions.get('window');
const CHART_W = W - SPACING.SCREEN_H_PAD * 2 - 32; // card padding

// ── Mini line chart for any metric trend ─────────────────────────────────────
const TrendChart: React.FC<{ values: number[]; color: string; labels: string[] }> = ({
  values, color, labels,
}) => {
  const H = 80;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * CHART_W;
    const y = H - ((v - min) / range) * (H - 16) - 8;
    return { x, y, v };
  });
  const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={CHART_W} height={H + 20}>
      <Polyline points={pointsStr} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 6 : 3.5} fill={i === pts.length - 1 ? color : COLORS.SURFACE_3} stroke={color} strokeWidth={2} />
          <SvgText x={p.x} y={H + 14} fontSize={9} fill={COLORS.TEXT_MUTED} textAnchor="middle">{labels[i]}</SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
};

// ── Metric card ───────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  label: string; value: string; change?: string; up?: boolean; color: string;
}> = ({ label, value, change, up, color }) => (
  <View style={mc.card}>
    <Text style={mc.label}>{label}</Text>
    <Text style={[mc.value, { color }]}>{value}</Text>
    {change !== undefined && (
      <View style={[mc.chip, { backgroundColor: `${color}20` }]}>
        <Text style={[mc.chipText, { color }]}>{up ? '↑' : '↓'} {change}</Text>
      </View>
    )}
  </View>
);
const mc = StyleSheet.create({
  card:     { width: '47%', backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.LG, gap: 8 } as ViewStyle,
  label:    { color: COLORS.TEXT_MUTED, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
  value:    { fontSize: 26, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  chip:     { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 } as ViewStyle,
  chipText: { fontSize: 11, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800' } as TextStyle,
});

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyProgress: React.FC<{ onScan: () => void }> = ({ onScan }) => (
  <View style={{ alignItems: 'center', paddingTop: 60, gap: SPACING.LG, paddingHorizontal: SPACING.XL }}>
    <Text style={{ fontSize: 72 }}>📊</Text>
    <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 24, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', textAlign: 'center' }}>
      No Progress Data Yet
    </Text>
    <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, textAlign: 'center', lineHeight: 22 }}>
      Complete your first AI Body Scan to start tracking your fitness journey with real metrics.
    </Text>
    <TouchableOpacity onPress={onScan} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }}>
      <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={{ paddingVertical: 16, alignItems: 'center' }}>
        <Text style={{ color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING }}>
          🤖 Start AI Body Scan
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export const ProgressScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const [scans,      setScans]      = useState<BodyScan[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadScans = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const data = await supabaseService.getScanHistory(userId);
      setScans(data);
    } catch (err) {
      console.warn('[ProgressScreen]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadScans(); }, [loadScans]));

  const onRefresh = () => { setRefreshing(true); loadScans(); };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Derived data from real scans (newest first)
  const latest  = scans[0];
  const prev    = scans[1];

  const bmiValues    = scans.slice(0, 7).reverse().map((s) => s.bmi ?? 0).filter(Boolean);
  const fatValues    = scans.slice(0, 7).reverse().map((s) => s.bodyFatPercent ?? 0).filter(Boolean);
  const scoreValues  = scans.slice(0, 7).reverse().map((s) => s.overallScore ?? 0).filter(Boolean);
  const weightValues = scans.slice(0, 7).reverse().map((s) => s.weightKg ?? 0).filter(Boolean);

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const bmiLabels    = scans.slice(0, 7).reverse().map((s) => shortDate(s.scanDate));
  const chartLabels  = bmiLabels;

  const scoreDelta  = prev ? (latest?.overallScore ?? 0) - (prev.overallScore ?? 0) : null;
  const weightDelta = prev ? (latest?.weightKg ?? 0) - (prev.weightKg ?? 0) : null;
  const fatDelta    = prev ? (latest?.bodyFatPercent ?? 0) - (prev.bodyFatPercent ?? 0) : null;

  const fmt = (n?: number | null, dec = 1) => (n != null ? n.toFixed(dec) : '--');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ gap: 2 }}>
            <Text style={s.title}>Progress</Text>
            <Text style={{ color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO }}>
              {scans.length > 0 ? `${scans.length} scan${scans.length > 1 ? 's' : ''} recorded` : 'No data yet'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AIScan')}
            style={s.scanBtn}
            activeOpacity={0.85}
          >
            <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.scanBtnGrad}>
              <Text style={s.scanBtnText}>+ New Scan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {scans.length === 0 ? (
          <EmptyProgress onScan={() => navigation.navigate('AIScan')} />
        ) : (
          <>
            {/* Latest scan hero */}
            <LinearGradient colors={['#1A1040', '#0F0830']} style={s.heroCard}>
              <View style={s.heroTop}>
                <View>
                  <Text style={s.heroLabel}>Latest AI Scan</Text>
                  <Text style={s.heroDate}>{shortDate(latest.scanDate)}</Text>
                  {latest.bodyShape && (
                    <Text style={s.heroBodyType}>{latest.bodyShape} body type</Text>
                  )}
                </View>
                <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.scoreBadge}>
                  <View style={s.scoreBadgeInner}>
                    <Text style={s.scoreNum}>{fmt(latest.overallScore, 0)}</Text>
                    <Text style={s.scoreLabel}>score</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Score trend */}
              {scoreDelta !== null && (
                <View style={[s.trendChip, { backgroundColor: scoreDelta >= 0 ? `${COLORS.SUCCESS}22` : `${COLORS.ERROR}22` }]}>
                  <Text style={[s.trendChipText, { color: scoreDelta >= 0 ? COLORS.SUCCESS : COLORS.ERROR }]}>
                    {scoreDelta >= 0 ? '↑' : '↓'} {Math.abs(scoreDelta).toFixed(0)} pts since last scan
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Body metrics */}
            <View style={s.section}>
              <SectionHeader title="Body Metrics" accentColor={COLORS.ACCENT_GREEN} />
              <View style={s.grid}>
                <MetricCard
                  label="Weight" color={COLORS.PRIMARY}
                  value={`${fmt(latest.weightKg)} kg`}
                  change={weightDelta != null ? `${Math.abs(weightDelta).toFixed(1)} kg` : undefined}
                  up={(weightDelta ?? 0) > 0}
                />
                <MetricCard
                  label="BMI" color={COLORS.SECONDARY}
                  value={fmt(latest.bmi)}
                />
                <MetricCard
                  label="Body Fat" color={COLORS.WARNING}
                  value={`${fmt(latest.bodyFatPercent)}%`}
                  change={fatDelta != null ? `${Math.abs(fatDelta).toFixed(1)}%` : undefined}
                  up={(fatDelta ?? 0) > 0}
                />
                <MetricCard
                  label="Muscle Mass" color={COLORS.SUCCESS}
                  value={`${fmt(latest.muscleMassKg)} kg`}
                />
              </View>
            </View>

            {/* Score trend chart */}
            {scoreValues.length >= 2 && (
              <View style={s.section}>
                <SectionHeader title="Overall Score Trend" accentColor={COLORS.PRIMARY} />
                <View style={s.chartCard}>
                  <TrendChart values={scoreValues} color={COLORS.PRIMARY} labels={chartLabels.slice(-scoreValues.length)} />
                </View>
              </View>
            )}

            {/* Weight trend chart */}
            {weightValues.length >= 2 && (
              <View style={s.section}>
                <SectionHeader title="Weight Trend (kg)" accentColor={COLORS.SECONDARY} />
                <View style={s.chartCard}>
                  <TrendChart values={weightValues} color={COLORS.SECONDARY} labels={chartLabels.slice(-weightValues.length)} />
                </View>
              </View>
            )}

            {/* Body fat trend */}
            {fatValues.length >= 2 && (
              <View style={s.section}>
                <SectionHeader title="Body Fat % Trend" accentColor={COLORS.WARNING} />
                <View style={s.chartCard}>
                  <TrendChart values={fatValues} color={COLORS.WARNING} labels={chartLabels.slice(-fatValues.length)} />
                </View>
              </View>
            )}

            {/* AI Summary */}
            {latest.aiSummary && (
              <View style={s.section}>
                <SectionHeader title="AI Insight" accentColor={COLORS.INFO} />
                <View style={s.aiCard}>
                  <Text style={{ fontSize: 28 }}>🤖</Text>
                  <Text style={s.aiText}>{latest.aiSummary}</Text>
                </View>
              </View>
            )}

            {/* Scan history list */}
            <View style={s.section}>
              <SectionHeader title="Scan History" accentColor={COLORS.TEXT_MUTED} />
              {scans.map((scan, i) => (
                <View key={scan.id ?? i} style={s.historyRow}>
                  <View style={s.historyLeft}>
                    <Text style={s.historyDate}>{shortDate(scan.scanDate)}</Text>
                    <Text style={s.historySub}>
                      BMI {fmt(scan.bmi)} · Fat {fmt(scan.bodyFatPercent)}% · {scan.bodyShape ?? ''}
                    </Text>
                  </View>
                  <Text style={[s.historyScore, { color: (scan.overallScore ?? 0) >= 70 ? COLORS.SUCCESS : COLORS.WARNING }]}>
                    {fmt(scan.overallScore, 0)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: SPACING.TAB_HEIGHT + 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll:        { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG } as ViewStyle,
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.LG } as ViewStyle,
  title:         { color: COLORS.TEXT_PRIMARY, fontSize: 32, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  scanBtn:       { borderRadius: 12, overflow: 'hidden' } as ViewStyle,
  scanBtnGrad:   { paddingHorizontal: 16, paddingVertical: 10 } as ViewStyle,
  scanBtnText:   { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800' } as TextStyle,
  heroCard:      { borderRadius: 20, padding: SPACING.LG, marginBottom: SPACING.XL, borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)', gap: SPACING.MD } as ViewStyle,
  heroTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' } as ViewStyle,
  heroLabel:     { color: COLORS.TEXT_MUTED, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 } as TextStyle,
  heroDate:      { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', marginTop: 4 } as TextStyle,
  heroBodyType:  { color: COLORS.SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginTop: 2 } as TextStyle,
  scoreBadge:    { width: 68, height: 68, borderRadius: 34, padding: 3 } as ViewStyle,
  scoreBadgeInner: { flex: 1, borderRadius: 31, backgroundColor: COLORS.DARK_BG, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scoreNum:      { color: COLORS.PRIMARY, fontSize: 22, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  scoreLabel:    { color: COLORS.TEXT_MUTED, fontSize: 9, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  trendChip:     { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 } as ViewStyle,
  trendChipText: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  section:       { marginBottom: SPACING.XL } as ViewStyle,
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD } as ViewStyle,
  chartCard:     { backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.LG } as ViewStyle,
  aiCard:        { backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1.5, borderColor: `${COLORS.INFO}33`, padding: SPACING.LG, flexDirection: 'row', gap: SPACING.MD, alignItems: 'flex-start' } as ViewStyle,
  aiText:        { flex: 1, color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, lineHeight: 22 } as TextStyle,
  historyRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, marginBottom: SPACING.SM } as ViewStyle,
  historyLeft:   { gap: 3 } as ViewStyle,
  historyDate:   { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  historySub:    { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  historyScore:  { fontSize: 22, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
});

export default ProgressScreen;
