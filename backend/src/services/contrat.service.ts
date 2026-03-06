// Service de gestion des contrats
import prisma from '../utils/prisma';
import {
  CreateContratDto,
  UpdateContratDto,
  ClotureContratDto,
  CreatePaiementDto,
  PaiementFilters,
} from '../validators/contrat.validator';
import { pdfService } from './pdf.service';
import logger from '../utils/logger';

/**
 * Génère un numéro de contrat lisible : CTR-YYMM-NNNN
 * Exemple : CTR-2603-0001
 */
async function generateNumeroContrat(): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.contrat.count({ where: { createdAt: { gte: debutMois } } });
  return `CTR-${yymm}-${String(count + 1).padStart(4, '0')}`;
}

export class ContratService {
  /**
   * Récupère tous les contrats avec pagination et filtres
   */
  async getAll(page = 1, limit = 20, statut?: string, search?: string) {
    const skip = (page - 1) * limit;

    const where = {
      ...(statut ? { statut: statut as 'ACTIF' | 'TERMINE' | 'LITIGE' } : {}),
      ...(search ? {
        OR: [
          { numeroContrat: { contains: search, mode: 'insensitive' as const } },
          { client: { nom: { contains: search, mode: 'insensitive' as const } } },
          { client: { prenom: { contains: search, mode: 'insensitive' as const } } },
          { reservation: { vehicule: { immatriculation: { contains: search, mode: 'insensitive' as const } } } },
          { reservation: { vehicule: { marque: { contains: search, mode: 'insensitive' as const } } } },
        ],
      } : {}),
    };

    const [contrats, total] = await Promise.all([
      prisma.contrat.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { nom: true, prenom: true, telephone: true },
          },
          reservation: {
            select: {
              numeroReservation: true,
              dateDebut: true,
              dateFin: true,
              prixTotal: true,
              vehicule: {
                select: { marque: true, modele: true, immatriculation: true },
              },
            },
          },
          agent: {
            select: { nom: true, prenom: true },
          },
          paiements: {
            where: { valide: true },
            select: { montant: true },
          },
        },
      }),
      prisma.contrat.count({ where }),
    ]);

    // Calculer le montant payé et le reste dû pour chaque contrat
    const contratsAvecSolde = contrats.map((c) => {
      const totalPaye = c.paiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0
      );
      const prixTotal = Number(c.reservation.prixTotal);
      return {
        ...c,
        totalPaye,
        resteADu: Math.max(0, prixTotal - totalPaye),
      };
    });

    return { contrats: contratsAvecSolde, total };
  }

  /**
   * Récupère un contrat par son ID avec tous les détails
   */
  async getById(id: string) {
    return prisma.contrat.findUnique({
      where: { id },
      include: {
        client: true,
        reservation: {
          include: {
            vehicule: true,
          },
        },
        agent: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        paiements: {
          where: { valide: true },
          orderBy: { datePaiement: 'asc' },
        },
      },
    });
  }

  /**
   * Crée un contrat depuis une réservation confirmée
   */
  async create(dto: CreateContratDto, agentId: string) {
    // Vérifier que la réservation existe et est confirmée
    const reservation = await prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: {
        client: true,
        vehicule: true,
      },
    });

    if (!reservation) {
      throw new Error('Réservation introuvable');
    }

    if (!['CONFIRMEE', 'EN_COURS'].includes(reservation.statut)) {
      throw new Error(
        'La réservation doit être confirmée pour créer un contrat'
      );
    }

    // Vérifier qu'il n'y a pas déjà un contrat pour cette réservation
    const contratExistant = await prisma.contrat.findUnique({
      where: { reservationId: dto.reservationId },
    });

    if (contratExistant) {
      throw new Error('Un contrat existe déjà pour cette réservation');
    }

    const numeroContrat = await generateNumeroContrat();

    const contrat = await prisma.$transaction(async (tx) => {
      // Créer le contrat
      const newContrat = await tx.contrat.create({
        data: {
          numeroContrat,
          reservationId: dto.reservationId,
          clientId: reservation.clientId,
          agentId,
          kilometrageDepart: dto.kilometrageDepart,
          etatDepart: dto.etatDepart,
          caution: dto.caution ?? 0,
          notes: dto.notes,
        },
        include: {
          client: true,
          reservation: {
            include: { vehicule: true },
          },
          agent: {
            select: { nom: true, prenom: true },
          },
        },
      });

      // Mettre à jour le statut de la réservation en EN_COURS
      await tx.reservation.update({
        where: { id: dto.reservationId },
        data: { statut: 'EN_COURS' },
      });

      // Mettre à jour le statut du véhicule
      await tx.vehicule.update({
        where: { id: reservation.vehiculeId },
        data: {
          statut: 'LOUE',
          kilometrage: dto.kilometrageDepart,
        },
      });

      return newContrat;
    });

    logger.info(`Contrat créé: ${contrat.numeroContrat}`);
    return contrat;
  }

  /**
   * Met à jour un contrat
   */
  async update(id: string, dto: UpdateContratDto) {
    const contrat = await prisma.contrat.findUnique({ where: { id } });

    if (!contrat) {
      throw new Error('Contrat introuvable');
    }

    if (contrat.statut === 'TERMINE') {
      throw new Error('Impossible de modifier un contrat terminé');
    }

    return prisma.contrat.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Clôture un contrat (fin de location)
   */
  async cloture(id: string, dto: ClotureContratDto) {
    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        reservation: {
          include: { vehicule: true },
        },
      },
    });

    if (!contrat) {
      throw new Error('Contrat introuvable');
    }

    if (contrat.statut !== 'ACTIF') {
      throw new Error('Seuls les contrats actifs peuvent être clôturés');
    }

    if (dto.kilometrageRetour < contrat.kilometrageDepart) {
      throw new Error(
        'Le kilométrage de retour doit être supérieur au kilométrage de départ'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Clôturer le contrat
      const updatedContrat = await tx.contrat.update({
        where: { id },
        data: {
          statut: 'TERMINE',
          kilometrageRetour: dto.kilometrageRetour,
          etatRetour: dto.etatRetour,
          cautionRendue: dto.cautionRendue,
        },
      });

      // Mettre à jour la réservation
      await tx.reservation.update({
        where: { id: contrat.reservationId },
        data: { statut: 'TERMINEE' },
      });

      // Remettre le véhicule disponible et mettre à jour le kilométrage
      await tx.vehicule.update({
        where: { id: contrat.reservation.vehiculeId },
        data: {
          statut: 'DISPONIBLE',
          kilometrage: dto.kilometrageRetour,
        },
      });

      return updatedContrat;
    });

    logger.info(`Contrat clôturé: ${contrat.numeroContrat}`);
    return result;
  }

  /**
   * Génère le PDF d'un contrat
   */
  async generatePdf(id: string): Promise<string> {
    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        client: true,
        reservation: {
          include: { vehicule: true },
        },
        agent: {
          select: { nom: true, prenom: true },
        },
        paiements: {
          where: { valide: true },
          orderBy: { datePaiement: 'asc' },
        },
      },
    });

    if (!contrat) {
      throw new Error('Contrat introuvable');
    }

    const pdfUrl = await pdfService.generateContratPdf({
      numeroContrat: contrat.numeroContrat,
      dateSignature: contrat.dateSignature,
      client: contrat.client,
      vehicule: contrat.reservation.vehicule,
      reservation: {
        dateDebut: contrat.reservation.dateDebut,
        dateFin: contrat.reservation.dateFin,
        nombreJours: contrat.reservation.nombreJours,
        prixTotal: Number(contrat.reservation.prixTotal),
        avance: Number(contrat.reservation.avance),
        lieuPriseEnCharge: contrat.reservation.lieuPriseEnCharge,
        lieuRetour: contrat.reservation.lieuRetour,
        typeTrajet: contrat.reservation.typeTrajet,
      },
      contrat: {
        kilometrageDepart: contrat.kilometrageDepart,
        etatDepart: contrat.etatDepart,
        caution: Number(contrat.caution),
      },
      agent: contrat.agent,
      paiements: contrat.paiements.map((p) => ({
        montant: Number(p.montant),
        methode: p.methode,
        datePaiement: p.datePaiement,
        reference: p.reference,
      })),
    });

    // Sauvegarder l'URL du PDF dans le contrat
    await prisma.contrat.update({
      where: { id },
      data: { pdfUrl },
    });

    return pdfUrl;
  }
}

