export const APP_NAME = 'FitBridge';

// Read from .env (EXPO_PUBLIC_ prefix required for Expo to expose to JS)
// Falls back to production URL so the app still builds in CI without a .env
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.fitbridge.app/v1';

export const SUPPORT_EMAIL = 'support@fitbridge.app';

// ── Groq AI ───────────────────────────────────────────────────────────────────
// Used by AIScan + AI Insight features. Key is read from .env only — never
// hardcode secrets here. Rotate at https://console.groq.com/keys
export const GROQ_API_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
export const GROQ_MODEL =
  process.env.EXPO_PUBLIC_GROQ_MODEL ?? 'gpt-oss-120B';
export const GROQ_BASE_URL =
  process.env.EXPO_PUBLIC_GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1';

export const SESSION_DURATION_OPTIONS = [30, 45, 60, 90]; // minutes

export const SPECIALISATIONS = [
  'Strength Training',
  'HIIT',
  'Yoga',
  'Pilates',
  'CrossFit',
  'Boxing',
  'Running',
  'Cycling',
  'Nutrition',
  'Calisthenics',
  'Powerlifting',
  'Mobility',
];

export const PRICE_RANGE = { min: 500, max: 10000 }; // INR per session
