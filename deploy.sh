#!/bin/bash
set -e

echo "=== ASM Multi-Services - Deploiement Production ==="

# Vérifier que .env.prod existe
if [ ! -f ".env.prod" ]; then
  echo "[ERREUR] Fichier .env.prod introuvable."
  echo "  cp .env.prod.example .env.prod && nano .env.prod"
  exit 1
fi

set -a
source .env.prod
set +a

echo "[1/5] Mise a jour du code depuis git..."
git pull origin main

echo "[2/5] Arret des anciens conteneurs..."
docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans

echo "[3/5] Construction des images..."
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache

echo "[4/5] Demarrage des conteneurs..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "[5/5] Execution des migrations Prisma..."
sleep 15
docker exec asm-backend npx prisma migrate deploy

echo ""
echo "=== Deploiement termine ! ==="
echo "Frontend : https://${FRONTEND_DOMAIN}"
echo "Backend  : https://${BACKEND_DOMAIN}"
echo ""
echo "Logs : docker compose -f docker-compose.prod.yml logs -f"
