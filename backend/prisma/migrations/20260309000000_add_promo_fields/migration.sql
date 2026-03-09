-- AlterTable: ajout des champs promo manquants dans parametres
ALTER TABLE "parametres" ADD COLUMN IF NOT EXISTS "promoSousTexte" TEXT;
ALTER TABLE "parametres" ADD COLUMN IF NOT EXISTS "promoReduction" TEXT;
ALTER TABLE "parametres" ADD COLUMN IF NOT EXISTS "promoDateFin" TEXT;
