import { Request, Response, NextFunction } from 'express';
import { analyzeBodyScan } from '../services/groqService';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { sendSuccess, sendError } from '../utils/response';

export async function scanBody(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { photo_urls, height, weight, age, gender } = req.body;
    if (!photo_urls || photo_urls.length < 4) {
      sendError(res, 'Exactly 4 photo URLs required', 400); return;
    }

    const result = await analyzeBodyScan({ photoUrls: photo_urls, height, weight, age, gender });

    // Save to Supabase
    const { data: scan, error } = await supabaseAdmin
      .from('body_scans')
      .insert({
        user_id: req.user!.id,
        bmi: result.bmi,
        body_fat_percent: result.body_fat_percent,
        muscle_mass_kg: result.muscle_mass_kg,
        lean_mass_kg: result.lean_mass_kg,
        posture_score: result.posture_score,
        body_shape: result.body_shape,
        overall_score: result.overall_score,
        photo_urls,
        generated_plan: result.generated_plan,
      })
      .select()
      .single();

    if (error) throw error;
    sendSuccess(res, { ...result, scan_id: scan.id });
  } catch (err) { next(err); }
}
