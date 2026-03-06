// Routes des zones tarifaires
import { Router } from 'express';
import { Role } from '@prisma/client';
import { tarifZoneController } from '../controllers/tarifZone.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createTarifZoneSchema, updateTarifZoneSchema } from '../validators/tarifZone.validator';

const router = Router();

// Lecture — tous les utilisateurs authentifiés (agents, comptables, admins)
router.get('/', authenticateToken, tarifZoneController.getAll.bind(tarifZoneController));

// Création, mise à jour, suppression — admin seulement
router.post(
  '/',
  authenticateToken,
  authorize(Role.ADMIN),
  validateBody(createTarifZoneSchema),
  tarifZoneController.create.bind(tarifZoneController)
);

router.put(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN),
  validateBody(updateTarifZoneSchema),
  tarifZoneController.update.bind(tarifZoneController)
);

router.delete(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN),
  tarifZoneController.delete.bind(tarifZoneController)
);

export default router;
