// Utilitaires de formatage pour le frontend
import { format, formatDistance, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate un montant en FCFA
 */
export function formatFCFA(montant: number | string | null | undefined): string {
  if (montant === null || montant === undefined) return '0 FCFA';
  const num = typeof montant === 'string' ? parseFloat(montant) : montant;
  if (isNaN(num)) return '0 FCFA';
  return `${num.toLocaleString('fr-SN')} FCFA`;
}

/**
 * Formate une date en français
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatStr = 'dd/MM/yyyy'
): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr, { locale: fr });
  } catch {
    return '-';
  }
}

/**
 * Formate une date avec l'heure
 */
export function formatDateTime(
  date: Date | string | null | undefined
): string {
  return formatDate(date, "dd/MM/yyyy 'à' HH:mm");
}

/**
 * Durée relative (ex: "il y a 2 heures")
 */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(d, new Date(), { addSuffix: true, locale: fr });
  } catch {
    return '-';
  }
}

/**
 * Couleur de badge par statut de réservation
 */
export function getStatutReservationColor(statut: string): string {
  const colors: Record<string, string> = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMEE: 'bg-blue-100 text-blue-800 border-blue-200',
    EN_COURS: 'bg-green-100 text-green-800 border-green-200',
    TERMINEE: 'bg-gray-100 text-gray-700 border-gray-200',
    ANNULEE: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[statut] || 'bg-gray-100 text-gray-700';
}

/**
 * Couleur de badge par statut de véhicule
 */
export function getStatutVehiculeColor(statut: string): string {
  const colors: Record<string, string> = {
    DISPONIBLE: 'bg-green-100 text-green-800',
    LOUE: 'bg-blue-100 text-blue-800',
    EN_MAINTENANCE: 'bg-orange-100 text-orange-800',
    HORS_SERVICE: 'bg-red-100 text-red-800',
  };
  return colors[statut] || 'bg-gray-100 text-gray-700';
}

/**
 * Label français pour les statuts
 */
export const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
  DISPONIBLE: 'Disponible',
  LOUE: 'Loué',
  EN_MAINTENANCE: 'En maintenance',
  HORS_SERVICE: 'Hors service',
  ACTIF: 'Actif',
  TERMINE: 'Terminé',
  LITIGE: 'Litige',
  PLANIFIEE: 'Planifiée',
};

export const METHODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money',
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
};

export const CATEGORIE_LABELS: Record<string, string> = {
  ECONOMIQUE: 'Économique',
  STANDARD: 'Standard',
  SUV: 'SUV',
  LUXE: 'Luxe',
  UTILITAIRE: 'Utilitaire',
};

export const TYPE_TRAJET_LABELS: Record<string, string> = {
  LOCATION: 'Location',
  TRANSFERT_AEROPORT: 'Transfert Aéroport',
  LONGUE_DUREE: 'Longue Durée',
};
