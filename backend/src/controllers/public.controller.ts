// Contrôleur pour les routes publiques (vitrine) - aucune authentification requise
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sendNotifNouvelleReservation } from '../utils/mailer';

async function generateNumeroReservation(): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.reservation.count({ where: { createdAt: { gte: debutMois } } });
  return `RES-${yymm}-${String(count + 1).padStart(4, '0')}`;
}

export class PublicController {
  /**
   * GET /api/public/zones
   * Retourne les zones tarifaires actives avec leurs tarifs par catégorie
   */
  async getZones(req: Request, res: Response): Promise<void> {
    try {
      const zones = await prisma.tarifZone.findMany({
        where: { actif: true },
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
        where: { statut: 'DISPONIBLE' },
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

      // 1. Trouver ou créer le client par téléphone
      let client = await prisma.client.findFirst({
        where: { telephone },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            prenom,
            nom,
            telephone,
            email: email || null,
            typeClient: 'PARTICULIER',
          },
        });
      }

      // 2. Récupérer le premier admin comme agent système pour les demandes publiques
      const agentSysteme = await prisma.user.findFirst({
        where: { role: 'ADMIN', actif: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!agentSysteme) {
        sendError(res, 'Service temporairement indisponible', 503);
        return;
      }

      // 3. Récupérer le véhicule pour le calcul du prix
      const vehicule = await prisma.vehicule.findUnique({
        where: { id: vehiculeId },
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

      // 5. Créer la réservation EN_ATTENTE
      const numeroReservation = await generateNumeroReservation();
      const reservation = await prisma.reservation.create({
        data: {
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

      // 7. Envoyer un email de notification (silencieux si SMTP non configuré)
      sendNotifNouvelleReservation({
        numeroReservation: reservation.numeroReservation,
        client: { prenom, nom, telephone, email: email || undefined },
        vehicule: { marque: vehicule.marque, modele: vehicule.modele },
        dateDebut,
        dateFin,
        nombreJours,
        prixTotal,
        lieuPriseEnCharge: lieuPriseEnCharge || 'À préciser',
        typeTrajet: typeTrajet || 'LOCATION',
        notes: notes || undefined,
      }).catch((err) => {
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
}

export const publicController = new PublicController();
