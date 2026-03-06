import prisma from '../utils/prisma';
import { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceFiltres } from '../validators/maintenance.validator';
import { StatutVehicule } from '@prisma/client';

export class MaintenanceService {
  async getAll(filters: MaintenanceFiltres) {
    const { vehiculeId, statut, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (vehiculeId) where.vehiculeId = vehiculeId;
    if (statut) where.statut = statut;

    const [maintenances, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicule: {
            select: { id: true, marque: true, modele: true, immatriculation: true },
          },
        },
        orderBy: { dateDebut: 'desc' },
      }),
      prisma.maintenance.count({ where }),
    ]);

    return { maintenances, total };
  }

  async getById(id: string) {
    return prisma.maintenance.findUnique({
      where: { id },
      include: {
        vehicule: {
          select: { id: true, marque: true, modele: true, immatriculation: true, statut: true },
        },
      },
    });
  }

  async create(data: CreateMaintenanceDto) {
    const { vehiculeId, dateDebut, dateFin, ...rest } = data;

    // Vérifier que le véhicule existe
    const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } });
    if (!vehicule) throw new Error('Véhicule introuvable');

    const maintenance = await prisma.maintenance.create({
      data: {
        ...rest,
        vehiculeId,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : undefined,
        statut: rest.statut || 'EN_COURS',
      },
      include: {
        vehicule: { select: { id: true, marque: true, modele: true, immatriculation: true } },
      },
    });

    // Mettre le véhicule EN_MAINTENANCE si statut EN_COURS
    if (maintenance.statut === 'EN_COURS') {
      await prisma.vehicule.update({
        where: { id: vehiculeId },
        data: { statut: StatutVehicule.EN_MAINTENANCE },
      });
    }

    return maintenance;
  }

  async update(id: string, data: UpdateMaintenanceDto) {
    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance introuvable');

    const { dateDebut, dateFin, ...rest } = data;

    const maintenance = await prisma.maintenance.update({
      where: { id },
      data: {
        ...rest,
        ...(dateDebut && { dateDebut: new Date(dateDebut) }),
        ...(dateFin && { dateFin: new Date(dateFin) }),
      },
      include: {
        vehicule: { select: { id: true, marque: true, modele: true, immatriculation: true } },
      },
    });

    // Si terminée, remettre le véhicule DISPONIBLE
    if (maintenance.statut === 'TERMINEE') {
      const autresEnCours = await prisma.maintenance.count({
        where: {
          vehiculeId: existing.vehiculeId,
          statut: 'EN_COURS',
          id: { not: id },
        },
      });
      if (autresEnCours === 0) {
        await prisma.vehicule.update({
          where: { id: existing.vehiculeId },
          data: { statut: StatutVehicule.DISPONIBLE },
        });
      }
    }

    return maintenance;
  }

  async delete(id: string) {
    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance introuvable');
    await prisma.maintenance.delete({ where: { id } });
  }

  async getStats() {
    const [total, enCours, planifiees, terminees, coutTotal] = await Promise.all([
      prisma.maintenance.count(),
      prisma.maintenance.count({ where: { statut: 'EN_COURS' } }),
      prisma.maintenance.count({ where: { statut: 'PLANIFIEE' } }),
      prisma.maintenance.count({ where: { statut: 'TERMINEE' } }),
      prisma.maintenance.aggregate({ _sum: { cout: true }, where: { statut: 'TERMINEE' } }),
    ]);

    return { total, enCours, planifiees, terminees, coutTotal: coutTotal._sum.cout || 0 };
  }
}

export const maintenanceService = new MaintenanceService();
