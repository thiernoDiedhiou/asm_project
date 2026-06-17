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
import { sendConfirmationClient, sendAnnulationClient } from '../utils/mailer';
import logger from '../utils/logger';

/**
 * Génère le prochain numéro candidat RES-YYMM-NNNN à partir du dernier existant.
 * Appelé dans une boucle retry côté service pour gérer les collisions.
 */
async function generateNumeroReservation(offset = 0): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `RES-${yymm}-`;

  const last = await prisma.reservation.findFirst({
    where: { numeroReservation: { startsWith: prefix } },
    orderBy: { numeroReservation: 'desc' },
    select: { numeroReservation: true },
  });

  const lastSeq = last ? parseInt(last.numeroReservation.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1 + offset).padStart(4, '0')}`;
}

export class ReservationService {
  async getAll(filters: ReservationFilters, tenantId: string) {
    if (!tenantId) throw new Error('TenantId requis');
    const { statut, agentId, dateDebut, dateFin, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
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

  async getById(id: string, tenantId: string) {
    return prisma.reservation.findFirst({
      where: { id, tenantId },
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

  async create(dto: CreateReservationDto, agentId: string, tenantId: string) {
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);

    const dispo = await vehiculeService.checkDisponibilite(
      dto.vehiculeId,
      dateDebut,
      dateFin,
      tenantId
    );

    if (!dispo.disponible) {
      throw new Error(dispo.raison || 'Véhicule non disponible');
    }

    const vehicule = await prisma.vehicule.findFirst({
      where: { id: dto.vehiculeId, tenantId },
    });

    if (!vehicule) {
      throw new Error('Véhicule introuvable');
    }

    let prixJournalier = Number(vehicule.prixJournalier);
    let prixSemaine = Number(vehicule.prixSemaine);

    if (dto.zoneId) {
      const zone = await prisma.tarifZone.findFirst({ where: { id: dto.zoneId, tenantId } });
      if (!zone) throw new Error('Zone tarifaire introuvable');
      if (!zone.actif) throw new Error('Cette zone tarifaire est désactivée');
      const prixCategorie = await prisma.prixCategorie.findUnique({
        where: { categorie_zoneId: { categorie: vehicule.categorie, zoneId: dto.zoneId } },
      });
      if (prixCategorie) {
        prixJournalier = Number(prixCategorie.prixJournalier);
        if (prixCategorie.prixSemaine) prixSemaine = Number(prixCategorie.prixSemaine);
      }
    }

    const nombreLocations = await prisma.reservation.count({
      where: { clientId: dto.clientId, tenantId, statut: 'TERMINEE' },
    });

    const prixCalc = calculerPrix(
      dto.typeTrajet || 'LOCATION',
      dateDebut,
      dateFin,
      prixJournalier,
      prixSemaine,
      nombreLocations
    );

    const nombreJours = calculerNombreJours(dateDebut, dateFin);

    // Appliquer la remise manuelle (montant fixe ou pourcentage)
    const remiseMontant = dto.typeRemise === 'POURCENTAGE'
      ? Math.round(prixCalc.prixTotal * (dto.remiseManuelle / 100))
      : Math.round(dto.remiseManuelle || 0);
    const prixFinal = Math.max(0, prixCalc.prixTotal - remiseMontant);

    // Retry jusqu'à 5 fois en cas de collision sur numeroReservation (P2002)
    let reservation;
    for (let attempt = 0; attempt < 5; attempt++) {
      const numeroReservation = await generateNumeroReservation(attempt);
      try {
        reservation = await prisma.reservation.create({
          data: {
            tenantId,
            numeroReservation,
            clientId: dto.clientId,
            vehiculeId: dto.vehiculeId,
            dateDebut,
            dateFin,
            lieuPriseEnCharge: dto.lieuPriseEnCharge,
            lieuRetour: dto.lieuRetour,
            nombreJours,
            prixTotal: prixFinal,
            remiseManuelle: remiseMontant,
            typeRemise: dto.typeRemise || 'MONTANT',
            avance: dto.avance || 0,
            typeTrajet: dto.typeTrajet || 'LOCATION',
            notes: dto.notes,
            agentId,
            ...(dto.zoneId && { zoneId: dto.zoneId }),
          },
          include: {
            client: true,
            vehicule: true,
            agent: { select: { id: true, nom: true, prenom: true } },
          },
        });
        break; // succès
      } catch (err: unknown) {
        const isPrismaUnique = (err as { code?: string })?.code === 'P2002';
        if (isPrismaUnique && attempt < 4) continue;
        throw err;
      }
    }

    logger.info(`Réservation créée: ${(reservation as { numeroReservation: string }).numeroReservation}`);
    return { reservation, prixDetail: prixCalc };
  }

  async updateStatut(
    id: string,
    dto: UpdateStatutReservationDto,
    userId: string,
    tenantId: string
  ) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, tenantId },
      include: { vehicule: true },
    });

    if (!reservation) {
      throw new Error('Réservation introuvable');
    }

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

    // Envoyer un email au client si son adresse est renseignée
    if (updatedReservation.client.email) {
      const [tenant, parametre] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { nomEntreprise: true, couleurPrimaire: true, couleurSecondaire: true },
        }),
        prisma.parametre.findUnique({
          where: { tenantId },
          select: { telephone: true, adresse: true, ville: true },
        }),
      ]);

      const nomEntreprise = tenant?.nomEntreprise || 'Agence';
      const couleurPrimaire = tenant?.couleurPrimaire || '#1B5E20';
      const couleurSecondaire = tenant?.couleurSecondaire || '#F9A825';
      const telephoneAgence = parametre?.telephone || '';
      const adresseAgence = [parametre?.adresse, parametre?.ville].filter(Boolean).join(', ');

      if (dto.statut === 'CONFIRMEE') {
        sendConfirmationClient({
          numeroReservation: updatedReservation.numeroReservation,
          nomEntreprise,
          couleurPrimaire,
          couleurSecondaire,
          telephoneAgence,
          adresseAgence,
          client: {
            prenom: updatedReservation.client.prenom,
            nom: updatedReservation.client.nom,
            email: updatedReservation.client.email,
          },
          vehicule: {
            marque: updatedReservation.vehicule.marque,
            modele: updatedReservation.vehicule.modele,
          },
          dateDebut: updatedReservation.dateDebut.toISOString(),
          dateFin: updatedReservation.dateFin.toISOString(),
          nombreJours: updatedReservation.nombreJours,
          prixTotal: Number(updatedReservation.prixTotal),
          lieuPriseEnCharge: updatedReservation.lieuPriseEnCharge,
          typeTrajet: updatedReservation.typeTrajet,
          notes: updatedReservation.notes ?? undefined,
        }).catch((err) => logger.error('Email confirmation client échoué', err));
      } else if (dto.statut === 'ANNULEE') {
        sendAnnulationClient({
          numeroReservation: updatedReservation.numeroReservation,
          nomEntreprise,
          couleurPrimaire,
          couleurSecondaire,
          telephoneAgence,
          client: {
            prenom: updatedReservation.client.prenom,
            email: updatedReservation.client.email,
          },
          vehicule: {
            marque: updatedReservation.vehicule.marque,
            modele: updatedReservation.vehicule.modele,
          },
          dateDebut: updatedReservation.dateDebut.toISOString(),
        }).catch((err) => logger.error('Email annulation client échoué', err));
      }
    }

    return updatedReservation;
  }

  async prolonger(id: string, nouvelleDataFin: string, userId: string, tenantId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, tenantId },
      include: {
        vehicule: true,
        client: true,
      },
    });

    if (!reservation) throw new Error('Réservation introuvable');

    if (!['CONFIRMEE', 'EN_COURS'].includes(reservation.statut)) {
      throw new Error('Seules les réservations confirmées ou en cours peuvent être prolongées');
    }

    const dateFin = new Date(nouvelleDataFin);
    if (dateFin <= reservation.dateFin) {
      throw new Error('La nouvelle date de fin doit être postérieure à la date de fin actuelle');
    }

    let prixJournalier = Number(reservation.vehicule.prixJournalier);
    let prixSemaine = Number(reservation.vehicule.prixSemaine);

    if (reservation.zoneId) {
      const prixCategorie = await prisma.prixCategorie.findUnique({
        where: {
          categorie_zoneId: {
            categorie: reservation.vehicule.categorie,
            zoneId: reservation.zoneId,
          },
        },
      });
      if (prixCategorie) {
        prixJournalier = Number(prixCategorie.prixJournalier);
        if (prixCategorie.prixSemaine) prixSemaine = Number(prixCategorie.prixSemaine);
      }
    }

    const nombreLocations = await prisma.reservation.count({
      where: { clientId: reservation.clientId, tenantId, statut: 'TERMINEE' },
    });

    const prixCalc = calculerPrix(
      reservation.typeTrajet,
      reservation.dateDebut,
      dateFin,
      prixJournalier,
      prixSemaine,
      nombreLocations
    );

    const ancienneDataFin = reservation.dateFin;
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        dateFin,
        nombreJours: prixCalc.nombreJours,
        prixTotal: prixCalc.prixTotal,
      },
      include: {
        client: true,
        vehicule: true,
      },
    });

    logger.info(
      `Réservation ${reservation.numeroReservation} prolongée: ${ancienneDataFin.toLocaleDateString('fr-FR')} → ${dateFin.toLocaleDateString('fr-FR')} (agent: ${userId})`
    );

    return { reservation: updated, prixDetail: prixCalc };
  }

  async delete(id: string, tenantId: string) {
    const reservation = await prisma.reservation.findFirst({ where: { id, tenantId } });

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

  async getCalendrier(mois: number, annee: number, tenantId: string) {
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0, 23, 59, 59);

    return prisma.reservation.findMany({
      where: {
        tenantId,
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
