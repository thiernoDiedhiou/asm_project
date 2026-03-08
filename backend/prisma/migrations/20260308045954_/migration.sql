-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'COMPTABLE');

-- CreateEnum
CREATE TYPE "Categorie" AS ENUM ('ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE');

-- CreateEnum
CREATE TYPE "StatutVehicule" AS ENUM ('DISPONIBLE', 'LOUE', 'EN_MAINTENANCE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PARTICULIER', 'ENTREPRISE', 'VIP');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeTrajet" AS ENUM ('LOCATION', 'TRANSFERT_AEROPORT', 'LONGUE_DUREE');

-- CreateEnum
CREATE TYPE "StatutContrat" AS ENUM ('ACTIF', 'TERMINE', 'LITIGE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'VIREMENT', 'CHEQUE');

-- CreateEnum
CREATE TYPE "StatutMaintenance" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicules" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "categorie" "Categorie" NOT NULL,
    "kilometrage" INTEGER NOT NULL DEFAULT 0,
    "prixJournalier" DECIMAL(10,2) NOT NULL,
    "prixSemaine" DECIMAL(10,2) NOT NULL,
    "statut" "StatutVehicule" NOT NULL DEFAULT 'DISPONIBLE',
    "photos" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT,
    "typeClient" "TypeClient" NOT NULL DEFAULT 'PARTICULIER',
    "societe" TEXT,
    "numeroCNI" TEXT,
    "numeroPasseport" TEXT,
    "permisConduire" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "numeroReservation" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "lieuPriseEnCharge" TEXT NOT NULL,
    "lieuRetour" TEXT NOT NULL,
    "nombreJours" INTEGER NOT NULL,
    "prixTotal" DECIMAL(10,2) NOT NULL,
    "avance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "statut" "StatutReservation" NOT NULL DEFAULT 'EN_ATTENTE',
    "typeTrajet" "TypeTrajet" NOT NULL DEFAULT 'LOCATION',
    "notes" TEXT,
    "agentId" TEXT NOT NULL,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrats" (
    "id" TEXT NOT NULL,
    "numeroContrat" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dateSignature" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilometrageDepart" INTEGER NOT NULL,
    "kilometrageRetour" INTEGER,
    "etatDepart" TEXT NOT NULL,
    "etatRetour" TEXT,
    "caution" DECIMAL(10,2) NOT NULL,
    "cautionRendue" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "statut" "StatutContrat" NOT NULL DEFAULT 'ACTIF',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "methode" "MethodePaiement" NOT NULL,
    "reference" TEXT,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "valide" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cout" DECIMAL(10,2),
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "statut" "StatutMaintenance" NOT NULL DEFAULT 'EN_COURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_activite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userNom" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarif_zones" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarif_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prix_categories" (
    "id" TEXT NOT NULL,
    "categorie" "Categorie" NOT NULL,
    "zoneId" TEXT NOT NULL,
    "prixJournalier" DECIMAL(10,2) NOT NULL,
    "prixSemaine" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prix_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nomEntreprise" TEXT NOT NULL DEFAULT 'ASM Multi-Services',
    "slogan" TEXT NOT NULL DEFAULT 'Location de Véhicules',
    "activite" TEXT NOT NULL DEFAULT 'Vente et location de voitures — Import/Export',
    "telephone" TEXT NOT NULL DEFAULT '+221 77 418 05 32',
    "telephone2" TEXT NOT NULL DEFAULT '+221 76 474 90 92',
    "email" TEXT NOT NULL DEFAULT 'contact@asm-location.sn',
    "adresse" TEXT NOT NULL DEFAULT 'Grand Yoff — Zone de Captage',
    "ville" TEXT NOT NULL DEFAULT 'Dakar, Sénégal',
    "rccm" TEXT NOT NULL DEFAULT 'SN.DKR.2024.A.53708',
    "ninea" TEXT NOT NULL DEFAULT '011803633',
    "heuresLunVen" TEXT NOT NULL DEFAULT '08h00 – 18h00',
    "heuresSamedi" TEXT NOT NULL DEFAULT '09h00 – 15h00',
    "noteTransfert" TEXT NOT NULL DEFAULT 'Transfert aéroport disponible 24h/24 sur réservation',
    "bannierePromo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_blacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_immatriculation_key" ON "vehicules"("immatriculation");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_numeroReservation_key" ON "reservations"("numeroReservation");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_numeroContrat_key" ON "contrats"("numeroContrat");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_reservationId_key" ON "contrats"("reservationId");

-- CreateIndex
CREATE INDEX "journal_activite_userId_idx" ON "journal_activite"("userId");

-- CreateIndex
CREATE INDEX "journal_activite_createdAt_idx" ON "journal_activite"("createdAt");

-- CreateIndex
CREATE INDEX "journal_activite_action_idx" ON "journal_activite"("action");

-- CreateIndex
CREATE UNIQUE INDEX "tarif_zones_nom_key" ON "tarif_zones"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "prix_categories_categorie_zoneId_key" ON "prix_categories"("categorie", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_token_key" ON "token_blacklist"("token");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "tarif_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prix_categories" ADD CONSTRAINT "prix_categories_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "tarif_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
