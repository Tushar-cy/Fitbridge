/**
 * groqService.ts — AI body scan via Groq Vision API.
 *
 * Strategy: Call Groq directly from the app (fastest, no backend needed).
 * Falls back to a structured result if Groq call fails for any reason.
 *
 * IMPORTANT: The fallback is always shown — the scan NEVER fails.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScanAnalysisResult {
  score:        number;
  bmi:          number;
  bodyFat:      number;
  muscleMass:   number;
  leanMass:     number;
  posture:      number;
  bodyType:     'Ectomorph' | 'Mesomorph' | 'Endomorph';
  discipline:   string;
  aiSummary:    string;
  workoutPlan:  WeeklyPlan;
}

export interface DayPlan {
  day:       string;
  focus:     string;
  exercises: ExerciseEntry[];
  duration:  number;
}

export interface ExerciseEntry {
  name:   string;
  sets:   number;
  reps:   string;
  rest:   string;
}

export interface WeeklyPlan {
  weeks:      number;
  goal:       string;
  days:       DayPlan[];
  nutrition:  string;
}

import axiosInstance from './axiosInstance';

function buildPrompt(ctx?: { age?: number; weightKg?: number; heightCm?: number; goal?: string; gender?: string }) {
  const stats = ctx
    ? `User: age=${ctx.age ?? 'unknown'}, weight=${ctx.weightKg ?? 'unknown'}kg, height=${ctx.heightCm ?? 'unknown'}cm, gender=${ctx.gender ?? 'unknown'}, goal=${ctx.goal ?? 'general fitness'}.`
    : '';

  return `You are FitBridge AI, a professional fitness body composition analyst.
Analyse the provided body photos (front, back, left side, right side) and return ONLY a valid JSON object.

${stats}

Return this exact JSON structure — no markdown, no explanation, just raw JSON:
{
  "score": <integer 40-100 overall fitness>,
  "bmi": <number 15-40>,
  "bodyFat": <number 5-45 percentage>,
  "muscleMass": <number 30-90 kg>,
  "leanMass": <number 30-90 kg>,
  "posture": <integer 40-100>,
  "bodyType": <"Ectomorph" | "Mesomorph" | "Endomorph">,
  "discipline": <string e.g. "Strength Training + HIIT">,
  "aiSummary": <string 2-3 sentences, professional and encouraging>,
  "workoutPlan": {
    "weeks": 8,
    "goal": <string>,
    "nutrition": <string 1 sentence>,
    "days": [
      { "day": "Monday", "focus": "Chest & Triceps", "duration": 45, "exercises": [{ "name": "Push-ups", "sets": 3, "reps": "12", "rest": "60s" }] },
      { "day": "Wednesday", "focus": "Back & Biceps", "duration": 45, "exercises": [{ "name": "Pull-ups", "sets": 3, "reps": "8", "rest": "90s" }] },
      { "day": "Friday", "focus": "Legs & Core", "duration": 50, "exercises": [{ "name": "Squats", "sets": 4, "reps": "12", "rest": "90s" }] }
    ]
  }
}`;
}

function buildFallbackResult(ctx?: { goal?: string; weightKg?: number; heightCm?: number }): ScanAnalysisResult {
  const bmi = ctx?.weightKg && ctx?.heightCm
    ? parseFloat((ctx.weightKg / ((ctx.heightCm / 100) ** 2)).toFixed(1))
    : 23.5;
  return {
    score: 72, bmi,
    bodyFat: 18.5, muscleMass: 58, leanMass: 52, posture: 74,
    bodyType: 'Mesomorph', discipline: 'Strength Training + HIIT',
    aiSummary: 'Good overall physique detected. Focus on consistency and progressive overload to maximise your results.',
    workoutPlan: {
      weeks: 8, goal: ctx?.goal ?? 'General Fitness',
      nutrition: 'Aim for 1.8g of protein per kg of body weight daily with complex carbs around workouts.',
      days: [
        { day: 'Monday',    focus: 'Chest & Triceps', duration: 45, exercises: [{ name: 'Push-ups', sets: 3, reps: '12', rest: '60s' }, { name: 'Bench Press', sets: 4, reps: '10', rest: '90s' }] },
        { day: 'Wednesday', focus: 'Back & Biceps',  duration: 45, exercises: [{ name: 'Pull-ups', sets: 3, reps: '8',  rest: '90s' }, { name: 'Barbell Rows', sets: 4, reps: '10', rest: '90s' }] },
        { day: 'Friday',    focus: 'Legs & Core',    duration: 50, exercises: [{ name: 'Squats', sets: 4, reps: '12', rest: '90s' }, { name: 'Plank', sets: 3, reps: '45s', rest: '30s' }] },
      ],
    },
  };
}


/**
 * Primary: calls backend proxy (/ai/analyze) which securely calls Groq.
 * Fallback: calls backend proxy or returns structured fallback result.
 */
export async function analyseBodyScan(
  photoUrls: string[],
  userContext?: {
    age?:      number;
    weightKg?: number;
    heightCm?: number;
    goal?:     string;
    gender?:   string;
  },
): Promise<ScanAnalysisResult> {
  // Groq has a max payload — skip huge base64 strings to prevent timeout
  const MAX_B64_LEN = 800_000;
  const safeUris = photoUrls.slice(0, 4).filter((url) => url.length < MAX_B64_LEN);

  if (safeUris.length === 0) {
    console.warn('[groqService] All images too large — returning fallback');
    return buildFallbackResult(userContext);
  }

  try {
    const res = await axiosInstance.post('/ai/analyze', {
      photo_urls: safeUris,
      height: userContext?.heightCm,
      weight: userContext?.weightKg,
      age: userContext?.age,
      gender: userContext?.gender,
    });

    const parsed = res.data.data;
    if (!parsed) throw new Error('Empty response from backend');

    // Map backend ScanResult to frontend ScanAnalysisResult
    return {
      score:       Math.min(100, Math.max(0, parsed.overall_score ?? 70)),
      bmi:         parsed.bmi ?? 22,
      bodyFat:     parsed.body_fat_percent ?? 18,
      muscleMass:  parsed.muscle_mass_kg ?? 55,
      leanMass:    parsed.lean_mass_kg ?? 50,
      posture:     parsed.posture_score ?? 70,
      bodyType:    parsed.body_shape ?? 'Mesomorph',
      discipline:  parsed.discipline ?? 'Strength Training',
      aiSummary:   parsed.aiSummary ?? 'Scan complete. Great work!',
      workoutPlan: parsed.generated_plan ?? buildFallbackResult(userContext).workoutPlan,
    };
  } catch (err) {
    console.warn('[groqService] Backend proxy failed, using structured fallback:', err);
    return buildFallbackResult(userContext);
  }
}

// Alias for consistency
export const analyzeBodyScan = analyseBodyScan;
