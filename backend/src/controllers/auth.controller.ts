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
      const result = await authService.login(req.body);

      // Journal : connexion réussie
      logAction({
        userId: result.user.id,
        userNom: `${result.user.prenom} ${result.user.nom}`,
        userRole: result.user.role,
        action: ACTIONS.LOGIN,
        entite: ENTITES.AUTH,
        details: { email: req.body.email },
      }).catch(() => {});

      sendSuccess(res, result, 'Connexion réussie');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur de connexion';
      sendError(res, message, 401);
    }
  }

  /**
   * POST /api/auth/refresh
   * Rafraîchir le token d'accès
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
   * Déconnexion et révocation du token
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : '';

      const { refreshToken } = req.body;

      // Journal : déconnexion (avant blacklist du token)
      if (req.user) {
        logAction({
          userId: req.user.userId,
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
   * Récupère le profil de l'utilisateur connecté
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
   * PUT /api/auth/password
   * Changer le mot de passe de l'utilisateur connecté
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
