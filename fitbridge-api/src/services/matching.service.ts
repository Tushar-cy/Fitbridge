import { supabaseAdmin } from '../config/supabaseAdmin';
import { ITrainer } from '../types/models.types';

const BODY_TYPE_COMPATIBILITY: Record<string, Record<string, number>> = {
  endomorph: { hiit: 1.0, gym: 0.9, running: 0.85, zumba: 0.8, yoga: 0.6, calisthenics: 0.6, nutrition: 0.7, pilates: 0.5, boxing: 0.75 },
  ectomorph: { gym: 1.0, nutrition: 0.9, yoga: 0.8, pilates: 0.8, calisthenics: 0.75, hiit: 0.6, running: 0.65, zumba: 0.5, boxing: 0.55 },
  mesomorph: { gym: 0.9, hiit: 0.9, calisthenics: 0.85, boxing: 0.85, running: 0.8, zumba: 0.75, yoga: 0.75, pilates: 0.7, nutrition: 0.7 },
};

const GOAL_TO_SPEC: Record<string, string[]> = {
  'lose weight': ['hiit', 'running', 'zumba', 'gym'],
  'build muscle': ['gym', 'calisthenics', 'boxing'],
  'improve endurance': ['running', 'hiit', 'zumba'],
  'stay flexible': ['yoga', 'pilates'],
  'reduce stress': ['yoga', 'pilates'],
  'train for events': ['running', 'boxing', 'hiit'],
};

export interface ScoredTrainer {
  trainer: ITrainer;
  score: number;
  breakdown: { specialisationMatch: number; bodyTypeCompatibility: number; normalizedRating: number; locationMatch: number; budgetMatch: number; };
}

export async function computeMatchScores(traineeId: string, trainers: ITrainer[]): Promise<ScoredTrainer[]> {
  const { data: trainee } = await supabaseAdmin.from('profiles').select('fitness_goal').eq('id', traineeId).single();
  const { data: lastScan } = await supabaseAdmin.from('body_scans').select('body_shape').eq('user_id', traineeId).order('created_at', { ascending: false }).limit(1).single();

  const fitnessGoal = (trainee?.fitness_goal ?? '').toLowerCase();
  const bodyShape = (lastScan?.body_shape ?? 'mesomorph').toLowerCase();
  const maxBudget = 5000;

  const goalSpecs = GOAL_TO_SPEC[fitnessGoal] ?? [];

  const scored: ScoredTrainer[] = trainers.map((trainer) => {
    const specs = trainer.specialisations.map((s) => s.toLowerCase());

    const specialisationMatch = goalSpecs.some((g) => specs.includes(g)) ? 1 : 0;
    const btcMap = BODY_TYPE_COMPATIBILITY[bodyShape] ?? BODY_TYPE_COMPATIBILITY.mesomorph;
    const bodyTypeCompatibility = Math.max(0, ...specs.map((s) => btcMap[s] ?? 0.5));
    const normalizedRating = (trainer.rating ?? 0) / 5;
    const locationMatch = 0.75;
    const rate = trainer.price_per_session ?? 0;
    const budgetMatch = rate <= maxBudget ? 1 : Math.max(0, 1 - (rate - maxBudget) / maxBudget);

    const score = specialisationMatch * 0.30 + bodyTypeCompatibility * 0.20 + normalizedRating * 0.20 + locationMatch * 0.15 + budgetMatch * 0.15;

    return {
      trainer,
      score: Math.round(score * 100) / 100,
      breakdown: { specialisationMatch, bodyTypeCompatibility: Math.round(bodyTypeCompatibility * 100) / 100, normalizedRating: Math.round(normalizedRating * 100) / 100, locationMatch, budgetMatch: Math.round(budgetMatch * 100) / 100 },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
