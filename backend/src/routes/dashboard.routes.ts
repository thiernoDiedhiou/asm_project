// Routes dashboard et maintenance
import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';
import {
  sendSuccess,
  sendError,
  sendPaginatedSuccess,
} from '../utils/response';
import { validateBody } from '../middlewares/validate.middleware';
import { createMaintenanceSchema } from '../validators/contrat.validator';

const router = Router();

// ---- Dashboard ----
router.get(
  '/dashboard/stats',
  authenticateToken,
  dashboardController.getStats.bind(dashboardController)
);

router.get(
  '/dashboard/revenus',
  authenticateToken,
  dashboardController.getRevenus.bind(dashboardController)
);

router.get(
  '/dashboard/vehicules/performance',
  authenticateToken,
  dashboardController.getVehiculesPerformance.bind(dashboardController)
);

router.get(
  '/dashboard/alertes',
  authenticateToken,
  dashboardController.getAlertes.bind(dashboardController)
);

router.get(
  '/dashboard/reservations/recentes',
  authenticateToken,
  dashboardController.getRecentesReservations.bind(dashboardController)
);

// ---- Maintenances ----
router.get('/maintenances', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const tenantId = req.tenantId!;

    const [maintenances, total] = await Promise.all([
      prisma.maintenance.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { dateDebut: 'desc' },
        include: {
          vehicule: {
            select: {
              marque: true,
              modele: true,
              immatriculation: true,
            },
          },
        },
      }),
      prisma.maintenance.count({ where: { tenantId } }),
    ]);

    sendPaginatedSuccess(res, maintenances, { page, limit, total });
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : 'Erreur serveur',
      500
    );
  }
});

router.post(
  '/maintenances',
  authenticateToken,
  validateBody(createMaintenanceSchema),
  async (req, res) => {
    try {
      // Mettre le véhicule en maintenance
      const maintenance = await prisma.$transaction(async (tx) => {
        const m = await tx.maintenance.create({
          data: {
            ...req.body,
            tenantId: req.tenantId!,
            dateDebut: new Date(req.body.dateDebut),
            dateFin: req.body.dateFin ? new Date(req.body.dateFin) : undefined,
          },
        });

        await tx.vehicule.update({
          where: { id: req.body.vehiculeId, tenantId: req.tenantId! },
          data: { statut: 'EN_MAINTENANCE' },
        });

        return m;
      });

      sendSuccess(res, maintenance, 'Maintenance planifiée', 201);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error.message : 'Erreur serveur',
        400
      );
    }
  }
);

router.put('/maintenances/:id', authenticateToken, async (req, res) => {
  try {
    const { dateDebut, dateFin, ...rest } = req.body;
    const maintenance = await prisma.maintenance.update({
      where: { id: req.params.id, tenantId: req.tenantId! },
      data: {
        ...rest,
        ...(dateDebut && { dateDebut: new Date(dateDebut) }),
        ...(dateFin && { dateFin: new Date(dateFin) }),
      },
    });

    // Si la maintenance est terminée, remettre le véhicule disponible
    if (req.body.statut === 'TERMINEE') {
      await prisma.vehicule.update({
        where: { id: maintenance.vehiculeId, tenantId: req.tenantId! },
        data: { statut: 'DISPONIBLE' },
      });
    }

    sendSuccess(res, maintenance, 'Maintenance mise à jour');
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : 'Erreur serveur',
      400
    );
  }
});

// ---- Gestion Utilisateurs (Admin) ----
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantId!, role: { not: 'SUPER_ADMIN' } },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, users);
  } catch (error) {
    sendError(res, 'Erreur serveur', 500);
  }
});

export default router;
