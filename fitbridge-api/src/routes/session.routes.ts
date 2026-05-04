import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as ctrl from '../controllers/session.controller';

const router = Router();

// All session routes require auth
router.use(authenticate);

router.post(
  '/',
  requireRole('trainer'),
  [
    body('mode').isIn(['online', 'offline']),
    body('type').isIn(['personal', 'group']),
    body('scheduledAt').isISO8601().toDate(),
    body('duration').isInt({ min: 15, max: 180 }),
    body('price').isFloat({ min: 0 }),
  ],
  validate,
  ctrl.create,
);

router.get('/', ctrl.list);

router.get('/:id', [param('id').isMongoId()], validate, ctrl.getOne);

router.patch(
  '/:id/status',
  [
    param('id').isMongoId(),
    body('status').isIn(['upcoming', 'live', 'completed', 'cancelled']),
  ],
  validate,
  ctrl.patchStatus,
);

router.delete('/:id', requireRole('trainer', 'admin'), [param('id').isMongoId()], validate, ctrl.remove);

export default router;
