import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, TouchableOpacity,
  Dimensions, Animated, Image, ImageStyle, ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useAuth } from '../../hooks/useAuth';
import { SectionHeader, StatChip } from '../../components/ui/Badge';
import { TrainerCard } from '../../components/features/trainer/TrainerCard';
import { supabaseService, BookingRecord } from '../../services/api/supabaseService';
import { useScanStore } from '../../store/scanStore';
import { rankTrainers, MatchedTrainer, ScanProfile } from '../../services/api/trainerMatchingService';
import type { Trainer } from '../../types/user.types';
import type { Post } from '../../types/feed.types';
import type { ScanAnalysisResult } from '../../services/api/groqService';

const { width: W } = Dimensions.get('window');

// ── Daily exercises data (personalised by score) ──────────────────────────────
const EXERCISE_PLANS = {
  beginner: [
    { name: 'Bodyweight Squats',    sets: 3, reps: '12', rest: '60s', emoji: '🦵' },
    { name: 'Push-ups (knee)',      sets: 3, reps: '10', rest: '60s', emoji: '💪' },
    { name: 'Dead Bug Hold',        sets: 3, reps: '30s', rest: '45s', emoji: '🧘' },
    { name: 'Glute Bridge',         sets: 3, reps: '15', rest: '45s', emoji: '🍑' },
  ],
  intermediate: [
    { name: 'Barbell Back Squat',   sets: 4, reps: '10', rest: '90s', emoji: '🏋️' },
    { name: 'Incline Push-ups',     sets: 4, reps: '12', rest: '60s', emoji: '💪' },
    { name: 'Romanian Deadlift',    sets: 3, reps: '10', rest: '90s', emoji: '🦵' },
    { name: 'Plank + Shoulder Tap', sets: 3, reps: '45s', rest: '45s', emoji: '🧘' },
  ],
  advanced: [
    { name: 'Weighted Pull-ups',    sets: 5, reps: '6',  rest: '120s', emoji: '🏆' },
    { name: 'Front Squat',          sets: 4, reps: '8',  rest: '120s', emoji: '🏋️' },
    { name: 'Single-leg RDL',       sets: 3, reps: '10', rest: '90s',  emoji: '⚡' },
    { name: 'L-Sit Hold',           sets: 4, reps: '20s', rest: '60s', emoji: '🧘' },
  ],
};

function getLevel(score: number | null) {
  if (!score || score < 50) return 'beginner';
  if (score < 75) return 'intermediate';
  return 'advanced';
}

// ── Ring progress chart ───────────────────────────────────────────────────────
const RingChart: React.FC<{ pct: number; size?: number; color?: string; label?: string; sublabel?: string }> = ({ pct, size = 100, color = '#6C47FF', label, sublabel }) => {
  const strokeWidth = size * 0.1;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  // Use a simple animated view to fake a ring chart without SVG
  const clamp = Math.min(100, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: 'rgba(255,255,255,0.06)' }} />
      {/* Progress ring using LinearGradient overlay with clip */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <LinearGradient
          colors={[color, `${color}88`]}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            // Clip to only show pct portion via a rotation trick
            transform: [{ rotate: `-${(1 - clamp / 100) * 360 * 0.5}deg` }],
          }}
        />
      </View>
      {/* Solid arc overlay hack: show filled donut up to pct */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        opacity: clamp / 100,
      }} />
      {/* Center text */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {label !== undefined && <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: size * 0.22, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' }}>{label}</Text>}
        {sublabel !== undefined && <Text style={{ color: COLORS.TEXT_MUTED, fontSize: size * 0.12, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM }}>{sublabel}</Text>}
      </View>
    </View>
  );
};

// ── Circular score gauge (mini) ───────────────────────────────────────────────
const MiniGauge: React.FC<{ score: number; size?: number }> = ({ score, size = 70 }) => (
  <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, backgroundColor: COLORS.DARK_BG, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: size * 0.28, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' }}>{score}</Text>
    </View>
  </LinearGradient>
);

