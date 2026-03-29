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

// GET /api/public/agences — liste publique de toutes les agences actives (landing page)
router.get(
  '/agences',
  publicController.getAgencesPubliques.bind(publicController)
);

// GET /api/public/tenant — infos publiques de branding du tenant courant
router.get(
  '/tenant',
  publicController.getTenantPublicInfo.bind(publicController)
);

// GET /api/public/vehicules/:id/periodes-occupees — périodes indisponibles d'un véhicule (vitrine)
router.get(
  '/vehicules/:id/periodes-occupees',
  publicController.getPeriodesOccupees.bind(publicController)
);

// GET /api/public/plans — plans d'abonnement avec tarifs (pour page /pricing)
router.get(
  '/plans',
  planController.getAll.bind(planController)
);

// GET /api/public/vitrine-meta — JSON-LD LocalBusiness du tenant (pour SEO vitrine React)
router.get(
  '/vitrine-meta',
  publicController.getVitrineMeta.bind(publicController)
);

// GET /api/public/flotte-globale — tous les véhicules de toutes les agences (public)
router.get(
  '/flotte-globale',
  publicController.getFlotteGlobale.bind(publicController)
);

// GET /api/public/sitemap — sitemap XML dynamique (toutes les agences ou un tenant)
// Consommé par location.innosft.com/sitemap.xml (via nginx) et par chaque {slug}.location.innosft.com/sitemap.xml
router.get(
  '/sitemap',
  publicController.getSitemap.bind(publicController)
);

// GET /api/public/robots — robots.txt dynamique pour les sous-domaines tenant
// Consommé par {slug}.location.innosft.com/robots.txt (via nginx)
router.get(
  '/robots',
  publicController.getRobotsTxt.bind(publicController)
);

export default router;
