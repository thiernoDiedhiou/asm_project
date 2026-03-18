-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'AGENT', 'COMPTABLE');

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
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domaine" TEXT,
    "nomEntreprise" TEXT NOT NULL,
    "slogan" TEXT NOT NULL DEFAULT 'Location de Véhicules',
    "activite" TEXT NOT NULL DEFAULT 'Location de véhicules',
    "couleurPrimaire" TEXT NOT NULL DEFAULT '#1B5E20',
    "couleurSecondaire" TEXT NOT NULL DEFAULT '#F9A825',
    "logo" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "planType" TEXT NOT NULL DEFAULT 'STARTER',
    "montantMensuel" DECIMAL(10,2),
    "dateExpiration" TIMESTAMP(3),
    "statutAbonnement" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

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
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "tenantId" TEXT,
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
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarif_zones" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prix_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nomEntreprise" TEXT NOT NULL DEFAULT 'Mon Entreprise',
    "slogan" TEXT NOT NULL DEFAULT 'Location de Véhicules',
    "activite" TEXT NOT NULL DEFAULT 'Vente et location de voitures',
    "telephone" TEXT NOT NULL DEFAULT '',
    "telephone2" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "adresse" TEXT NOT NULL DEFAULT '',
    "ville" TEXT NOT NULL DEFAULT '',
    "rccm" TEXT NOT NULL DEFAULT '',
    "ninea" TEXT NOT NULL DEFAULT '',
    "heuresLunVen" TEXT NOT NULL DEFAULT '08h00 – 18h00',
    "heuresSamedi" TEXT NOT NULL DEFAULT '09h00 – 15h00',
    "noteTransfert" TEXT NOT NULL DEFAULT 'Transfert aéroport disponible 24h/24 sur réservation',
    "bannierePromo" TEXT,
    "promoSousTexte" TEXT,
    "promoReduction" TEXT,
    "promoDateFin" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_abonnement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "methode" TEXT NOT NULL,
    "reference" TEXT,
    "periode" TEXT NOT NULL,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_configs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "montantMensuel" DECIMAL(10,2) NOT NULL,
    "montantAnnuel" DECIMAL(10,2),
    "maxAgents" INTEGER NOT NULL DEFAULT 3,
    "maxVehicules" INTEGER NOT NULL DEFAULT 20,
    "features" JSONB NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domaine_key" ON "tenants"("domaine");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_tenantId_key" ON "users"("email", "tenantId");

-- CreateIndex
CREATE INDEX "vehicules_tenantId_idx" ON "vehicules"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_immatriculation_tenantId_key" ON "vehicules"("immatriculation", "tenantId");

-- CreateIndex
CREATE INDEX "clients_tenantId_idx" ON "clients"("tenantId");

-- CreateIndex
CREATE INDEX "reservations_tenantId_idx" ON "reservations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_tenantId_numeroReservation_key" ON "reservations"("tenantId", "numeroReservation");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_numeroContrat_key" ON "contrats"("numeroContrat");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_reservationId_key" ON "contrats"("reservationId");

-- CreateIndex
CREATE INDEX "contrats_tenantId_idx" ON "contrats"("tenantId");

-- CreateIndex
CREATE INDEX "paiements_tenantId_idx" ON "paiements"("tenantId");

-- CreateIndex
CREATE INDEX "maintenances_tenantId_idx" ON "maintenances"("tenantId");

-- CreateIndex
CREATE INDEX "journal_activite_tenantId_idx" ON "journal_activite"("tenantId");

-- CreateIndex
CREATE INDEX "journal_activite_userId_idx" ON "journal_activite"("userId");

-- CreateIndex
CREATE INDEX "journal_activite_createdAt_idx" ON "journal_activite"("createdAt");

-- CreateIndex
CREATE INDEX "journal_activite_action_idx" ON "journal_activite"("action");

-- CreateIndex
CREATE INDEX "tarif_zones_tenantId_idx" ON "tarif_zones"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tarif_zones_nom_tenantId_key" ON "tarif_zones"("nom", "tenantId");

-- CreateIndex
CREATE INDEX "prix_categories_tenantId_idx" ON "prix_categories"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "prix_categories_categorie_zoneId_key" ON "prix_categories"("categorie", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "parametres_tenantId_key" ON "parametres"("tenantId");

-- CreateIndex
CREATE INDEX "paiements_abonnement_tenantId_idx" ON "paiements_abonnement"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_configs_code_key" ON "plan_configs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_token_key" ON "token_blacklist"("token");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "tarif_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_activite" ADD CONSTRAINT "journal_activite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarif_zones" ADD CONSTRAINT "tarif_zones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prix_categories" ADD CONSTRAINT "prix_categories_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "tarif_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prix_categories" ADD CONSTRAINT "prix_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametres" ADD CONSTRAINT "parametres_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_abonnement" ADD CONSTRAINT "paiements_abonnement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
