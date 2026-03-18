// Service tarification — matrice PrixCategorie × TarifZone
import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const tarificationService = {
  async getMatrix(tenantId: string) {
    const zones = await prisma.tarifZone.findMany({
      where: { tenantId, actif: true },
      orderBy: { nom: 'asc' },
      include: {
        prixCategories: {
          orderBy: { categorie: 'asc' },
        },
      },
    });
    return zones;
  },

  async updateCell(id: string, data: { prixJournalier: number; prixSemaine?: number | null }) {
    const updated = await prisma.prixCategorie.update({
      where: { id },
      data: {
        prixJournalier: new Decimal(data.prixJournalier),
        ...(data.prixSemaine !== undefined && {
          prixSemaine: data.prixSemaine !== null ? new Decimal(data.prixSemaine) : null,
        }),
      },
    });
    return updated;
  },

  async upsertCell(tenantId: string, categorie: string, zoneId: string, prixJournalier: number, prixSemaine?: number | null) {
    // Vérifie que la zone appartient bien au tenant
    const zone = await prisma.tarifZone.findFirst({ where: { id: zoneId, tenantId } });
    if (!zone) throw new Error('Zone introuvable ou accès refusé');

    return prisma.prixCategorie.upsert({
      where: { categorie_zoneId: { categorie: categorie as any, zoneId } },
      create: {
        categorie: categorie as any,
        zoneId,
        prixJournalier: new Decimal(prixJournalier),
        prixSemaine: prixSemaine != null ? new Decimal(prixSemaine) : null,
      },
      update: {
        prixJournalier: new Decimal(prixJournalier),
        ...(prixSemaine !== undefined && { prixSemaine: prixSemaine != null ? new Decimal(prixSemaine) : null }),
      },
    });
  },

  async getPrix(categorie: string, zoneId: string) {
    const prix = await prisma.prixCategorie.findUnique({
      where: { categorie_zoneId: { categorie: categorie as any, zoneId } },
    });
    return prix;
  },
};
