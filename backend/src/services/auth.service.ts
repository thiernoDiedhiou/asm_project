// Service d'authentification
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiry,
} from '../utils/jwt';
import { LoginDto } from '../validators/auth.validator';
import logger from '../utils/logger';

export class AuthService {
  /**
   * Authentifie un utilisateur avec email/mot de passe
   */
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.actif) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const motDePasseValide = await bcrypt.compare(
      dto.motDePasse,
      user.motDePasse
    );

    if (!motDePasseValide) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Génération des tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info(`Connexion réussie: ${user.email} (${user.role})`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        actif: user.actif,
      },
    };
  }

  /**
   * Rafraîchit le token d'accès avec un refresh token valide
   */
  async refresh(refreshToken: string) {
    // Vérifier que le refresh token n'est pas blacklisté
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token: refreshToken },
    });

    if (blacklisted) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    const payload = verifyRefreshToken(refreshToken);

    // Vérifier que l'utilisateur existe toujours et est actif
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.actif) {
      throw new Error('Utilisateur introuvable ou inactif');
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    // Révoquer l'ancien refresh token
    await prisma.tokenBlacklist.create({
      data: {
        token: refreshToken,
        expiresAt: getTokenExpiry(refreshToken),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Révoque le token (logout)
   */
  async logout(accessToken: string, refreshToken?: string) {
    const tokensToRevoke = [];

    if (accessToken) {
      try {
        tokensToRevoke.push({
          token: accessToken,
          expiresAt: getTokenExpiry(accessToken),
        });
      } catch {
        // Token déjà expiré, ignorer
      }
    }

    if (refreshToken) {
      try {
        tokensToRevoke.push({
          token: refreshToken,
          expiresAt: getTokenExpiry(refreshToken),
        });
      } catch {
        // Token déjà expiré, ignorer
      }
    }

    if (tokensToRevoke.length > 0) {
      await prisma.tokenBlacklist.createMany({
        data: tokensToRevoke,
        skipDuplicates: true,
      });
    }

    logger.info('Déconnexion effectuée');
  }

  /**
   * Récupère le profil de l'utilisateur connecté
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
        _count: {
          select: {
            reservations: true,
            contrats: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    return user;
  }

  /**
   * Change le mot de passe de l'utilisateur connecté
   */
  async changePassword(userId: string, motDePasseActuel: string, nouveauMotDePasse: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur introuvable');

    const valide = await bcrypt.compare(motDePasseActuel, user.motDePasse);
    if (!valide) throw new Error('Mot de passe actuel incorrect');

    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await prisma.user.update({ where: { id: userId }, data: { motDePasse: hash } });
  }

  /**
   * Nettoie les tokens expirés de la blacklist (tâche de maintenance)
   */
  async cleanupExpiredTokens() {
    const deleted = await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    logger.info(`Nettoyage: ${deleted.count} tokens expirés supprimés`);
    return deleted.count;
  }
}

export const authService = new AuthService();
