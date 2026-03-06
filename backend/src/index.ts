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
import authRoutes from './routes/auth.routes';
import vehiculeRoutes from './routes/vehicule.routes';
import clientRoutes from './routes/client.routes';
import reservationRoutes from './routes/reservation.routes';
import contratRoutes from './routes/contrat.routes';
import dashboardRoutes from './routes/dashboard.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import userRoutes from './routes/user.routes';
import publicRoutes from './routes/public.routes';
import journalRoutes from './routes/journal.routes';
import settingsRoutes from './routes/settings.routes';
import tarifZoneRoutes from './routes/tarifZone.routes';
import tarificationRoutes from './routes/tarification.routes';
import logger from './utils/logger';
import prisma from './utils/prisma';

const app = express();
const httpServer = createServer(app);

// ---- Configuration Socket.io ----
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Rendre io accessible depuis les routes
app.set('io', io);

// ---- Middlewares globaux ----

// Sécurité HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

// Rate limiting strict pour l'authentification (5 tentatives/15min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
  },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitisation anti-XSS
app.use(sanitizeInput);

// ---- Répertoires d'uploads ----
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const dirsToCreate = [
  uploadDir,
  path.join(uploadDir, 'vehicules'),
  path.join(uploadDir, 'contrats'),
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
app.use('/api/auth', authRoutes);
app.use('/api/vehicules', vehiculeRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api', contratRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tarif-zones', tarifZoneRoutes);
app.use('/api/tarification', tarificationRoutes);

// Route de santé
app.get('/api/health', async (req, res) => {
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
