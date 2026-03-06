import { Request, Response } from 'express';
import { maintenanceService } from '../services/maintenance.service';
import { sendSuccess, sendError, sendNotFound, sendPaginatedSuccess } from '../utils/response';
import { logAction, ACTIONS, ENTITES } from '../utils/journal';
import { MaintenanceFiltres } from '../validators/maintenance.validator';

export class MaintenanceController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query as unknown as MaintenanceFiltres;
      const { maintenances, total } = await maintenanceService.getAll(filters);
      sendPaginatedSuccess(res, maintenances, { page: filters.page || 1, limit: filters.limit || 20, total });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const maintenance = await maintenanceService.getById(req.params.id);
      if (!maintenance) { sendNotFound(res, 'Maintenance introuvable'); return; }
      sendSuccess(res, maintenance);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const maintenance = await maintenanceService.create(req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.MAINTENANCE_CREEE,
          entite: ENTITES.MAINTENANCE,
          entiteId: maintenance.id,
          details: { type: maintenance.type, vehiculeId: maintenance.vehiculeId },
        }).catch(() => {});
      }

      sendSuccess(res, maintenance, 'Maintenance créée avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const maintenance = await maintenanceService.update(req.params.id, req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.MAINTENANCE_MODIFIEE,
          entite: ENTITES.MAINTENANCE,
          entiteId: req.params.id,
          details: { statut: req.body.statut },
        }).catch(() => {});
      }

      sendSuccess(res, maintenance, 'Maintenance mise à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await maintenanceService.delete(req.params.id);
      sendSuccess(res, null, 'Maintenance supprimée');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await maintenanceService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }
}

export const maintenanceController = new MaintenanceController();
