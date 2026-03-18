// Middleware de journalisation des actions Super Admin
// - Log Winston pour toutes les actions write (POST/PUT/DELETE)
// - Log journalActivite DB quand une action cible un tenant spécifique
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function logSuperAdminAction(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method)) {
    return next();
  }

  // Log après envoi de la réponse (non-bloquant)
  res.on('finish', () => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') return;
    if (res.statusCode >= 400) return; // Ne pas logguer les erreurs

    const url = req.originalUrl;
    const method = req.method;
    const action = `SA_${method}`;

    // Log Winston (toujours)
    logger.info(`[SA] ${method} ${url} — userId=${req.user.userId} status=${res.statusCode}`);

    // Log DB si l'URL cible un tenant précis : /tenants/:id/...
    const match = url.match(/\/tenants\/([a-z0-9-]+)/i);
    const targetTenantId = match?.[1];

    if (targetTenantId && !['plans', 'stats', 'mrr', 'journal'].includes(targetTenantId)) {
      prisma.journalActivite.create({
        data: {
          userId: req.user.userId,
          userNom: 'Super Admin',
          userRole: 'SUPER_ADMIN',
          action,
          entite: 'TENANT',
          entiteId: targetTenantId,
          tenantId: targetTenantId,
          details: {
            url,
            method,
            body: req.body ?? {},
          },
        },
      }).catch(() => { /* silencieux */ });
    }
  });

  next();
}
