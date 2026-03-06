import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess, sendError } from '../utils/response';
import { Role } from '@prisma/client';

export class UserController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getAll();
      sendSuccess(res, users);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { nom, prenom, email, telephone, role, motDePasse } = req.body;
      if (!nom || !prenom || !email || !motDePasse) {
        sendError(res, 'Nom, prénom, email et mot de passe sont requis', 400);
        return;
      }
      if (motDePasse.length < 8) {
        sendError(res, 'Le mot de passe doit faire au moins 8 caractères', 400);
        return;
      }
      const validRoles = Object.values(Role);
      const userRole = validRoles.includes(role) ? role : Role.AGENT;
      const user = await userService.create({ nom, prenom, email, telephone, role: userRole, motDePasse });
      sendSuccess(res, user, 'Utilisateur créé avec succès', 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      sendError(res, message, 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { actif, nom, prenom, telephone, role } = req.body;
      // Empêcher la désactivation de son propre compte
      if (req.user?.userId === id && actif === false) {
        sendError(res, 'Vous ne pouvez pas désactiver votre propre compte', 400);
        return;
      }
      const user = await userService.update(id, { actif, nom, prenom, telephone, role });
      sendSuccess(res, user, 'Utilisateur mis à jour');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      sendError(res, message, 400);
    }
  }
}

export const userController = new UserController();
