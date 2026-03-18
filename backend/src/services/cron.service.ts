// Service cron — tâches planifiées quotidiennes
import prisma from '../utils/prisma';
import { emailService } from './email.service';
import { getIo } from '../utils/socketRegistry';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DAILY_MS = 24 * 60 * 60 * 1000;

export async function checkTenantExpirations(): Promise<void> {
  try {
    const now = new Date();
    const j7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const j30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Blocage automatique des tenants expirés
    const expired = await prisma.tenant.findMany({
      where: {
        dateExpiration: { lt: now },
        actif: true,
        statutAbonnement: { not: 'EXPIRE' },
      },
      select: { id: true, nomEntreprise: true, dateExpiration: true },
    });

    for (const t of expired) {
      await prisma.tenant.update({
        where: { id: t.id },
        data: { actif: false, statutAbonnement: 'EXPIRE' },
      });
      await emailService.sendExpirationNotice({ nomEntreprise: t.nomEntreprise, dateExpiration: t.dateExpiration });
      // Notification socket Super Admin
      getIo()?.emit('superadmin:tenant_expire', {
        tenantId: t.id,
        nomEntreprise: t.nomEntreprise,
        dateExpiration: t.dateExpiration,
      });
      logger.info(`[CRON] Tenant expiré et bloqué: ${t.nomEntreprise}`);
    }

    if (expired.length > 0) {
      logger.info(`[CRON] ${expired.length} tenant(s) bloqué(s) automatiquement`);
    }

    // 2. Alertes J-7 (expire dans < 7 jours)
    const tenantsJ7 = await prisma.tenant.findMany({
      where: { dateExpiration: { gte: now, lte: j7 }, actif: true },
      select: { nomEntreprise: true, dateExpiration: true },
    });

    // 3. Alertes J-30 (expire dans < 30 jours)
    const tenantsJ30 = await prisma.tenant.findMany({
      where: { dateExpiration: { gte: now, lte: j30 }, actif: true },
      select: { nomEntreprise: true, dateExpiration: true },
    });

    if (tenantsJ7.length > 0 || tenantsJ30.length > 0) {
      await emailService.sendExpirationAlerts(tenantsJ30, tenantsJ7);
    }

    logger.info(`[CRON] Vérification terminée — expirés: ${expired.length}, J7: ${tenantsJ7.length}, J30: ${tenantsJ30.length}`);
  } catch (err) {
    logger.error('[CRON] Erreur checkTenantExpirations:', err);
  }
}

/**
 * Exporte les données clés de la DB en JSON gzippé dans uploads/backups/
 * Conserve uniquement les 7 derniers backups.
 */
export async function backupDatabase(): Promise<void> {
  try {
    const backupDir = path.join(process.cwd(), 'uploads', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const [tenants, users, vehicules, reservations, clients, contrats] = await Promise.all([
      prisma.tenant.findMany(),
      prisma.user.findMany({ select: { id: true, nom: true, prenom: true, email: true, role: true, tenantId: true, actif: true, createdAt: true } }),
      prisma.vehicule.findMany({ select: { id: true, marque: true, modele: true, immatriculation: true, statut: true, tenantId: true } }),
      prisma.reservation.findMany({ select: { id: true, statut: true, dateDebut: true, dateFin: true, prixTotal: true, tenantId: true, createdAt: true } }),
      prisma.client.findMany({ select: { id: true, nom: true, prenom: true, telephone: true, tenantId: true, createdAt: true } }),
      prisma.contrat.findMany({ select: { id: true, numeroContrat: true, statut: true, tenantId: true, createdAt: true } }),
    ]);

    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      counts: { tenants: tenants.length, users: users.length, vehicules: vehicules.length, reservations: reservations.length, clients: clients.length, contrats: contrats.length },
      tenants, users, vehicules, reservations, clients, contrats,
    });

    const filename = `backup_${new Date().toISOString().slice(0, 10)}.json.gz`;
    const filepath = path.join(backupDir, filename);

    await new Promise<void>((resolve, reject) => {
      zlib.gzip(Buffer.from(payload, 'utf-8'), (err, compressed) => {
        if (err) return reject(err);
        fs.writeFile(filepath, compressed, (writeErr) => writeErr ? reject(writeErr) : resolve());
      });
    });

    logger.info(`[BACKUP] Sauvegarde créée : ${filename} (${(fs.statSync(filepath).size / 1024).toFixed(1)} Ko)`);

    // Rotation : garder seulement les 7 derniers backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json.gz'))
      .sort()
      .reverse();
    for (const old of files.slice(7)) {
      fs.unlinkSync(path.join(backupDir, old));
      logger.info(`[BACKUP] Ancien backup supprimé : ${old}`);
    }
  } catch (err) {
    logger.error('[BACKUP] Erreur lors de la sauvegarde:', err);
  }
}

export function initCronJobs(): void {
  logger.info('[CRON] Démarrage des tâches planifiées (vérification expirations + backup toutes les 24h)');

  // Exécuter 30s après le démarrage (laisser le temps à la DB de s'initialiser)
  setTimeout(() => {
    checkTenantExpirations();
    backupDatabase();
  }, 30 * 1000);

  // Puis toutes les 24 heures
  setInterval(() => {
    checkTenantExpirations();
    backupDatabase();
  }, DAILY_MS);
}
