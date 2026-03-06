// Controller clients
import { Request, Response } from 'express';
import { clientService } from '../services/client.service';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendPaginatedSuccess,
} from '../utils/response';
import { logAction, ACTIONS, ENTITES } from '../utils/journal';
import { ClientFilters } from '../validators/client.validator';

export class ClientController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query as unknown as ClientFilters;
      const { clients, total } = await clientService.getAll(filters);
      sendPaginatedSuccess(res, clients, {
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
      const client = await clientService.getById(req.params.id);
      if (!client) { sendNotFound(res, 'Client introuvable'); return; }
      sendSuccess(res, client);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getHistorique(req: Request, res: Response): Promise<void> {
    try {
      const result = await clientService.getHistorique(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientService.create(req.body);

      if (req.user) {
        logAction({
          userId: req.user.userId,
          userRole: req.user.role,
          action: ACTIONS.CLIENT_CREE,
          entite: ENTITES.CLIENT,
          entiteId: client.id,
          details: { nom: `${client.prenom} ${client.nom}`, telephone: client.telephone },
        }).catch(() => {});
      }

      sendSuccess(res, client, 'Client créé avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientService.update(req.params.id, req.body);
      sendSuccess(res, client, 'Client mis à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const clientController = new ClientController();
