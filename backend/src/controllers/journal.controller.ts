// Contrôleur du journal d'activité — admin uniquement
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError, sendPaginatedSuccess } from '../utils/response';

export class JournalController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        action,
        entite,
        dateDebut,
        dateFin,
        page: pageStr = '1',
        limit: limitStr = '50',
      } = req.query as Record<string, string>;

      const page = Math.max(1, parseInt(pageStr) || 1);
      const limit = Math.min(100, parseInt(limitStr) || 50);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { tenantId: req.tenantId! };

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entite) where.entite = entite;

      if (dateDebut || dateFin) {
        where.createdAt = {
          ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
          ...(dateFin ? { lte: new Date(new Date(dateFin).setHours(23, 59, 59, 999)) } : {}),
        };
      }

      const [entries, total] = await Promise.all([
        prisma.journalActivite.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.journalActivite.count({ where }),
      ]);

      sendPaginatedSuccess(res, entries, { page, limit, total });
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.journalActivite.findMany({
        where: { tenantId: req.tenantId! },
        distinct: ['userId'],
        select: {
          userId: true,
          userNom: true,
          userRole: true,
        },
        orderBy: { userNom: 'asc' },
      });
      sendSuccess(res, users);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { dateDebut, dateFin } = req.query as Record<string, string>;

      const where: Record<string, unknown> = { tenantId: req.tenantId! };
      if (dateDebut || dateFin) {
        where.createdAt = {
          ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
          ...(dateFin ? { lte: new Date(new Date(dateFin).setHours(23, 59, 59, 999)) } : {}),
        };
      }

      const stats = await prisma.journalActivite.groupBy({
        by: ['userId', 'userNom', 'userRole'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      const result = stats.map((s) => ({
        userId: s.userId,
        userNom: s.userNom,
        userRole: s.userRole,
        totalActions: s._count.id,
      }));

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }
}

export const journalController = new JournalController();
