import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', referralController.getOverview.bind(referralController));

export default router;
