import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as ctrl from '../controllers/review.controller';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole('trainee'),
  [
    body('trainerId').isMongoId(),
    body('sessionId').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  ctrl.createReview,
);

router.get(
  '/trainer/:trainerId',
  [param('trainerId').isMongoId()],
  validate,
  ctrl.getTrainerReviews,
);

export default router;
