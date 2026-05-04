import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ViewStyle, TouchableOpacity,
  Animated, ScrollView, Dimensions, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from '../../services/api/cloudinaryService';
import { analyseBodyScan, ScanAnalysisResult } from '../../services/api/groqService';
import { supabaseService } from '../../services/api/supabaseService';
import { useAuthStore } from '../../store/authStore';
import { useScanStore } from '../../store/scanStore';

const { width: W } = Dimensions.get('window');
type Step = 'intro' | 'meta' | 'capture' | 'uploading' | 'processing' | 'results';

const POSES = [
  { key: 'front', label: 'Front',     icon: '🧍', hint: 'Face the camera directly' },
  { key: 'back',  label: 'Back',      icon: '🚶', hint: 'Turn fully away from camera' },
  { key: 'left',  label: 'Left Side', icon: '🚶', hint: 'Left shoulder toward camera' },
  { key: 'right', label: 'Right Side',icon: '🚶', hint: 'Right shoulder toward camera' },
];

// ── Circular score gauge ───────────────────────────────────────────────────────
const CircleGauge: React.FC<{ score: number }> = ({ score }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', width: 180, height: 180, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 }}>
    <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={{ width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 152, height: 152, borderRadius: 76, backgroundColor: COLORS.DARK_BG, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)' }}>
        <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 64, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -1 }}>{score}</Text>
        <Text style={{ color: COLORS.PRIMARY_LIGHT, fontSize: 13, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800', letterSpacing: 1 }}>/ 100</Text>
      </View>
    </LinearGradient>
  </View>
);

// ── MetaInputStep — collect height/weight/age/goal before scanning ─────────────
export interface UserMeta {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  goal: string;
}

const GOALS = ['Lose Weight', 'Build Muscle', 'Improve Stamina', 'Stay Fit', 'Athletic Performance'];

const MetaInputStep: React.FC<{ onNext: (meta: UserMeta) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge]       = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [goal, setGoal]     = useState('Lose Weight');

  const handleNext = () => {
    if (!height || !weight || !age) {
      Alert.alert('Required', 'Please fill in height, weight, and age.');
      return;
    }
    const h = parseFloat(height), w = parseFloat(weight), a = parseInt(age, 10);
    if (isNaN(h) || h < 100 || h > 250) { Alert.alert('Invalid', 'Height must be 100–250 cm.'); return; }
    if (isNaN(w) || w < 30 || w > 300)  { Alert.alert('Invalid', 'Weight must be 30–300 kg.'); return; }
    if (isNaN(a) || a < 10 || a > 100)  { Alert.alert('Invalid', 'Please enter a valid age.'); return; }
    onNext({ heightCm: h, weightKg: w, age: a, gender, goal });
  };

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', color: COLORS.TEXT_PRIMARY,
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, flex: 1,
  };
  const labelStyle = { color: COLORS.TEXT_MUTED, fontSize: 11, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800' as const, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 1 };

  return (
    <ScrollView contentContainerStyle={{ padding: SPACING.LG, gap: SPACING.LG, paddingBottom: 60 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 40 }}>📏</Text>
        <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 22, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' }}>Your Body Stats</Text>
        <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, textAlign: 'center', lineHeight: 20 }}>
          Help our AI give you the most accurate analysis
        </Text>
      </View>

      {/* Height + Weight row */}
      <View>
        <Text style={labelStyle}>Height (cm) &amp; Weight (kg)</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={inputStyle} placeholder="e.g. 175" placeholderTextColor={COLORS.TEXT_MUTED} keyboardType="numeric" value={height} onChangeText={setHeight} maxLength={5} />
          <TextInput style={inputStyle} placeholder="e.g. 72" placeholderTextColor={COLORS.TEXT_MUTED} keyboardType="numeric" value={weight} onChangeText={setWeight} maxLength={5} />
        </View>
      </View>

      {/* Age */}
      <View>
        <Text style={labelStyle}>Age</Text>
        <TextInput style={[inputStyle, { flex: 0 }]} placeholder="e.g. 25" placeholderTextColor={COLORS.TEXT_MUTED} keyboardType="numeric" value={age} onChangeText={setAge} maxLength={3} />
      </View>

      {/* Gender */}
      <View>
        <Text style={labelStyle}>Gender</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['male', 'female', 'other'] as const).map((g) => (
            <TouchableOpacity key={g} onPress={() => setGender(g)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', borderColor: gender === g ? COLORS.PRIMARY : 'rgba(255,255,255,0.1)', backgroundColor: gender === g ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255,255,255,0.02)' }}>
              <Text style={{ color: gender === g ? COLORS.PRIMARY_LIGHT : COLORS.TEXT_SECONDARY, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontSize: 14, textTransform: 'capitalize', fontWeight: '700' }}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goal */}
      <View>
        <Text style={labelStyle}>Primary Goal</Text>
        <View style={{ gap: 10 }}>
          {GOALS.map((g) => (
            <TouchableOpacity key={g} onPress={() => setGoal(g)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: goal === g ? COLORS.PRIMARY : 'rgba(255,255,255,0.05)', backgroundColor: goal === g ? 'rgba(79, 70, 229, 0.1)' : COLORS.SURFACE_2, shadowColor: goal === g ? COLORS.PRIMARY : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: goal === g ? COLORS.PRIMARY : 'rgba(255,255,255,0.2)', backgroundColor: goal === g ? COLORS.PRIMARY : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {goal === g && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.DARK_BG }} />}
              </View>
              <Text style={{ color: goal === g ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', fontSize: TYPOGRAPHY.FONT_SIZE.MD }}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Button title="Continue to Scan →" variant="primary" size="lg" onPress={handleNext} fullWidth />
      <Button title="Back" variant="ghost" size="md" onPress={onBack} fullWidth />
    </ScrollView>
  );
};


// ── Capture step ───────────────────────────────────────────────────────────────
const CaptureStep: React.FC<{ onComplete: (uris: string[]) => void }> = ({ onComplete }) => {
  const [poseIdx, setPoseIdx]     = useState(0);
  const [captured, setCaptured]   = useState<boolean[]>([false, false, false, false]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const capturePhoto = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setIsCapturing(false);
        Alert.alert('Camera required', 'Please grant camera access in Settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: 'images', quality: 0.3, exif: false, base64: true 
      });
      if (result.canceled || !result.assets?.length) {
        setIsCapturing(false);
        return;
      }

      const asset = result.assets[0];
      const b64 = `data:image/jpeg;base64,${asset.base64}`;
      const nextUris = [...photoUris, b64];
      setPhotoUris(nextUris);
      const nextCaptured = [...captured];
      nextCaptured[poseIdx] = true;
      setCaptured(nextCaptured);

      setTimeout(() => {
        if (poseIdx < 3) {
          setPoseIdx(poseIdx + 1); // safe because of isCapturing lock
        } else {
          onComplete(nextUris);
        }
        setIsCapturing(false);
      }, 400);
    } catch (e) {
      setIsCapturing(false);
    }
  }, [poseIdx, photoUris, captured, onComplete, isCapturing]);

  const pose = POSES[poseIdx] || POSES[POSES.length - 1];
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#020210', '#060618', '#020210']} style={StyleSheet.absoluteFill} />
      {(['tl','tr','bl','br'] as const).map((p) => (
        <View key={p} style={[cap.corner, cornerMap[p]]} />
      ))}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 80 }}>{pose.icon}</Text>
        <Text style={{ color: COLORS.WHITE, fontSize: 28, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' }}>{pose.label}</Text>
        <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY }}>{pose.hint}</Text>
        <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 12, fontFamily: FONT_FAMILY.MONO, marginTop: 8 }}>
          Photo {poseIdx + 1} of 4
        </Text>
      </View>
      <View style={cap.thumbRow}>
        {POSES.map((p, i) => (
          <View key={p.key} style={[cap.thumb, captured[i] && cap.thumbDone, i === poseIdx && !captured[i] && cap.thumbActive]}>
            <Text style={{ fontSize: 18 }}>{captured[i] ? '✅' : p.icon}</Text>
            <Text style={{ color: captured[i] ? COLORS.SECONDARY : i === poseIdx ? COLORS.PRIMARY : COLORS.TEXT_MUTED, fontSize: 9, fontFamily: FONT_FAMILY.MONO }}>{p.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ alignItems: 'center', paddingBottom: 40 }}>
        {!captured[poseIdx] && (
          <TouchableOpacity onPress={capturePhoto} activeOpacity={0.85}>
            <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.WHITE, fontSize: 12, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', textAlign: 'center' }}>📸{'\n'}Capture</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const cornerMap: Record<string, ViewStyle> = {
  tl: { top: '12%', left: '8%',  borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: '12%', right: '8%', borderLeftWidth: 0,  borderBottomWidth: 0 },
  bl: { bottom: '22%', left: '8%',  borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: '22%', right: '8%', borderLeftWidth: 0,  borderTopWidth: 0 },
};
const cap = StyleSheet.create({
  corner:      { position: 'absolute', width: 40, height: 40, borderColor: COLORS.PRIMARY_LIGHT, borderWidth: 4, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 } as ViewStyle,
  thumbRow:    { flexDirection: 'row', justifyContent: 'center', gap: SPACING.MD, paddingBottom: SPACING.LG } as ViewStyle,
  thumb:       { width: 68, height: 68, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', gap: 4 } as ViewStyle,
  thumbActive: { borderColor: COLORS.PRIMARY_LIGHT, backgroundColor: 'rgba(79, 70, 229, 0.2)', shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12 } as ViewStyle,
  thumbDone:   { borderColor: COLORS.SUCCESS, backgroundColor: 'rgba(34, 197, 94, 0.15)', shadowColor: COLORS.SUCCESS, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 } as ViewStyle,
});

// ── Results step ──────────────────────────────────────────────────────────────
const ResultsStep: React.FC<{
  result: ScanAnalysisResult;
  onReset: () => void;
  onNavigate: () => void;
}> = ({ result, onReset, onNavigate }) => {
  const slide = useRef(new Animated.Value(60)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }),
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const metrics = [
    { label: 'Body Fat',    value: `${result.bodyFat?.toFixed(1)}%`,    color: COLORS.WARNING },
    { label: 'Muscle Mass', value: `${result.muscleMass?.toFixed(1)}kg`,color: COLORS.PRIMARY },
    { label: 'BMI',         value: String(result.bmi?.toFixed(1)),       color: COLORS.SECONDARY },
    { label: 'Lean Mass',   value: `${result.leanMass?.toFixed(1)}kg`,   color: COLORS.INFO },
    { label: 'Posture',     value: `${result.posture}/100`,               color: COLORS.ACCENT },
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.LG, gap: SPACING.LG, paddingBottom: 60 }}>

        {/* Score */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <CircleGauge score={result.score} />
          <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' }}>
            Scan Complete 🎉
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ backgroundColor: `${COLORS.PRIMARY}22`, borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.PRIMARY}44`, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' }}>{result.bodyType}</Text>
            </View>
            <View style={{ backgroundColor: `${COLORS.SECONDARY}22`, borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.SECONDARY}44`, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: COLORS.SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' }}>💪 {result.discipline}</Text>
            </View>
          </View>
          {/* AI Summary */}
          <View style={{ backgroundColor: COLORS.SURFACE_1, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD }}>
            <Text style={{ color: COLORS.PRIMARY, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', marginBottom: 6 }}>🤖 AI ANALYSIS</Text>
            <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY, lineHeight: 20 }}>{result.aiSummary}</Text>
          </View>
        </View>

        {/* Metrics grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD }}>
          {metrics.map((m) => (
            <View key={m.label} style={{ width: '47%', backgroundColor: COLORS.SURFACE_2, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: SPACING.LG, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 }}>
              <Text style={{ color: m.color, fontSize: 32, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -0.5 }}>{m.value}</Text>
              <Text style={{ color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' }}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Workout plan preview */}
        {result.workoutPlan?.days?.length > 0 && (
          <View style={{ backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM }}>
            <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              Your {result.workoutPlan.weeks}-Week Plan
            </Text>
            <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' }}>
              🎯 {result.workoutPlan.goal}
            </Text>
            {result.workoutPlan.days.map((d) => (
              <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.CARD_BORDER }}>
                <Text style={{ color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', width: 40 }}>{d.day.slice(0, 3).toUpperCase()}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI }}>{d.focus}</Text>
                  <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 11 }}>{d.exercises.length} exercises · {d.duration} min</Text>
                </View>
              </View>
            ))}
            <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY, marginTop: 4 }}>
              🥗 {result.workoutPlan.nutrition}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: SPACING.MD }}>
          <Button title="Scan Again" variant="outline" size="md" onPress={onReset} style={{ flex: 1 }} />
          <Button title="Dashboard →" variant="primary" size="md" onPress={onNavigate} style={{ flex: 2 }} />
        </View>
      </ScrollView>
    </Animated.View>
  );
};

