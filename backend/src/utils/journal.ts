// Utilitaire de journalisation des actions utilisateurs (audit log)
import { Prisma } from '@prisma/client';
import prisma from './prisma';

export interface LogActionParams {
  userId: string;
  userNom?: string;  // Optionnel : si fourni, évite la requête DB
  userRole: string;
  action: string;
  entite: string;
  entiteId?: string;
  details?: Record<string, unknown>;
}

/**
 * Enregistre une action dans le journal d'activité.
 * - Ne bloque jamais l'opération principale (catch silencieux)
 * - Snapshot le nom de l'utilisateur pour l'historique
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    let userNom = params.userNom;

    if (!userNom) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { prenom: true, nom: true },
      });
      userNom = user ? `${user.prenom} ${user.nom}` : 'Utilisateur inconnu';
    }

    await prisma.journalActivite.create({
      data: {
        userId: params.userId,
        userNom,
        userRole: params.userRole,
        action: params.action,
        entite: params.entite,
        entiteId: params.entiteId ?? null,
        details: (params.details ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Le journal ne doit jamais bloquer ni faire échouer une opération métier
  }
}

// ---- Actions prédéfinies pour la cohérence ----

export const ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',

  // Réservations
  RESERVATION_CREEE: 'RESERVATION_CREEE',
  RESERVATION_STATUT_MODIFIE: 'RESERVATION_STATUT_MODIFIE',
  RESERVATION_SUPPRIMEE: 'RESERVATION_SUPPRIMEE',

  // Contrats
  CONTRAT_CREE: 'CONTRAT_CREE',
  CONTRAT_CLOTURE: 'CONTRAT_CLOTURE',

  // Paiements
  PAIEMENT_ENREGISTRE: 'PAIEMENT_ENREGISTRE',
  PAIEMENT_VALIDE: 'PAIEMENT_VALIDE',
  PAIEMENT_INVALIDE: 'PAIEMENT_INVALIDE',

  // Véhicules
  VEHICULE_CREE: 'VEHICULE_CREE',
  VEHICULE_MODIFIE: 'VEHICULE_MODIFIE',
  VEHICULE_SUPPRIME: 'VEHICULE_SUPPRIME',

  // Maintenances
  MAINTENANCE_CREEE: 'MAINTENANCE_CREEE',
  MAINTENANCE_MODIFIEE: 'MAINTENANCE_MODIFIEE',

  // Clients
  CLIENT_CREE: 'CLIENT_CREE',
  CLIENT_MODIFIE: 'CLIENT_MODIFIE',
} as const;

export const ENTITES = {
  AUTH: 'AUTH',
  RESERVATION: 'RESERVATION',
  CONTRAT: 'CONTRAT',
  PAIEMENT: 'PAIEMENT',
  VEHICULE: 'VEHICULE',
  MAINTENANCE: 'MAINTENANCE',
  CLIENT: 'CLIENT',
} as const;
