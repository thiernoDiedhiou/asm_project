// Schémas de validation pour les réservations
import { z } from 'zod';

export const createReservationSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  vehiculeId: z.string().uuid('ID véhicule invalide'),
  dateDebut: z.string().refine((d) => !isNaN(Date.parse(d)), 'Date de début invalide'),
  dateFin: z.string().refine((d) => !isNaN(Date.parse(d)), 'Date de fin invalide'),
  lieuPriseEnCharge: z.string().min(1, 'Lieu de prise en charge requis'),
  lieuRetour: z.string().min(1, 'Lieu de retour requis'),
  typeTrajet: z
    .enum(['LOCATION', 'TRANSFERT_AEROPORT', 'LONGUE_DUREE'])
    .default('LOCATION'),
  avance: z.number().min(0).default(0),
  notes: z.string().optional(),
  zoneId: z.string().uuid().optional(),
}).refine(
  (data) => new Date(data.dateFin) >= new Date(data.dateDebut),
  {
    message: 'La date de fin doit être après ou égale à la date de début',
    path: ['dateFin'],
  }
);

export const updateStatutReservationSchema = z.object({
  statut: z.enum([
    'EN_ATTENTE',
    'CONFIRMEE',
    'EN_COURS',
    'TERMINEE',
    'ANNULEE',
  ]),
  notes: z.string().optional(),
});

export const reservationFiltresSchema = z.object({
  statut: z
    .enum(['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'])
    .optional(),
  agentId: z.string().uuid().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const calendrierQuerySchema = z.object({
  mois: z.coerce.number().int().min(1).max(12),
  annee: z.coerce.number().int().min(2020).max(2100),
});

export type CreateReservationDto = z.infer<typeof createReservationSchema>;
export type UpdateStatutReservationDto = z.infer<typeof updateStatutReservationSchema>;
export type ReservationFilters = z.infer<typeof reservationFiltresSchema>;
