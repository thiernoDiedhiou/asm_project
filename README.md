# ASM Multi-Services - Système de Gestion de Location de Véhicules

Application web complète de gestion de location de véhicules pour **ASM Multi-Services**, PME basée à Dakar, Sénégal.

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Base de données | PostgreSQL + Prisma ORM |
| Authentification | JWT + bcrypt + RBAC |
| Temps réel | Socket.io |
| PDF | Puppeteer |
| Déploiement | Railway/Render (backend) + Vercel (frontend) |

## Structure du Projet

```
asm-location/
├── backend/               # API Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma  # Schéma base de données
│   │   └── seed.ts        # Données de démonstration
│   ├── src/
│   │   ├── controllers/   # Handlers HTTP
│   │   ├── services/      # Logique métier
│   │   ├── routes/        # Définition des routes
│   │   ├── middlewares/   # Auth, validation, sanitize
│   │   ├── utils/         # JWT, logger, pricing, prisma
│   │   └── validators/    # Schémas Zod
│   └── Dockerfile
├── frontend/              # React App
│   ├── src/
│   │   ├── components/    # Layout, UI, forms
│   │   ├── pages/         # Dashboard, véhicules, clients...
│   │   ├── services/      # Client API Axios
│   │   ├── store/         # State Zustand
│   │   └── utils/         # Formatage, helpers
│   └── Dockerfile
├── shared/                # Types TypeScript partagés
├── docker-compose.yml
└── ASM-MultiServices.postman_collection.json
```

## Installation Rapide (avec Docker)

### Prérequis
- Docker Desktop installé
- Node.js 20+ (pour le développement local)

### Démarrage avec Docker

```bash
# 1. Cloner le projet
git clone <url-du-repo>
cd asm-location

# 2. Copier et configurer les variables d'environnement
cp backend/.env.example backend/.env
# Modifier les valeurs dans backend/.env

# 3. Démarrer tous les services
docker-compose up -d

# 4. Appliquer les migrations Prisma
docker exec asm-backend npx prisma migrate deploy

# 5. Insérer les données de démonstration
docker exec asm-backend npm run seed
```

L'application sera disponible sur :
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- pgAdmin: http://localhost:5050

## Installation Locale (sans Docker)

### Prérequis
- Node.js 20+
- PostgreSQL 14+

### Backend

```bash
cd backend

# Installation des dépendances
npm install

# Configuration
cp .env.example .env
# Modifier DATABASE_URL et les secrets JWT dans .env

# Migrations et génération du client Prisma
npx prisma generate
npx prisma migrate dev --name init

# Seed des données de démonstration
npm run seed

# Démarrage en développement
npm run dev
```

### Frontend

```bash
cd frontend

# Installation des dépendances
npm install

# Démarrage en développement
npm run dev
```

## Variables d'Environnement

### Backend (backend/.env)

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/asm_location"

# JWT (générer des secrets longs et aléatoires)
JWT_SECRET="secret_jwt_tres_long"
JWT_REFRESH_SECRET="secret_refresh_different"
JWT_EXPIRY="15m"
REFRESH_EXPIRY="7d"

