// Schémas de validation pour les contrats et paiements
import { z } from 'zod';

export const createContratSchema = z.object({
  reservationId: z.string().uuid('ID réservation invalide'),
  kilometrageDepart: z
    .number()
    .int()
    .min(0, 'Le kilométrage doit être positif'),
  etatDepart: z
    .string()
    .min(1, "L'état de départ est requis"),
  caution: z
    .number()
    .min(0, 'La caution doit être positive')
    .optional(),
  notes: z.string().optional(),
});

export const updateContratSchema = z.object({
  kilometrageRetour: z.number().int().min(0).optional(),
  etatRetour: z.string().optional(),
  statut: z.enum(['ACTIF', 'TERMINE', 'LITIGE']).optional(),
});

export const clotureContratSchema = z.object({
  kilometrageRetour: z
    .number()
    .int()
    .min(0, 'Kilométrage de retour requis'),
  etatRetour: z.string().min(1, "L'état de retour est requis"),
  cautionRendue: z.boolean().default(false),
});

export const createPaiementSchema = z.object({
  contratId: z.string().uuid('ID contrat invalide'),
  montant: z.number().positive('Le montant doit être positif'),
  methode: z.enum([
    'ESPECES',
    'WAVE',
    'ORANGE_MONEY',
    'FREE_MONEY',
    'VIREMENT',
    'CHEQUE',
  ]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  datePaiement: z.string().optional(),
});

export const paiementFiltresSchema = z.object({
  methode: z
    .enum(['ESPECES', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'VIREMENT', 'CHEQUE'])
    .optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  valide: z.coerce.boolean().optional(),
  contratId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createMaintenanceSchema = z.object({
  vehiculeId: z.string().uuid('ID véhicule invalide'),
  type: z.string().min(1, 'Le type de maintenance est requis'),
  description: z.string().min(1, 'La description est requise'),
  cout: z.number().positive().optional(),
  dateDebut: z.string().refine((d) => !isNaN(Date.parse(d)), 'Date de début invalide'),
  dateFin: z.string().optional(),
});

export type CreateContratDto = z.infer<typeof createContratSchema>;
export type UpdateContratDto = z.infer<typeof updateContratSchema>;
export type ClotureContratDto = z.infer<typeof clotureContratSchema>;
export type CreatePaiementDto = z.infer<typeof createPaiementSchema>;
export type PaiementFilters = z.infer<typeof paiementFiltresSchema>;
export type CreateMaintenanceDto = z.infer<typeof createMaintenanceSchema>;
