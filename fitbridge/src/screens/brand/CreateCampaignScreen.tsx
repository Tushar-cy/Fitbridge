import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ViewStyle, TextStyle, KeyboardAvoidingView, Platform, Alert,
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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Campaign } from '../../types/user.types';

type Props = NativeStackScreenProps<any, 'CreateCampaign'>;

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const GOALS = ['Weight Loss', 'Muscle Gain', 'Flexibility', 'Endurance', 'General Fitness'];
const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Other'];
const STEP_TITLES = ['Basic Info', 'Target Audience', 'Budget', 'Review'];
const STEP_ICONS  = ['📋', '🎯', '💰', '✅'];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goals: string[];
  ageMin: string;
  ageMax: string;
  cities: string[];
  budget: string;
}

const INITIAL: FormData = {
  title: '', description: '',
  startDate: '', endDate: '',
  goals: [], ageMin: '18', ageMax: '40',
  cities: [], budget: '',
};

// ── Validators ────────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const validate = (step: number, f: FormData): string | null => {
  if (step === 1) {
    if (!f.title.trim())       return 'Campaign title is required.';
    if (f.title.length < 5)    return 'Title must be at least 5 characters.';
    if (!f.description.trim()) return 'Description is required.';
    if (!DATE_RE.test(f.startDate)) return 'Start date must be YYYY-MM-DD.';
    if (!DATE_RE.test(f.endDate))   return 'End date must be YYYY-MM-DD.';
    if (f.endDate <= f.startDate)   return 'End date must be after start date.';
  }
  if (step === 2) {
    if (f.goals.length === 0)  return 'Select at least one fitness goal.';
    if (f.cities.length === 0) return 'Select at least one city.';
    const min = Number(f.ageMin), max = Number(f.ageMax);
    if (isNaN(min) || min < 13 || min > 100) return 'Min age must be between 13–100.';
    if (isNaN(max) || max <= min)            return 'Max age must be greater than min age.';
  }
  if (step === 3) {
    const b = Number(f.budget);
    if (!f.budget || isNaN(b) || b < 5000) return 'Minimum budget is ₹5,000.';
  }
  return null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysBetween = (a: string, b: string) =>
  Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));

