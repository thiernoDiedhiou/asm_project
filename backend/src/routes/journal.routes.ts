// Routes du journal d'activité — admin uniquement
import { Router } from 'express';
import { journalController } from '../controllers/journal.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Toutes les routes nécessitent l'authentification + rôle ADMIN
router.get(
  '/',
  authenticateToken,
  authorize(Role.ADMIN),
  journalController.getAll.bind(journalController)
);

router.get(
  '/users',
  authenticateToken,
  authorize(Role.ADMIN),
  journalController.getUsers.bind(journalController)
);

router.get(
  '/stats',
  authenticateToken,
  authorize(Role.ADMIN),
  journalController.getStats.bind(journalController)
);

export default router;
