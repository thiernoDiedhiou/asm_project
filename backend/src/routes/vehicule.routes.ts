// Routes véhicules
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { vehiculeController } from '../controllers/vehicule.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  createVehiculeSchema,
  updateVehiculeSchema,
  vehiculeFiltresSchema,
  disponibiliteQuerySchema,
} from '../validators/vehicule.validator';
import { Role } from '@prisma/client';

const router = Router();

// Configuration Multer pour l'upload de photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.env.UPLOAD_DIR || './uploads', 'vehicules'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `vehicule-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images JPEG, PNG et WebP sont autorisées'));
    }
  },
});

// Routes publiques (authentifié)
router.get(
  '/',
  authenticateToken,
  validateQuery(vehiculeFiltresSchema),
  vehiculeController.getAll.bind(vehiculeController)
);

router.get(
  '/:id',
  authenticateToken,
  vehiculeController.getById.bind(vehiculeController)
);

router.get(
  '/:id/disponibilite',
  authenticateToken,
  validateQuery(disponibiliteQuerySchema),
  vehiculeController.checkDisponibilite.bind(vehiculeController)
);

// Routes Admin seulement
router.post(
  '/',
  authenticateToken,
  authorize(Role.ADMIN),
  validateBody(createVehiculeSchema),
  vehiculeController.create.bind(vehiculeController)
);

router.put(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN),
  validateBody(updateVehiculeSchema),
  vehiculeController.update.bind(vehiculeController)
);

router.delete(
  '/:id',
  authenticateToken,
  authorize(Role.ADMIN),
  vehiculeController.delete.bind(vehiculeController)
);

router.post(
  '/:id/photos',
  authenticateToken,
  authorize(Role.ADMIN),
  upload.array('photos', 10),
  vehiculeController.uploadPhotos.bind(vehiculeController)
);

export default router;
