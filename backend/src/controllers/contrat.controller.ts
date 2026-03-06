// Controller contrats et paiements
import { Request, Response } from 'express';
import { contratService, paiementService } from '../services/contrat.service';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendPaginatedSuccess,
} from '../utils/response';
import { logAction, ACTIONS, ENTITES } from '../utils/journal';
import { PaiementFilters } from '../validators/contrat.validator';
import path from 'path';
import fs from 'fs';

export class ContratController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const statut = req.query.statut as string | undefined;
      const search = (req.query.search as string) || undefined;
      const { contrats, total } = await contratService.getAll(page, limit, statut, search);
      sendPaginatedSuccess(res, contrats, { page, limit, total });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const contrat = await contratService.getById(req.params.id);
      if (!contrat) { sendNotFound(res, 'Contrat introuvable'); return; }
      sendSuccess(res, contrat);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) { sendError(res, 'Non authentifié', 401); return; }
      const contrat = await contratService.create(req.body, req.user.userId);

      logAction({
        userId: req.user.userId,
        userRole: req.user.role,
        action: ACTIONS.CONTRAT_CREE,
        entite: ENTITES.CONTRAT,
        entiteId: contrat.id,
        details: { numeroContrat: contrat.numeroContrat, reservationId: contrat.reservationId },
      }).catch(() => {});

      sendSuccess(res, contrat, 'Contrat créé avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const contrat = await contratService.update(req.params.id, req.body);
      sendSuccess(res, contrat, 'Contrat mis à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async cloture(req: Request, res: Response): Promise<void> {
    try {
      const contrat = await contratService.cloture(req.params.id, req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.CONTRAT_CLOTURE,
          entite: ENTITES.CONTRAT,
          entiteId: req.params.id,
          details: { kilometrageRetour: req.body.kilometrageRetour },
        }).catch(() => {});
      }

      sendSuccess(res, contrat, 'Contrat clôturé avec succès');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const pdfUrl = await contratService.generatePdf(req.params.id);
      const filePath = path.join(process.cwd(), pdfUrl);

      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="contrat-${req.params.id}.pdf"`
        );
        fs.createReadStream(filePath).pipe(res);
      } else {
        sendSuccess(res, { pdfUrl }, 'PDF généré');
      }
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur génération PDF', 500);
    }
  }
}

export class PaiementController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query as unknown as PaiementFilters;
      const { paiements, total } = await paiementService.getAll(filters);
      sendPaginatedSuccess(res, paiements, {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total,
      });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getByContrat(req: Request, res: Response): Promise<void> {
    try {
      const result = await paiementService.getByContrat(req.params.contratId);
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const paiement = await paiementService.create(req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.PAIEMENT_ENREGISTRE,
          entite: ENTITES.PAIEMENT,
          entiteId: paiement.id,
          details: { montant: paiement.montant, methode: paiement.methode, contratId: paiement.contratId },
        }).catch(() => {});
      }

      sendSuccess(res, paiement, 'Paiement enregistré', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async valider(req: Request, res: Response): Promise<void> {
    try {
      const valide = req.body.valide !== false;
      const paiement = await paiementService.valider(req.params.id, valide);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: valide ? ACTIONS.PAIEMENT_VALIDE : ACTIONS.PAIEMENT_INVALIDE,
          entite: ENTITES.PAIEMENT,
          entiteId: req.params.id,
        }).catch(() => {});
      }

      sendSuccess(res, paiement, `Paiement ${valide ? 'validé' : 'invalidé'}`);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { dateDebut, dateFin } = req.query as {
        dateDebut?: string;
        dateFin?: string;
      };
      const stats = await paiementService.getStatsByMethode(
        dateDebut ? new Date(dateDebut) : undefined,
        dateFin ? new Date(dateFin) : undefined
      );
      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async generateRecu(req: Request, res: Response): Promise<void> {
    try {
      const buffer = await paiementService.generateRecu(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="recu-paiement-${req.params.id.slice(-8)}.pdf"`
      );
      res.send(buffer);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur génération reçu', 500);
    }
  }
}

export const contratController = new ContratController();
export const paiementController = new PaiementController();
