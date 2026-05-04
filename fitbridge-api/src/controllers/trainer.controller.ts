import { Request, Response, NextFunction } from 'express';
import {
  listTrainers,
  getTrainerById,
  getTrainerAvailability,
  getTrainerReviews,
  updateTrainerProfile,
  uploadCertification,
} from '../services/trainer.service';
import { uploadToCloudinary } from '../config/cloudinary';
import { sendSuccess, sendError } from '../utils/response';

export async function getTrainers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listTrainers(req);
    sendSuccess(res, result.data, 'Trainers fetched', 200, result.meta);
  } catch (err) { next(err); }
}

export async function getTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trainer = await getTrainerById(String(req.params.id));
    sendSuccess(res, trainer);
  } catch (err) { next(err); }
}

export async function getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const availability = await getTrainerAvailability(String(req.params.id));
    sendSuccess(res, availability);
  } catch (err) { next(err); }
}

export async function getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getTrainerReviews(String(req.params.id), req);
    sendSuccess(res, result.data, 'Reviews fetched', 200, result.meta);
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trainer = await updateTrainerProfile(req.user!.id, req.body);
    sendSuccess(res, trainer, 'Profile updated');
  } catch (err) { next(err); }
}

export async function addCertification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let url = req.body.url ?? '';
    if (req.file) {
      url = await uploadToCloudinary(req.file.path, `fitbridge/certifications/${req.user!.id}`);
    }
    if (!url) { sendError(res, 'No certification file or URL provided', 400); return; }
    const trainer = await uploadCertification(req.user!.id, { name: req.body.name, url });
    sendSuccess(res, trainer, 'Certification added');
  } catch (err) { next(err); }
}
