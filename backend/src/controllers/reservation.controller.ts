// Controller réservations
import { Request, Response } from 'express';
import { reservationService } from '../services/reservation.service';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendPaginatedSuccess,
} from '../utils/response';
import { logAction, ACTIONS, ENTITES } from '../utils/journal';
import { ReservationFilters } from '../validators/reservation.validator';

export class ReservationController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query as unknown as ReservationFilters;
      const { reservations, total } = await reservationService.getAll(filters);
      sendPaginatedSuccess(res, reservations, {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total,
      });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getCalendrier(req: Request, res: Response): Promise<void> {
    try {
      const { mois, annee } = req.query as { mois: string; annee: string };
      const reservations = await reservationService.getCalendrier(
        parseInt(mois),
        parseInt(annee)
      );
      sendSuccess(res, reservations);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const reservation = await reservationService.getById(req.params.id);
      if (!reservation) { sendNotFound(res, 'Réservation introuvable'); return; }
      sendSuccess(res, reservation);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) { sendError(res, 'Non authentifié', 401); return; }
      const result = await reservationService.create(req.body, req.user.userId);
      const { reservation } = result;

      logAction({
        userId: req.user.userId,
        userRole: req.user.role,
        action: ACTIONS.RESERVATION_CREEE,
        entite: ENTITES.RESERVATION,
        entiteId: reservation.id,
        details: {
          numeroReservation: reservation.numeroReservation,
          clientId: reservation.clientId,
          vehiculeId: reservation.vehiculeId,
        },
      }).catch(() => {});

      sendSuccess(res, result, 'Réservation créée avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async updateStatut(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) { sendError(res, 'Non authentifié', 401); return; }
      const reservation = await reservationService.updateStatut(
        req.params.id,
        req.body,
        req.user.userId
      );

      logAction({
        userId: req.user.userId,
        userRole: req.user.role,
        action: ACTIONS.RESERVATION_STATUT_MODIFIE,
        entite: ENTITES.RESERVATION,
        entiteId: req.params.id,
        details: { nouveauStatut: req.body.statut },
      }).catch(() => {});

      sendSuccess(res, reservation, 'Statut mis à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await reservationService.delete(req.params.id);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.RESERVATION_SUPPRIMEE,
          entite: ENTITES.RESERVATION,
          entiteId: req.params.id,
        }).catch(() => {});
      }

      sendSuccess(res, null, 'Réservation supprimée');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const reservationController = new ReservationController();
