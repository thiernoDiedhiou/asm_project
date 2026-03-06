// Logique de calcul des prix - ASM Multi-Services
// Tarifs basés sur les données réelles de l'entreprise
import { TypeTrajet } from '@prisma/client';

// Tarifs de base (en FCFA)
const TARIFS = {
  // Transferts fixes
  TRANSFERT_AIBD: 25000,      // Dakar ↔ AIBD
  TRANSFERT_THIES: 30000,     // Vers Thiès
  TRANSFERT_AUTRES: 37500,    // Autres régions (moyenne 35000-40000)

  // Remises
  REMISE_LONGUE_DUREE: 0.10, // -10% si > 2 semaines
  REMISE_FIDELITE: 0.05,     // -5% si > 5 locations
};

export interface PrixCalcule {
  prixBase: number;
  nombreJours: number;
  remiseLongueDuree: number;
  remiseFidelite: number;
  prixTotal: number;
  detail: string;
}

/**
 * Calcule le nombre de jours entre deux dates
 */
export function calculerNombreJours(dateDebut: Date, dateFin: Date): number {
  const diffMs = dateFin.getTime() - dateDebut.getTime();
  const diffJours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffJours);
}

/**
 * Calcule le prix total d'une location
 */
export function calculerPrix(
  typeTrajet: TypeTrajet,
  dateDebut: Date,
  dateFin: Date,
  prixJournalier: number,
  prixSemaine: number,
  nombreLocationsClient = 0
): PrixCalcule {
  const nombreJours = calculerNombreJours(dateDebut, dateFin);

  // Prix de base selon le type de trajet
  let prixBase = 0;
  let detail = '';

  if (typeTrajet === TypeTrajet.TRANSFERT_AEROPORT) {
    prixBase = TARIFS.TRANSFERT_AIBD;
    detail = `Transfert aéroport: ${prixBase.toLocaleString('fr-SN')} FCFA`;
  } else {
    // Calcul pour location standard et longue durée
    const nombreSemaines = Math.floor(nombreJours / 7);
    const joursRestants = nombreJours % 7;

    if (nombreSemaines > 0) {
      prixBase += nombreSemaines * prixSemaine;
      detail += `${nombreSemaines} semaine(s) × ${prixSemaine.toLocaleString('fr-SN')} FCFA`;
    }

    if (joursRestants > 0) {
      const prixJours = joursRestants * prixJournalier;
      prixBase += prixJours;
      detail += `${nombreSemaines > 0 ? ' + ' : ''}${joursRestants} jour(s) × ${prixJournalier.toLocaleString('fr-SN')} FCFA`;
    }
  }

  // Calcul des remises
  let remiseLongueDuree = 0;
  let remiseFidelite = 0;

  if (typeTrajet !== TypeTrajet.TRANSFERT_AEROPORT) {
    // Remise longue durée (> 14 jours = 2 semaines)
    if (nombreJours > 14) {
      remiseLongueDuree = prixBase * TARIFS.REMISE_LONGUE_DUREE;
    }

    // Remise fidélité (> 5 locations précédentes)
    if (nombreLocationsClient > 5) {
      remiseFidelite = prixBase * TARIFS.REMISE_FIDELITE;
    }
  }

  const prixTotal = prixBase - remiseLongueDuree - remiseFidelite;

  return {
    prixBase,
    nombreJours,
    remiseLongueDuree,
    remiseFidelite,
    prixTotal: Math.round(prixTotal),
    detail,
  };
}

/**
 * Formate un montant en FCFA
 */
export function formatFCFA(montant: number): string {
  return `${montant.toLocaleString('fr-SN')} FCFA`;
}
