import prisma from '../utils/prisma';

async function main() {
  console.log('Migration vers multi-tenant...');

  // 1. Créer le tenant ASM (s'il n'existe pas déjà)
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: 'asm' } });

  if (existingTenant) {
    console.log('Tenant ASM déjà existant, migration des données...');
    await migrateExistingData(existingTenant.id);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      slug: 'asm',
      domaine: 'asm-location.innosft.com',
      nomEntreprise: 'ASM Multi-Services',
      slogan: 'Location de Véhicules',
      activite: 'Vente et location de voitures — Import/Export',
      couleurPrimaire: '#1B5E20',
      couleurSecondaire: '#F9A825',
    },
  });
  console.log(`Tenant créé: ${tenant.slug} (${tenant.id})`);

  await migrateExistingData(tenant.id);
  console.log('Migration terminée !');
}

async function migrateExistingData(tenantId: string) {
  // Migrer toutes les tables existantes
  await Promise.all([
    prisma.$executeRaw`UPDATE users SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE vehicules SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE clients SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE reservations SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE contrats SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE paiements SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE maintenances SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE journal_activite SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
    prisma.$executeRaw`UPDATE tarif_zones SET "tenantId" = ${tenantId} WHERE "tenantId" IS NULL`.catch(() => {}),
  ]);
  console.log('Données migrées vers le tenant ASM');

  // Créer le paramètre si inexistant
  const existingParam = await prisma.parametre.findUnique({ where: { tenantId } });
  if (!existingParam) {
    const oldParam = await prisma.$queryRaw<any[]>`SELECT * FROM parametres LIMIT 1`;
    const old = oldParam[0] || {};
    await prisma.parametre.create({
      data: {
        tenantId,
        nomEntreprise: old.nomEntreprise || 'ASM Multi-Services',
        slogan: old.slogan || 'Location de Véhicules',
        activite: old.activite || 'Vente et location de voitures — Import/Export',
        telephone: old.telephone || '+221 77 418 05 32',
        telephone2: old.telephone2 || '+221 76 474 90 92',
        email: old.email || 'contact@asm-location.sn',
        adresse: old.adresse || 'Grand Yoff — Zone de Captage',
        ville: old.ville || 'Dakar, Sénégal',
        rccm: old.rccm || 'SN.DKR.2024.A.53708',
        ninea: old.ninea || '011803633',
        heuresLunVen: old.heuresLunVen || '08h00 – 18h00',
        heuresSamedi: old.heuresSamedi || '09h00 – 15h00',
        noteTransfert: old.noteTransfert || 'Transfert aéroport disponible 24h/24 sur réservation',
        bannierePromo: old.bannierePromo || null,
        promoSousTexte: old.promoSousTexte || null,
        promoReduction: old.promoReduction || null,
        promoDateFin: old.promoDateFin || null,
      },
    });
    console.log('Paramètres migrés');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
