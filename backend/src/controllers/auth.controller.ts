// Controller d'authentification
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
} from '../utils/response';
import { logAction, ACTIONS, ENTITES } from '../utils/journal';
import logger from '../utils/logger';

export class AuthController {
  /**
   * POST /api/auth/login
   * Connexion avec email/mot de passe
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body, req.tenantId);

      // Journal : connexion réussie (tenantId peut être undefined pour SUPER_ADMIN hors tenant)
      if (req.tenantId) {
        logAction({
          userId: result.user.id,
          tenantId: req.tenantId,
          userNom: `${result.user.prenom} ${result.user.nom}`,
          userRole: result.user.role,
          action: ACTIONS.LOGIN,
          entite: ENTITES.AUTH,
          details: { email: req.body.email },
        }).catch(() => {});
      }

      sendSuccess(res, result, 'Connexion réussie');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur de connexion';
      sendError(res, message, 401);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        sendUnauthorized(res, 'Token de rafraîchissement manquant');
        return;
      }

      const result = await authService.refresh(refreshToken);
      sendSuccess(res, result, 'Token rafraîchi avec succès');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur de rafraîchissement';
      sendError(res, message, 401);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : '';

      const { refreshToken } = req.body;

      if (req.user && req.tenantId) {
        logAction({
          userId: req.user.userId,
          tenantId: req.tenantId,
          userRole: req.user.role,
          action: ACTIONS.LOGOUT,
          entite: ENTITES.AUTH,
        }).catch(() => {});
      }

      await authService.logout(accessToken, refreshToken);
      sendSuccess(res, null, 'Déconnexion réussie');
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
      sendSuccess(res, null, 'Déconnexion effectuée');
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const user = await authService.getMe(req.user.userId);
      sendSuccess(res, user);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur serveur';
      sendError(res, message, 500);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) { sendError(res, 'Email requis', 400); return; }
      const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
      await authService.forgotPassword(email, req.tenantId, origin as string);
      // Toujours retourner succès (anti-énumération)
      sendSuccess(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      sendError(res, message, 500);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, nouveauMotDePasse } = req.body;
      if (!token || !nouveauMotDePasse) { sendError(res, 'Token et nouveau mot de passe requis', 400); return; }
      await authService.resetPassword(token, nouveauMotDePasse);
      sendSuccess(res, null, 'Mot de passe réinitialisé avec succès');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      sendError(res, message, 400);
    }
  }

  /**
   * PUT /api/auth/password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) { sendUnauthorized(res); return; }
      const { motDePasseActuel, nouveauMotDePasse } = req.body;
      if (!motDePasseActuel || !nouveauMotDePasse) {
        sendError(res, 'Mot de passe actuel et nouveau mot de passe requis', 400);
        return;
      }
      if (nouveauMotDePasse.length < 8) {
        sendError(res, 'Le nouveau mot de passe doit faire au moins 8 caractères', 400);
        return;
      }
      await authService.changePassword(req.user.userId, motDePasseActuel, nouveauMotDePasse);
      sendSuccess(res, null, 'Mot de passe modifié avec succès');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      sendError(res, message, 400);
    }
  }
}

export const authController = new AuthController();
