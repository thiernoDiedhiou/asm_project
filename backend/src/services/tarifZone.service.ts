// Service de gestion des zones tarifaires
import prisma from '../utils/prisma';
import { CreateTarifZoneDto, UpdateTarifZoneDto } from '../validators/tarifZone.validator';

export const tarifZoneService = {
  async getAll(actifSeulement = false, tenantId: string) {
    return prisma.tarifZone.findMany({
      where: { tenantId, ...(actifSeulement ? { actif: true } : {}) },
      orderBy: { nom: 'asc' },
    });
  },

  async getById(id: string, tenantId: string) {
    return prisma.tarifZone.findFirst({ where: { id, tenantId } });
  },

  async create(dto: CreateTarifZoneDto, tenantId: string) {
    const existant = await prisma.tarifZone.findFirst({ where: { nom: dto.nom, tenantId } });
    if (existant) throw new Error(`Une zone nommée "${dto.nom}" existe déjà`);
    return prisma.tarifZone.create({ data: { ...dto, tenantId } });
  },

  async update(id: string, dto: UpdateTarifZoneDto, tenantId: string) {
    const zone = await prisma.tarifZone.findFirst({ where: { id, tenantId } });
    if (!zone) throw new Error('Zone introuvable');

    if (dto.nom && dto.nom !== zone.nom) {
      const existant = await prisma.tarifZone.findFirst({ where: { nom: dto.nom, tenantId } });
      if (existant) throw new Error(`Une zone nommée "${dto.nom}" existe déjà`);
    }

    return prisma.tarifZone.update({ where: { id }, data: dto });
  },

  async delete(id: string, tenantId: string) {
    const reservations = await prisma.reservation.count({ where: { zoneId: id, tenantId } });
    if (reservations > 0) {
      throw new Error('Impossible de supprimer : cette zone est utilisée dans des réservations');
    }
    return prisma.tarifZone.delete({ where: { id } });
  },
};
