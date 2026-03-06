import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceFiltresSchema,
} from '../validators/maintenance.validator';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/',
  authenticateToken,
  validateQuery(maintenanceFiltresSchema),
  maintenanceController.getAll.bind(maintenanceController)
);

router.get(
  '/stats',
  authenticateToken,
  authorize(Role.ADMIN),
  maintenanceController.getStats.bind(maintenanceController)
);

router.get(
  '/:id',
  authenticateToken,
  maintenanceController.getById.bind(maintenanceController)
);

router.post(
  '/',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createMaintenanceSchema),
  maintenanceController.create.bind(maintenanceController)
);

router.put(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(updateMaintenanceSchema),
  maintenanceController.update.bind(maintenanceController)
);

router.delete(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN),
  maintenanceController.delete.bind(maintenanceController)
);

export default router;
