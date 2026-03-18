// Service — configuration des plans d'abonnement (plateforme)
import prisma from '../utils/prisma';

const DEFAULT_PLANS = [
  {
    code: 'STARTER',
    nom: 'Starter',
    description: 'Idéal pour les petites agences et indépendants',
    montantMensuel: 25000,
    montantAnnuel: 250000,
    maxAgents: 2,
    maxVehicules: 15,
    features: ['Gestion réservations', 'Gestion clients', 'Contrats PDF', 'Support email'],
  },
  {
    code: 'PRO',
    nom: 'Pro',
    description: 'Pour les agences en croissance',
    montantMensuel: 75000,
    montantAnnuel: 750000,
    maxAgents: 10,
    maxVehicules: 50,
    features: ['Tout Starter', 'Multi-agents', 'Rapports avancés', 'Journal d\'activité', 'Domaine custom', 'Support prioritaire'],
  },
  {
    code: 'ENTERPRISE',
    nom: 'Enterprise',
    description: 'Pour les grands groupes et flottes corporate',
    montantMensuel: 200000,
    montantAnnuel: 2000000,
    maxAgents: 999,
    maxVehicules: 999,
    features: ['Tout Pro', 'Agents illimités', 'Véhicules illimités', 'SLA garanti', 'Intégration API', 'Account Manager dédié'],
  },
];

export const planService = {
  async initDefaultPlans(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      await prisma.planConfig.upsert({
        where: { code: plan.code },
        update: {},  // Ne pas écraser si existe déjà
        create: plan,
      });
    }
  },

  async getAll() {
    return prisma.planConfig.findMany({ orderBy: { montantMensuel: 'asc' } });
  },

  async getByCode(code: string) {
    return prisma.planConfig.findUnique({ where: { code } });
  },

  async update(code: string, data: Partial<{
    nom: string;
    description: string;
    montantMensuel: number;
    montantAnnuel: number | null;
    maxAgents: number;
    maxVehicules: number;
    features: string[];
    actif: boolean;
  }>) {
    return prisma.planConfig.update({ where: { code }, data });
  },
};
