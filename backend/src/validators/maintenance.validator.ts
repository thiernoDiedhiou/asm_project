import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  vehiculeId: z.string().uuid('ID véhicule invalide'),
  type: z.string().min(1, 'Le type est requis'),
  description: z.string().min(1, 'La description est requise'),
  cout: z.number().positive().optional(),
  dateDebut: z.string().min(1, 'La date de début est requise'),
  dateFin: z.string().optional(),
  statut: z.enum(['PLANIFIEE', 'EN_COURS', 'TERMINEE']).optional(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial().omit({ vehiculeId: true });

export const maintenanceFiltresSchema = z.object({
  vehiculeId: z.string().uuid().optional(),
  statut: z.enum(['PLANIFIEE', 'EN_COURS', 'TERMINEE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMaintenanceDto = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceDto = z.infer<typeof updateMaintenanceSchema>;
export type MaintenanceFiltres = z.infer<typeof maintenanceFiltresSchema>;
