// Routes tarification — matrice catégorie × zone
import { Router } from 'express';
import { Role } from '@prisma/client';
import { tarificationController } from '../controllers/tarification.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Lecture — tous les utilisateurs authentifiés
router.get('/', authenticateToken, tarificationController.getMatrix.bind(tarificationController));

// Mise à jour d'une cellule — admin seulement
router.put(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN),
  tarificationController.updateCell.bind(tarificationController)
);

export default router;
