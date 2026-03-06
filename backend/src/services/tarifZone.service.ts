// Service de gestion des zones tarifaires
import prisma from '../utils/prisma';
import { CreateTarifZoneDto, UpdateTarifZoneDto } from '../validators/tarifZone.validator';

export const tarifZoneService = {
  async getAll(actifSeulement = false) {
    return prisma.tarifZone.findMany({
      where: actifSeulement ? { actif: true } : undefined,
      orderBy: { nom: 'asc' },
    });
  },

  async getById(id: string) {
    return prisma.tarifZone.findUnique({ where: { id } });
  },

  async create(dto: CreateTarifZoneDto) {
    const existant = await prisma.tarifZone.findUnique({ where: { nom: dto.nom } });
    if (existant) throw new Error(`Une zone nommée "${dto.nom}" existe déjà`);
    return prisma.tarifZone.create({ data: dto });
  },

  async update(id: string, dto: UpdateTarifZoneDto) {
    const zone = await prisma.tarifZone.findUnique({ where: { id } });
    if (!zone) throw new Error('Zone introuvable');

    if (dto.nom && dto.nom !== zone.nom) {
      const existant = await prisma.tarifZone.findUnique({ where: { nom: dto.nom } });
      if (existant) throw new Error(`Une zone nommée "${dto.nom}" existe déjà`);
    }

    return prisma.tarifZone.update({ where: { id }, data: dto });
  },

  async delete(id: string) {
    const reservations = await prisma.reservation.count({ where: { zoneId: id } });
    if (reservations > 0) {
      throw new Error('Impossible de supprimer : cette zone est utilisée dans des réservations');
    }
    return prisma.tarifZone.delete({ where: { id } });
  },
};
