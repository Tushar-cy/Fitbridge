import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/booking.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  [body('sessionId').isMongoId().withMessage('Valid sessionId required')],
  validate,
  ctrl.createBooking,
);

router.get('/', ctrl.listBookings);

router.get('/:id', [param('id').isMongoId()], validate, ctrl.getBooking);

router.patch('/:id/cancel', [param('id').isMongoId()], validate, ctrl.cancelBooking);

export default router;
