// Schémas de validation pour les clients
import { z } from 'zod';

export const createClientSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide').nullable().optional().or(z.literal('')),
  telephone: z
    .string()
    .min(9, 'Numéro de téléphone invalide')
    .regex(/^[+\d\s\-()]+$/, 'Format de téléphone invalide'),
  adresse: z.string().nullable().optional(),
  typeClient: z.enum(['PARTICULIER', 'ENTREPRISE', 'VIP']).default('PARTICULIER'),
  societe: z.string().nullable().optional(),
  numeroCNI: z.string().nullable().optional(),
  numeroPasseport: z.string().nullable().optional(),
  permisConduire: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const clientFiltresSchema = z.object({
  search: z.string().optional(),
  typeClient: z.enum(['PARTICULIER', 'ENTREPRISE', 'VIP']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export type CreateClientDto = z.infer<typeof createClientSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;
export type ClientFilters = z.infer<typeof clientFiltresSchema>;
