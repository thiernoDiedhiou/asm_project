// ============================================================
// Point d'entrée du serveur Express - ASM Multi-Services
// ============================================================
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { sanitizeInput } from './middlewares/sanitize.middleware';
import { resolveTenant } from './middlewares/tenant.middleware';
import authRoutes from './routes/auth.routes';
import vehiculeRoutes from './routes/vehicule.routes';
import clientRoutes from './routes/client.routes';
import reservationRoutes from './routes/reservation.routes';
import contratRoutes from './routes/contrat.routes';
import dashboardRoutes from './routes/dashboard.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import userRoutes from './routes/user.routes';
import publicRoutes from './routes/public.routes';
import { publicController } from './controllers/public.controller';
import journalRoutes from './routes/journal.routes';
import settingsRoutes from './routes/settings.routes';
import tarifZoneRoutes from './routes/tarifZone.routes';
import tarificationRoutes from './routes/tarification.routes';
import tenantRoutes from './routes/tenant.routes';
import { initCronJobs } from './services/cron.service';
import { planService } from './services/plan.service';
import { setIo } from './utils/socketRegistry';
import logger from './utils/logger';
import prisma from './utils/prisma';

const app = express();
const httpServer = createServer(app);

// Derrière nginx — faire confiance au premier proxy pour X-Forwarded-For
app.set('trust proxy', 1);

// ---- Fonction CORS dynamique — autorise tous les sous-domaines *.innosft.com + localhost ----
const platformDomain = process.env.PLATFORM_DOMAIN || 'innosft.com';
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin ou Postman
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  const escaped = platformDomain.replace(/\./g, '\\.');
  // Autorise le domaine racine (ex: location.innosft.com) et tous ses sous-domaines
  const rootPattern = new RegExp(`^https?://${escaped}(:\\d+)?$`);
  const subPattern  = new RegExp(`^https?://[a-z0-9-]+\\.${escaped}(:\\d+)?$`);
  return rootPattern.test(origin) || subPattern.test(origin);
}

// ---- Configuration Socket.io ----
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error('CORS: origine non autorisée'));
    },
    methods: ['GET', 'POST'],
  },
});

// Rendre io accessible depuis les routes ET depuis les services
app.set('io', io);
setIo(io);

// ---- Middlewares globaux ----

// Sécurité HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — autorise *.innosft.com + localhost
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error('CORS: origine non autorisée'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug'],
  })
);

// Compression gzip
app.use(compression());

// Rate limiting global (500 req/15min par IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting pour l'authentification (15 tentatives/15min par IP+email)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => {
    // Clé combinée IP + email pour éviter de bloquer une IP entière à cause d'un seul compte
    const email = req.body?.email?.toLowerCase?.() ?? '';
    return `${req.ip}:${email}`;
  },
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
  },
});

// Parser JSON — doit être avant les rate limiters pour que req.body soit disponible
app.use(express.json({ limit: '10mb' }));

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitisation anti-XSS
app.use(sanitizeInput);

// ---- Répertoires d'uploads ----
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const dirsToCreate = [
  uploadDir,
  path.join(uploadDir, 'vehicules'),
  path.join(uploadDir, 'contrats'),
  path.join(uploadDir, 'abonnements'),
  path.join(uploadDir, 'logos'),
  'logs',
];

dirsToCreate.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(uploadDir));

// ---- Routes API ----
// Routes tenant super-admin (pas de resolveTenant — accès cross-tenant)
app.use('/api/tenants', tenantRoutes);

// Routes plateforme — sans résolution tenant (appelées depuis la landing page)
app.get('/api/public/agences', publicController.getAgencesPubliques.bind(publicController));
app.post('/api/public/contact', publicController.sendContactForm.bind(publicController));
// Vérification d'authenticité d'un contrat via QR code — cross-tenant, aucun contexte tenant requis
app.get('/api/public/contrats/verifier/:numero', publicController.verifierContrat.bind(publicController));

// Toutes les autres routes API sont scoped au tenant résolu depuis le sous-domaine/domaine
app.use('/api/auth', resolveTenant, authRoutes);
app.use('/api/vehicules', resolveTenant, vehiculeRoutes);
app.use('/api/clients', resolveTenant, clientRoutes);
app.use('/api/reservations', resolveTenant, reservationRoutes);
app.use('/api', resolveTenant, contratRoutes);
app.use('/api', resolveTenant, dashboardRoutes);
app.use('/api/maintenances', resolveTenant, maintenanceRoutes);
app.use('/api/users', resolveTenant, userRoutes);
app.use('/api/public', resolveTenant, publicRoutes);
app.use('/api/journal', resolveTenant, journalRoutes);
app.use('/api/settings', resolveTenant, settingsRoutes);
app.use('/api/tarif-zones', resolveTenant, tarifZoneRoutes);
app.use('/api/tarification', resolveTenant, tarificationRoutes);

// Route de santé
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ASM Multi-Services API',
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// ---- Gestion Socket.io - Disponibilités temps réel ----

// Map pour stocker les véhicules "bloqués" temporairement (10 min)
const vehiculesBloquesTemporairement = new Map<
  string,
  { userId: string; expiresAt: Date }
>();

io.on('connection', (socket) => {
  logger.debug(`Client connecté: ${socket.id}`);

  // Un agent commence à créer une réservation - bloque le véhicule 10 min
  socket.on('vehicule:bloquer', ({ vehiculeId, userId }) => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    vehiculesBloquesTemporairement.set(vehiculeId, { userId, expiresAt });

    // Informer tous les autres clients
    socket.broadcast.emit('vehicule:bloque', { vehiculeId, userId });

    // Libérer automatiquement après 10 minutes
    setTimeout(() => {
      vehiculesBloquesTemporairement.delete(vehiculeId);
      io.emit('vehicule:libere', { vehiculeId });
    }, 10 * 60 * 1000);

    logger.debug(`Véhicule ${vehiculeId} bloqué temporairement par ${userId}`);
  });

  // Libérer un véhicule manuellement
  socket.on('vehicule:liberer', ({ vehiculeId }) => {
    vehiculesBloquesTemporairement.delete(vehiculeId);
    io.emit('vehicule:libere', { vehiculeId });
  });

  // Vérifier l'état des blocages
  socket.on('vehicule:etat', (vehiculeIds: string[]) => {
    const etat: Record<string, boolean> = {};
    vehiculeIds.forEach((id) => {
      const blocage = vehiculesBloquesTemporairement.get(id);
      etat[id] = blocage ? blocage.expiresAt > new Date() : false;
    });
    socket.emit('vehicule:etatRetour', etat);
  });

  socket.on('disconnect', () => {
    logger.debug(`Client déconnecté: ${socket.id}`);
  });
});

// ---- Démarrage du serveur ----
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Vérifier la connexion à la base de données
    await prisma.$connect();
    logger.info('Connexion base de données établie');

    // Initialiser les plans par défaut (upsert — idempotent)
    await planService.initDefaultPlans();
    logger.info('Plans d\'abonnement initialisés');

    // Démarrer les tâches planifiées (vérification expirations)
    initCronJobs();

    httpServer.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║     ASM Multi-Services API démarrée        ║
║     Port: ${PORT}                               ║
║     Env: ${process.env.NODE_ENV || 'development'}                   ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Erreur de démarrage:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  logger.info('Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export { io };