# Serveur
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Upload fichiers
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880
```

## Comptes de Démonstration

| Rôle | Email | Mot de passe | Accès |
|------|-------|--------------|-------|
| Admin | admin@asm.sn | Admin123! | Accès total |
| Agent | agent1@asm.sn | Agent123! | CRUD opérationnel |
| Agent | agent2@asm.sn | Agent123! | CRUD opérationnel |
| Comptable | comptable@asm.sn | Compta123! | Lecture + validation paiements |

## API Endpoints

### Authentification
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | /api/auth/login | Connexion |
| POST | /api/auth/refresh | Rafraîchir token |
| POST | /api/auth/logout | Déconnexion |
| GET | /api/auth/me | Profil utilisateur |

### Véhicules
| Méthode | URL | Rôle requis |
|---------|-----|-------------|
| GET | /api/vehicules | Tous |
| POST | /api/vehicules | Admin |
| GET | /api/vehicules/:id | Tous |
| PUT | /api/vehicules/:id | Admin |
| DELETE | /api/vehicules/:id | Admin |
| GET | /api/vehicules/:id/disponibilite | Tous |

### Réservations
| Méthode | URL | Rôle requis |
|---------|-----|-------------|
| GET | /api/reservations | Tous |
| POST | /api/reservations | Admin, Agent |
| PUT | /api/reservations/:id/statut | Admin, Agent |
| DELETE | /api/reservations/:id | Admin, Agent |
| GET | /api/reservations/calendrier | Tous |

### Contrats et Paiements
| Méthode | URL | Rôle requis |
|---------|-----|-------------|
| GET | /api/contrats | Tous |
| POST | /api/contrats | Admin, Agent |
| GET | /api/contrats/:id/pdf | Tous |
| POST | /api/contrats/:id/cloture | Admin, Agent |
| GET | /api/paiements | Tous |
| POST | /api/paiements | Admin, Agent |
| PUT | /api/paiements/:id/valider | Admin, Comptable |

## Déploiement Production

### Backend sur Railway

1. Créer un compte sur [railway.app](https://railway.app)
2. Nouveau projet → "Deploy from GitHub"
3. Configurer les variables d'environnement:
   ```
   DATABASE_URL=<url-postgresql-railway>
   JWT_SECRET=<secret-tres-long-aleatoire>
   JWT_REFRESH_SECRET=<autre-secret-aleatoire>
   NODE_ENV=production
   FRONTEND_URL=https://votre-app.vercel.app
   ```
4. Ajouter un service PostgreSQL dans Railway
5. Déployer et exécuter: `npm run prisma:migrate && npm run seed`

### Frontend sur Vercel

1. Créer un compte sur [vercel.com](https://vercel.com)
2. Importer le répertoire `frontend/` depuis GitHub
3. Variables d'environnement:
   ```
   VITE_API_URL=https://votre-backend.railway.app/api
   ```
4. Déployer

## Architecture Sécurité

- **Authentification**: JWT avec tokens d'accès (15min) et de rafraîchissement (7j)
- **RBAC**: 3 rôles - ADMIN, AGENT, COMPTABLE avec permissions distinctes
- **Rate limiting**: 100 req/15min global, 5 req/15min pour le login
- **Sanitisation**: Protection XSS sur toutes les entrées
- **Validation**: Schémas Zod stricts sur toutes les routes
- **CORS**: Configuré pour n'accepter que le domaine frontend
- **Helmet**: Headers HTTP sécurisés

## Logique de Tarification

Basée sur les tarifs réels d'ASM Multi-Services:
- Location standard: à partir de 35 000 FCFA/semaine
- Transfert AIBD: 25 000 FCFA
- Transfert Thiès: 30 000 FCFA
- Autres régions: 35 000 - 40 000 FCFA
- Remise longue durée (>14j): -10%
- Remise fidélité (>5 locations): -5%
- Tous les montants en Franc CFA (FCFA)

## Collection Postman

Importer le fichier `ASM-MultiServices.postman_collection.json` dans Postman pour tester tous les endpoints.

La collection inclut un script automatique qui sauvegarde les tokens après le login.

## Fonctionnalités Socket.io

L'application utilise Socket.io pour la gestion des disponibilités en temps réel:

```javascript
// Bloquer un véhicule pendant 10 min
socket.emit('vehicule:bloquer', { vehiculeId, userId });

// Écouter les mises à jour
socket.on('vehicule:bloque', ({ vehiculeId }) => { /* ... */ });
socket.on('vehicule:libere', ({ vehiculeId }) => { /* ... */ });
```

---

**ASM Multi-Services** | Grand Yoff - Zone de Captage, Dakar, Sénégal
