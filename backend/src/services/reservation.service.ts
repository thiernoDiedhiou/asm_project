// Service de gestion des réservations
import { StatutReservation } from '@prisma/client';
import prisma from '../utils/prisma';
import {
  CreateReservationDto,
  UpdateStatutReservationDto,
  ReservationFilters,
} from '../validators/reservation.validator';
import { vehiculeService } from './vehicule.service';
import { calculerPrix, calculerNombreJours } from '../utils/pricing';
import logger from '../utils/logger';

/**
 * Génère un numéro de réservation lisible : RES-YYMM-NNNN
 * Exemple : RES-2603-0001
 */
async function generateNumeroReservation(): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.reservation.count({ where: { createdAt: { gte: debutMois } } });
  return `RES-${yymm}-${String(count + 1).padStart(4, '0')}`;
}

export class ReservationService {
  /**
   * Récupère la liste des réservations avec filtres
   */
  async getAll(filters: ReservationFilters) {
    const { statut, agentId, dateDebut, dateFin, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(statut && { statut }),
      ...(agentId && { agentId }),
      ...(dateDebut && dateFin && {
        dateDebut: { gte: new Date(dateDebut) },
        dateFin: { lte: new Date(dateFin) },
      }),
      ...(search && {
        OR: [
          { numeroReservation: { contains: search, mode: 'insensitive' } },
          {
            client: {
              OR: [
                { nom: { contains: search, mode: 'insensitive' } },
                { prenom: { contains: search, mode: 'insensitive' } },
                { telephone: { contains: search } },
              ],
            },
          },
          {
            vehicule: {
              OR: [
                { immatriculation: { contains: search, mode: 'insensitive' } },
                { marque: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    };

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, nom: true, prenom: true, telephone: true },
          },
          vehicule: {
            select: {
              id: true,
              marque: true,
              modele: true,
              immatriculation: true,
              couleur: true,
              photos: true,
            },
          },
          agent: {
            select: { id: true, nom: true, prenom: true },
          },
          zone: {
            select: { id: true, nom: true },
          },
          contrat: {
            select: { id: true, numeroContrat: true, statut: true },
          },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return { reservations, total };
  }

  /**
   * Récupère une réservation par son ID
   */
  async getById(id: string) {
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        client: true,
        vehicule: true,
        agent: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        contrat: {
          include: {
            paiements: {
              orderBy: { datePaiement: 'desc' },
            },
          },
        },
      },
    });
  }

  /**
   * Crée une nouvelle réservation
   */
  async create(dto: CreateReservationDto, agentId: string) {
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);

    // Vérifier la disponibilité du véhicule
    const dispo = await vehiculeService.checkDisponibilite(
      dto.vehiculeId,
      dateDebut,
      dateFin
    );

    if (!dispo.disponible) {
      throw new Error(dispo.raison || 'Véhicule non disponible');
    }

    // Récupérer le véhicule pour les prix
    const vehicule = await prisma.vehicule.findUnique({
      where: { id: dto.vehiculeId },
    });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    // Récupérer la zone tarifaire si fournie (prix depuis la matrice catégorie × zone)
    let prixJournalier = Number(vehicule.prixJournalier);
    let prixSemaine = Number(vehicule.prixSemaine);

    if (dto.zoneId) {
      const zone = await prisma.tarifZone.findUnique({ where: { id: dto.zoneId } });
      if (!zone) throw new Error('Zone tarifaire introuvable');
      if (!zone.actif) throw new Error('Cette zone tarifaire est désactivée');
      // Chercher le prix dans la matrice pour la catégorie du véhicule
      const prixCategorie = await prisma.prixCategorie.findUnique({
        where: { categorie_zoneId: { categorie: vehicule.categorie, zoneId: dto.zoneId } },
      });
      if (prixCategorie) {
        prixJournalier = Number(prixCategorie.prixJournalier);
        if (prixCategorie.prixSemaine) prixSemaine = Number(prixCategorie.prixSemaine);
      }
    }

    // Récupérer le nombre de locations précédentes du client (fidélité)
    const nombreLocations = await prisma.reservation.count({
      where: { clientId: dto.clientId, statut: 'TERMINEE' },
    });

    // Calculer le prix (tarif zone si sélectionnée, sinon tarif véhicule)
    const prixCalc = calculerPrix(
      dto.typeTrajet || 'LOCATION',
      dateDebut,
      dateFin,
      prixJournalier,
      prixSemaine,
      nombreLocations
    );

    const nombreJours = calculerNombreJours(dateDebut, dateFin);

    const numeroReservation = await generateNumeroReservation();

    const reservation = await prisma.reservation.create({
      data: {
        numeroReservation,
        clientId: dto.clientId,
        vehiculeId: dto.vehiculeId,
        dateDebut,
        dateFin,
        lieuPriseEnCharge: dto.lieuPriseEnCharge,
        lieuRetour: dto.lieuRetour,
        nombreJours,
        prixTotal: prixCalc.prixTotal,
        avance: dto.avance || 0,
        typeTrajet: dto.typeTrajet || 'LOCATION',
        notes: dto.notes,
        agentId,
        ...(dto.zoneId && { zoneId: dto.zoneId }),
      },
      include: {
        client: true,
        vehicule: true,
        agent: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });

    logger.info(`Réservation créée: ${reservation.numeroReservation}`);
    return { reservation, prixDetail: prixCalc };
  }

  /**
   * Met à jour le statut d'une réservation
   */
  async updateStatut(
    id: string,
    dto: UpdateStatutReservationDto,
    userId: string
  ) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { vehicule: true },
    });

