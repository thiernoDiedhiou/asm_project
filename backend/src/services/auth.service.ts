// Service d'authentification
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
   * - Utilisateurs normaux : scoped par tenantId
   * - SUPER_ADMIN : fallback sans tenant (accès cross-tenant)
   */
  async login(dto: LoginDto, tenantId?: string) {
    // Chercher dans le tenant courant d'abord
    let user = tenantId
      ? await prisma.user.findFirst({
          where: { email: dto.email, tenantId },
          include: { tenant: { select: { actif: true } } },
        })
      : null;

    // Fallback SUPER_ADMIN (pas limité à un tenant)
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: dto.email, role: 'SUPER_ADMIN' },
        include: { tenant: { select: { actif: true } } },
      });
    }

    // Fallback global : en dev (localhost), tous les tenants partagent le même domaine.
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: dto.email },
        include: { tenant: { select: { actif: true } } },
      });
    }

    if (!user || !user.actif) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Bloquer la connexion si le tenant est désactivé (sauf SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.actif) {
      throw new Error('Accès suspendu — contactez votre administrateur');
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
      tenantId: user.tenantId ?? undefined, // null → undefined pour SUPER_ADMIN
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

    // Vérifier que l'utilisateur existe toujours et est actif,
    // et que son tenant n'a pas été désactivé
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: { select: { actif: true } } },
    });

    if (!user || !user.actif) {
      throw new Error('Utilisateur introuvable ou inactif');
    }

    if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.actif) {
      throw new Error('Abonnement suspendu — contactez votre administrateur');
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
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
    const tokensToRevoke: { token: string; expiresAt: Date }[] = [];

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
   * Génère un token de réinitialisation et envoie l'email
   */
  async forgotPassword(email: string, tenantId: string | undefined, frontendUrl: string) {
    // Chercher l'utilisateur dans le tenant courant
    const user = await prisma.user.findFirst({
      where: tenantId ? { email, tenantId } : { email },
    });

    // Toujours répondre de la même façon (anti-énumération)
    if (!user || !user.actif) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const { emailService } = await import('./email.service');
    await emailService.sendResetPasswordEmail({
      to: user.email,
      prenom: user.prenom,
      nom: user.nom,
      resetUrl,
    });

    logger.info(`[AUTH] Reset password demandé pour ${user.email}`);
  }

  /**
   * Réinitialise le mot de passe avec un token valide
   */
  async resetPassword(token: string, nouveauMotDePasse: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new Error('Lien invalide ou expiré');
    if (nouveauMotDePasse.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères');

    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { motDePasse: hash, resetToken: null, resetTokenExpiry: null },
    });

    logger.info(`[AUTH] Mot de passe réinitialisé pour ${user.email}`);
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
