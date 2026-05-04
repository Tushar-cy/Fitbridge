/**
 * trainerMatchingService.ts
 *
 * AI-backed trainer matching algorithm.
 * Takes a user's latest body scan result + profile → returns ranked trainers.
 *
 * Scoring model (0–100):
 *  - Body type alignment (35 pts)
 *  - Goal alignment via discipline (25 pts)
 *  - Rating & experience (20 pts)
 *  - Price fit (10 pts)
 *  - Availability score (10 pts)
 */

import type { Trainer } from '../../types/user.types';

// ── Scan result shape (mirrors ScanAnalysisResult from groqService) ───────────
export interface ScanProfile {
  bodyType?:   string;   // 'ectomorph' | 'mesomorph' | 'endomorph'
  discipline?: string;   // 'fat_loss' | 'muscle_gain' | 'endurance' | 'yoga' etc.
  score?:      number;   // 0–100 overall fitness score
  bodyFat?:    number;
  muscleMass?: number;
  bmi?:        number;
}

export interface MatchedTrainer extends Trainer {
  matchScore:    number;   // 0–100
  matchReasons:  string[]; // human-readable reasons why they match
  primaryBadge:  string;   // e.g. "Best Match 🎯" | "Top Rated ⭐" | "Budget Pick 💰"
}

// ── Discipline → Specialisation mapping ──────────────────────────────────────
const DISCIPLINE_MAP: Record<string, string[]> = {
  fat_loss:     ['Fat Loss', 'HIIT', 'Cardio', 'Nutrition', 'Zumba'],
  muscle_gain:  ['Strength Training', 'Bodybuilding', 'Powerlifting', 'Gym'],
  endurance:    ['Running', 'Cardio', 'Calisthenics', 'HIIT'],
  yoga:         ['Yoga', 'Flexibility', 'Mindfulness'],
  general:      ['General Fitness', 'Gym', 'Functional Training'],
  rehabilitation: ['Physiotherapy', 'Rehabilitation', 'Yoga', 'Flexibility'],
};

// ── Body type → trainer style mapping ────────────────────────────────────────
const BODY_TYPE_MAP: Record<string, string[]> = {
  ectomorph:  ['Strength Training', 'Bodybuilding', 'Nutrition', 'Powerlifting'],
  mesomorph:  ['HIIT', 'Strength Training', 'Calisthenics', 'General Fitness'],
  endomorph:  ['Fat Loss', 'HIIT', 'Cardio', 'Nutrition', 'Zumba'],
};

/**
 * Score how well a trainer matches the user's scan profile.
 * Returns 0–100.
 */
function scoreTrainer(trainer: Trainer, scan: ScanProfile): number {
  let score = 0;
  const specs = (trainer.specialisation ?? []).map((s) => s.toLowerCase());

  // ── 1. Body type alignment (35 pts) ──────────────────────────────────────
  const bodyTypeTargets = BODY_TYPE_MAP[scan.bodyType ?? ''] ?? [];
  const bodyHits = bodyTypeTargets.filter((t) =>
    specs.some((s) => s.includes(t.toLowerCase()))
  ).length;
  score += Math.min(bodyHits / Math.max(bodyTypeTargets.length, 1), 1) * 35;

  // ── 2. Discipline alignment (25 pts) ─────────────────────────────────────
  const disciplineTargets = DISCIPLINE_MAP[scan.discipline ?? 'general'] ?? [];
  const disciplineHits = disciplineTargets.filter((t) =>
    specs.some((s) => s.includes(t.toLowerCase()))
  ).length;
  score += Math.min(disciplineHits / Math.max(disciplineTargets.length, 1), 1) * 25;

  // ── 3. Rating + experience (20 pts) ──────────────────────────────────────
  const ratingScore  = ((trainer.rating ?? 0) / 5) * 10;
  const expScore     = Math.min((trainer.experience ?? 0) / 10, 1) * 10;
  score += ratingScore + expScore;

  // ── 4. Price fit (10 pts) — cheaper is better for new users ─────────────
  const price = trainer.pricePerSession ?? 0;
  if (price < 500)       score += 10;
  else if (price < 1000) score += 7;
  else if (price < 2000) score += 4;
  else                   score += 2;

  // ── 5. Availability (10 pts) ──────────────────────────────────────────────
  const slots = (trainer.availability ?? []).length;
  score += Math.min(slots / 7, 1) * 10;

  return Math.round(Math.min(score, 100));
}

/** Build human-readable match reasons */
function buildReasons(trainer: Trainer, scan: ScanProfile, score: number): string[] {
  const reasons: string[] = [];
  const specs = trainer.specialisation ?? [];

  if (scan.bodyType && BODY_TYPE_MAP[scan.bodyType]?.some((t) =>
    specs.some((s) => s.toLowerCase().includes(t.toLowerCase()))
  )) {
    reasons.push(`Specialises in ${scan.bodyType} body type training`);
  }

  if (scan.discipline) {
    const label = scan.discipline.replace('_', ' ');
    const targets = DISCIPLINE_MAP[scan.discipline] ?? [];
    if (targets.some((t) => specs.some((s) => s.toLowerCase().includes(t.toLowerCase())))) {
      reasons.push(`Expert in ${label} coaching`);
    }
  }

  if ((trainer.rating ?? 0) >= 4.5) {
    reasons.push(`Highly rated ${trainer.rating?.toFixed(1)}⭐ by clients`);
  }

  if ((trainer.experience ?? 0) >= 5) {
    reasons.push(`${trainer.experience}+ years of experience`);
  }

  if ((trainer.pricePerSession ?? 9999) < 1000) {
    reasons.push('Affordable pricing');
  }

  if (score >= 80) {
    reasons.push('Excellent overall compatibility');
  }

  return reasons.slice(0, 3); // show max 3 reasons
}

/** Get primary badge for this trainer */
function getPrimaryBadge(trainer: Trainer, score: number, index: number): string {
  if (index === 0 && score >= 70) return '🎯 Best Match';
  if ((trainer.rating ?? 0) >= 4.8)  return '⭐ Top Rated';
  if ((trainer.pricePerSession ?? 9999) < 700) return '💰 Budget Pick';
  if ((trainer.experience ?? 0) >= 8) return '🏆 Expert';
  if (score >= 75) return '✨ Great Fit';
  return '👍 Recommended';
}

/**
 * Main export: rank trainers by match score for a given scan profile.
 */
export function rankTrainers(
  trainers: Trainer[],
  scan: ScanProfile,
): MatchedTrainer[] {
  return trainers
    .map((trainer) => {
      const matchScore   = scoreTrainer(trainer, scan);
      const matchReasons = buildReasons(trainer, scan, matchScore);
      return { ...trainer, matchScore, matchReasons, primaryBadge: '' };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((trainer, index) => ({
      ...trainer,
      primaryBadge: getPrimaryBadge(trainer, trainer.matchScore, index),
    }));
}

/**
 * Get a quick "why you should scan first" message if no scan exists.
 */
export function getNoScanMessage(): string {
  return 'Complete your AI Body Scan to get personalised trainer matches based on your body type, goals, and fitness level.';
}
