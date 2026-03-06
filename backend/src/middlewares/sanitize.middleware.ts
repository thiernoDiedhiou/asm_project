// Middleware de sanitisation pour prévenir les attaques XSS
import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * Nettoie récursivement un objet de toute balise HTML malveillante
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // Aucune balise HTML autorisée
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(
          (obj as Record<string, unknown>)[key]
        );
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware qui sanitise le body, les query params et les params URL
 */
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }

  if (req.params) {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }

  next();
}
