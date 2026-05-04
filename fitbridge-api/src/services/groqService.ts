import Groq from 'groq-sdk';
import { ENV } from '../config/env';

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });

export interface ScanInput {
  photoUrls: string[];        // 4 Cloudinary URLs (front, back, left, right)
  height?: number;            // cm
  weight?: number;            // kg
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

export interface ScanResult {
  bmi: number;
  body_fat_percent: number;
  muscle_mass_kg: number;
  lean_mass_kg: number;
  posture_score: number;
  body_shape: 'ectomorph' | 'mesomorph' | 'endomorph';
  overall_score: number;
  discipline?: string;
  aiSummary?: string;
  generated_plan: {
    weeks: number;
    goal: string;
    nutrition: string;
    days: Array<{
      day: string;
      focus: string;
      duration: number;
      exercises: string[];
    }>;
  };
}

export async function analyzeBodyScan(input: ScanInput): Promise<ScanResult> {
  const imageMessages = input.photoUrls.map((url, i) => ({
    type: 'image_url' as const,
    image_url: { url },
  }));

  let calculatedBmi: number | undefined;
  if (input.height && input.weight) {
    const heightM = input.height / 100;
    calculatedBmi = Number((input.weight / (heightM * heightM)).toFixed(1));
  }

  const userContext = input.height
    ? `User stats: height ${input.height}cm, weight ${input.weight}kg, age ${input.age}, gender ${input.gender}. Exact BMI is ${calculatedBmi}. Use this exact BMI in the JSON. Based on the photos and this BMI, estimate body_fat_percent and muscle_mass_kg realistically.`
    : 'No height/weight provided. Estimate BMI, body_fat_percent, and muscle_mass_kg entirely from the visual physique in the photos.';

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `You are a professional fitness AI assistant. Analyze body composition from these photos. Return ONLY a JSON object with these exact fields: bmi (number), body_fat_percent (number), muscle_mass_kg (number), lean_mass_kg (number), posture_score (0-100 integer), body_shape (ectomorph|mesomorph|endomorph), overall_score (0-100 integer), discipline (string), aiSummary (string, 1-2 engaging sentences), generated_plan (object with weeks (number, must be 14 for 100 days), goal (string), nutrition (string), days (array of exactly 7 objects representing a 1-week microcycle, with day ("Day 1" to "Day 7"), focus, duration (number in mins), exercises (array of 4-6 strings))). Provide a highly realistic and personalized strategy mapped out over 100 days, but specifically return the 7-day routine for Week 1. Make the values dynamic and highly tailored to the user's physique. No markdown, no explanation. Pure JSON only. ${userContext}` },
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as ScanResult;
  } catch (err: any) {
    console.error('[groqService] analyzeBodyScan failed, using fallback:', err.message);
    // Return a safe fallback if API or JSON parsing fails
    return {
      bmi: 22.5, body_fat_percent: 18, muscle_mass_kg: 55, lean_mass_kg: 50,
      posture_score: 75, body_shape: 'mesomorph', overall_score: 74,
      discipline: 'Strength Training', aiSummary: 'You have a solid base. Let\'s focus on progressive overload and mobility.',
      generated_plan: {
        weeks: 14,
        goal: 'Hypertrophy & Conditioning',
        nutrition: 'High protein, moderate carb, slight caloric surplus.',
        days: [
          { day: 'Day 1', focus: 'Upper Body Power', duration: 45, exercises: ['Bench Press', 'Pull-ups', 'Overhead Press'] },
          { day: 'Day 2', focus: 'Lower Body Strength', duration: 50, exercises: ['Squats', 'Deadlifts', 'Leg Press'] },
          { day: 'Day 3', focus: 'Active Recovery', duration: 30, exercises: ['Yoga', 'Mobility drills'] }
        ]
      },
    };
  }
}
