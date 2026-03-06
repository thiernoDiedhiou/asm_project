// Controller dashboard
import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess, sendError } from '../utils/response';

export class DashboardController {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getRevenus(req: Request, res: Response): Promise<void> {
    try {
      const periode = (req.query.periode as 'mois' | 'semaine' | 'annee') || 'mois';
      const revenus = await dashboardService.getRevenus(periode);
      sendSuccess(res, revenus);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getVehiculesPerformance(req: Request, res: Response): Promise<void> {
    try {
      const perf = await dashboardService.getVehiculesPerformance();
      sendSuccess(res, perf);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getAlertes(req: Request, res: Response): Promise<void> {
    try {
      const alertes = await dashboardService.getAlertes();
      sendSuccess(res, alertes);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getRecentesReservations(req: Request, res: Response): Promise<void> {
    try {
      const reservations = await dashboardService.getRecentesReservations();
      sendSuccess(res, reservations);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }
}

export const dashboardController = new DashboardController();
