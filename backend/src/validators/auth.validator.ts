// Schémas de validation pour l'authentification
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .toLowerCase(),
  motDePasse: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Token de rafraîchissement requis'),
});

export const createUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide').toLowerCase(),
  motDePasse: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
    ),
  telephone: z.string().optional(),
  role: z.enum(['ADMIN', 'AGENT', 'COMPTABLE']).default('AGENT'),
});

export const updateUserSchema = createUserSchema.partial().omit({ motDePasse: true }).extend({
  actif: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  ancienMotDePasse: z.string().min(1, 'Ancien mot de passe requis'),
  nouveauMotDePasse: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
    ),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