export const contratService = new ContratService();

// ---- Service Paiements ----

export class PaiementService {
  /**
   * Récupère tous les paiements avec filtres
   */
  async getAll(filters: PaiementFilters) {
    const { methode, dateDebut, dateFin, valide, contratId, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(methode && { methode }),
      ...(typeof valide === 'boolean' && { valide }),
      ...(contratId && { contratId }),
      ...(dateDebut && dateFin && {
        datePaiement: { gte: new Date(dateDebut), lte: new Date(dateFin) },
      }),
      ...(search && {
        OR: [
          { contrat: { client: { nom: { contains: search, mode: 'insensitive' as const } } } },
          { contrat: { client: { prenom: { contains: search, mode: 'insensitive' as const } } } },
          { contrat: { numeroContrat: { contains: search, mode: 'insensitive' as const } } },
          { reference: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [paiements, total] = await Promise.all([
      prisma.paiement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { datePaiement: 'desc' },
        include: {
          contrat: {
            include: {
              client: {
                select: { nom: true, prenom: true },
              },
              reservation: {
                select: {
                  numeroReservation: true,
                  vehicule: {
                    select: { marque: true, modele: true, immatriculation: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.paiement.count({ where }),
    ]);

    return { paiements, total };
  }

  /**
   * Récupère les paiements d'un contrat
   */
  async getByContrat(contratId: string) {
    const contrat = await prisma.contrat.findUnique({
      where: { id: contratId },
      include: {
        reservation: { select: { prixTotal: true } },
        paiements: {
          orderBy: { datePaiement: 'asc' },
        },
      },
    });

    if (!contrat) {
      throw new Error('Contrat introuvable');
    }

    const totalPaye = contrat.paiements
      .filter((p) => p.valide)
      .reduce((sum, p) => sum + Number(p.montant), 0);

    const prixTotal = Number(contrat.reservation.prixTotal);

    return {
      paiements: contrat.paiements,
      totalPaye,
      prixTotal,
      resteADu: Math.max(0, prixTotal - totalPaye),
    };
  }

  /**
   * Enregistre un nouveau paiement
   */
  async create(dto: CreatePaiementDto) {
    const contrat = await prisma.contrat.findUnique({
      where: { id: dto.contratId },
      include: {
        reservation: { select: { prixTotal: true } },
        paiements: {
          where: { valide: true },
          select: { montant: true },
        },
      },
    });

    if (!contrat) {
      throw new Error('Contrat introuvable');
    }

    if (contrat.statut === 'TERMINE') {
      throw new Error('Impossible d\'ajouter un paiement à un contrat terminé');
    }

    // Vérifier que le montant ne dépasse pas le reste dû
    const totalPaye = contrat.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0
    );
    const prixTotal = Number(contrat.reservation.prixTotal);
    const resteADu = prixTotal - totalPaye;

    if (dto.montant > resteADu + Number(contrat.caution ?? 0)) {
      throw new Error(
        `Le montant (${dto.montant}) dépasse le reste dû (${resteADu} FCFA)`
      );
    }

    const paiement = await prisma.paiement.create({
      data: {
        contratId: dto.contratId,
        montant: dto.montant,
        methode: dto.methode,
        reference: dto.reference,
        notes: dto.notes,
        datePaiement: dto.datePaiement
          ? new Date(dto.datePaiement)
          : new Date(),
      },
    });

    logger.info(
      `Paiement enregistré: ${dto.montant} FCFA (${dto.methode}) pour contrat ${dto.contratId}`
    );

    return paiement;
  }

  /**
   * Valide ou invalide un paiement (Comptable/Admin)
   */
  async valider(id: string, valide: boolean) {
    const paiement = await prisma.paiement.findUnique({ where: { id } });

    if (!paiement) {
      throw new Error('Paiement introuvable');
    }

    return prisma.paiement.update({
      where: { id },
      data: { valide },
    });
  }

  /**
   * Génère le reçu PDF d'un paiement
   */
  async generateRecu(id: string): Promise<Buffer> {
    const paiement = await prisma.paiement.findUnique({
      where: { id },
      include: {
        contrat: {
          include: {
            client: true,
            reservation: { include: { vehicule: true } },
            paiements: { where: { valide: true }, select: { montant: true } },
          },
        },
      },
    });

    if (!paiement || !paiement.contrat) throw new Error('Paiement introuvable');

    const c = paiement.contrat;
    const totalPaye = c.paiements.reduce((s, p) => s + Number(p.montant), 0);
    const prixTotal = Number(c.reservation.prixTotal);

    return pdfService.generateRecuPaiementPdf({
      paiement: {
        montant: Number(paiement.montant),
        methode: paiement.methode,
        reference: paiement.reference,
        datePaiement: paiement.datePaiement,
        notes: paiement.notes,
        valide: paiement.valide,
      },
      contrat: { numeroContrat: c.numeroContrat },
      client: {
        prenom: c.client.prenom,
        nom: c.client.nom,
        telephone: c.client.telephone,
        email: c.client.email,
      },
      vehicule: {
        marque: c.reservation.vehicule.marque,
        modele: c.reservation.vehicule.modele,
        immatriculation: c.reservation.vehicule.immatriculation,
      },
      reservation: {
        dateDebut: c.reservation.dateDebut,
        dateFin: c.reservation.dateFin,
        prixTotal,
        nombreJours: c.reservation.nombreJours,
      },
      resteADu: Math.max(0, prixTotal - totalPaye),
    });
  }

  /**
   * Statistiques des paiements par méthode
   */
  async getStatsByMethode(dateDebut?: Date, dateFin?: Date) {
    const where = {
      valide: true,
      ...(dateDebut && dateFin && {
        datePaiement: { gte: dateDebut, lte: dateFin },
      }),
    };

    const stats = await prisma.paiement.groupBy({
      by: ['methode'],
      where,
      _sum: { montant: true },
      _count: { id: true },
    });

    return stats.map((s) => ({
      methode: s.methode,
      total: Number(s._sum.montant) || 0,
      nombre: s._count.id,
    }));
  }
}

export const paiementService = new PaiementService();
