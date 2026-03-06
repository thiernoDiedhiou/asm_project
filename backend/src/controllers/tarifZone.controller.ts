// Controller des zones tarifaires
import { Request, Response } from 'express';
import { tarifZoneService } from '../services/tarifZone.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';

export class TarifZoneController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const actifSeulement = req.query.actif === 'true';
      const zones = await tarifZoneService.getAll(actifSeulement);
      sendSuccess(res, zones);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const zone = await tarifZoneService.create(req.body);
      sendSuccess(res, zone, 'Zone créée avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const zone = await tarifZoneService.update(req.params.id, req.body);
      sendSuccess(res, zone, 'Zone mise à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await tarifZoneService.delete(req.params.id);
      sendSuccess(res, null, 'Zone supprimée');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const tarifZoneController = new TarifZoneController();
