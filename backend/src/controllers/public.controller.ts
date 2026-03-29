// Contrôleur pour les routes publiques (vitrine) - aucune authentification requise
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sendNotifNouvelleReservation, sendContactFormEmail } from '../utils/mailer';

// Génère le prochain numéro RES-YYMM-NNNN (même logique que reservation.service.ts)
async function generateNumeroReservation(tenantId: string, offset = 0): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `RES-${yymm}-`;
  const last = await prisma.reservation.findFirst({
    where: { tenantId, numeroReservation: { startsWith: prefix } },
    orderBy: { numeroReservation: 'desc' },
    select: { numeroReservation: true },
  });
  const lastSeq = last ? parseInt(last.numeroReservation.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1 + offset).padStart(4, '0')}`;
}

export class PublicController {
  /**
   * GET /api/public/zones
   * Retourne les zones tarifaires actives avec leurs tarifs par catégorie
   */
  async getZones(req: Request, res: Response): Promise<void> {
    try {
      const zones = await prisma.tarifZone.findMany({
        where: { tenantId: req.tenantId!, actif: true },
        select: {
          id: true,
          nom: true,
          prixCategories: {
            select: {
              categorie: true,
              prixJournalier: true,
              prixSemaine: true,
            },
          },
        },
        orderBy: { nom: 'asc' },
      });
      sendSuccess(res, zones);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * GET /api/public/vehicules
   * Retourne les véhicules disponibles pour la vitrine publique.
   * Accepte les query params optionnels `dateDebut` et `dateFin` (ISO strings).
   * Si des dates sont fournies, filtre par chevauchement de réservation afin qu'un
   * véhicule actuellement loué mais libre sur la période demandée reste visible.
   */
  async getVehicules(req: Request, res: Response): Promise<void> {
    try {
      const { dateDebut, dateFin } = req.query as { dateDebut?: string; dateFin?: string };
      const tenantId = req.tenantId!;

      // Trouver les véhicules occupés sur la période demandée
      let vehiculesOccupesIds: string[] = [];
      if (dateDebut && dateFin) {
        const reservationsConflictuelles = await prisma.reservation.findMany({
          where: {
            tenantId,
            statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
            dateDebut: { lte: new Date(dateFin) },
            dateFin: { gte: new Date(dateDebut) },
          },
          select: { vehiculeId: true },
        });
        vehiculesOccupesIds = reservationsConflictuelles.map((r) => r.vehiculeId);
      }

      // Toujours inclure DISPONIBLE + LOUE (les véhicules LOUE seront affichés
      // avec leur prochaine date de disponibilité)
      const vehicules = await prisma.vehicule.findMany({
        where: {
          tenantId,
          statut: { notIn: ['EN_MAINTENANCE', 'HORS_SERVICE'] },
          ...(vehiculesOccupesIds.length > 0 && { id: { notIn: vehiculesOccupesIds } }),
        },
        select: {
          id: true,
          marque: true,
          modele: true,
          annee: true,
          couleur: true,
          categorie: true,
          prixJournalier: true,
          prixSemaine: true,
          photos: true,
          description: true,
          statut: true,
        },
        orderBy: [{ categorie: 'asc' }, { marque: 'asc' }],
      });

      // Calculer la prochaine date de disponibilité pour chaque véhicule
      const vehiculeIds = vehicules.map((v) => v.id);
      const today = new Date();
      const reservationsActives = vehiculeIds.length > 0
        ? await prisma.reservation.findMany({
            where: {
              vehiculeId: { in: vehiculeIds },
              statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
              dateFin: { gte: today },
            },
            select: { vehiculeId: true, dateDebut: true, dateFin: true },
          })
        : [];

      const latestDateFin = new Map<string, Date>();
      const earliestDateDebut = new Map<string, Date>();
      for (const r of reservationsActives) {
        const currentFin = latestDateFin.get(r.vehiculeId);
        if (!currentFin || r.dateFin > currentFin) {
          latestDateFin.set(r.vehiculeId, r.dateFin);
        }
        const currentDebut = earliestDateDebut.get(r.vehiculeId);
        if (!currentDebut || r.dateDebut < currentDebut) {
          earliestDateDebut.set(r.vehiculeId, r.dateDebut);
        }
      }

      type VehiculePublic = typeof vehicules[0] & {
        prochaineDateDisponible?: Date;
        dateDebutIndisponible?: Date;
        nombreDisponibles: number;
        vehiculeIds: string[];
      };

      // Grouper par modèle (marque + modele + annee + categorie)
      const groupMap = new Map<string, VehiculePublic>();
      for (const v of vehicules) {
        const dateFin = latestDateFin.get(v.id);
        const dateDebut = earliestDateDebut.get(v.id);
        const prochaine = dateFin
          ? new Date(new Date(dateFin).setDate(dateFin.getDate() + 1))
          : undefined;

        const key = `${v.marque}|${v.modele}|${v.annee}|${v.categorie}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, { ...v, prochaineDateDisponible: prochaine, dateDebutIndisponible: prochaine ? dateDebut : undefined, nombreDisponibles: prochaine ? 0 : 1, vehiculeIds: [v.id] });
        } else {
          const g = groupMap.get(key)!;
          g.vehiculeIds.push(v.id);
          if (!prochaine) {
            // Ce véhicule est disponible maintenant → le groupe est disponible
            g.nombreDisponibles++;
            g.prochaineDateDisponible = undefined;
            g.dateDebutIndisponible = undefined;
          } else if (g.nombreDisponibles === 0) {
            // Tous occupés jusqu'ici : garder la date la plus proche
            if (!g.prochaineDateDisponible || prochaine < g.prochaineDateDisponible) {
              g.prochaineDateDisponible = prochaine;
              g.dateDebutIndisponible = dateDebut;
            }
          }
        }
      }

      sendSuccess(res, Array.from(groupMap.values()));
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * POST /api/public/reservation
   * Crée une demande de réservation depuis la vitrine publique.
   * - Trouve ou crée le client par téléphone
   * - Utilise le premier ADMIN comme agent système
   * - Crée la réservation avec statut EN_ATTENTE
   * - Émet une notification socket aux agents connectés
   */
  async createDemande(req: Request, res: Response): Promise<void> {
    try {
      const {
        prenom,
        nom,
        telephone,
        email,
        vehiculeId,
        dateDebut,
        dateFin,
        lieuPriseEnCharge,
        lieuRetour,
        typeTrajet,
        notes,
      } = req.body;

      const tenantId = req.tenantId!;

      // 1. Trouver ou créer le client par téléphone
      let client = await prisma.client.findFirst({
        where: { tenantId, telephone },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            tenantId,
            prenom,
            nom,
            telephone,
            email: email || null,
            typeClient: 'PARTICULIER',
          },
        });
      }

      // 2. Récupérer le premier admin comme agent système pour les demandes publiques
      //    Son email servira de destinataire pour la notification de la nouvelle demande
      const [agentSysteme, tenant] = await Promise.all([
        prisma.user.findFirst({
          where: { tenantId, role: 'ADMIN', actif: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { nomEntreprise: true, slug: true, couleurPrimaire: true, couleurSecondaire: true },
        }),
      ]);

      if (!agentSysteme) {
        sendError(res, 'Service temporairement indisponible', 503);
        return;
      }

      // 3. Récupérer le véhicule pour le calcul du prix
      const vehicule = await prisma.vehicule.findFirst({
        where: { id: vehiculeId, tenantId },
        select: {
          id: true,
          marque: true,
          modele: true,
          prixJournalier: true,
          prixSemaine: true,
          statut: true,
        },
      });

      if (!vehicule) {
        sendError(res, 'Véhicule introuvable', 404);
        return;
      }

      // Vérifier la disponibilité par chevauchement de dates (et non par statut seul),
      // afin qu'un véhicule LOUE sur une autre période reste réservable.
      if (vehicule.statut === 'EN_MAINTENANCE' || vehicule.statut === 'HORS_SERVICE') {
        sendError(res, 'Ce véhicule n\'est pas disponible à la location', 400);
        return;
      }
      const dernierConflitPublic = await prisma.reservation.findFirst({
        where: {
          vehiculeId,
          tenantId,
          statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
          dateDebut: { lte: new Date(dateFin) },
          dateFin: { gte: new Date(dateDebut) },
        },
        orderBy: { dateFin: 'desc' },
        select: { dateFin: true },
      });
      if (dernierConflitPublic) {
        const prochaine = new Date(dernierConflitPublic.dateFin);
        prochaine.setDate(prochaine.getDate() + 1);
        const dateStr = prochaine.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        sendError(res, `Ce véhicule est déjà réservé sur cette période. Il sera disponible à partir du ${dateStr}.`, 400);
        return;
      }

      // 4. Calculer le nombre de jours et le prix
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const diffMs = fin.getTime() - debut.getTime();
      const nombreJours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const prixJournalier = Number(vehicule.prixJournalier);
      const prixSemaine = Number(vehicule.prixSemaine);

      let prixTotal: number;
      if (nombreJours >= 7) {
        const semaines = Math.floor(nombreJours / 7);
        const joursRestants = nombreJours % 7;
        prixTotal = semaines * prixSemaine + joursRestants * prixJournalier;
      } else {
        prixTotal = nombreJours * prixJournalier;
      }

      // 5. Créer la réservation EN_ATTENTE (retry sur P2002 en cas de collision numero unique)
      let reservation!: Awaited<ReturnType<typeof prisma.reservation.create>>;
      for (let attempt = 0; attempt < 5; attempt++) {
        const numeroReservation = await generateNumeroReservation(tenantId, attempt);
        try {
          reservation = await prisma.reservation.create({
            data: {
              tenantId,
              numeroReservation,
              clientId: client.id,
              vehiculeId,
              dateDebut: debut,
              dateFin: fin,
              lieuPriseEnCharge: lieuPriseEnCharge || 'À préciser',
              lieuRetour: lieuRetour || lieuPriseEnCharge || 'À préciser',
              nombreJours,
              prixTotal,
              avance: 0,
              statut: 'EN_ATTENTE',
              typeTrajet: typeTrajet || 'LOCATION',
              notes: notes || `Demande en ligne — ${prenom} ${nom}`,
              agentId: agentSysteme.id,
            },
            include: {
              vehicule: { select: { marque: true, modele: true } },
              client: { select: { prenom: true, nom: true, telephone: true } },
            },
          });
          break;
        } catch (err: unknown) {
          if ((err as { code?: string })?.code === 'P2002' && attempt < 4) continue;
          throw err;
        }
      }

      // 6. Émettre une notification socket à tous les agents/admins connectés
      const io = req.app.get('io');
      if (io) {
        io.emit('notification:nouvelle_demande', {
          message: `Nouvelle demande de ${prenom} ${nom} pour ${vehicule.marque} ${vehicule.modele}`,
          reservationId: reservation.id,
          numeroReservation: reservation.numeroReservation,
          client: { prenom, nom, telephone },
          vehicule: { marque: vehicule.marque, modele: vehicule.modele },
          dateDebut,
          dateFin,
        });
      }

      // 7. Envoyer un email de notification à l'admin du tenant (silencieux si SMTP non configuré)
      //    L'email va à agentSysteme.email (l'ADMIN du tenant), pas à une valeur .env
      // Construire l'URL back-office du tenant pour le bouton CTA de l'email
      // Prod: https://{slug}.innosft.com/reservations | Dev: http://localhost:3000/reservations
      const platformDomain = process.env.PLATFORM_DOMAIN || 'innosft.com';
      const isDevMode = process.env.NODE_ENV !== 'production';
      const backofficeUrl = isDevMode
        ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reservations`
        : `https://${tenant?.slug}.${platformDomain}/reservations`;

      sendNotifNouvelleReservation(
        {
          numeroReservation: reservation.numeroReservation,
          nomEntreprise: tenant?.nomEntreprise || 'InnoSoft Location',
          couleurPrimaire: tenant?.couleurPrimaire || '#1B5E20',
          couleurSecondaire: tenant?.couleurSecondaire || '#F9A825',
          client: { prenom, nom, telephone, email: email || undefined },
          vehicule: { marque: vehicule.marque, modele: vehicule.modele },
          dateDebut,
          dateFin,
          nombreJours,
          prixTotal,
          lieuPriseEnCharge: lieuPriseEnCharge || 'À préciser',
          typeTrajet: typeTrajet || 'LOCATION',
          notes: notes || undefined,
          backofficeUrl,
        },
        agentSysteme.email  // Destinataire dynamique = admin du tenant
      ).catch((err) => {
        console.error('[mailer] Échec envoi email notification:', err.message);
      });

      sendSuccess(
        res,
        {
          reservationId: reservation.id,
          numeroReservation: reservation.numeroReservation,
          prixTotal,
          nombreJours,
        },
        'Votre demande de réservation a été envoyée avec succès',
        201
      );
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur lors de la création', 500);
    }
  }

  /**
   * GET /api/public/contrats/verifier/:numero
   * Vérifie l'authenticité d'un contrat à partir de son numéro.
   * Retourne uniquement les informations non-sensibles (pas de montants).
   */
  async verifierContrat(req: Request, res: Response): Promise<void> {
    try {
      const { numero } = req.params;
      const contrat = await prisma.contrat.findUnique({
        where: { numeroContrat: numero },
        select: {
          id: true,
          numeroContrat: true,
          statut: true,
          dateSignature: true,
          createdAt: true,
          tenant: {
            select: { nomEntreprise: true, slug: true, domaine: true },
          },
          reservation: {
            select: {
              dateDebut: true,
              dateFin: true,
              nombreJours: true,
              lieuPriseEnCharge: true,
              client: {
                select: { prenom: true, nom: true },
              },
              vehicule: {
                select: { marque: true, modele: true, immatriculation: true, categorie: true },
              },
            },
          },
        },
      });

      if (!contrat) {
        sendError(res, 'Contrat introuvable ou numéro invalide', 404);
        return;
      }

      sendSuccess(res, contrat);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * GET /api/public/agences
   * Retourne la liste de toutes les agences actives de la plateforme
   * avec leurs infos publiques (vitrine, contact, adresse).
   * Aucune authentification requise — utilisé par la landing page.
   */
  async getAgencesPubliques(_req: Request, res: Response): Promise<void> {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { actif: true },
        select: {
          slug: true,
          nomEntreprise: true,
          slogan: true,
          activite: true,
          logo: true,
          couleurPrimaire: true,
          parametre: {
            select: {
              telephone: true,
              email: true,
              adresse: true,
              ville: true,
              heuresLunVen: true,
            },
          },
        },
        orderBy: { nomEntreprise: 'asc' },
      });

      const agences = tenants.map((t) => ({
        slug: t.slug,
        nomEntreprise: t.nomEntreprise,
        slogan: t.slogan,
        activite: t.activite,
        logo: t.logo,
        couleurPrimaire: t.couleurPrimaire,
        telephone: t.parametre?.telephone || '',
        email: t.parametre?.email || '',
        adresse: t.parametre?.adresse || '',
        ville: t.parametre?.ville || '',
        heures: t.parametre?.heuresLunVen || '',
      }));

      sendSuccess(res, agences);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * GET /api/public/tenant
   * Retourne les informations publiques de branding du tenant courant.
   */
  async getTenantPublicInfo(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        select: {
          slug: true,
          nomEntreprise: true,
          slogan: true,
          couleurPrimaire: true,
          couleurSecondaire: true,
          logo: true,
        },
      });
      if (!tenant) { sendError(res, 'Tenant introuvable', 404); return; }
      sendSuccess(res, tenant);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * POST /api/public/contact
   * Reçoit le formulaire de contact de la landing page et envoie un email.
   * Aucune résolution de tenant requise.
   */
  /**
   * GET /api/public/sitemap
   * Génère un sitemap XML dynamique.
   *
   * — Appelé depuis location.innosft.com (sans tenant) :
   *   Retourne un <urlset> listant toutes les vitrines de toutes les agences actives
   *   (utilisé comme entrée dans le sitemapindex principal).
   *
   * — Appelé depuis {slug}.location.innosft.com (avec tenant) :
   *   Retourne un <urlset> listant les pages publiques de ce tenant.
   */
  async getSitemap(req: Request, res: Response): Promise<void> {
    try {
      const platformDomain = process.env.PLATFORM_DOMAIN || 'location.innosft.com';
      const now = new Date().toISOString().split('T')[0];

      // Pages de vitrine par tenant (chemins publics)
      const vitrinePaths = [
        { path: '/',        priority: '1.0', changefreq: 'weekly'  },
        { path: '/flotte',  priority: '0.9', changefreq: 'daily'   },
        { path: '/tarifs',  priority: '0.7', changefreq: 'weekly'  },
      ];

      let urls: string[] = [];

      if (req.tenantId) {
        // ── Mode tenant : sitemap de ce tenant uniquement ─────────────────
        const tenant = await prisma.tenant.findUnique({
          where: { id: req.tenantId },
          select: { slug: true, domaine: true, nomEntreprise: true, updatedAt: true },
        });
        if (!tenant) { res.status(404).send('Tenant introuvable'); return; }

        const base = `https://${tenant.domaine || `${tenant.slug}.${platformDomain}`}`;
        const lastmod = tenant.updatedAt.toISOString().split('T')[0];

        urls = vitrinePaths.map(({ path, priority, changefreq }) => `
  <url>
    <loc>${base}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
      } else {
        // ── Mode plateforme : sitemap de toutes les agences actives ───────
        const tenants = await prisma.tenant.findMany({
          where: { actif: true },
          select: { slug: true, domaine: true, updatedAt: true },
          orderBy: { nomEntreprise: 'asc' },
        });

        for (const tenant of tenants) {
          const base = `https://${tenant.domaine || `${tenant.slug}.${platformDomain}`}`;
          const lastmod = tenant.updatedAt.toISOString().split('T')[0];
          for (const { path, priority, changefreq } of vitrinePaths) {
            urls.push(`
  <url>
    <loc>${base}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
          }
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 h de cache
      res.status(200).send(xml);
    } catch (error) {
      res.status(500).send('Erreur génération sitemap');
    }
  }

  /**
   * GET /api/public/vitrine-meta
   * Retourne le JSON-LD LocalBusiness + WebSite du tenant courant.
   * Utilisé par le frontend React pour injecter les données structurées
   * dans le <head> de chaque vitrine (améliore le SEO des sous-domaines).
   */
  async getVitrineMeta(req: Request, res: Response): Promise<void> {
    try {
      const platformDomain = process.env.PLATFORM_DOMAIN || 'location.innosft.com';

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId! },
        select: {
          slug: true,
          domaine: true,
          nomEntreprise: true,
          slogan: true,
          activite: true,
          couleurPrimaire: true,
          logo: true,
          parametre: {
            select: {
              telephone: true,
              email: true,
              adresse: true,
              ville: true,
            },
          },
        },
      });

      if (!tenant) { sendError(res, 'Tenant introuvable', 404); return; }

      const base = `https://${tenant.domaine || `${tenant.slug}.${platformDomain}`}`;
      const param = tenant.parametre;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'LocalBusiness',
            '@id': `${base}/#business`,
            'name': tenant.nomEntreprise,
            'description': tenant.slogan || tenant.activite || `Agence de location de véhicules — ${tenant.nomEntreprise}`,
            'url': base,
            'logo': tenant.logo ? `https://${platformDomain}/uploads/${tenant.logo}` : undefined,
            'telephone': param?.telephone || undefined,
            'email': param?.email || undefined,
            'address': param?.adresse ? {
              '@type': 'PostalAddress',
              'streetAddress': param.adresse,
              'addressLocality': param.ville || '',
              'addressCountry': 'CI',
            } : undefined,
            'priceRange': '$$',
            'currenciesAccepted': 'XOF',
            'openingHours': 'Mo-Fr 08:00-18:00',
          },
          {
            '@type': 'WebSite',
            '@id': `${base}/#website`,
            'url': base,
            'name': tenant.nomEntreprise,
            'publisher': { '@id': `${base}/#business` },
          },
        ],
      };

      res.setHeader('Cache-Control', 'public, max-age=3600');
      sendSuccess(res, jsonLd);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * GET /api/public/robots
   * Génère le robots.txt pour un sous-domaine tenant.
   * Appelé depuis {slug}.location.innosft.com/robots.txt via nginx.
   */
  async getRobotsTxt(req: Request, res: Response): Promise<void> {
    try {
      const host = req.hostname || req.headers.host || '';
      const sitemapUrl = `https://${host}/sitemap.xml`;

      const content = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${sitemapUrl}\n`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 h
      res.status(200).send(content);
    } catch (error) {
      res.status(500).send('Erreur');
    }
  }

  async sendContactForm(req: Request, res: Response): Promise<void> {
    try {
      const { prenom, nom, email, telephone, agence, flotte, message } = req.body;

      if (!prenom || !nom || !email) {
        sendError(res, 'Prénom, nom et email sont requis', 400);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        sendError(res, 'Adresse email invalide', 400);
        return;
      }

      await sendContactFormEmail({ prenom, nom, email, telephone, agence, flotte, message });

      sendSuccess(res, null, 'Votre demande a bien été envoyée. Nous vous contacterons sous 24 h.', 200);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur lors de l\'envoi', 500);
    }
  }

  /**
   * GET /api/public/vehicules/:id/periodes-occupees
   * Retourne les périodes où le véhicule est indisponible (réservations + maintenances).
   * Accessible sans authentification pour permettre le blocage des dates sur la vitrine.
   */
  async getPeriodesOccupees(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const vehicule = await prisma.vehicule.findFirst({ where: { id, tenantId } });
      if (!vehicule) { sendError(res, 'Véhicule introuvable', 404); return; }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [reservations, maintenances] = await Promise.all([
        prisma.reservation.findMany({
          where: {
            vehiculeId: id,
            tenantId,
            statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
            dateFin: { gte: today },
          },
          select: { dateDebut: true, dateFin: true },
        }),
        prisma.maintenance.findMany({
          where: {
            vehiculeId: id,
            statut: { in: ['PLANIFIEE', 'EN_COURS'] },
            OR: [{ dateFin: { gte: today } }, { dateFin: null }],
          },
          select: { dateDebut: true, dateFin: true },
        }),
      ]);

      const periodes = [
        ...reservations.map((r) => ({
          debut: r.dateDebut.toISOString().split('T')[0],
          fin: r.dateFin.toISOString().split('T')[0],
        })),
        ...maintenances
          .filter((m) => m.dateFin !== null)
          .map((m) => ({
            debut: m.dateDebut.toISOString().split('T')[0],
            fin: m.dateFin!.toISOString().split('T')[0],
          })),
      ];

      sendSuccess(res, periodes);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }

  /**
   * GET /api/public/flotte-globale
   * Retourne tous les véhicules de toutes les agences actives — sans authentification.
   * Utilisé par la page publique admin.location.innosft.com/flotte.
   */
  async getFlotteGlobale(req: Request, res: Response): Promise<void> {
    try {
      const { statut, categorie, search, tenantId } = req.query as Record<string, string>;

      const vehicules = await prisma.vehicule.findMany({
        where: {
          tenant: { actif: true },
          ...(tenantId && { tenantId }),
          ...(statut && { statut: statut as never }),
          ...(categorie && { categorie: categorie as never }),
          ...(search && {
            OR: [
              { marque: { contains: search, mode: 'insensitive' } },
              { modele: { contains: search, mode: 'insensitive' } },
              { immatriculation: { contains: search, mode: 'insensitive' } },
              { tenant: { nomEntreprise: { contains: search, mode: 'insensitive' } } },
            ],
          }),
        },
        select: {
          id: true,
          marque: true,
          modele: true,
          annee: true,
          couleur: true,
          categorie: true,
          statut: true,
          prixJournalier: true,
          prixSemaine: true,
          photos: true,
          tenant: {
            select: {
              slug: true,
              nomEntreprise: true,
              couleurPrimaire: true,
            },
          },
        },
        orderBy: [{ statut: 'asc' }, { tenant: { nomEntreprise: 'asc' } }, { marque: 'asc' }],
      });

      sendSuccess(res, vehicules);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Erreur serveur', 500);
    }
  }
}

export const publicController = new PublicController();
