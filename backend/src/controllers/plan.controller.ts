import { Request, Response } from 'express';
import { planService } from '../services/plan.service';
import { sendSuccess, sendError } from '../utils/response';

export class PlanController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const plans = await planService.getAll();
      sendSuccess(res, plans);
    } catch (err) {
      sendError(res, err instanceof Error ? err.message : 'Erreur serveur', 500);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const plan = await planService.update(req.params.code, req.body);
      sendSuccess(res, plan, 'Plan mis à jour');
    } catch (err) {
      sendError(res, err instanceof Error ? err.message : 'Erreur serveur', 400);
    }
  }
}

export const planController = new PlanController();
