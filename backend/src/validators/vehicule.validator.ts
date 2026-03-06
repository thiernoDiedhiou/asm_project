// Schémas de validation pour les véhicules
import { z } from 'zod';

export const createVehiculeSchema = z.object({
  marque: z.string().min(1, 'La marque est requise'),
  modele: z.string().min(1, 'Le modèle est requis'),
  annee: z
    .number()
    .int()
    .min(1990, 'Année invalide')
    .max(new Date().getFullYear() + 1, 'Année invalide'),
  immatriculation: z
    .string()
    .min(1, "L'immatriculation est requise")
    .toUpperCase(),
  couleur: z.string().min(1, 'La couleur est requise'),
  categorie: z.enum([
    'ECONOMIQUE',
    'STANDARD',
    'SUV',
    'LUXE',
    'UTILITAIRE',
  ]),
  kilometrage: z.number().int().min(0).default(0),
  prixJournalier: z
    .number()
    .positive('Le prix journalier doit être positif'),
  prixSemaine: z
    .number()
    .positive('Le prix à la semaine doit être positif'),
  description: z.string().optional(),
});

export const updateVehiculeSchema = createVehiculeSchema.partial().extend({
  statut: z
    .enum(['DISPONIBLE', 'LOUE', 'EN_MAINTENANCE', 'HORS_SERVICE'])
    .optional(),
  photos: z.array(z.string()).optional(),
});

export const vehiculeFiltresSchema = z.object({
  statut: z
    .enum(['DISPONIBLE', 'LOUE', 'EN_MAINTENANCE', 'HORS_SERVICE'])
    .optional(),
  categorie: z
    .enum(['ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'])
    .optional(),
  search: z.string().optional(),
  dateDebut: z.string().datetime({ offset: true }).optional(),
  dateFin: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const disponibiliteQuerySchema = z.object({
  debut: z.string().min(1, 'Date de début requise'),
  fin: z.string().min(1, 'Date de fin requise'),
});

export type CreateVehiculeDto = z.infer<typeof createVehiculeSchema>;
export type UpdateVehiculeDto = z.infer<typeof updateVehiculeSchema>;
export type VehiculeFilters = z.infer<typeof vehiculeFiltresSchema>;
