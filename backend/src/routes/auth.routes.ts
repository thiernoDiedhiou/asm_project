// Routes d'authentification
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  loginSchema,
  refreshSchema,
} from '../validators/auth.validator';

const router = Router();

// POST /api/auth/login - Connexion
router.post('/login', validateBody(loginSchema), authController.login.bind(authController));

// POST /api/auth/refresh - Rafraîchir le token
router.post('/refresh', validateBody(refreshSchema), authController.refresh.bind(authController));

// POST /api/auth/logout - Déconnexion (authentifié)
router.post('/logout', authenticateToken, authController.logout.bind(authController));

// GET /api/auth/me - Profil utilisateur connecté
router.get('/me', authenticateToken, authController.me.bind(authController));

// PUT /api/auth/password - Changer le mot de passe
router.put('/password', authenticateToken, authController.changePassword.bind(authController));

export default router;
