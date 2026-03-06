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
    req.user = payload;
    next();
  } catch {
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
    } catch {
      // Token invalide ignoré en mode optionnel
    }
  }

  next();
}
