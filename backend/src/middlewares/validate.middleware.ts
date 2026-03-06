// Middleware de validation avec Zod
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

/**
 * Valide le corps de la requête avec un schéma Zod
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Données invalides', 400, errors);
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Valide les paramètres de requête (query params)
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Paramètres de requête invalides', 400, errors);
      return;
    }

    req.query = result.data as Record<string, string>;
    next();
  };
}

/**
 * Valide les paramètres d'URL
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Paramètres URL invalides', 400, errors);
      return;
    }

    req.params = result.data as Record<string, string>;
    next();
  };
}

/**
 * Formate les erreurs Zod en messages lisibles
 */
function formatZodErrors(error: ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}
