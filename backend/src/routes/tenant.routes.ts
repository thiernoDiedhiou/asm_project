import { Router } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { abonnementController } from '../controllers/abonnement.controller';
import { planController } from '../controllers/plan.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { logSuperAdminAction } from '../middlewares/superAdminLog.middleware';
import { Role } from '@prisma/client';

const router = Router();
const SA = [authenticateToken, authorize(Role.SUPER_ADMIN)];

// Log automatique de toutes les actions write du Super Admin
router.use(logSuperAdminAction);

// ---- Routes statiques AVANT /:id ----
router.get('/stats', ...SA, tenantController.getPlatformStats.bind(tenantController));
router.get('/mrr', ...SA, tenantController.getMrrStats.bind(tenantController));
router.get('/journal', ...SA, tenantController.getGlobalJournal.bind(tenantController));

// Plans d'abonnement (plateforme)
router.get('/plans', ...SA, planController.getAll.bind(planController));
router.put('/plans/:code', ...SA, planController.update.bind(planController));

// Tenants CRUD
router.get('/', ...SA, tenantController.getAll.bind(tenantController));
router.post('/', ...SA, tenantController.create.bind(tenantController));

// ---- Routes /:id ----
router.get('/:id/detail', ...SA, tenantController.getDetail.bind(tenantController));
router.post('/:id/impersonate', ...SA, tenantController.impersonate.bind(tenantController));
router.post('/:id/renouveler', ...SA, tenantController.renouveler.bind(tenantController));
router.put('/:id', ...SA, tenantController.update.bind(tenantController));
router.get('/:id', ...SA, tenantController.getById.bind(tenantController));

// Paiements abonnement du tenant
router.get('/:tenantId/abonnements', ...SA, abonnementController.list.bind(abonnementController));
router.post('/:tenantId/abonnements', ...SA, abonnementController.create.bind(abonnementController));
router.delete('/:tenantId/abonnements/:paiementId', ...SA, abonnementController.delete.bind(abonnementController));

export default router;
