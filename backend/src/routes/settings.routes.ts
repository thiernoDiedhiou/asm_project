// Routes des paramètres de l'entreprise
import { Router } from 'express';
import { Role } from '@prisma/client';
import { settingsController } from '../controllers/settings.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public — lecture des paramètres (vitrine)
router.get('/', settingsController.get.bind(settingsController));

// Admin — mise à jour des paramètres
router.put(
  '/',
  authenticateToken,
  authorize(Role.ADMIN),
  settingsController.update.bind(settingsController)
);

export default router;
