import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { emailService } from './email.service';
import https from 'https';
import http from 'http';

/**
 * Notifie les moteurs de recherche qu'un nouveau sitemap est disponible.
 * Appel silencieux — n'interrompt pas la création du tenant en cas d'échec.
 */
function pingSitemapSearchEngines(sitemapUrl: string): void {
  const engines = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];

  for (const url of engines) {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      res.resume(); // Consomme la réponse sans la stocker
    });
    req.on('error', () => {}); // Silencieux
    req.end();
  }
}

interface CreateTenantDto {
  slug: string;
  nomEntreprise: string;
  slogan?: string;
  domaine?: string;
  couleurPrimaire?: string;
  couleurSecondaire?: string;
  // Premier admin du tenant
  adminEmail: string;
  adminPassword: string;
  adminNom: string;
  adminPrenom: string;
}

export const tenantService = {
  async getAll() {
    return prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, vehicules: true, reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        parametre: true,
        _count: { select: { users: true, vehicules: true, clients: true, reservations: true } },
      },
    });
  },

  async create(dto: CreateTenantDto) {
    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Créer le tenant
      // Domaine auto-généré depuis le slug si non fourni explicitement
      // Ex: slug "boucotteauto" + PLATFORM_DOMAIN "innosft.com" → "boucotteauto.innosft.com"
      const platformDomain = process.env.PLATFORM_DOMAIN;
      const domaine = dto.domaine || (platformDomain ? `${dto.slug}.${platformDomain}` : null);

      const tenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          nomEntreprise: dto.nomEntreprise,
          slogan: dto.slogan || 'Location de Véhicules',
          domaine,
          couleurPrimaire: dto.couleurPrimaire || '#1B5E20',
          couleurSecondaire: dto.couleurSecondaire || '#F9A825',
        },
      });

      // Créer le paramètre du tenant
      await tx.parametre.create({
        data: {
          tenantId: tenant.id,
          nomEntreprise: dto.nomEntreprise,
          slogan: dto.slogan || 'Location de Véhicules',
        },
      });

      // Créer le premier admin du tenant
      await tx.user.create({
        data: {
          nom: dto.adminNom,
          prenom: dto.adminPrenom,
          email: dto.adminEmail,
          motDePasse: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      return tenant;
    });

    // Email de bienvenue (hors transaction — silencieux si SMTP non configuré)
    // loginUrl pointe vers le sous-domaine du tenant en prod, localhost en dev
    const platformDomain = process.env.PLATFORM_DOMAIN;
    const tenantDomain = result.domaine;
    const loginUrl = (process.env.NODE_ENV === 'production' && tenantDomain)
      ? `https://${tenantDomain}/login`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    emailService.sendWelcomeEmail({
      adminEmail: dto.adminEmail,
      adminPrenom: dto.adminPrenom,
      adminNom: dto.adminNom,
      nomEntreprise: dto.nomEntreprise,
      motDePasseTemporaire: dto.adminPassword,
      loginUrl,
    }).catch(() => {});

    // Ping Google & Bing pour indexer le nouveau tenant (silencieux en dev)
    if (process.env.NODE_ENV === 'production') {
      const mainSitemap = `https://${process.env.PLATFORM_DOMAIN || 'location.innosft.com'}/api/public/sitemap`;
      pingSitemapSearchEngines(mainSitemap);
    }

    return result;
  },

  async update(id: string, data: Partial<{ nomEntreprise: string; slogan: string; domaine: string; couleurPrimaire: string; couleurSecondaire: string; actif: boolean; planType: string; montantMensuel: number | null; dateExpiration: string | null; statutAbonnement: string }>) {
    const { montantMensuel, dateExpiration, ...rest } = data;
    return prisma.tenant.update({
      where: { id },
      data: {
        ...rest,
        ...(montantMensuel !== undefined && { montantMensuel: montantMensuel ?? null }),
        ...(dateExpiration !== undefined && { dateExpiration: dateExpiration ? new Date(dateExpiration) : null }),
      },
    });
  },

  async getPlatformStats() {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const finMoisPrec = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalTenants, tenantsActifs, totalVehicules, totalReservations, totalClients, totalMaintenances, revenus, revenusPrec] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { actif: true } }),
      prisma.vehicule.count(),
      prisma.reservation.count(),
      prisma.client.count(),
      prisma.maintenance.count(),
      prisma.paiement.aggregate({
        where: { valide: true, datePaiement: { gte: debutMois } },
        _sum: { montant: true },
      }),
      prisma.paiement.aggregate({
        where: { valide: true, datePaiement: { gte: debutMoisPrec, lte: finMoisPrec } },
        _sum: { montant: true },
      }),
    ]);

    const revenusMois = Number(revenus._sum.montant ?? 0);
    const revenusMoisPrec = Number(revenusPrec._sum.montant ?? 0);
    const croissanceMRR = revenusMoisPrec > 0
      ? Math.round(((revenusMois - revenusMoisPrec) / revenusMoisPrec) * 100)
      : null;

    return { totalTenants, tenantsActifs, totalVehicules, totalReservations, totalClients, totalMaintenances, revenusMois, revenusMoisPrec, croissanceMRR };
  },

  async impersonate(tenantId: string) {
    const admin = await prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN', actif: true },
    });
    if (!admin) throw new Error('Aucun administrateur actif trouvé pour ce tenant');

    const payload = { userId: admin.id, email: admin.email, role: admin.role as 'ADMIN', tenantId: admin.tenantId ?? undefined };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return { accessToken, refreshToken, user: { id: admin.id, nom: admin.nom, prenom: admin.prenom, email: admin.email, role: admin.role } };
  },

  async getDetail(id: string) {
    const [tenant, users, recentReservations, revenusTotal] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id },
        include: {
          parametre: true,
          _count: { select: { users: true, vehicules: true, clients: true, reservations: true } },
        },
      }),
      prisma.user.findMany({
        where: { tenantId: id },
        select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reservation.findMany({
        where: { tenantId: id },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { nom: true, prenom: true } },
          vehicule: { select: { marque: true, modele: true, immatriculation: true } },
        },
      }),
      prisma.paiement.aggregate({
        where: { tenantId: id, valide: true },
        _sum: { montant: true },
      }),
    ]);

    if (!tenant) return null;

    return {
      ...tenant,
      users,
      recentReservations,
      revenusTotal: Number(revenusTotal._sum?.montant ?? 0),
    };
  },

  /**
   * MRR sur les 12 derniers mois (depuis paiementsAbonnement) + top tenants + churn
   */
  async getMrrStats() {
    const now = new Date();

    // 12 derniers mois (labels)
    const months: { key: string; label: string; debut: Date; fin: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: key, debut: d, fin });
    }

    // Paiements abonnement des 12 derniers mois groupés par période
    const paiements = await prisma.paiementAbonnement.findMany({
      where: { createdAt: { gte: months[0].debut } },
      select: { montant: true, periode: true, tenantId: true },
    });

    const mrrParMois = months.map(({ key, label }) => {
      const total = paiements
        .filter(p => p.periode === key)
        .reduce((s, p) => s + Number(p.montant), 0);
      return { mois: label, mrr: total };
    });

    // Top 5 tenants par revenus abonnement (all-time)
    const allPaiements = await prisma.paiementAbonnement.findMany({
      select: { montant: true, tenantId: true, tenant: { select: { nomEntreprise: true } } },
    });
    const topMap: Record<string, { nomEntreprise: string; total: number }> = {};
    for (const p of allPaiements) {
      if (!topMap[p.tenantId]) topMap[p.tenantId] = { nomEntreprise: p.tenant.nomEntreprise, total: 0 };
      topMap[p.tenantId].total += Number(p.montant);
    }
    const topTenants = Object.entries(topMap)
      .map(([id, { nomEntreprise, total }]) => ({ id, nomEntreprise, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Churn: tenants passés EXPIRE ce mois
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const churnCount = await prisma.tenant.count({
      where: { statutAbonnement: 'EXPIRE', dateExpiration: { gte: debutMois, lte: now } },
    });
    const totalActifs = await prisma.tenant.count({ where: { actif: true } });
    const tauxChurn = totalActifs > 0 ? Math.round((churnCount / totalActifs) * 100) : 0;

    return { mrrParMois, topTenants, churnCount, tauxChurn };
  },

  /**
   * Renouveler l'abonnement d'un tenant (+1 mois depuis maintenant ou depuis dateExpiration)
   */
  async renouveler(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant introuvable');

    const base = tenant.dateExpiration && new Date(tenant.dateExpiration) > new Date()
      ? new Date(tenant.dateExpiration)
      : new Date();
    const nouvelleExpiration = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());

    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        dateExpiration: nouvelleExpiration,
        statutAbonnement: 'ACTIF',
        actif: true,
      },
    });
  },

  async getGlobalJournal(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      prisma.journalActivite.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { nomEntreprise: true, couleurPrimaire: true } } },
      }),
      prisma.journalActivite.count(),
    ]);
    return { entries, total };
  },

  async deleteTenant(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant introuvable');
    // La suppression en cascade est gérée par Prisma (onDelete: Cascade sur toutes les relations)
    await prisma.tenant.delete({ where: { id } });
  },

  async updateAdminEmail(tenantId: string, userId: string, newEmail: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new Error('Utilisateur introuvable dans ce tenant');

    // Vérifier que le nouvel email n'est pas déjà utilisé
    const existing = await prisma.user.findFirst({
      where: { email: newEmail, id: { not: userId } },
    });
    if (existing) throw new Error('Cet email est déjà utilisé par un autre compte');

    return prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: { id: true, email: true, nom: true, prenom: true, role: true },
    });
  },
};
