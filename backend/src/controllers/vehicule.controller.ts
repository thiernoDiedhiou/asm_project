// Controller véhicules
import { Request, Response } from 'express';
import { vehiculeService } from '../services/vehicule.service';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendPaginatedSuccess,
} from '../utils/response';
import { logAction, ACTIONS, ENTITES } from '../utils/journal';
import { VehiculeFilters } from '../validators/vehicule.validator';

export class VehiculeController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query as unknown as VehiculeFilters;
      const { vehicules, total } = await vehiculeService.getAll(filters);
      sendPaginatedSuccess(res, vehicules, {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total,
      });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const vehicule = await vehiculeService.getById(req.params.id);
      if (!vehicule) { sendNotFound(res, 'Véhicule introuvable'); return; }
      sendSuccess(res, vehicule);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const vehicule = await vehiculeService.create(req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.VEHICULE_CREE,
          entite: ENTITES.VEHICULE,
          entiteId: vehicule.id,
          details: { marque: vehicule.marque, modele: vehicule.modele, immatriculation: vehicule.immatriculation },
        }).catch(() => {});
      }

      sendSuccess(res, vehicule, 'Véhicule créé avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const vehicule = await vehiculeService.update(req.params.id, req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.VEHICULE_MODIFIE,
          entite: ENTITES.VEHICULE,
          entiteId: req.params.id,
          details: { champsModifies: Object.keys(req.body) },
        }).catch(() => {});
      }

      sendSuccess(res, vehicule, 'Véhicule mis à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await vehiculeService.delete(req.params.id);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.VEHICULE_SUPPRIME,
          entite: ENTITES.VEHICULE,
          entiteId: req.params.id,
        }).catch(() => {});
      }

      sendSuccess(res, null, 'Véhicule supprimé');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async checkDisponibilite(req: Request, res: Response): Promise<void> {
    try {
      const { debut, fin } = req.query as { debut: string; fin: string };
      const result = await vehiculeService.checkDisponibilite(
        req.params.id,
        new Date(debut),
        new Date(fin)
      );
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async uploadPhotos(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        sendError(res, 'Aucune photo fournie');
        return;
      }
      const paths = files.map((f) => `/uploads/vehicules/${f.filename}`);
      const vehicule = await vehiculeService.addPhotos(req.params.id, paths);
      sendSuccess(res, vehicule, 'Photos ajoutées');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const vehiculeController = new VehiculeController();
