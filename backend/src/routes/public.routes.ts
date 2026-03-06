// Routes publiques (vitrine) - aucune authentification requise
import { Router } from 'express';
import { publicController } from '../controllers/public.controller';

const router = Router();

// GET /api/public/zones — zones tarifaires actives (pour estimation côté vitrine)
router.get(
  '/zones',
  publicController.getZones.bind(publicController)
);

// GET /api/public/vehicules — liste des véhicules disponibles pour la vitrine
router.get(
  '/vehicules',
  publicController.getVehicules.bind(publicController)
);

// POST /api/public/reservation — soumettre une demande de réservation
router.post(
  '/reservation',
  publicController.createDemande.bind(publicController)
);

export default router;
