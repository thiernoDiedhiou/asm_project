// Routes réservations
import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  createReservationSchema,
  updateStatutReservationSchema,
  reservationFiltresSchema,
  calendrierQuerySchema,
} from '../validators/reservation.validator';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/calendrier',
  authenticateToken,
  validateQuery(calendrierQuerySchema),
  reservationController.getCalendrier.bind(reservationController)
);

router.get(
  '/',
  authenticateToken,
  validateQuery(reservationFiltresSchema),
  reservationController.getAll.bind(reservationController)
);

router.get(
  '/:id',
  authenticateToken,
  reservationController.getById.bind(reservationController)
);

router.post(
  '/',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(createReservationSchema),
  reservationController.create.bind(reservationController)
);

router.put(
  '/:id/statut',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  validateBody(updateStatutReservationSchema),
  reservationController.updateStatut.bind(reservationController)
);

router.put(
  '/:id/prolonger',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  reservationController.prolonger.bind(reservationController)
);

router.delete(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN, Role.AGENT),
  reservationController.delete.bind(reservationController)
);

export default router;
