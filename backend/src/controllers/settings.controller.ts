// Controller des paramètres de l'entreprise
import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess, sendError } from '../utils/response';

export class SettingsController {
  async get(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.get();
      sendSuccess(res, settings);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.update(req.body);
      sendSuccess(res, settings, 'Paramètres mis à jour avec succès');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const settingsController = new SettingsController();
