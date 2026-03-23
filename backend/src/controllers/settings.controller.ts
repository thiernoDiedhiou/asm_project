// Controller des paramètres de l'entreprise
import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess, sendError } from '../utils/response';
import fs from 'fs';
import path from 'path';

export class SettingsController {
  async get(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) { sendError(res, 'Tenant non résolu', 400); return; }
      const settings = await settingsService.get(req.tenantId);
      sendSuccess(res, settings);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) { sendError(res, 'Tenant non résolu', 400); return; }
      const settings = await settingsService.update(req.tenantId, req.body);
      sendSuccess(res, settings, 'Paramètres mis à jour avec succès');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) { sendError(res, 'Tenant non résolu', 400); return; }
      if (!req.file) { sendError(res, 'Aucun fichier reçu', 400); return; }

      const logoUrl = `/uploads/logos/${req.file.filename}`;

      // Supprimer l'ancien logo si existant
      const current = await settingsService.get(req.tenantId);
      if (current.logo) {
        const oldPath = path.join(process.cwd(), current.logo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const settings = await settingsService.update(req.tenantId, { logo: logoUrl });
      sendSuccess(res, settings, 'Logo mis à jour avec succès');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async deleteLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) { sendError(res, 'Tenant non résolu', 400); return; }

      const current = await settingsService.get(req.tenantId);
      if (current.logo) {
        const oldPath = path.join(process.cwd(), current.logo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const settings = await settingsService.update(req.tenantId, { logo: null });
      sendSuccess(res, settings, 'Logo supprimé avec succès');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }
}

export const settingsController = new SettingsController();
