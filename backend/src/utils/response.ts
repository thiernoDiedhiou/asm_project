// Helpers pour les réponses API standardisées
import { Response } from 'express';

// Réponse de succès
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

// Réponse de succès avec pagination
export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
) {
  return res.status(200).json({
    success: true,
    data,
    message,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

// Réponse d'erreur
export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: string[]
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

// Erreur 401 - Non authentifié
export function sendUnauthorized(res: Response, message = 'Non authentifié') {
  return sendError(res, message, 401);
}

// Erreur 403 - Accès refusé
export function sendForbidden(res: Response, message = 'Accès refusé') {
  return sendError(res, message, 403);
}

// Erreur 404 - Ressource introuvable
export function sendNotFound(res: Response, message = 'Ressource introuvable') {
  return sendError(res, message, 404);
}

// Erreur 500 - Erreur serveur
export function sendServerError(
  res: Response,
  message = 'Erreur serveur interne'
) {
  return sendError(res, message, 500);
}
