#!/bin/bash
set -e

echo "=== ASM Multi-Services - Deploiement Production ==="

if [ ! -f ".env.prod" ]; then
  echo "[ERREUR] Fichier .env.prod introuvable."
  exit 1
fi

set -a
source .env.prod
set +a

echo "[1/4] Arret des anciens conteneurs..."
docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans

echo "[2/4] Construction des images..."
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache

echo "[3/4] Demarrage des conteneurs..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "[4/4] Migrations Prisma..."
sleep 15
docker exec asm-backend npx prisma migrate deploy

echo "=== Deploiement termine ! ==="
echo "Frontend : https://${FRONTEND_DOMAIN}"
echo "Backend  : https://${BACKEND_DOMAIN}"