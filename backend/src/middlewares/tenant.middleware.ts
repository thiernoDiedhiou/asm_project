// Résolution du tenant depuis le sous-domaine ou domaine custom
// Ex: "asm.platform.sn" → slug "asm" → tenant ASM
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export async function resolveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const host = req.hostname; // ex: "boucotteauto.innosft.com" ou "boucotteauto.localhost"

    // Extraire le slug depuis le sous-domaine (premier segment)
    const parts = host.split('.');
    // localhost ou IP directe = dev sans sous-domaine → fallback x-tenant-slug header
    // "boucotteauto.localhost" = dev avec sous-domaine → résolution par slug (comme prod)
    const isLocalOrIP = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host);

    let tenant;

    if (isLocalOrIP) {
      // En développement : si un slug est fourni via header ou query param, l'utiliser
      const devSlug = (req.headers['x-tenant-slug'] as string) || (req.query['tenant'] as string);
      if (devSlug) {
        tenant = await prisma.tenant.findFirst({ where: { slug: devSlug, actif: true } });
      }
      // Fallback : premier tenant actif
      if (!tenant) {
        tenant = await prisma.tenant.findFirst({ where: { actif: true }, orderBy: { createdAt: 'asc' } });
      }
    } else {
      // Production : chercher d'abord par domaine exact, puis par slug (premier segment)
      // Ex: "asm-location.innosft.com" → domaine match OU slug "asm-location"
      // Ex: "boucotteauto.innosft.com" → slug insensible à la casse "BoucotteAuto" → match
      const slug = parts[0].toLowerCase(); // normaliser en minuscule
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domaine: host },                                    // match exact domaine enregistré
            { slug: { equals: slug, mode: 'insensitive' }, actif: true }, // match slug insensible casse
          ],
          actif: true,
        },
      });
    }

    if (!tenant) {
      // Les routes d'auth (login, refresh, reset password) doivent fonctionner même sans tenant actif
      // pour permettre la connexion SUPER_ADMIN quand tous les tenants sont désactivés
      const isAuthRoute = req.originalUrl.startsWith('/api/auth/');
      if (isAuthRoute) {
        next();
        return;
      }
      res.status(404).json({ success: false, message: 'Tenant introuvable' });
      return;
    }

    req.tenantId = tenant.id;
    req.tenant = tenant;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur résolution tenant' });
  }
}
