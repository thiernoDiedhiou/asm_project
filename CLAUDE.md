# SenLocaDesk — Instructions pour Claude Code

Plateforme SaaS multi-tenant de gestion de location de véhicules.
Développé par **Innosoft Creation** (innosft.com) pour le marché sénégalais.

---

## Architecture

```
asm-location/
├── backend/     Node.js + Express + TypeScript + Prisma + PostgreSQL
├── frontend/    React 18 + TypeScript + Tailwind CSS + Zustand + Axios
└── shared/      Types TypeScript partagés (enums, interfaces, DTOs)
```

## Commandes

```bash
# Backend
cd backend && npm run dev          # ts-node-dev port 5000
cd backend && npx prisma generate  # après modif schema.prisma
cd backend && npx prisma db push --accept-data-loss  # migration (shadow DB indisponible)
cd backend && npm run seed         # données initiales

# Frontend
cd frontend && npm run dev         # Vite port 3000
```

## Multi-tenant

- Chaque modèle Prisma a `tenantId` + `@@index([tenantId])`
- Middleware `resolveTenant` : localhost → premier tenant actif (ou header `x-tenant-slug`) ; prod → slug du sous-domaine
- URL prod : `{slug}.innosft.com` (wildcard DNS *.innosft.com)
- Rôles : `SUPER_ADMIN` (Innosoft, cross-tenant) / `ADMIN` / `AGENT` / `COMPTABLE` (par tenant)
- Tenant ASM : id=`tenant-asm-001`, slug=`asm`

## Patterns de données critiques

### useQuery hook
```
setData(response.data)  →  data = { success, data, pagination }
data?.data       ✓  (items)
data?.pagination ✓
data?.data?.data ✗  (toujours undefined)
```

### Champs Prisma
- Réservation : `prixTotal` (PAS `montantTotal`)
- Réservation : `remiseManuelle` (Decimal, défaut 0) + `typeRemise` (`MONTANT` | `POURCENTAGE`)
- `numeroReservation` : unique **par tenant** → `@@unique([tenantId, numeroReservation])`
- Contrat getAll() : retourne `totalPaye` et `resteADu` (calculés serveur)
- ContratDetailPage : calcule `montantPaye`/`resteAPayer` localement depuis `paiements[]`

### API_FILE_BASE
```typescript
// frontend/src/services/api.ts
export const API_FILE_BASE = import.meta.env.VITE_API_FILE_BASE || 'http://localhost:5000';
// Utiliser partout pour les URLs d'images/PDFs uploadés (jamais localhost hardcodé)
src={`${API_FILE_BASE}${path}`}
```

## Routes backend

| Fichier | Monté sur |
|---|---|
| `auth.routes.ts` | `/api/auth` |
| `public.routes.ts` | `/api/public` (sans auth, sans tenant requis pour SUPER_ADMIN) |
| `contrat.routes.ts` | `/api` (contrats + paiements) |
| `dashboard.routes.ts` | `/api` (dashboard + maintenances + users) |

Rate limit : 500 req/15min (dev)

## Email (mailer)

- **`backend/src/services/email.service.ts`** : emails plateforme (bienvenue, expiration abonnement, reset password) — charte Innosoft Creation (rouge #E53935, fond sombre)
- **`backend/src/utils/mailer.ts`** : notification nouvelle réservation vitrine → admin du tenant (lookup DB dynamique, pas .env)
- Expéditeur SMTP : `innosoftcreation@gmail.com` (compte Innosoft Creation)
- `NOTIF_EMAIL_TO` dans `.env` est obsolète — l'email va à `agentSysteme.email` (ADMIN du tenant)

## Vitrine publique

Routes sans auth : `/`, `/flotte`, `/reserver`
- Layout : `frontend/src/layouts/VitrineLayout.tsx`
- Pages : `frontend/src/pages/vitrine/`
- Backend : `GET /api/public/vehicules`, `POST /api/public/reservation`, `GET /api/public/tenant`
- DashboardPage écoute socket `notification:nouvelle_demande` → toast 8s

## Couleurs & Branding

- **Tenant** : couleurs dynamiques via `TenantContext` → CSS vars `--color-primary` / `--color-secondary`
- **Innosoft Creation** (emails plateforme) : rouge `#E53935`, fond sombre `#222`
- **ASM** (tenant principal) : vert `#1B5E20` (`asm-vert`), or `#F9A825` (`asm-or`)
- La vitrine utilise les classes Tailwind `asm-vert`/`asm-or` — à remplacer par CSS vars pour branding dynamique

## Bugs à ne jamais réintroduire

- `data?.data?.data` → toujours `data?.data`
- `montantTotal` → `prixTotal` (champ Prisma réservation)
- `http://localhost:5000` hardcodé → toujours `${API_FILE_BASE}`
- `http://localhost:3000` hardcodé dans emails → `${process.env.FRONTEND_URL}`
- Dupliquer `"exclude"` dans `tsconfig.json` backend → JSON invalide → backend down
- `prisma/**/*` doit être dans `"exclude"` (pas `"include"`) du tsconfig.json backend
- `numeroReservation` unique globalement → collision multi-tenant → doit être `@@unique([tenantId, numeroReservation])`

## Comptes demo

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | superadmin@asm-platform.sn | (voir .env seed) |
| Admin ASM | admin@asm.sn | Admin123! |
| Agent | agent1@asm.sn | Agent123! |
| Comptable | comptable@asm.sn | Compta123! |

## Variables d'environnement clés

```bash
# backend/.env
DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
ADMIN_EMAIL          # alertes expiration abonnement → Innosoft Creation
FRONTEND_URL         # utilisé dans liens emails
PLATFORM_DOMAIN      # innosft.com (wildcard CORS)
API_URL              # http://localhost:5000 en dev

# frontend/.env
VITE_API_URL=http://localhost:5000/api
VITE_API_FILE_BASE=http://localhost:5000

# frontend/.env.production
VITE_API_URL=/api
VITE_API_FILE_BASE=   # vide = même domaine (nginx proxy)
```

## Prisma sur Windows

Si `prisma generate` échoue (DLL verrouillée) :
```bash
# Arrêter le backend d'abord, puis :
rm -f node_modules/.prisma/client/query_engine-windows.dll.node
npx prisma generate
```
