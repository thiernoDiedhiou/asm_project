# Déploiement — ASM Location SaaS sur Hostinger VPS
# Domaine : *.location.innosft.com

## 0. Prérequis DNS (Hostinger → Zone DNS)

Ajouter dans Hostinger DNS Manager (Zone de innosft.com) :
```
Type : A
Nom  : *.location
Valeur : <IP_DE_VOTRE_VPS>
TTL  : 3600
```

---

## 1. Connexion SSH au VPS

```bash
ssh root@<IP_DE_VOTRE_VPS>
```

---

## 2. Installation des dépendances système

```bash
# Mise à jour
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 (gestionnaire de processus Node)
npm install -g pm2

# Nginx
apt install -y nginx

# Certbot (SSL Let's Encrypt via DNS challenge)
apt install -y certbot python3-certbot-nginx python3-certbot-dns-digitalocean
# Note: pour Hostinger, utiliser le plugin DNS manuel ou cloudflare selon votre config DNS

# PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Chromium (pour Puppeteer / génération PDF)
apt install -y chromium-browser

# Git
apt install -y git
```

---

## 3. Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le shell psql :
CREATE USER asm_user WITH PASSWORD 'CHANGER_CE_MOT_DE_PASSE';
CREATE DATABASE location OWNER asm_user;
GRANT ALL PRIVILEGES ON DATABASE location TO asm_user;
\q
```

---

## 4. Déployer le code

```bash
# Créer le dossier
mkdir -p /var/www/asm-location
cd /var/www/asm-location

# Cloner le projet
git clone <URL_DE_VOTRE_REPO> .
# OU transférer via scp depuis votre machine :
# scp -r /chemin/local/asm_project/* root@<IP>:/var/www/asm-location/
```

---

## 5. Configurer le Backend

```bash
cd /var/www/asm-location/backend

# Créer le fichier .env de production
cp .env.example .env
nano .env
```

**Contenu du .env à remplir :**
```env
DATABASE_URL="postgresql://asm_user:VOTRE_MOT_DE_PASSE@localhost:5432/location"
JWT_SECRET="$(openssl rand -base64 64)"
JWT_REFRESH_SECRET="$(openssl rand -base64 64)"
JWT_EXPIRY="15m"
REFRESH_EXPIRY="7d"
PORT=5000
NODE_ENV="production"
FRONTEND_URL="https://admin.location.innosft.com"
PLATFORM_DOMAIN="location.innosft.com"
SUPERADMIN_URL="https://admin.location.innosft.com"
API_URL="https://admin.location.innosft.com"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="false"
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="innosoftcreation@gmail.com"
SMTP_PASS="VOTRE_APP_PASSWORD_GMAIL"
SMTP_FROM="Innosoft Creation <innosoftcreation@gmail.com>"
ADMIN_EMAIL="innosoftcreation@gmail.com"
```

```bash
# Installer les dépendances et builder
npm install
npm run build

# Créer les dossiers nécessaires
mkdir -p uploads/vehicules uploads/contrats logs

# Appliquer les migrations Prisma
npx prisma migrate deploy

# (Optionnel) Seed initial — créer le 1er tenant SUPER_ADMIN
npx prisma db seed
```

---

## 6. Démarrer le Backend avec PM2

```bash
cd /var/www/asm-location/backend

# Démarrer
pm2 start dist/index.js --name asm-backend

# Vérifier qu'il tourne
pm2 status
pm2 logs asm-backend --lines 50

# Démarrage automatique au reboot
pm2 startup
pm2 save
```

---

## 7. Builder le Frontend

```bash
cd /var/www/asm-location/frontend

# Variables d'environnement production (nginx proxifie /api)
echo "VITE_API_URL=" > .env.production
echo "VITE_API_FILE_BASE=" >> .env.production

npm install
npm run build
# Le build est généré dans : /var/www/asm-location/frontend/dist
```

---

## 8. Configurer Nginx

```bash
# Copier la configuration
cp /var/www/asm-location/nginx.conf /etc/nginx/sites-available/asm-location

# Activer le site
ln -s /etc/nginx/sites-available/asm-location /etc/nginx/sites-enabled/asm-location

# Tester la configuration (SSL pas encore installé — commenter les blocs 443 temporairement)
nginx -t

# Pour tester sans SSL, activer d'abord uniquement le bloc HTTP :
```

---

## 9. Installer le certificat SSL wildcard

```bash
# Via DNS challenge (nécessite accès API DNS ou entrée manuelle)
certbot certonly --manual --preferred-challenges dns \
  -d "*.location.innosft.com"

# Certbot vous demandera d'ajouter un enregistrement TXT dans votre DNS :
# _acme-challenge.location.innosft.com → <valeur fournie par certbot>
# Ajouter cette entrée dans Hostinger DNS Manager, attendre 60s, puis appuyer Entrée

# Vérifier le certificat
ls /etc/letsencrypt/live/location.innosft.com/
```

---

## 10. Activer Nginx avec SSL

```bash
# Tester la configuration complète
nginx -t

# Recharger
systemctl reload nginx
systemctl enable nginx
```

---

## 11. Vérification finale

```bash
# Backend répond ?
curl http://localhost:5000/api/auth/me

# Frontend accessible ?
curl -I https://asm.location.innosft.com

# PM2 statut
pm2 status

# Logs backend
pm2 logs asm-backend --lines 100
```

---

## 12. Mise à jour du code (déploiements futurs)

```bash
cd /home/tfksservice/Location/asm_project

# Récupérer les nouvelles modifications
git pull origin tenant

# Backend — OBLIGATOIRE : dist/ est gitignore, il faut rebuilder sur le serveur
cd backend
npm install
npm run build
npx prisma migrate deploy
pm2 restart asm-backend

# Frontend
cd ../frontend
npm install
npm run build
# Nginx sert automatiquement le nouveau dist/

# Nginx — si nginx.conf a changé
cp /home/tfksservice/Location/asm_project/nginx.conf /etc/nginx/sites-available/asm-location
sudo nginx -t && sudo nginx -s reload
```

---

## URLs finales

| Usage | URL |
|-------|-----|
| Super Admin | https://admin.location.innosft.com |
| Tenant "asm" | https://asm.location.innosft.com |
| Tenant "boucotte" | https://boucotte.location.innosft.com |
| Nouveau tenant | https://{slug}.location.innosft.com (automatique) |
