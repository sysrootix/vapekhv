import { Router } from 'express';
import vpnController from '../controllers/vpn.controller';

const router = Router();

router.get('/check-country', vpnController.checkCountry);

export default router;

