// Routes publiques (vitrine) - aucune authentification requise
import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { planController } from '../controllers/plan.controller';

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

// GET /api/public/contrats/verifier/:numero — vérifier l'authenticité d'un contrat
router.get(
  '/contrats/verifier/:numero',
  publicController.verifierContrat.bind(publicController)
);

// GET /api/public/tenant — infos publiques de branding du tenant courant
router.get(
  '/tenant',
  publicController.getTenantPublicInfo.bind(publicController)
);

// GET /api/public/plans — plans d'abonnement avec tarifs (pour page /pricing)
router.get(
  '/plans',
  planController.getAll.bind(planController)
);

export default router;
