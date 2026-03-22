// Service de gestion des véhicules
import { StatutVehicule } from '@prisma/client';
import prisma from '../utils/prisma';
import { checkPlanLimit } from '../utils/planLimits';
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
  async getAll(filters: VehiculeFilters, tenantId: string) {
    if (!tenantId) throw new Error('TenantId requis');
    const { statut, categorie, search, dateDebut, dateFin, page, limit } = filters;
    const skip = (page - 1) * limit;

    // Construction du filtre de disponibilité par dates
    let vehiculesOccupesIds: string[] = [];
    if (dateDebut && dateFin) {
      const reservationsOccupees = await prisma.reservation.findMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: {
          tenantId,
          statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
          dateDebut: { lte: new Date(dateFin) },
          dateFin: { gte: new Date(dateDebut) },
        },
        select: { vehiculeId: true },
      });
      vehiculesOccupesIds = reservationsOccupees.map((r) => r.vehiculeId);
    }

    const where = {
      tenantId,
      // Quand des dates sont fournies, on filtre par disponibilité (overlap) et non par statut :
      // un véhicule LOUE peut être libre sur la période demandée.
      // On exclut seulement les véhicules hors service / en maintenance.
      ...(dateDebut && dateFin
        ? { statut: { notIn: [StatutVehicule.EN_MAINTENANCE, StatutVehicule.HORS_SERVICE] } }
        : statut ? { statut } : {}),
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

    // Enrichir chaque véhicule avec sa prochaine date de disponibilité
    const vehiculeIds = vehicules.map((v) => v.id);
    const today = new Date();
    const reservationsActives = vehiculeIds.length > 0
      ? await prisma.reservation.findMany({
          where: {
            vehiculeId: { in: vehiculeIds },
            statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
            dateFin: { gte: today },
          },
          select: { vehiculeId: true, dateFin: true },
        })
      : [];

    const latestDateFin = new Map<string, Date>();
    for (const r of reservationsActives) {
      const current = latestDateFin.get(r.vehiculeId);
      if (!current || r.dateFin > current) {
        latestDateFin.set(r.vehiculeId, r.dateFin);
      }
    }

    const vehiculesEnrichis = vehicules.map((v) => {
      const dateFin = latestDateFin.get(v.id);
      if (!dateFin) return v;
      const prochaine = new Date(dateFin);
      prochaine.setDate(prochaine.getDate() + 1);
      return { ...v, prochaineDateDisponible: prochaine };
    });

    return { vehicules: vehiculesEnrichis, total };
  }

  /**
   * Récupère un véhicule par son ID
   */
  async getById(id: string, tenantId: string) {
    const vehicule = await prisma.vehicule.findFirst({
      where: { id, tenantId },
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
  async create(dto: CreateVehiculeDto, tenantId: string) {
    // Vérifier les limites du plan avant création
    await checkPlanLimit(tenantId, 'vehicules');

    // Vérifier l'unicité de l'immatriculation au sein du tenant
    const existant = await prisma.vehicule.findFirst({
      where: { immatriculation: dto.immatriculation, tenantId },
    });

    if (existant) {
      throw new Error(
        `Un véhicule avec l'immatriculation ${dto.immatriculation} existe déjà`
      );
    }

    const vehicule = await prisma.vehicule.create({
      data: {
        ...dto,
        tenantId,
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
  async update(id: string, dto: UpdateVehiculeDto, tenantId: string) {
    const vehicule = await prisma.vehicule.findFirst({ where: { id, tenantId } });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    // Vérifier l'unicité de l'immatriculation si elle change
    if (dto.immatriculation && dto.immatriculation !== vehicule.immatriculation) {
      const existant = await prisma.vehicule.findFirst({
        where: { immatriculation: dto.immatriculation, tenantId },
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
  async delete(id: string, tenantId: string) {
    const vehicule = await prisma.vehicule.findFirst({ where: { id, tenantId } });
    if (!vehicule) throw new Error('Véhicule introuvable');

    const [reservationsBloquantes, totalMaintenances] = await Promise.all([
      prisma.reservation.count({
        where: {
          vehiculeId: id,
          tenantId,
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
      where: { vehiculeId: id, tenantId, statut: 'ANNULEE' },
    });

    return prisma.vehicule.delete({ where: { id } });
  }

  /**
   * Retourne toutes les périodes réservées (futures + en cours) d'un véhicule
   */
  async getPeriodesOccupees(vehiculeId: string, tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservations = await prisma.reservation.findMany({
      where: {
        vehiculeId,
        tenantId,
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
        dateFin: { gte: today },
      },
      select: {
        dateDebut: true,
        dateFin: true,
        statut: true,
        numeroReservation: true,
      },
      orderBy: { dateDebut: 'asc' },
    });
    return reservations.map(r => ({
      dateDebut: r.dateDebut.toISOString().split('T')[0],
      dateFin: r.dateFin.toISOString().split('T')[0],
      statut: r.statut,
      numero: r.numeroReservation,
    }));
  }

  /**
   * Vérifie la disponibilité d'un véhicule pour une période donnée
   */
  async checkDisponibilite(vehiculeId: string, dateDebut: Date, dateFin: Date, tenantId?: string) {
    const where = tenantId ? { id: vehiculeId, tenantId } : { id: vehiculeId };
    const vehicule = await prisma.vehicule.findFirst({ where });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    if (vehicule.statut === StatutVehicule.EN_MAINTENANCE ||
        vehicule.statut === StatutVehicule.HORS_SERVICE) {
      return { disponible: false, raison: `Véhicule ${vehicule.statut.toLowerCase()}` };
    }

    // Vérifier les chevauchements de réservations
    const dernierConflitReservation = await prisma.reservation.findFirst({
      where: {
        vehiculeId,
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
        dateDebut: { lte: dateFin },
        dateFin: { gte: dateDebut },
      },
      orderBy: { dateFin: 'desc' },
      select: { dateFin: true },
    });

    // Vérifier les chevauchements de maintenances
    const dernierConflitMaintenance = await prisma.maintenance.findFirst({
      where: {
        vehiculeId,
        statut: { in: ['PLANIFIEE', 'EN_COURS'] },
        dateDebut: { lte: dateFin },
        OR: [
          { dateFin: { gte: dateDebut } },
          { dateFin: null },
        ],
      },
      orderBy: { dateFin: 'desc' },
      select: { dateFin: true },
    });

    const conflits = dernierConflitReservation ? 1 : 0;
    const maintenances = dernierConflitMaintenance ? 1 : 0;
    const disponible = conflits === 0 && maintenances === 0;

    // Calculer la prochaine date de disponibilité (lendemain de la fin du conflit)
    let prochaineDateDisponible: Date | undefined;
    if (!disponible) {
      const dateFinConflit = conflits > 0
        ? dernierConflitReservation!.dateFin
        : dernierConflitMaintenance?.dateFin ?? null;
      if (dateFinConflit) {
        prochaineDateDisponible = new Date(dateFinConflit);
        prochaineDateDisponible.setDate(prochaineDateDisponible.getDate() + 1);
      }
    }

    return {
      disponible,
      raison: !disponible
        ? conflits > 0
          ? 'Véhicule déjà réservé sur cette période'
          : 'Véhicule en maintenance sur cette période'
        : undefined,
      prochaineDateDisponible,
    };
  }

  /**
   * Ajoute des photos à un véhicule
   */
  async addPhotos(id: string, photoPaths: string[], tenantId: string) {
    const vehicule = await prisma.vehicule.findFirst({ where: { id, tenantId } });

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
  async getCalendrierDisponibilite(vehiculeId: string, mois: number, annee: number, tenantId: string) {
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0);

    const reservations = await prisma.reservation.findMany({
      where: {
        vehiculeId,
        tenantId,
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
