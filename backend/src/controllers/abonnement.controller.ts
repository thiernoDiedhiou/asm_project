import { Request, Response } from 'express';
import { abonnementService } from '../services/abonnement.service';
import { sendSuccess, sendError } from '../utils/response';

export class AbonnementController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const paiements = await abonnementService.list(req.params.tenantId);
      sendSuccess(res, paiements);
    } catch (err) {
      sendError(res, err instanceof Error ? err.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { montant, methode, reference, periode, notes } = req.body;
      if (!montant || !methode || !periode) {
        sendError(res, 'montant, methode et periode sont obligatoires', 400);
        return;
      }
      const paiement = await abonnementService.create(req.params.tenantId, {
        montant: parseFloat(montant),
        methode, reference, periode, notes,
      });
      sendSuccess(res, paiement, 'Paiement enregistré et facture générée', 201);
    } catch (err) {
      sendError(res, err instanceof Error ? err.message : 'Erreur serveur', 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await abonnementService.delete(req.params.paiementId, req.params.tenantId);
      sendSuccess(res, null, 'Paiement supprimé');
    } catch (err) {
      sendError(res, err instanceof Error ? err.message : 'Erreur serveur', 400);
    }
  }
}

export const abonnementController = new AbonnementController();
