// Service de gestion des paramètres de l'entreprise
import prisma from '../utils/prisma';

const DEFAULTS = {
  nomEntreprise: 'ASM Multi-Services',
  slogan: 'Location de Véhicules',
  activite: 'Vente et location de voitures — Import/Export',
  telephone: '+221 77 418 05 32',
  telephone2: '+221 76 474 90 92',
  email: 'contact@asm-location.sn',
  adresse: 'Grand Yoff — Zone de Captage',
  ville: 'Dakar, Sénégal',
  rccm: 'SN.DKR.2024.A.53708',
  ninea: '011803633',
  heuresLunVen: '08h00 – 18h00',
  heuresSamedi: '09h00 – 15h00',
  noteTransfert: 'Transfert aéroport disponible 24h/24 sur réservation',
  bannierePromo: '',
  promoSousTexte: '',
  promoReduction: '',
  promoDateFin: '',
};

export const settingsService = {
  async get() {
    return prisma.parametre.upsert({
      where: { id: 1 },
      create: { id: 1, ...DEFAULTS },
      update: {},
    });
  },

  async update(data: Partial<typeof DEFAULTS>) {
    return prisma.parametre.upsert({
      where: { id: 1 },
      create: { id: 1, ...DEFAULTS, ...data },
      update: data,
    });
  },
};