// ── Latest scan results panel ─────────────────────────────────────────────────
const ScanResultPanel: React.FC<{ scan: ScanAnalysisResult; onViewFull: () => void }> = ({ scan, onViewFull }) => {
  const slide = useRef(new Animated.Value(30)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 100 }),
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const metrics = [
    { label: 'Body Fat',    value: `${scan.bodyFat?.toFixed(1)}%`,  color: COLORS.WARNING },
    { label: 'Muscle Mass', value: `${scan.muscleMass?.toFixed(1)}kg`, color: COLORS.PRIMARY },
    { label: 'BMI',         value: `${scan.bmi?.toFixed(1)}`,        color: COLORS.SECONDARY },
    { label: 'Posture',     value: `${scan.posture}/100`,            color: COLORS.ACCENT_GREEN ?? COLORS.SUCCESS },
  ];

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <LinearGradient
        colors={['#1A1040', '#0F0830']}
        style={srStyles.card}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={srStyles.header}>
          <View>
            <Text style={srStyles.label}>🤖 Latest AI Scan</Text>
            <Text style={srStyles.bodyType}>{scan.bodyType} · {scan.discipline}</Text>
          </View>
          <MiniGauge score={scan.score} />
        </View>

        <View style={srStyles.metricRow}>
          {metrics.map((m) => (
            <View key={m.label} style={srStyles.metric}>
              <Text style={[srStyles.metricVal, { color: m.color }]}>{m.value}</Text>
              <Text style={srStyles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        <View style={srStyles.summaryBox}>
          <Text style={srStyles.summaryText} numberOfLines={2}>{scan.aiSummary}</Text>
        </View>

        <TouchableOpacity onPress={onViewFull} style={srStyles.btn}>
          <Text style={srStyles.btnText}>View Full Results →</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const srStyles = StyleSheet.create({
  card:       { borderRadius: 24, padding: SPACING.LG, borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)', gap: SPACING.MD, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 } as ViewStyle,
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  label:      { color: COLORS.PRIMARY_LIGHT, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', letterSpacing: 1, marginBottom: 4 } as TextStyle,
  bodyType:   { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.HEADING, fontWeight: '800' } as TextStyle,
  metricRow:  { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  metric:     { alignItems: 'center', gap: 3 } as ViewStyle,
  metricVal:  { fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  metricLabel:{ color: COLORS.TEXT_MUTED, fontSize: 10, fontFamily: FONT_FAMILY.MONO, textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
  summaryBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: SPACING.MD } as ViewStyle,
  summaryText:{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY, lineHeight: 20 } as TextStyle,
  btn:        { backgroundColor: 'rgba(108,71,255,0.2)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(108,71,255,0.4)' } as ViewStyle,
  btnText:    { color: COLORS.PRIMARY_LIGHT, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
});

// ── Exercise card ─────────────────────────────────────────────────────────────
const ExerciseCard: React.FC<{ ex: typeof EXERCISE_PLANS.beginner[0]; index: number }> = ({ ex, index }) => {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, delay, useNativeDriver: true, damping: 18, stiffness: 120 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[exStyles.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <Text style={exStyles.emoji}>{ex.emoji}</Text>
      <View style={exStyles.info}>
        <Text style={exStyles.name}>{ex.name}</Text>
        <Text style={exStyles.meta}>{ex.sets} sets · {ex.reps} · Rest {ex.rest}</Text>
      </View>
    </Animated.View>
  );
};

const exStyles = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD, backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, marginBottom: SPACING.SM } as ViewStyle,
  emoji: { fontSize: 28 } as TextStyle,
  info:  { flex: 1, gap: 3 } as ViewStyle,
  name:  { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
  meta:  { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
});

// ── Mini feed post preview ─────────────────────────────────────────────────────
const MiniPost: React.FC<{ post: any; onPress: () => void }> = ({ post, onPress }) => (
  <TouchableOpacity onPress={onPress} style={miniPostStyles.card} activeOpacity={0.88}>
    <Image source={{ uri: post.mediaUrl }} style={miniPostStyles.img as ImageStyle} />
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={miniPostStyles.grad} />
    <Text style={miniPostStyles.likes}>❤️ {post.likes}</Text>
  </TouchableOpacity>
);
const miniPostStyles = StyleSheet.create({
  card:  { width: 130, height: 185, borderRadius: 18, overflow: 'hidden', marginRight: SPACING.MD, backgroundColor: COLORS.SURFACE_2, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' } as ViewStyle,
  img:   { width: '100%', height: '100%', position: 'absolute' } as ImageStyle,
  grad:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 } as ViewStyle,
  likes: { position: 'absolute', bottom: 10, left: 10, color: COLORS.WHITE, fontSize: 12, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
});

// ── Main screen ───────────────────────────────────────────────────────────────
export const DashboardScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const { user } = useAuth();

  // ── Scan store (shared with AIScanScreen) ─────────────────────────────────
  const latestScan   = useScanStore((s) => s.latestScan);
  const lastScanAt   = useScanStore((s) => s.lastScanAt);
  const sessionScans = useScanStore((s) => s.sessionScans);

  // ── Remote data ───────────────────────────────────────────────────────────
  const [trainers,    setTrainers]    = useState<MatchedTrainer[]>([]);
  const [posts,       setPosts]       = useState<Post[]>([]);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [totalScans,  setTotalScans]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [completedDays, setCompletedDays] = useState<number[]>([]);

  // Load completed days from local storage
  const loadCompletedDays = async () => {
    try {
      const stored = await AsyncStorage.getItem(`completed_days_${user?.id || 'anon'}`);
      if (stored) {
        setCompletedDays(JSON.parse(stored));
      }
    } catch (e) {}
  };

  const toggleDayComplete = async (dayNum: number) => {
    const newCompleted = completedDays.includes(dayNum)
      ? completedDays.filter(d => d !== dayNum)
      : [...completedDays, dayNum];
    
    setCompletedDays(newCompleted);
    try {
      await AsyncStorage.setItem(`completed_days_${user?.id || 'anon'}`, JSON.stringify(newCompleted));
    } catch (e) {}
  };

  const loadData = useCallback(async () => {
    try {
      await loadCompletedDays();
      const [trainerData, postData, historyData] = await Promise.all([
        supabaseService.getTrainers({ isVerified: false }), // show all, not just verified
        supabaseService.getPosts(0, 5),
        user?.id ? supabaseService.getScanHistory(user.id) : Promise.resolve([]),
      ]);

      // Build scan profile for matching (use latest scan or in-session scan)
      const dbLatest = historyData[0];
      const scanProfile: ScanProfile = {
        bodyType:   latestScan?.bodyType  ?? dbLatest?.bodyShape,
        discipline: latestScan?.discipline ?? undefined,
        score:      latestScan?.score      ?? dbLatest?.overallScore,
        bodyFat:    latestScan?.bodyFat    ?? dbLatest?.bodyFatPercent,
        muscleMass: latestScan?.muscleMass ?? dbLatest?.muscleMassKg,
        bmi:        latestScan?.bmi        ?? dbLatest?.bmi,
      };

      const ranked = rankTrainers(trainerData, scanProfile);
      setTrainers(ranked);
      setPosts(postData);
      setScanHistory(historyData);
      setTotalScans(historyData.length + sessionScans);
    } catch (err) {
      console.warn('[DashboardScreen] loadData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, sessionScans, latestScan]);

  // Load on mount
  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh when screen comes into focus (e.g., returning from AIScan)
  useFocusEffect(
    useCallback(() => {
      if (!loading) { loadData(); }
    }, [loadData, loading])
  );

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // Determine exercise plan based on latest scan
  const dbLatestScan = scanHistory[0];
  const dynamicPlan = latestScan?.workoutPlan ?? dbLatestScan?.generatedPlan;
  
  // Use actual completed days count to show progress, or default to 1 if just starting
  const currentDay = Math.max(1, completedDays.length);
  const progressPct = Math.min(100, Math.max(1, (completedDays.length / 100) * 100));

  const activePlan = dynamicPlan ? dynamicPlan.days : [
    { day: 'Day 1', focus: 'AI Base Assessment', duration: 30, exercises: ['Scanning your metrics...'] }
  ];

  const topTrainers = trainers.slice(0, 5);
  const feedPosts   = posts;

  const hasScan = !!latestScan || scanHistory.length > 0;

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} />}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=4F46E5&color=fff&size=100` }}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: COLORS.DARK_BG }}
            />
            <View>
              <Text style={s.greeting}>{greeting} 👋</Text>
              <Text style={s.userName}>{user?.name ?? 'Athlete'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AIScan')} style={s.scanBadge}>
            <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.scanGrad}>
              <Text style={s.scanText}>🤖 AI Scan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Quick stats ─────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatChip
            icon="🔬"
            value={String(totalScans)}
            label="Total Scans"
            color={COLORS.PRIMARY}
          />
          <StatChip
            icon="💪"
            value={latestScan?.score != null ? String(latestScan.score) : scanHistory[0]?.overallScore != null ? String(scanHistory[0].overallScore) : '—'}
            label="Latest Score"
            color={COLORS.SECONDARY}
          />
          <StatChip
            icon="🎯"
            value={latestScan?.bodyType ?? scanHistory[0]?.bodyShape?.slice(0, 4) ?? '—'}
            label="Body Type"
            color={COLORS.ACCENT_GREEN ?? COLORS.SUCCESS}
          />
        </View>

        {/* ── Latest scan result (from scanStore — updates instantly) ─────── */}
        {latestScan && (
          <View style={s.section}>
            <SectionHeader
              title="Latest Scan Results ✨"
              rightAction={{ label: 'Scan again', onPress: () => navigation.navigate('AIScan') }}
              accentColor={COLORS.PRIMARY}
            />
            <ScanResultPanel
              scan={latestScan}
              onViewFull={() => navigation.navigate('AIScan')}
            />
          </View>
        )}

        {/* ── Scan history (from DB) ─────────────────────────────────────── */}
        {!latestScan && scanHistory.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Recent Scans"
              rightAction={{ label: 'New Scan', onPress: () => navigation.navigate('AIScan') }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {scanHistory.slice(0, 5).map((scan, i) => (
                <View key={scan.id ?? i} style={histStyles.card}>
                  <MiniGauge score={scan.overallScore ?? 70} size={56} />
                  <Text style={histStyles.date}>
                    {scan.scanDate ? new Date(scan.scanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                  </Text>
                  <Text style={histStyles.bmi}>BMI {scan.bmi?.toFixed(1) ?? '—'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 100-Day AI Fitness Plan ──────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader
            title={`AI 100-Day Plan 🗓️`}
            rightAction={{ label: `${completedDays.length}/100 days`, onPress: () => {} }}
            accentColor={COLORS.SECONDARY}
          />

          {/* Stats Row: Ring + Scan Trend */}
          <View style={{ flexDirection: 'row', gap: SPACING.MD, marginBottom: SPACING.LG, alignItems: 'center' }}>
            {/* Ring Progress */}
            <LinearGradient
              colors={['#1A1040', '#0F0830']}
              style={{ flex: 1, borderRadius: 20, padding: SPACING.LG, alignItems: 'center', gap: 8 }}
            >
              <RingChart
                pct={progressPct}
                size={110}
                color={COLORS.SECONDARY}
                label={`${completedDays.length}`}
                sublabel="days done"
              />
              <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: 12, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, textAlign: 'center' }}>of 100-Day Plan</Text>
              <View style={{ width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[COLORS.SECONDARY, '#B347FF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: `${Math.max(2, progressPct)}%`, height: '100%', borderRadius: 3 }}
                />
              </View>
            </LinearGradient>

            {/* Scan Score Trend bars */}
            <LinearGradient
              colors={['#1A1040', '#0F0830']}
              style={{ flex: 1, borderRadius: 20, padding: SPACING.LG, gap: 4 }}
            >
              <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: 11, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginBottom: 4 }}>Score History 📈</Text>
              {scanHistory.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ fontSize: 28 }}>🔬</Text>
                  <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 11, marginTop: 6, textAlign: 'center' }}>No scans yet</Text>
                </View>
              ) : (
                scanHistory.slice(0, 5).reverse().map((scan: any, i: number) => {
                  const score = scan.overallScore ?? scan.bmi ?? 50;
                  const maxScore = 100;
                  const pct = Math.min(100, (score / maxScore) * 100);
                  return (
                    <View key={i} style={{ gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 9, width: 28, fontFamily: FONT_FAMILY.MONO }}>
                          {scan.scanDate ? new Date(scan.scanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `#${i + 1}`}
                        </Text>
                        <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                          <LinearGradient
                            colors={pct >= 75 ? ['#22c55e', '#16a34a'] : pct >= 50 ? [COLORS.SECONDARY, '#B347FF'] : [COLORS.WARNING, '#F59E0B']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ width: `${pct}%`, height: '100%', borderRadius: 4 }}
                          />
                        </View>
                        <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 9, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', width: 22, textAlign: 'right' }}>{Math.round(score)}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </LinearGradient>
          </View>

          {/* Plan Days */}
          {activePlan.map((d: any, i: number) => {
            const dayNum = i + 1;
            const isCompleted = completedDays.includes(dayNum);
            return (
              <View key={i} style={[s.planDayCard, isCompleted && s.planDayCardDone]}>
                {/* Left: Number badge */}
                <LinearGradient
                  colors={isCompleted ? ['#22c55e', '#16a34a'] : COLORS.GRADIENT_PRIMARY}
                  style={s.planDayBadge}
                >
                  <Text style={s.planDayBadgeNum}>{dayNum}</Text>
                </LinearGradient>

                <View style={s.planDayLeft}>
                  <Text style={[s.planDayTitle, isCompleted && { color: '#22c55e' }]}>{d.day || `Day ${dayNum}`}</Text>
                  <Text style={s.planDayFocus} numberOfLines={1}>{d.focus}</Text>
                  <Text style={s.planDayMeta}>⏱ {d.duration}m  •  {d.exercises?.length || 0} exercises</Text>
                </View>

                <TouchableOpacity
                  style={[s.planDayBtn, isCompleted && s.planDayBtnDone]}
                  onPress={() => toggleDayComplete(dayNum)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.planDayBtnText, isCompleted && s.planDayBtnTextDone]}>
                    {isCompleted ? '✓' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* ── Top trainers ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader
            title="Top Trainers"
            rightAction={{ label: 'Explore all →', onPress: () => navigation.navigate('Explore') }}
            accentColor={COLORS.PRIMARY}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={{ width: W * 0.72, marginRight: SPACING.MD, height: 200,
                    backgroundColor: COLORS.SURFACE_2, borderRadius: 18, opacity: 0.5 }} />
                ))
              : topTrainers.map((trainer) => (
                  <View key={trainer.id} style={{ width: W * 0.72, marginRight: SPACING.MD }}>
                    <TrainerCard
                      trainer={trainer}
                      onPress={(t) => navigation.navigate('TrainerProfile', { trainerId: t.id })}
                      onBook={(t) => navigation.navigate('Booking', { trainerId: t.id })}
                    />
                  </View>
                ))}
          </ScrollView>
        </View>

        {/* ── FitFeed preview ──────────────────────────────────────────────── */}
        {feedPosts.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="FitFeed"
              rightAction={{ label: 'See all', onPress: () => navigation.navigate('FitFeed') }}
              accentColor={COLORS.ACCENT_PINK}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {feedPosts.map((post) => (
                <MiniPost key={post.id} post={{ ...post, mediaUrl: post.imageUrl ?? post.thumbnailUrl }}
                  onPress={() => navigation.navigate('FitFeed')} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── AI Scan CTA (if no scan done yet) ─────────────────────────── */}
        {!latestScan && scanHistory.length === 0 && (
          <View style={s.section}>
            <TouchableOpacity onPress={() => navigation.navigate('AIScan')} activeOpacity={0.9}>
              <LinearGradient
                colors={['#6C47FF', '#B347FF', '#FF4C8B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.aiCtaBanner}
              >
                <View>
                  <Text style={s.aiCtaTitle}>AI Body Scan ✨</Text>
                  <Text style={s.aiCtaSub}>Get your personalised fitness assessment</Text>
                </View>
                <Text style={s.aiCtaArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.TAB_HEIGHT + SPACING.XXL }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const histStyles = StyleSheet.create({
  card: { alignItems: 'center', gap: 6, backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, marginRight: SPACING.MD, minWidth: 90 } as ViewStyle,
  date: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  bmi:  { color: COLORS.TEXT_MUTED, fontSize: 11, fontFamily: FONT_FAMILY.MONO } as TextStyle,
});

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, paddingBottom: SPACING.MD } as ViewStyle,
  greeting:    { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '600' } as TextStyle,
  userName:    { color: COLORS.TEXT_PRIMARY, fontSize: 28, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 } as TextStyle,
  scanBadge:   { borderRadius: 20, overflow: 'hidden', shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 } as ViewStyle,
  scanGrad:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 } as ViewStyle,
  scanText:    { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.HEADING, fontWeight: '800', letterSpacing: 0.5 } as TextStyle,
  statsRow:    { flexDirection: 'row', gap: SPACING.SM, paddingHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.LG } as ViewStyle,
  section:     { paddingHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.XXL } as ViewStyle,
  levelBadgeRow:     { flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.MD } as ViewStyle,
  levelBadge:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER } as ViewStyle,
  levelBadgeActive:  { backgroundColor: `${COLORS.PRIMARY}25`, borderColor: COLORS.PRIMARY } as ViewStyle,
  levelBadgeText:    { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '700' } as TextStyle,
  levelBadgeTextActive: { color: COLORS.PRIMARY } as TextStyle,
  aiCtaBanner: { borderRadius: 24, paddingHorizontal: SPACING.XL, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#FF4C8B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 } as ViewStyle,
  aiCtaTitle:  { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', marginBottom: 4 } as TextStyle,
  aiCtaSub:    { color: 'rgba(255,255,255,0.85)', fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  aiCtaArrow:  { color: COLORS.WHITE, fontSize: 32, fontWeight: '300' } as TextStyle,

  // 100-Day Plan Styles
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD, marginBottom: SPACING.LG } as ViewStyle,
  planDayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.SURFACE_2, borderRadius: 16, padding: SPACING.MD, marginBottom: SPACING.SM, borderWidth: 1, borderColor: COLORS.CARD_BORDER, gap: SPACING.MD } as ViewStyle,
  planDayCardDone: { borderColor: '#22c55e33', backgroundColor: '#22c55e08' } as ViewStyle,
  planDayBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  planDayBadgeNum: { color: COLORS.WHITE, fontSize: 14, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  planDayLeft: { flex: 1, gap: 2 } as ViewStyle,
  planDayTitle: { color: COLORS.PRIMARY, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', textTransform: 'uppercase' } as TextStyle,
  planDayFocus: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
  planDayMeta: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  planDayBtn: { backgroundColor: `${COLORS.PRIMARY}22`, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.PRIMARY}44`, minWidth: 52, alignItems: 'center' } as ViewStyle,
  planDayBtnDone: { backgroundColor: '#22c55e18', borderColor: '#22c55e55' } as ViewStyle,
  planDayBtnText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '800' } as TextStyle,
  planDayBtnTextDone: { color: '#22c55e' } as TextStyle,
});

export default DashboardScreen;
