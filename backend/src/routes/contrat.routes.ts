// Routes contrats et paiements
import { Router } from 'express';
import {
  contratController,
  paiementController,
} from '../controllers/contrat.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  createContratSchema,
  updateContratSchema,
  clotureContratSchema,
  createPaiementSchema,
  paiementFiltresSchema,
} from '../validators/contrat.validator';
import { Role } from '@prisma/client';

const router = Router();

// ---- Routes Contrats ----
router.get(
  '/contrats',
  authenticateToken,
  contratController.getAll.bind(contratController)
);

router.get(
  '/contrats/:id',
  authenticateToken,
  contratController.getById.bind(contratController)
);

router.post(
  '/contrats',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createContratSchema),
  contratController.create.bind(contratController)
);

router.put(
  '/contrats/:id',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(updateContratSchema),
  contratController.update.bind(contratController)
);

router.get(
  '/contrats/:id/pdf',
  authenticateToken,
  contratController.generatePdf.bind(contratController)
);

router.post(
  '/contrats/:id/cloture',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(clotureContratSchema),
  contratController.cloture.bind(contratController)
);

// ---- Routes Paiements ----
router.get(
  '/paiements',
  authenticateToken,
  validateQuery(paiementFiltresSchema),
  paiementController.getAll.bind(paiementController)
);

router.get(
  '/paiements/stats',
  authenticateToken,
  authorize(Role.ADMIN, Role.COMPTABLE),
  paiementController.getStats.bind(paiementController)
);

router.get(
  '/paiements/contrat/:contratId',
  authenticateToken,
  paiementController.getByContrat.bind(paiementController)
);

router.post(
  '/paiements',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createPaiementSchema),
  paiementController.create.bind(paiementController)
);

router.put(
  '/paiements/:id/valider',
  authenticateToken,
  authorize(Role.ADMIN, Role.COMPTABLE),
  paiementController.valider.bind(paiementController)
);

router.get(
  '/paiements/:id/recu',
  authenticateToken,
  paiementController.generateRecu.bind(paiementController)
);

export default router;
