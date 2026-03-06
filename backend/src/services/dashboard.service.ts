// Service Dashboard - KPIs et Analytics
import prisma from '../utils/prisma';

export class DashboardService {
  /**
   * Récupère les statistiques principales du tableau de bord
   */
  async getStats() {
    const maintenant = new Date();
    const debutMois = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth(),
      1
    );
    const debutMoisPrecedent = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() - 1,
      1
    );
    const finMoisPrecedent = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth(),
      0,
      23,
      59,
      59
    );

    // Statistiques en parallèle pour les performances
    const [
      vehiculesStats,
      revenusMois,
      revenusMoisPrecedent,
      reservationsActives,
      nouveauxClientsMois,
      paiementsEnAttente,
      totalClients,
    ] = await Promise.all([
      // Comptage des véhicules par statut
      prisma.vehicule.groupBy({
        by: ['statut'],
        _count: { id: true },
      }),

      // Revenus du mois en cours
      prisma.paiement.aggregate({
        where: {
          valide: true,
          datePaiement: { gte: debutMois },
        },
        _sum: { montant: true },
      }),

      // Revenus du mois précédent
      prisma.paiement.aggregate({
        where: {
          valide: true,
          datePaiement: {
            gte: debutMoisPrecedent,
            lte: finMoisPrecedent,
          },
        },
        _sum: { montant: true },
      }),

      // Réservations actives (confirmées + en cours)
      prisma.reservation.count({
        where: { statut: { in: ['CONFIRMEE', 'EN_COURS'] } },
      }),

      // Nouveaux clients ce mois
      prisma.client.count({
        where: { createdAt: { gte: debutMois } },
      }),

      // Paiements en attente (contrats actifs avec reste dû)
      prisma.contrat.count({
        where: { statut: 'ACTIF' },
      }),

      // Total clients
      prisma.client.count(),
    ]);

    // Calculer les stats véhicules
    const totalVehicules = vehiculesStats.reduce(
      (sum, s) => sum + s._count.id,
      0
    );
    const vehiculesDisponibles =
      vehiculesStats.find((s) => s.statut === 'DISPONIBLE')?._count.id || 0;
    const vehiculesLoues =
      vehiculesStats.find((s) => s.statut === 'LOUE')?._count.id || 0;
    const vehiculesMaintenance =
      vehiculesStats.find((s) => s.statut === 'EN_MAINTENANCE')?._count.id || 0;

    const tauxOccupation =
      totalVehicules > 0
        ? Math.round((vehiculesLoues / totalVehicules) * 100)
        : 0;

    const revenusMoisVal = Number(revenusMois._sum.montant) || 0;
    const revenusMoisPrecedentVal =
      Number(revenusMoisPrecedent._sum.montant) || 0;

    return {
      revenusMois: revenusMoisVal,
      revenusMoisPrecedent: revenusMoisPrecedentVal,
      variationRevenus:
        revenusMoisPrecedentVal > 0
          ? Math.round(
              ((revenusMoisVal - revenusMoisPrecedentVal) /
                revenusMoisPrecedentVal) *
                100
            )
          : 0,
      vehiculesDisponibles,
      vehiculesLoues,
      vehiculesMaintenance,
      totalVehicules,
      reservationsActives,
      tauxOccupation,
      nouveauxClients: nouveauxClientsMois,
      contratsActifs: paiementsEnAttente,
      totalClients,
    };
  }

  /**
   * Revenus par période (12 derniers mois)
   */
  async getRevenus(periode: 'mois' | 'semaine' | 'annee' = 'mois') {
    const maintenant = new Date();
    let dateDebut: Date;
    let groupByFormat: string;

    if (periode === 'mois') {
      // 12 derniers mois
      dateDebut = new Date(
        maintenant.getFullYear() - 1,
        maintenant.getMonth(),
        1
      );
    } else if (periode === 'semaine') {
      // 8 dernières semaines
      dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 56);
    } else {
      // 5 dernières années
      dateDebut = new Date(maintenant.getFullYear() - 5, 0, 1);
    }

    // Récupérer tous les paiements valides sur la période
    const paiements = await prisma.paiement.findMany({
      where: {
        valide: true,
        datePaiement: { gte: dateDebut },
      },
      select: {
        montant: true,
        datePaiement: true,
      },
      orderBy: { datePaiement: 'asc' },
    });

    // Grouper par mois
    const revenus: Record<string, number> = {};

    paiements.forEach((p) => {
      const date = new Date(p.datePaiement);
      let key: string;

      if (periode === 'mois') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (periode === 'semaine') {
        const debutSemaine = new Date(date);
        debutSemaine.setDate(date.getDate() - date.getDay());
        key = debutSemaine.toISOString().split('T')[0];
      } else {
        key = String(date.getFullYear());
      }

      revenus[key] = (revenus[key] || 0) + Number(p.montant);
    });

    return Object.entries(revenus).map(([periode, montant]) => ({
      periode,
      montant,
    }));
  }

  /**
   * Performance des véhicules
   */
  async getVehiculesPerformance() {
    const vehicules = await prisma.vehicule.findMany({
      include: {
        reservations: {
          where: { statut: 'TERMINEE' },
          include: {
            contrat: {
              include: {
                paiements: {
                  where: { valide: true },
                },
              },
            },
          },
        },
      },
    });

    return vehicules.map((v) => {
      const nombreLocations = v.reservations.length;
      const revenuTotal = v.reservations.reduce((sum, r) => {
        const paiements = r.contrat?.paiements || [];
        return sum + paiements.reduce((s, p) => s + Number(p.montant), 0);
      }, 0);

      // Calcul du taux d'occupation sur les 30 derniers jours
      const il_y_a_30_jours = new Date();
      il_y_a_30_jours.setDate(il_y_a_30_jours.getDate() - 30);

      const joursLoues = v.reservations
        .filter((r) => r.dateFin >= il_y_a_30_jours)
        .reduce((sum, r) => sum + r.nombreJours, 0);

      return {
        vehiculeId: v.id,
        immatriculation: v.immatriculation,
        marque: v.marque,
        modele: v.modele,
        categorie: v.categorie,
        statut: v.statut,
        nombreLocations,
        revenuTotal,
        tauxOccupation: Math.min(100, Math.round((joursLoues / 30) * 100)),
      };
    });
  }

  /**
   * Alertes du système
   */
  async getAlertes() {
    const maintenant = new Date();
    const dans24h = new Date(maintenant.getTime() + 24 * 60 * 60 * 1000);
    const il_y_a_3_jours = new Date(maintenant.getTime() - 3 * 24 * 60 * 60 * 1000);
    const il_y_a_7_jours = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);

    const alertes: Array<{ id: string; type: string; message: string; severite: string; lien: string; createdAt: Date }> = [];

    // 1. Réservations se terminant dans 24h
    const reservationsExpirantBientot = await prisma.reservation.findMany({
      where: {
        statut: 'EN_COURS',
        dateFin: { gte: maintenant, lte: dans24h },
      },
      include: {
        client: { select: { nom: true, prenom: true } },
        vehicule: { select: { immatriculation: true, marque: true } },
      },
    });

    reservationsExpirantBientot.forEach((r) => {
      alertes.push({
        id: `res-${r.id}`,
        type: 'RESERVATION',
        message: `Location se termine dans moins de 24h: ${r.client.prenom} ${r.client.nom} - ${r.vehicule.marque} (${r.vehicule.immatriculation})`,
        severite: 'WARNING',
        lien: `/reservations/${r.id}`,
        createdAt: maintenant,
      });
    });

    // 2. Cautions non rendues depuis > 7 jours
    const cautionsNonRendues = await prisma.contrat.findMany({
      where: {
        statut: 'TERMINE',
        cautionRendue: false,
        updatedAt: { lte: il_y_a_7_jours },
      },
      include: {
        client: { select: { nom: true, prenom: true } },
      },
    });

    cautionsNonRendues.forEach((c) => {
      alertes.push({
        id: `caution-${c.id}`,
        type: 'CAUTION',
        message: `Caution non rendue depuis > 7 jours: ${c.client.prenom} ${c.client.nom} (${Number(c.caution).toLocaleString('fr-SN')} FCFA)`,
        severite: 'ERROR',
        lien: `/contrats/${c.id}`,
        createdAt: maintenant,
      });
    });

    // 3. Contrats expirés non clôturés
    const contratsExpires = await prisma.contrat.findMany({
      where: {
        statut: 'ACTIF',
        reservation: {
          dateFin: { lt: maintenant },
        },
      },
      include: {
        client: { select: { nom: true, prenom: true } },
        reservation: {
          select: {
            dateFin: true,
            vehicule: { select: { immatriculation: true } },
          },
        },
      },
    });

    contratsExpires.forEach((c) => {
      alertes.push({
        id: `contrat-${c.id}`,
        type: 'CONTRAT',
        message: `Contrat expiré non clôturé: ${c.client.prenom} ${c.client.nom} - ${c.reservation.vehicule.immatriculation}`,
        severite: 'ERROR',
        lien: `/contrats/${c.id}`,
        createdAt: maintenant,
      });
    });

    // 4. Véhicules dépassant 5000 km depuis dernière maintenance
    const vehicules = await prisma.vehicule.findMany({
      include: {
        maintenances: {
          where: { statut: 'TERMINEE' },
          orderBy: { dateFin: 'desc' },
          take: 1,
        },
      },
    });

    vehicules.forEach((v) => {
      const derniereMaintenance = v.maintenances[0];
      // Si aucune maintenance ou plus de 5000 km (estimation)
      if (!derniereMaintenance) {
        if (v.kilometrage > 50000) {
          alertes.push({
            id: `maint-${v.id}`,
            type: 'MAINTENANCE',
            message: `Maintenance recommandée: ${v.marque} ${v.modele} (${v.immatriculation}) - ${v.kilometrage.toLocaleString('fr-SN')} km`,
            severite: 'INFO',
            lien: `/vehicules/${v.id}`,
            createdAt: maintenant,
          });
        }
      }
    });

    return alertes;
  }

  /**
   * Récupère les 5 dernières réservations pour le dashboard
   */
  async getRecentesReservations() {
    return prisma.reservation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { nom: true, prenom: true },
        },
        vehicule: {
          select: { marque: true, modele: true, immatriculation: true },
        },
      },
    });
  }
}

export const dashboardService = new DashboardService();
