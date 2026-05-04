import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { uploadLimiter } from '../middleware/rateLimiter';
import multer from 'multer';
import * as ctrl from '../controllers/trainer.controller';

const router = Router();
const upload = multer({ dest: '/tmp/fitbridge-uploads/' });

// Public routes
router.get(
  '/',
  optionalAuth,
  [
    query('specialisation').optional().isString(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  ctrl.getTrainers,
);

router.get('/:id', [param('id').isMongoId()], validate, ctrl.getTrainer);
router.get('/:id/availability', [param('id').isMongoId()], validate, ctrl.getAvailability);
router.get('/:id/reviews', [param('id').isMongoId()], validate, ctrl.getReviews);

// Trainer-only
router.put('/profile', authenticate, requireRole('trainer'), ctrl.updateProfile);

router.post(
  '/certification',
  authenticate,
  requireRole('trainer'),
  uploadLimiter,
  upload.single('file'),
  [body('name').notEmpty().withMessage('Certification name required')],
  validate,
  ctrl.addCertification,
);

export default router;
