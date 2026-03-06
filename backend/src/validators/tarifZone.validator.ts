import { z } from 'zod';

export const createTarifZoneSchema = z.object({
  nom: z.string().min(1, 'Le nom de la zone est requis'),
  actif: z.boolean().default(true),
});

export const updateTarifZoneSchema = createTarifZoneSchema.partial();

export type CreateTarifZoneDto = z.infer<typeof createTarifZoneSchema>;
export type UpdateTarifZoneDto = z.infer<typeof updateTarifZoneSchema>;
