import { Router } from 'express';
import { me, logout, deleteAccount } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);
router.delete('/account', authenticate, deleteAccount);

export default router;
