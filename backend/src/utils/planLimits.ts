// Vérification des limites du plan d'abonnement du tenant
import prisma from './prisma';

/**
 * Vérifie si le tenant peut encore ajouter un agent ou un véhicule.
 * Lance une erreur avec un message clair si le quota est atteint.
 */
export async function checkPlanLimit(
  tenantId: string,
  resource: 'agents' | 'vehicules'
): Promise<void> {
  // Récupérer le tenant avec son plan
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { planType: true },
  });
  if (!tenant) return;

  const planType = tenant.planType || 'STARTER';

  // Récupérer la config du plan
  const planConfig = await prisma.planConfig.findUnique({
    where: { code: planType },
    select: { maxAgents: true, maxVehicules: true, nom: true },
  });
  if (!planConfig) return; // plan inconnu → pas de restriction

  if (resource === 'agents') {
    const count = await prisma.user.count({
      where: { tenantId, role: { not: 'SUPER_ADMIN' } },
    });
    if (count >= planConfig.maxAgents) {
      throw new Error(
        `Limite du plan ${planConfig.nom} atteinte : maximum ${planConfig.maxAgents} agents autorisés. ` +
        `Passez à un plan supérieur pour en ajouter davantage.`
      );
    }
  }

  if (resource === 'vehicules') {
    const count = await prisma.vehicule.count({ where: { tenantId } });
    if (count >= planConfig.maxVehicules) {
      throw new Error(
        `Limite du plan ${planConfig.nom} atteinte : maximum ${planConfig.maxVehicules} véhicules autorisés. ` +
        `Passez à un plan supérieur pour en ajouter davantage.`
      );
    }
  }
}
