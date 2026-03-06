// Controller tarification
import { Request, Response } from 'express';
import { tarificationService } from '../services/tarification.service';
import { sendSuccess, sendError } from '../utils/response';

export class TarificationController {
  async getMatrix(req: Request, res: Response): Promise<void> {
    try {
      const matrix = await tarificationService.getMatrix();
      sendSuccess(res, matrix);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async updateCell(req: Request, res: Response): Promise<void> {
    try {
      const { prixJournalier, prixSemaine } = req.body;
      if (typeof prixJournalier !== 'number' || prixJournalier <= 0) {
        sendError(res, 'prixJournalier doit être un nombre positif', 400);
        return;
      }
      const updated = await tarificationService.updateCell(req.params.id, {
        prixJournalier,
        prixSemaine: prixSemaine ?? null,
      });
      sendSuccess(res, updated, 'Prix mis à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const tarificationController = new TarificationController();
