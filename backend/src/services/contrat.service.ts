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
 * Génère le prochain numéro candidat CTR-YYMM-NNNN à partir du dernier existant.
 * Appelé dans une boucle retry côté service pour gérer les collisions.
 */
async function generateNumeroContrat(offset = 0): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `CTR-${yymm}-`;

  const last = await prisma.contrat.findFirst({
    where: { numeroContrat: { startsWith: prefix } },
    orderBy: { numeroContrat: 'desc' },
    select: { numeroContrat: true },
  });

  const lastSeq = last ? parseInt(last.numeroContrat.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1 + offset).padStart(4, '0')}`;
}

export class ContratService {
  async getAll(page = 1, limit = 20, statut: string | undefined, search: string | undefined, tenantId: string) {
    if (!tenantId) throw new Error('TenantId requis');
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
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

  async getById(id: string, tenantId: string) {
    return prisma.contrat.findFirst({
      where: { id, tenantId },
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

  async create(dto: CreateContratDto, agentId: string, tenantId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id: dto.reservationId, tenantId },
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

    const contratExistant = await prisma.contrat.findUnique({
      where: { reservationId: dto.reservationId },
    });

    if (contratExistant) {
      throw new Error('Un contrat existe déjà pour cette réservation');
    }

    // Retry jusqu'à 5 fois en cas de collision sur numeroContrat (P2002)
    let contrat;
    for (let attempt = 0; attempt < 5; attempt++) {
      const numeroContrat = await generateNumeroContrat(attempt);
      try {
        contrat = await prisma.$transaction(async (tx) => {
          const newContrat = await tx.contrat.create({
            data: {
              tenantId,
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
              reservation: { include: { vehicule: true } },
              agent: { select: { nom: true, prenom: true } },
            },
          });
          await tx.reservation.update({
            where: { id: dto.reservationId },
            data: { statut: 'EN_COURS' },
          });
          await tx.vehicule.update({
            where: { id: reservation.vehiculeId },
            data: { statut: 'LOUE', kilometrage: dto.kilometrageDepart },
          });
          return newContrat;
        });
        break; // succès — sortir de la boucle
      } catch (err: unknown) {
        const isPrismaUnique = (err as { code?: string })?.code === 'P2002';
        if (isPrismaUnique && attempt < 4) continue; // réessayer avec offset+1
        throw err; // autre erreur ou épuisement des tentatives
      }
    }

    logger.info(`Contrat créé: ${(contrat as { numeroContrat: string }).numeroContrat}`);
    return contrat;
  }

  async update(id: string, dto: UpdateContratDto, tenantId: string) {
    const contrat = await prisma.contrat.findFirst({ where: { id, tenantId } });

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

  async cloture(id: string, dto: ClotureContratDto, tenantId: string) {
    const contrat = await prisma.contrat.findFirst({
      where: { id, tenantId },
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
      const updatedContrat = await tx.contrat.update({
        where: { id },
        data: {
          statut: 'TERMINE',
          kilometrageRetour: dto.kilometrageRetour,
          etatRetour: dto.etatRetour,
          cautionRendue: dto.cautionRendue,
        },
      });

      await tx.reservation.update({
        where: { id: contrat.reservationId },
        data: { statut: 'TERMINEE' },
      });

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

  async generatePdf(id: string, tenantId: string): Promise<string> {
    const contrat = await prisma.contrat.findFirst({
      where: { id, tenantId },
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
    }, tenantId);

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
  async getAll(filters: PaiementFilters, tenantId: string) {
    const { methode, dateDebut, dateFin, valide, contratId, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
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

  async getByContrat(contratId: string, tenantId: string) {
    const contrat = await prisma.contrat.findFirst({
      where: { id: contratId, tenantId },
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

  async create(dto: CreatePaiementDto, tenantId: string) {
    const contrat = await prisma.contrat.findFirst({
      where: { id: dto.contratId, tenantId },
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
        tenantId,
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

  async generateRecu(id: string, tenantId: string): Promise<Buffer> {
    const paiement = await prisma.paiement.findFirst({
      where: { id, tenantId },
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
    }, tenantId);
  }

  async getStatsByMethode(tenantId: string, dateDebut?: Date, dateFin?: Date) {
    const where = {
      tenantId,
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
