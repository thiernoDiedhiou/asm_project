// Service de gestion des paramètres de l'entreprise
import prisma from '../utils/prisma';

const PARAMETRE_DEFAULTS = {
  nomEntreprise: 'Mon Entreprise',
  slogan: 'Location de Véhicules',
  activite: 'Vente et location de voitures',
  telephone: '',
  telephone2: '',
  email: '',
  adresse: '',
  ville: '',
  rccm: '',
  ninea: '',
  heuresLunVen: '08h00 – 18h00',
  heuresSamedi: '09h00 – 15h00',
  noteTransfert: 'Transfert aéroport disponible 24h/24 sur réservation',
  bannierePromo: '',
  promoSousTexte: '',
  promoReduction: '',
  promoDateFin: '',
};

export const settingsService = {
  async get(tenantId: string) {
    // Récupérer les paramètres ET les infos branding du Tenant
    const [parametre, tenant] = await Promise.all([
      prisma.parametre.upsert({
        where: { tenantId },
        create: { tenantId, ...PARAMETRE_DEFAULTS },
        update: {},
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { slug: true, couleurPrimaire: true, couleurSecondaire: true, logo: true, nomEntreprise: true, slogan: true },
      }),
    ]);

    // Fusionner : Tenant fournit slug/couleurs/logo, Parametre fournit tout le reste
    return {
      ...parametre,
      slug: tenant?.slug ?? 'default',
      couleurPrimaire: tenant?.couleurPrimaire ?? '#1B5E20',
      couleurSecondaire: tenant?.couleurSecondaire ?? '#F9A825',
      logo: tenant?.logo ?? null,
      // Le Tenant est la source canonique pour nomEntreprise et slogan (branding)
      nomEntreprise: tenant?.nomEntreprise ?? parametre.nomEntreprise,
      slogan: tenant?.slogan ?? parametre.slogan,
    };
  },

  async update(tenantId: string, data: Record<string, unknown>) {
    // Champs du modèle Tenant (branding) — à séparer de Parametre
    const TENANT_FIELDS = ['slug', 'couleurPrimaire', 'couleurSecondaire', 'logo', 'nomEntreprise', 'slogan'];

    const tenantData: Record<string, unknown> = {};
    const parametreData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (TENANT_FIELDS.includes(key)) {
        tenantData[key] = value;
      } else {
        parametreData[key] = value;
      }
    }

    await Promise.all([
      // Mettre à jour le Tenant si des champs branding sont présents
      Object.keys(tenantData).length > 0
        ? prisma.tenant.update({ where: { id: tenantId }, data: tenantData })
        : Promise.resolve(),
      // Mettre à jour (ou créer) les Parametre
      prisma.parametre.upsert({
        where: { tenantId },
        create: { tenantId, ...PARAMETRE_DEFAULTS, ...parametreData },
        update: parametreData,
      }),
    ]);

    // Retourner la vue fusionnée
    return settingsService.get(tenantId);
  },
};
