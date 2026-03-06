// Service de gestion des clients
import prisma from '../utils/prisma';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientFilters,
} from '../validators/client.validator';
import logger from '../utils/logger';

export class ClientService {
  /**
   * Récupère la liste des clients avec recherche et pagination
   */
  async getAll(filters: ClientFilters) {
    const { search, typeClient, page, limit } = filters;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      ...(typeClient && { typeClient }),
      ...(search && {
        OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { prenom: { contains: search, mode: 'insensitive' } },
          { telephone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
          { numeroCNI: { contains: search } },
        ],
      }),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { reservations: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return { clients, total };
  }

  /**
   * Récupère un client par son ID
   */
  async getById(id: string) {
    return prisma.client.findUnique({
      where: { id },
    });
  }

  /**
   * Récupère le profil complet d'un client avec son historique
   */
  async getHistorique(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error('Client introuvable');
    }

    const reservations = await prisma.reservation.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicule: {
          select: { marque: true, modele: true, immatriculation: true },
        },
        contrat: {
          include: {
            paiements: {
              where: { valide: true },
            },
          },
        },
      },
    });

    // Calcul des statistiques du client
    const paiementsValides = reservations
      .flatMap((r) => r.contrat?.paiements || [])
      .filter((p) => p.valide);

    const totalDepense = paiementsValides.reduce(
      (sum, p) => sum + Number(p.montant),
      0
    );

    const nombreLocations = reservations.filter(
      (r) => r.statut === 'TERMINEE'
    ).length;

    // Détermination du statut client
    let statutClient = 'NOUVEAU';
    if (nombreLocations > 10) {
      statutClient = 'VIP';
    } else if (nombreLocations > 3) {
      statutClient = 'REGULIER';
    }

    return {
      client,
      reservations,
      statistiques: {
        totalReservations: reservations.length,
        locationsTerminees: nombreLocations,
        totalDepense,
        statutClient,
      },
    };
  }

  /**
   * Crée un nouveau client
   */
  async create(dto: CreateClientDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = await prisma.client.create({ data: { ...dto, email: dto.email || null } as any });

    logger.info(`Client créé: ${client.prenom} ${client.nom} (${client.telephone})`);
    return client;
  }

  /**
   * Met à jour un client
   */
  async update(id: string, dto: UpdateClientDto) {
    const client = await prisma.client.findUnique({ where: { id } });

    if (!client) {
      throw new Error('Client introuvable');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.client.update({ where: { id }, data: dto as any });
  }

  /**
   * Recherche un client par téléphone (pour autocomplétion)
   */
  async searchByPhone(telephone: string) {
    return prisma.client.findMany({
      where: {
        telephone: { contains: telephone },
      },
      take: 5,
    });
  }
}

export const clientService = new ClientService();