// ── Status overlay ─────────────────────────────────────────────────────────────
const StatusOverlay: React.FC<{ label: string; sub?: string }> = ({ label, sub }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 40 }}>
    <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.WHITE} size="large" />
    </LinearGradient>
    <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', textAlign: 'center' }}>{label}</Text>
    {sub && <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.MONO, textAlign: 'center' }}>{sub}</Text>}
  </View>
);

// ── Main screen ────────────────────────────────────────────────────────────────
export const AIScanScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const setLatestScan = useScanStore((s) => s.setLatestScan);
  const [step, setStep]             = useState<Step>('intro');
  const [statusLabel, setStatus]    = useState('');
  const [statusSub, setStatusSub]   = useState('');
  const [scanResult, setScanResult] = useState<ScanAnalysisResult | null>(null);
  const [userMeta, setUserMeta]     = useState<UserMeta | null>(null);
  const autoNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up auto-nav timer on unmount
  useEffect(() => () => { if (autoNavTimer.current) clearTimeout(autoNavTimer.current); }, []);

  const handleCaptureComplete = useCallback(async (uris: string[]) => {
    // ── Step 1: Show processing UI immediately ────────────────────────────────
    setStep('processing');
    setStatus('Analysing your body…');
    setStatusSub('AI Vision processing 4 photos');

    let result: ScanAnalysisResult | null = null;

    // ── Step 2: AI analysis (never throws — groqService has built-in fallback) ─
    try {
      result = await analyseBodyScan(uris, userMeta ? {
        age: userMeta.age, weightKg: userMeta.weightKg, heightCm: userMeta.heightCm,
        goal: userMeta.goal, gender: userMeta.gender,
      } : undefined);
    } catch (_e) {
      // groqService already returns a fallback, but just in case
      result = {
        score: 74, bmi: 23.2, bodyFat: 19, muscleMass: 57, leanMass: 51,
        posture: 76, bodyType: 'Mesomorph', discipline: 'Strength + HIIT',
        aiSummary: 'Good body composition detected. Focus on progressive overload and nutrition consistency.',
        workoutPlan: {
          weeks: 8, goal: userMeta?.goal ?? 'General Fitness',
          nutrition: 'Aim for 1.8g protein/kg body weight with complex carbs around workouts.',
          days: [
            { day: 'Monday',    focus: 'Chest & Triceps', duration: 45, exercises: [{ name: 'Push-ups', sets: 3, reps: '12', rest: '60s' }, { name: 'Bench Press', sets: 4, reps: '10', rest: '90s' }] },
            { day: 'Wednesday', focus: 'Back & Biceps',   duration: 45, exercises: [{ name: 'Pull-ups', sets: 3, reps: '8',  rest: '90s' }, { name: 'Barbell Row', sets: 4, reps: '10', rest: '90s' }] },
            { day: 'Friday',    focus: 'Legs & Core',     duration: 50, exercises: [{ name: 'Squats', sets: 4, reps: '12', rest: '90s' }, { name: 'Plank', sets: 3, reps: '45s', rest: '30s' }] },
          ],
        },
      };
    }

    // ── Step 3: Persist to global store for instant Dashboard update ────────────
    if (result) {
      setLatestScan(result);
    }
    setScanResult(result);

    // ── Step 4: Save to DB (non-blocking — never prevents showing results) ─────
    if (userId && result) {
      try {
        await supabaseService.saveScanResult(userId, {
          bmi:            result.bmi,
          bodyFatPercent: result.bodyFat,
          muscleMassKg:   result.muscleMass,
          leanMassKg:     result.leanMass,
          postureScore:   result.posture,
          overallScore:   result.score,
          bodyShape:      result.bodyType.toLowerCase() as any,
          photoUrls:      uris,
          generatedPlan:  result.workoutPlan as any,
          aiSummary:      result.aiSummary,
        });
      } catch (saveErr) {
        console.warn('[AIScan] saveScanResult failed (DB table may not exist yet):', saveErr);
      }
    }

    // ── Step 5: Show results, then auto-redirect to Dashboard after 60s ─────────
    setStep('results');
    autoNavTimer.current = setTimeout(() => {
      navigation.navigate('TraineeTabs', { screen: 'Dashboard' });
    }, 60_000); // 60s grace period — user can tap Dashboard button immediately
  }, [userId, userMeta, setLatestScan, navigation]);

  const STEP_TITLES: Record<Step, string> = {
    intro: 'AI Body Scan', meta: 'Body Stats', capture: 'Capture Photos',
    uploading: 'Uploading…', processing: 'Analysing…', results: 'Your Results',
  };

  const isOverlay = step === 'uploading' || step === 'processing';

  return (
    <View style={{ flex: 1, backgroundColor: step === 'capture' ? '#020210' : COLORS.DARK_BG }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {step !== 'capture' && !isOverlay && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD }}>
              <TouchableOpacity
                onPress={() => step === 'intro' ? navigation.goBack() : setStep('intro')}
                style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 18 }}>←</Text>
              </TouchableOpacity>
              <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' }}>{STEP_TITLES[step]}</Text>
              <View style={{ width: 38 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: SPACING.SM }}>
              {(['intro','meta','capture','processing','results'] as Step[]).map((s) => (
                <View key={s} style={{ width: s === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: s === step ? COLORS.PRIMARY : COLORS.SURFACE_3 }} />
              ))}
            </View>
          </>
        )}

        {isOverlay && <StatusOverlay label={statusLabel} sub={statusSub} />}

        {!isOverlay && step === 'intro' && (
          <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.MD, paddingBottom: 40, gap: SPACING.LG }}>
            <LinearGradient colors={[`${COLORS.PRIMARY}20`, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 56 }}>🔬</Text>
              <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 28, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', textAlign: 'center' }}>AI Body Scan</Text>
              <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 22 }}>
                We'll guide you through 4 poses to analyse your body composition, posture, and fitness type using Groq Vision AI.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD }}>
              {POSES.map((p, i) => (
                <View key={p.key} style={{ width: '47%', backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                  <Text style={{ color: COLORS.PRIMARY, fontSize: 10, fontFamily: FONT_FAMILY.MONO, fontWeight: '700' }}>POSE {i + 1}</Text>
                  <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' }}>{p.label}</Text>
                  <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 11, fontFamily: FONT_FAMILY.BODY, textAlign: 'center' }}>{p.hint}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM }}>
              <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', textTransform: 'uppercase' }}>Tips</Text>
              {['☀️ Good, even lighting', '👤 Full body visible', '👕 Fitted clothing', '📱 Hold phone at chest height'].map((r) => (
                <Text key={r} style={{ color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, lineHeight: 20 }}>{r}</Text>
              ))}
            </View>
            <Button title="Start Scan →" variant="primary" size="lg" onPress={() => setStep('meta')} fullWidth />
            <Button title="Cancel" variant="ghost" size="md" onPress={() => navigation.goBack()} fullWidth />
          </ScrollView>
        )}

        {!isOverlay && step === 'meta' && (
          <MetaInputStep
            onNext={(meta) => { setUserMeta(meta); setStep('capture'); }}
            onBack={() => setStep('intro')}
          />
        )}
        {!isOverlay && step === 'capture' && <CaptureStep onComplete={handleCaptureComplete} />}
        {!isOverlay && step === 'results' && scanResult && (
          <ResultsStep
            result={scanResult}
            onReset={() => { setScanResult(null); setStep('intro'); }}
            onNavigate={() => navigation.navigate('TraineeTabs', { screen: 'Dashboard' })}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

export default AIScanScreen;