const fmtINR = (n: number) =>
  n >= 100_000 ? `₹${(n / 100_000).toFixed(2)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

const genId = () => `cmp_${Date.now()}`;

// ── Sub-components ────────────────────────────────────────────────────────────

/** Chip button used for multi-select */
const Chip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({
  label, selected, onPress,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.78} style={[ch.base, selected && ch.sel]}>
    {selected && <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={ch.gradient} />}
    <Text style={[ch.text, selected && ch.textSel]}>{label}</Text>
  </TouchableOpacity>
);
const ch = StyleSheet.create({
  base: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' } as ViewStyle,
  sel: { borderColor: `${COLORS.PRIMARY}60` } as ViewStyle,
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle,
  text: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  textSel: { color: COLORS.WHITE, fontWeight: '700' } as TextStyle,
});

/** Section label */
const Label: React.FC<{ text: string }> = ({ text }) => (
  <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', marginBottom: SPACING.SM, letterSpacing: 0.3 }}>{text}</Text>
);

/** Chip group toggle helper */
const toggle = (arr: string[], val: string) =>
  arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

// ── Progress bar ──────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ step: number }> = ({ step }) => (
  <View style={pb.wrap}>
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
      const done   = i < step - 1;
      const active = i === step - 1;
      return (
        <React.Fragment key={i}>
          <View style={[pb.dot, active && pb.dotActive, done && pb.dotDone]}>
            {done ? <Text style={pb.dotCheck}>✓</Text> : <Text style={[pb.dotNum, active && { color: COLORS.WHITE }]}>{i + 1}</Text>}
          </View>
          {i < TOTAL_STEPS - 1 && <View style={[pb.line, done && pb.lineDone]} />}
        </React.Fragment>
      );
    })}
  </View>
);
const pb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD } as ViewStyle,
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.SURFACE_2, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  dotActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY } as ViewStyle,
  dotDone: { backgroundColor: COLORS.SECONDARY, borderColor: COLORS.SECONDARY } as ViewStyle,
  dotNum: { color: COLORS.TEXT_MUTED, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  dotCheck: { color: COLORS.WHITE, fontSize: 12, fontWeight: '900' } as TextStyle,
  line: { flex: 1, height: 2, backgroundColor: COLORS.CARD_BORDER } as ViewStyle,
  lineDone: { backgroundColor: COLORS.SECONDARY } as ViewStyle,
});

// ── Review row ────────────────────────────────────────────────────────────────

const ReviewRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER, gap: SPACING.MD }}>
    <Text style={{ color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, flex: 1 }}>{label}</Text>
    <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: mono ? FONT_FAMILY.MONO : FONT_FAMILY.BODY_SEMI, fontWeight: '600', flex: 2, textAlign: 'right' }} numberOfLines={3}>{value}</Text>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

export const CreateCampaignScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { addCampaign } = useBrandStore();
  const user = useAuthStore((s) => s.user);

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors(null);
  }, []);

  const handleNext = () => {
    const err = validate(step, form);
    if (err) { setErrors(err); return; }
    setErrors(null);
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors(null);
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));

    const days = daysBetween(form.startDate, form.endDate);
    const budget = Number(form.budget);

    const newCampaign: Campaign = {
      id: genId(),
      brandId: user?.id ?? 'brand_user',
      brandName: user?.name ?? 'My Brand',
      title: form.title.trim(),
      description: form.description.trim(),
      targetAudience: {
        goals: form.goals.map((g) => g.toLowerCase().replace(' ', '_')) as any,
        ageRange: [Number(form.ageMin), Number(form.ageMax)],
        cities: form.cities,
      },
      budget,
      spentBudget: 0,
      startDate: form.startDate,
      endDate: form.endDate,
      status: 'pending_approval',
      trainerCollaborators: [],
      metrics: { impressions: 0, clicks: 0, conversions: 0, ctr: 0 },
    };

    addCampaign(newCampaign);
    setSubmitting(false);

    Alert.alert(
      '🎉 Campaign Submitted!',
      'Your campaign is now under review. We\'ll notify you within 24–48 hours.',
      [{ text: 'View Campaigns', onPress: () => navigation.replace('BrandCampaigns') }],
    );
  };

  const budget = Number(form.budget) || 0;
  const days   = form.startDate && form.endDate ? daysBetween(form.startDate, form.endDate) : 1;
  const perDay = budget > 0 ? fmtINR(Math.round(budget / days)) : '—';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.8}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerIcon}>{STEP_ICONS[step - 1]}</Text>
          <View>
            <Text style={s.headerStep}>Step {step} of {TOTAL_STEPS}</Text>
            <Text style={s.headerTitle}>{STEP_TITLES[step - 1]}</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Step progress ───────────────────────────────────────────────────── */}
      <ProgressBar step={step} />

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {errors && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>⚠️  {errors}</Text>
        </View>
      )}

      {/* ── Form content ────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ═══ STEP 1 — Basic Info ═══════════════════════════════════════ */}
          {step === 1 && (
            <View style={s.stepContent}>
              <Input
                label="Campaign Title *"
                placeholder="e.g. Summer Fitness Challenge 2026"
                value={form.title}
                onChangeText={(v) => set('title', v)}
                maxLength={80}
              />

              {/* Description with char counter */}
              <View>
                <Label text="Description *" />
                <View style={s.textAreaWrap}>
                  <TextInput
                    style={s.textArea}
                    placeholder="Describe your campaign goals, target audience, and expected outcomes…"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={form.description}
                    onChangeText={(v) => set('description', v)}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                  />
                  <Text style={s.charCounter}>{form.description.length}/300</Text>
                </View>
              </View>

              <Input
                label="Start Date * (YYYY-MM-DD)"
                placeholder="2026-06-01"
                value={form.startDate}
                onChangeText={(v) => set('startDate', v)}
                keyboardType="numeric"
                maxLength={10}
              />
              <Input
                label="End Date * (YYYY-MM-DD)"
                placeholder="2026-08-31"
                value={form.endDate}
                onChangeText={(v) => set('endDate', v)}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          )}

          {/* ═══ STEP 2 — Target Audience ══════════════════════════════════ */}
          {step === 2 && (
            <View style={s.stepContent}>
              <View>
                <Label text="Fitness Goals *" />
                <View style={s.chipGroup}>
                  {GOALS.map((g) => (
                    <Chip key={g} label={g} selected={form.goals.includes(g)} onPress={() => set('goals', toggle(form.goals, g))} />
                  ))}
                </View>
              </View>

              <View style={s.ageRow}>
                <View style={{ flex: 1 }}>
                  <Input label="Min Age" placeholder="18" value={form.ageMin} onChangeText={(v) => set('ageMin', v)} keyboardType="numeric" maxLength={3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Max Age" placeholder="40" value={form.ageMax} onChangeText={(v) => set('ageMax', v)} keyboardType="numeric" maxLength={3} />
                </View>
              </View>

              <View>
                <Label text="Target Cities *" />
                <View style={s.chipGroup}>
                  {CITIES.map((c) => (
                    <Chip key={c} label={c} selected={form.cities.includes(c)} onPress={() => set('cities', toggle(form.cities, c))} />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ═══ STEP 3 — Budget ═══════════════════════════════════════════ */}
          {step === 3 && (
            <View style={s.stepContent}>
              <Input
                label="Total Budget (₹ INR) *"
                placeholder="250000"
                value={form.budget}
                onChangeText={(v) => set('budget', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                hint="Minimum ₹5,000"
              />

              {budget > 0 && (
                <View style={s.budgetBreakdown}>
                  <LinearGradient colors={[`${COLORS.PRIMARY}18`, 'transparent']} style={s.budgetGradient} />
                  <Text style={s.budgetTitle}>Budget Breakdown</Text>
                  <View style={s.budgetRow}>
                    <Text style={s.budgetLabel}>Total</Text>
                    <Text style={s.budgetValue}>{fmtINR(budget)}</Text>
                  </View>
                  <View style={s.budgetRow}>
                    <Text style={s.budgetLabel}>Campaign Duration</Text>
                    <Text style={s.budgetValue}>{days} days</Text>
                  </View>
                  <View style={[s.budgetRow, { borderTopWidth: 1, borderTopColor: COLORS.CARD_BORDER, paddingTop: SPACING.SM, marginTop: SPACING.SM }]}>
                    <Text style={[s.budgetLabel, { color: COLORS.TEXT_SECONDARY }]}>Est. Daily Spend</Text>
                    <Text style={[s.budgetValue, { color: COLORS.SECONDARY }]}>{perDay}</Text>
                  </View>
                  <Text style={s.budgetNote}>
                    💡 FitBridge recommends ₹500–₹2,000/day for optimal trainer reach.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ═══ STEP 4 — Review ═══════════════════════════════════════════ */}
          {step === 4 && (
            <View style={s.stepContent}>
              <View style={s.reviewCard}>
                <LinearGradient colors={[`${COLORS.PRIMARY}12`, 'transparent']} style={s.budgetGradient} />
                <Text style={s.reviewSectionLabel}>📋  Basic Info</Text>
                <ReviewRow label="Title" value={form.title} />
                <ReviewRow label="Description" value={form.description} />
                <ReviewRow label="Duration" value={`${form.startDate} → ${form.endDate}  (${days}d)`} mono />
              </View>

              <View style={s.reviewCard}>
                <LinearGradient colors={[`${COLORS.SECONDARY}10`, 'transparent']} style={s.budgetGradient} />
                <Text style={s.reviewSectionLabel}>🎯  Audience</Text>
                <ReviewRow label="Goals" value={form.goals.join(', ')} />
                <ReviewRow label="Age Range" value={`${form.ageMin} – ${form.ageMax} years`} />
                <ReviewRow label="Cities" value={form.cities.join(', ')} />
              </View>

              <View style={s.reviewCard}>
                <LinearGradient colors={[`${COLORS.WARNING}10`, 'transparent']} style={s.budgetGradient} />
                <Text style={s.reviewSectionLabel}>💰  Budget</Text>
                <ReviewRow label="Total Budget" value={fmtINR(budget)} mono />
                <ReviewRow label="Daily Est." value={perDay} mono />
              </View>

              <View style={s.noticeBox}>
                <Text style={s.noticeText}>
                  🔍  After submission, FitBridge will review your campaign within 24–48 hours. You'll receive a push notification once approved.
                </Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom nav ──────────────────────────────────────────────────────── */}
      <View style={s.footer}>
        <Button
          title={step === 1 ? 'Cancel' : '← Back'}
          variant="outline"
          size="md"
          onPress={handleBack}
          style={{ flex: 1 }}
        />
        {step < TOTAL_STEPS ? (
          <Button
            title="Next →"
            variant="primary"
            size="md"
            onPress={handleNext}
            style={{ flex: 2 }}
          />
        ) : (
          <Button
            title="Submit for Review"
            variant="primary"
            size="md"
            loading={submitting}
            onPress={handleSubmit}
            style={{ flex: 2 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.MD, paddingBottom: SPACING.SM, gap: SPACING.MD } as ViewStyle,
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backArrow: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM, flex: 1, justifyContent: 'center' } as ViewStyle,
  headerIcon: { fontSize: 26 } as TextStyle,
  headerStep: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  headerTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,

  // Error banner
  errorBanner: { marginHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.SM, backgroundColor: `${COLORS.ERROR}18`, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.ERROR}40`, padding: SPACING.MD } as ViewStyle,
  errorText: { color: COLORS.ERROR, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY } as TextStyle,

  // Scroll
  scroll: { paddingBottom: SPACING.XXXL } as ViewStyle,
  stepContent: { paddingHorizontal: SPACING.SCREEN_H_PAD, gap: SPACING.LG } as ViewStyle,

  // TextArea
  textAreaWrap: { backgroundColor: COLORS.SURFACE_2, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: 6 } as ViewStyle,
  textArea: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, minHeight: 100, lineHeight: 22 } as TextStyle,
  charCounter: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, alignSelf: 'flex-end' } as TextStyle,

  // Chips
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  ageRow: { flexDirection: 'row', gap: SPACING.MD } as ViewStyle,

  // Budget breakdown card
  budgetBreakdown: { backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM, overflow: 'hidden' } as ViewStyle,
  budgetGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle,
  budgetTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', marginBottom: SPACING.SM } as TextStyle,
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  budgetLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  budgetValue: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' } as TextStyle,
  budgetNote: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY, lineHeight: 17, marginTop: SPACING.SM } as TextStyle,

  // Review cards
  reviewCard: { backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, overflow: 'hidden' } as ViewStyle,
  reviewSectionLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', marginBottom: SPACING.SM, textTransform: 'uppercase', letterSpacing: 0.8 } as TextStyle,

  // Notice
  noticeBox: { backgroundColor: `${COLORS.INFO}12`, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.INFO}30`, padding: SPACING.MD } as ViewStyle,
  noticeText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY, lineHeight: 20 } as TextStyle,

  // Footer
  footer: { flexDirection: 'row', gap: SPACING.MD, paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, borderTopWidth: 1, borderTopColor: COLORS.CARD_BORDER, backgroundColor: COLORS.DARK_BG } as ViewStyle,
});

export default CreateCampaignScreen;
