// Routes des paramètres de l'entreprise
import { Router } from 'express';
import { Role } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { settingsController } from '../controllers/settings.controller';
import { authenticateToken, authorize, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Multer pour upload logo
const logosDir = path.join(process.env.UPLOAD_DIR || './uploads', 'logos');
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  },
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// Public — lecture des paramètres (vitrine), mais si token présent → tenant du token
router.get('/', optionalAuth, settingsController.get.bind(settingsController));

// Admin — mise à jour des paramètres
router.put(
  '/',
  authenticateToken,
  authorize(Role.ADMIN),
  settingsController.update.bind(settingsController)
);

// Admin — upload logo
router.post(
  '/logo',
  authenticateToken,
  authorize(Role.ADMIN),
  uploadLogo.single('logo'),
  settingsController.uploadLogo.bind(settingsController)
);

export default router;
