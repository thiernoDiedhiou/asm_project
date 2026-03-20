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
   * Retourne tous les véhicules DISPONIBLES pour la vitrine publique
   */
  async getVehicules(req: Request, res: Response): Promise<void> {
    try {
      const vehicules = await prisma.vehicule.findMany({
        where: { tenantId: req.tenantId!, statut: 'DISPONIBLE' },
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
        },
        orderBy: [{ categorie: 'asc' }, { marque: 'asc' }],
      });

      // Grouper par modèle (marque + modele + annee + categorie)
      // → un seul représentant par modèle avec le compteur de disponibilités
      const groupMap = new Map<string, typeof vehicules[0] & { nombreDisponibles: number; vehiculeIds: string[] }>();
      for (const v of vehicules) {
        const key = `${v.marque}|${v.modele}|${v.annee}|${v.categorie}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, { ...v, nombreDisponibles: 1, vehiculeIds: [v.id] });
        } else {
          const g = groupMap.get(key)!;
          g.nombreDisponibles++;
          g.vehiculeIds.push(v.id);
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

      if (vehicule.statut !== 'DISPONIBLE') {
        sendError(res, 'Ce véhicule n\'est plus disponible', 400);
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
}

export const publicController = new PublicController();
