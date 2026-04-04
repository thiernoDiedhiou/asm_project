import { Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
import { sendSuccess, sendError, sendPaginatedSuccess } from '../utils/response';
import prisma from '../utils/prisma';

export class TenantController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const tenants = await tenantService.getAll();
      sendSuccess(res, tenants);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.getById(req.params.id);
      if (!tenant) { sendError(res, 'Tenant introuvable', 404); return; }
      sendSuccess(res, tenant);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.create(req.body);
      sendSuccess(res, tenant, 'Tenant créé avec succès', 201);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.update(req.params.id, req.body);
      sendSuccess(res, tenant, 'Tenant mis à jour');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async getPlatformStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await tenantService.getPlatformStats();
      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async impersonate(req: Request, res: Response): Promise<void> {
    try {
      const result = await tenantService.impersonate(req.params.id);
      sendSuccess(res, result, 'Session démarrée');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async getDetail(req: Request, res: Response): Promise<void> {
    try {
      const detail = await tenantService.getDetail(req.params.id);
      if (!detail) { sendError(res, 'Tenant introuvable', 404); return; }
      sendSuccess(res, detail);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getMrrStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await tenantService.getMrrStats();
      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async renouveler(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.renouveler(req.params.id);
      sendSuccess(res, tenant, 'Abonnement renouvelé (+1 mois)');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  async getGlobalJournal(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const { entries, total } = await tenantService.getGlobalJournal(page, limit);
      sendPaginatedSuccess(res, entries, { page, limit, total });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async deleteTenant(req: Request, res: Response): Promise<void> {
    try {
      await tenantService.deleteTenant(req.params.id);
      sendSuccess(res, null, 'Tenant et toutes ses données supprimés définitivement');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }

  /**
   * GET /api/tenants/vehicules
   * Retourne tous les véhicules de tous les tenants actifs (SUPER_ADMIN uniquement).
   * Inclut les infos du tenant pour affichage groupé.
   */
  async getAllVehicules(req: Request, res: Response): Promise<void> {
    try {
      const { statut, categorie, search, tenantId } = req.query as Record<string, string>;

      const vehicules = await prisma.vehicule.findMany({
        where: {
          tenant: { actif: true },
          ...(tenantId && { tenantId }),
          ...(statut && { statut: statut as never }),
          ...(categorie && { categorie: categorie as never }),
          ...(search && {
            OR: [
              { marque: { contains: search, mode: 'insensitive' } },
              { modele: { contains: search, mode: 'insensitive' } },
              { immatriculation: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          marque: true,
          modele: true,
          annee: true,
          couleur: true,
          immatriculation: true,
          categorie: true,
          statut: true,
          kilometrage: true,
          prixJournalier: true,
          prixSemaine: true,
          photos: true,
          tenant: {
            select: {
              id: true,
              slug: true,
              nomEntreprise: true,
              couleurPrimaire: true,
            },
          },
        },
        orderBy: [{ tenant: { nomEntreprise: 'asc' } }, { marque: 'asc' }],
      });

      sendSuccess(res, vehicules);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async updateAdminEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        sendError(res, 'Email invalide', 400);
        return;
      }
      const user = await tenantService.updateAdminEmail(id, userId, email.trim().toLowerCase());
      sendSuccess(res, user, 'Email mis à jour avec succès');
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 400);
    }
  }
}

export const tenantController = new TenantController();
