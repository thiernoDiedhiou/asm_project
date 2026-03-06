// Service tarification — matrice PrixCategorie × TarifZone
import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const tarificationService = {
  /**
   * Retourne la matrice complète :
   * zones[] avec pour chacune ses prixCategories[]
   */
  async getMatrix() {
    const zones = await prisma.tarifZone.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
      include: {
        prixCategories: {
          orderBy: { categorie: 'asc' },
        },
      },
    });
    return zones;
  },

  /**
   * Met à jour un prix dans la matrice.
   * @param id  ID du PrixCategorie à modifier
   * @param data  { prixJournalier, prixSemaine? }
   */
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

  /**
   * Résout le prix journalier pour une catégorie de véhicule et une zone.
   * Utilisé lors de la création d'une réservation.
   * Retourne null si la combinaison n'existe pas.
   */
  async getPrix(categorie: string, zoneId: string) {
    const prix = await prisma.prixCategorie.findUnique({
      where: { categorie_zoneId: { categorie: categorie as any, zoneId } },
    });
    return prix;
  },
};
