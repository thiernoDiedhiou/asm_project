// Middleware d'authentification JWT
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import prisma from '../utils/prisma';

// Extension du type Request pour inclure l'utilisateur authentifié
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Vérifie le token JWT et ajoute l'utilisateur à la requête
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    sendUnauthorized(res, 'Token d\'authentification manquant');
    return;
  }

  try {
    // Vérifier que le token n'est pas blacklisté (logout)
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token },
    });

    if (blacklisted) {
      sendUnauthorized(res, 'Session expirée, veuillez vous reconnecter');
      return;
    }

    const payload = verifyAccessToken(token);

    // Vérifier que l'utilisateur est toujours actif en DB
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tenantId: true, actif: true, tenant: { select: { actif: true } } },
    });

    if (!dbUser || !dbUser.actif) {
      sendUnauthorized(res, 'Compte utilisateur désactivé');
      return;
    }

    // Pour les non-SUPER_ADMIN : vérifier que le tenant est toujours actif
    if (payload.role !== 'SUPER_ADMIN' && dbUser.tenant && !dbUser.tenant.actif) {
      sendForbidden(res, 'Abonnement suspendu — contactez votre administrateur');
      return;
    }

    req.user = payload;
    // Le tenantId du JWT est prioritaire sur celui résolu par le sous-domaine
    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    } else if (dbUser.tenantId) {
      req.tenantId = dbUser.tenantId;
    }
    next();
  } catch (err) {
    // Erreur de vérification JWT (signature invalide, expiré...)
    sendUnauthorized(res, 'Token invalide ou expiré');
  }
}

/**
 * Vérifie que l'utilisateur possède un des rôles requis
 * Usage: authorize(Role.ADMIN, Role.AGENT)
 */
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(
        res,
        `Accès refusé. Rôles requis: ${roles.join(', ')}`
      );
      return;
    }

    next();
  };
}

/**
 * Middleware optionnel: authentifie si token présent, continue sinon
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      if (payload.tenantId) {
        req.tenantId = payload.tenantId;
      } else if (payload.role !== 'SUPER_ADMIN') {
        // Fallback: vieux token sans tenantId → lire depuis la DB
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { tenantId: true },
        });
        if (dbUser?.tenantId) {
          req.tenantId = dbUser.tenantId;
        }
      }
    } catch {
      // Token invalide ignoré en mode optionnel
    }
  }

  next();
}
