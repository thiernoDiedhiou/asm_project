// Service de gestion des véhicules
import { StatutVehicule } from '@prisma/client';
import prisma from '../utils/prisma';
import {
  CreateVehiculeDto,
  UpdateVehiculeDto,
  VehiculeFilters,
} from '../validators/vehicule.validator';
import logger from '../utils/logger';

export class VehiculeService {
  /**
   * Récupère la liste des véhicules avec filtres et pagination
   */
  async getAll(filters: VehiculeFilters) {
    const { statut, categorie, search, dateDebut, dateFin, page, limit } = filters;
    const skip = (page - 1) * limit;

    // Construction du filtre de disponibilité par dates
    let vehiculesOccupesIds: string[] = [];
    if (dateDebut && dateFin) {
      const reservationsOccupees = await prisma.reservation.findMany({
        where: {
          statut: { in: ['CONFIRMEE', 'EN_COURS'] },
          OR: [
            {
              dateDebut: { lte: new Date(dateFin) },
              dateFin: { gte: new Date(dateDebut) },
            },
          ],
        },
        select: { vehiculeId: true },
      });
      vehiculesOccupesIds = reservationsOccupees.map((r) => r.vehiculeId);
    }

    const where = {
      ...(statut && { statut }),
      ...(categorie && { categorie }),
      ...(vehiculesOccupesIds.length > 0 && {
        id: { notIn: vehiculesOccupesIds },
      }),
      ...(search && {
        OR: [
          { marque: { contains: search, mode: 'insensitive' as const } },
          { modele: { contains: search, mode: 'insensitive' as const } },
          { immatriculation: { contains: search, mode: 'insensitive' as const } },
          { couleur: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [vehicules, total] = await Promise.all([
      prisma.vehicule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicule.count({ where }),
    ]);

    return { vehicules, total };
  }

  /**
   * Récupère un véhicule par son ID
   */
  async getById(id: string) {
    const vehicule = await prisma.vehicule.findUnique({
      where: { id },
      include: {
        reservations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: { nom: true, prenom: true, telephone: true },
            },
          },
        },
        maintenances: {
          orderBy: { dateDebut: 'desc' },
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    return vehicule;
  }

  /**
   * Crée un nouveau véhicule
   */
  async create(dto: CreateVehiculeDto) {
    // Vérifier l'unicité de l'immatriculation
    const existant = await prisma.vehicule.findUnique({
      where: { immatriculation: dto.immatriculation },
    });

    if (existant) {
      throw new Error(
        `Un véhicule avec l'immatriculation ${dto.immatriculation} existe déjà`
      );
    }

    const vehicule = await prisma.vehicule.create({
      data: {
        ...dto,
        prixJournalier: dto.prixJournalier,
        prixSemaine: dto.prixSemaine,
      },
    });

    logger.info(`Véhicule créé: ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})`);
    return vehicule;
  }

  /**
   * Met à jour un véhicule
   */
  async update(id: string, dto: UpdateVehiculeDto) {
    const vehicule = await prisma.vehicule.findUnique({ where: { id } });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    // Vérifier l'unicité de l'immatriculation si elle change
    if (dto.immatriculation && dto.immatriculation !== vehicule.immatriculation) {
      const existant = await prisma.vehicule.findUnique({
        where: { immatriculation: dto.immatriculation },
      });

      if (existant) {
        throw new Error(
          `Un véhicule avec l'immatriculation ${dto.immatriculation} existe déjà`
        );
      }
    }

    return prisma.vehicule.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Supprime un véhicule.
   * Bloqué si des réservations EN_ATTENTE, CONFIRMEE, EN_COURS ou TERMINEE existent.
   * Les réservations ANNULEE et les maintenances sont supprimées en cascade.
   */
  async delete(id: string) {
    const [reservationsBloquantes, totalMaintenances] = await Promise.all([
      prisma.reservation.count({
        where: {
          vehiculeId: id,
          statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE'] },
        },
      }),
      prisma.maintenance.count({ where: { vehiculeId: id } }),
    ]);

    if (reservationsBloquantes > 0) {
      throw new Error(
        'Impossible de supprimer : ce véhicule a des réservations actives ou terminées associées.'
      );
    }

    if (totalMaintenances > 0) {
      throw new Error(
        'Impossible de supprimer : ce véhicule a des maintenances associées.'
      );
    }

    // Supprimer les réservations ANNULEE (aucun impact financier) avant de supprimer le véhicule
    await prisma.reservation.deleteMany({
      where: { vehiculeId: id, statut: 'ANNULEE' },
    });

    return prisma.vehicule.delete({ where: { id } });
  }

  /**
   * Vérifie la disponibilité d'un véhicule pour une période donnée
   */
  async checkDisponibilite(vehiculeId: string, dateDebut: Date, dateFin: Date) {
    const vehicule = await prisma.vehicule.findUnique({
      where: { id: vehiculeId },
    });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    if (vehicule.statut === StatutVehicule.EN_MAINTENANCE ||
        vehicule.statut === StatutVehicule.HORS_SERVICE) {
      return { disponible: false, raison: `Véhicule ${vehicule.statut.toLowerCase()}` };
    }

    // Vérifier les chevauchements de réservations
    const conflits = await prisma.reservation.count({
      where: {
        vehiculeId,
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
        dateDebut: { lte: dateFin },
        dateFin: { gte: dateDebut },
      },
    });

    // Vérifier les chevauchements de maintenances
    const maintenances = await prisma.maintenance.count({
      where: {
        vehiculeId,
        statut: { in: ['PLANIFIEE', 'EN_COURS'] },
        dateDebut: { lte: dateFin },
        OR: [
          { dateFin: { gte: dateDebut } },
          { dateFin: null },
        ],
      },
    });

    const disponible = conflits === 0 && maintenances === 0;

    return {
      disponible,
      raison: !disponible
        ? conflits > 0
          ? 'Véhicule déjà réservé sur cette période'
          : 'Véhicule en maintenance sur cette période'
        : undefined,
    };
  }

  /**
   * Ajoute des photos à un véhicule
   */
  async addPhotos(id: string, photoPaths: string[]) {
    const vehicule = await prisma.vehicule.findUnique({ where: { id } });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    return prisma.vehicule.update({
      where: { id },
      data: {
        photos: { push: photoPaths },
      },
    });
  }

  /**
   * Récupère le calendrier de disponibilité (pour un mois donné)
   */
  async getCalendrierDisponibilite(vehiculeId: string, mois: number, annee: number) {
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0);

    const reservations = await prisma.reservation.findMany({
      where: {
        vehiculeId,
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
        dateDebut: { lte: finMois },
        dateFin: { gte: debutMois },
      },
      select: {
        dateDebut: true,
        dateFin: true,
        statut: true,
        numeroReservation: true,
        client: { select: { nom: true, prenom: true } },
      },
    });

    return reservations;
  }
}

export const vehiculeService = new VehiculeService();
