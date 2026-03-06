// Routes clients
import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  createClientSchema,
  updateClientSchema,
  clientFiltresSchema,
} from '../validators/client.validator';

const router = Router();

router.get(
  '/',
  authenticateToken,
  validateQuery(clientFiltresSchema),
  clientController.getAll.bind(clientController)
);

router.get(
  '/:id',
  authenticateToken,
  clientController.getById.bind(clientController)
);

router.get(
  '/:id/historique',
  authenticateToken,
  clientController.getHistorique.bind(clientController)
);

router.post(
  '/',
  authenticateToken,
  validateBody(createClientSchema),
  clientController.create.bind(clientController)
);

router.put(
  '/:id',
  authenticateToken,
  validateBody(updateClientSchema),
  clientController.update.bind(clientController)
);

export default router;