    if (!reservation) {
      throw new Error('Réservation introuvable');
    }

    // Transitions autorisées
    const transitionsValides: Record<string, StatutReservation[]> = {
      EN_ATTENTE: ['CONFIRMEE', 'ANNULEE'],
      CONFIRMEE: ['EN_COURS', 'ANNULEE'],
      EN_COURS: ['TERMINEE'],
      TERMINEE: [],
      ANNULEE: [],
    };

    if (!transitionsValides[reservation.statut].includes(dto.statut)) {
      throw new Error(
        `Transition invalide: ${reservation.statut} → ${dto.statut}`
      );
    }

    // Mettre à jour le statut du véhicule en conséquence
    let statutVehicule = reservation.vehicule.statut;

    if (dto.statut === 'EN_COURS') {
      statutVehicule = 'LOUE';
    } else if (dto.statut === 'TERMINEE' || dto.statut === 'ANNULEE') {
      statutVehicule = 'DISPONIBLE';
    }

    const [updatedReservation] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: {
          statut: dto.statut,
          ...(dto.notes && { notes: dto.notes }),
        },
        include: {
          client: true,
          vehicule: true,
        },
      }),
      prisma.vehicule.update({
        where: { id: reservation.vehiculeId },
        data: { statut: statutVehicule },
      }),
    ]);

    logger.info(
      `Réservation ${reservation.numeroReservation}: ${reservation.statut} → ${dto.statut} (agent: ${userId})`
    );

    return updatedReservation;
  }

  /**
   * Supprime une réservation (seulement si EN_ATTENTE ou ANNULEE)
   */
  async delete(id: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      throw new Error('Réservation introuvable');
    }

    if (!['EN_ATTENTE', 'ANNULEE'].includes(reservation.statut)) {
      throw new Error(
        'Seules les réservations en attente ou annulées peuvent être supprimées'
      );
    }

    return prisma.reservation.delete({ where: { id } });
  }

  /**
   * Récupère le calendrier des réservations pour un mois donné
   */
  async getCalendrier(mois: number, annee: number) {
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0, 23, 59, 59);

    return prisma.reservation.findMany({
      where: {
        statut: { not: 'ANNULEE' },
        OR: [
          {
            dateDebut: { gte: debutMois, lte: finMois },
          },
          {
            dateFin: { gte: debutMois, lte: finMois },
          },
          {
            dateDebut: { lte: debutMois },
            dateFin: { gte: finMois },
          },
        ],
      },
      include: {
        client: {
          select: { nom: true, prenom: true },
        },
        vehicule: {
          select: { marque: true, modele: true, immatriculation: true, couleur: true },
        },
      },
      orderBy: { dateDebut: 'asc' },
    });
  }
}

export const reservationService = new ReservationService();
