import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import * as ctrl from '../controllers/feed.controller';

const router = Router();

// Use memory storage so it works on Vercel (no /tmp persistence needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authenticate);

router.post(
  '/',
  upload.single('media'),
  [
    body('content').optional().isString().isLength({ max: 2200 }),
    body('media_type').optional().isIn(['image', 'video', 'text']),
  ],
  validate,
  ctrl.createPost,
);

router.get('/', ctrl.getFeed);

// Fixed: isUUID(4) instead of isMongoId() — Supabase uses UUIDs not Mongo ObjectIDs
router.get('/:id',    [param('id').isUUID(4)], validate, ctrl.getPost);

router.post('/:id/like', [param('id').isUUID(4)], validate, ctrl.toggleLike);

router.post(
  '/:id/comment',
  [
    param('id').isUUID(4),
    body('text').notEmpty().isLength({ max: 1000 }),
  ],
  validate,
  ctrl.addComment,
);

router.delete('/:id', [param('id').isUUID(4)], validate, ctrl.deletePost);

export default router;
