// ============================================================
// SEED - Données de démonstration ASM Multi-Services
// Commande: npm run seed
// ============================================================
import { PrismaClient, Role, Categorie, StatutVehicule, TypeClient, StatutReservation, TypeTrajet, StatutContrat, MethodePaiement } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed...');

  // Nettoyer la base de données dans le bon ordre
  await prisma.paiement.deleteMany();
  await prisma.contrat.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.vehicule.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tokenBlacklist.deleteMany();
  await prisma.prixCategorie.deleteMany();
  await prisma.tarifZone.deleteMany();

  console.log('🗑️  Base de données nettoyée');

  // ---- 1. Utilisateurs ----
  const motDePasseHash = await bcrypt.hash('Admin123!', 12);
  const motDePasseAgent = await bcrypt.hash('Agent123!', 12);
  const motDePasseComptable = await bcrypt.hash('Compta123!', 12);

  const [admin, agent1, agent2, comptable] = await Promise.all([
    prisma.user.create({
      data: {
        nom: 'Diedhiou',
        prenom: 'Thierno',
        email: 'admin@asm.sn',
        motDePasse: motDePasseHash,
        telephone: '+221 77 100 00 01',
        role: Role.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        nom: 'Ndiaye',
        prenom: 'Fatou',
        email: 'agent1@asm.sn',
        motDePasse: motDePasseAgent,
        telephone: '+221 77 200 00 01',
        role: Role.AGENT,
      },
    }),
    prisma.user.create({
      data: {
        nom: 'Sow',
        prenom: 'Oumar',
        email: 'agent2@asm.sn',
        motDePasse: motDePasseAgent,
        telephone: '+221 77 200 00 02',
        role: Role.AGENT,
      },
    }),
    prisma.user.create({
      data: {
        nom: 'Fall',
        prenom: 'Aminata',
        email: 'comptable@asm.sn',
        motDePasse: motDePasseComptable,
        telephone: '+221 77 300 00 01',
        role: Role.COMPTABLE,
      },
    }),
  ]);

  console.log('👥 4 utilisateurs créés');

  // ---- 2. Véhicules (flotte réelle ASM) ----
  const vehicules = await Promise.all([
    // Mitsubishi Outlander - SUV premium
    prisma.vehicule.create({
      data: {
        marque: 'Mitsubishi',
        modele: 'Outlander',
        annee: 2022,
        immatriculation: 'DK-1234-AB',
        couleur: 'Blanc',
        categorie: Categorie.SUV,
        kilometrage: 45000,
        prixJournalier: 40000,
        prixSemaine: 240000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'SUV spacieux 7 places, climatisé, idéal pour les grandes familles et transferts',
        photos: [],
      },
    }),
    // Peugeot 308 - Berline standard
    prisma.vehicule.create({
      data: {
        marque: 'Peugeot',
        modele: '308',
        annee: 2021,
        immatriculation: 'DK-5678-CD',
        couleur: 'Gris Métallisé',
        categorie: Categorie.STANDARD,
        kilometrage: 32000,
        prixJournalier: 30000,
        prixSemaine: 180000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'Berline confortable, économique, parfaite pour les déplacements en ville',
        photos: [],
      },
    }),
    // Mazda CX-5 - SUV intermédiaire
    prisma.vehicule.create({
      data: {
        marque: 'Mazda',
        modele: 'CX-5',
        annee: 2023,
        immatriculation: 'DK-9012-EF',
        couleur: 'Rouge',
        categorie: Categorie.SUV,
        kilometrage: 12000,
        prixJournalier: 40000,
        prixSemaine: 240000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'SUV récent, technologie avancée, confort premium',
        photos: [],
      },
    }),
    // Toyota Corolla - Économique
    prisma.vehicule.create({
      data: {
        marque: 'Toyota',
        modele: 'Corolla',
        annee: 2020,
        immatriculation: 'DK-3456-GH',
        couleur: 'Blanc',
        categorie: Categorie.ECONOMIQUE,
        kilometrage: 68000,
        prixJournalier: 25000,
        prixSemaine: 150000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'Économique et fiable, parfait pour les petits budgets',
        photos: [],
      },
    }),
    // Mercedes Vito - Utilitaire
    prisma.vehicule.create({
      data: {
        marque: 'Mercedes',
        modele: 'Vito',
        annee: 2021,
        immatriculation: 'DK-7890-IJ',
        couleur: 'Noir',
        categorie: Categorie.UTILITAIRE,
        kilometrage: 55000,
        prixJournalier: 35000,
        prixSemaine: 210000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'Minibus 9 places, idéal pour les groupes et transferts aéroport',
        photos: [],
      },
    }),
    // BMW Série 3 - Luxe
    prisma.vehicule.create({
      data: {
        marque: 'BMW',
        modele: 'Série 3',
        annee: 2022,
        immatriculation: 'DK-2468-KL',
        couleur: 'Noir',
        categorie: Categorie.LUXE,
        kilometrage: 28000,
        prixJournalier: 60000,
        prixSemaine: 360000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'Berline premium, idéale pour les voyages d\'affaires et clients VIP',
        photos: [],
      },
    }),
    // Renault Kangoo - Utilitaire compact
    prisma.vehicule.create({
      data: {
        marque: 'Renault',
        modele: 'Kangoo',
        annee: 2020,
        immatriculation: 'DK-1357-MN',
        couleur: 'Blanc',
        categorie: Categorie.UTILITAIRE,
        kilometrage: 72000,
        prixJournalier: 35000,
        prixSemaine: 210000,
        statut: StatutVehicule.DISPONIBLE,
        description: 'Véhicule utilitaire compact, idéal pour les livraisons et déménagements légers',
        photos: [],
      },
    }),
  ]);

  console.log('🚗 7 véhicules créés');

  // ---- 3. Clients sénégalais ----
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        nom: 'Ba',
        prenom: 'Ibrahima',
        email: 'ibrahima.ba@gmail.com',
        telephone: '+221 77 111 22 33',
        adresse: 'Sacré-Cœur 3, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0012345-6',
        permisConduire: 'SN-2019-001234',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Sarr',
        prenom: 'Mariama',
        email: 'mariama.sarr@yahoo.fr',
        telephone: '+221 76 444 55 66',
        adresse: 'Almadies, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0023456-7',
        permisConduire: 'SN-2020-002345',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Mbaye',
        prenom: 'Cheikh',
        email: 'cheikh.mbaye@hotmail.com',
        telephone: '+221 70 777 88 99',
        adresse: 'Plateau, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0034567-8',
        permisConduire: 'SN-2018-003456',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Diop',
        prenom: 'Aissatou',
        telephone: '+221 77 000 11 22',
        adresse: 'Liberté 6, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0045678-9',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Sentravel',
        prenom: 'SARL',
        email: 'contact@sentravel.sn',
        telephone: '+221 33 820 00 00',
        adresse: 'Avenue Bourguiba, Dakar',
        typeClient: TypeClient.ENTREPRISE,
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Touré',
        prenom: 'Moussa',
        email: 'moussa.toure@orange.sn',
        telephone: '+221 76 333 44 55',
        adresse: 'Mermoz, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0056789-0',
        permisConduire: 'SN-2021-004567',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Cissé',
        prenom: 'Rokhaya',
        telephone: '+221 77 666 77 88',
        adresse: 'Yoff, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0067890-1',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Thiam',
        prenom: 'Abdoulaye',
        email: 'abdoulaye.thiam@gmail.com',
        telephone: '+221 70 999 00 11',
        adresse: 'Parcelles Assainies, Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0078901-2',
        permisConduire: 'SN-2017-005678',
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Orange Business',
        prenom: 'Sénégal',
        email: 'fleet@orange.sn',
        telephone: '+221 33 835 00 00',
        adresse: 'Rue du Dr. Thèze, Dakar',
        typeClient: TypeClient.ENTREPRISE,
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Diouf',
        prenom: 'Babacar',
        email: 'babacar.diouf@gmail.com',
        telephone: '+221 77 222 33 44',
        adresse: 'Grand Dakar',
        typeClient: TypeClient.PARTICULIER,
        numeroCNI: '1-01-0089012-3',
        permisConduire: 'SN-2022-006789',
        numeroPasseport: 'SN-01234567',
      },
    }),
  ]);

  console.log('👤 10 clients créés');

  // ---- 4. Réservations (mix sur 3 mois) ----
  const maintenant = new Date();
  const il_y_a_2_mois = new Date(maintenant);
  il_y_a_2_mois.setMonth(maintenant.getMonth() - 2);

  const il_y_a_1_mois = new Date(maintenant);
  il_y_a_1_mois.setMonth(maintenant.getMonth() - 1);

  const dans_1_semaine = new Date(maintenant);
  dans_1_semaine.setDate(maintenant.getDate() + 7);

  const dans_2_semaines = new Date(maintenant);
  dans_2_semaines.setDate(maintenant.getDate() + 14);

  const reservations = await Promise.all([
    // Réservation terminée il y a 2 mois
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0001',
        clientId: clients[0].id,
        vehiculeId: vehicules[0].id,
        agentId: agent1.id,
        dateDebut: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 5),
        dateFin: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 12),
        lieuPriseEnCharge: 'Agence ASM - Grand Yoff',
        lieuRetour: 'Agence ASM - Grand Yoff',
        nombreJours: 7,
        prixTotal: 80000,
        avance: 30000,
        statut: StatutReservation.TERMINEE,
        typeTrajet: TypeTrajet.LOCATION,
      },
    }),
    // Réservation terminée il y a 1 mois
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0002',
        clientId: clients[1].id,
        vehiculeId: vehicules[1].id,
        agentId: agent2.id,
        dateDebut: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 10),
        dateFin: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 17),
        lieuPriseEnCharge: 'Aéroport AIBD',
        lieuRetour: 'Hôtel Terrou-Bi, Dakar',
        nombreJours: 7,
        prixTotal: 55000,
        avance: 20000,
        statut: StatutReservation.TERMINEE,
        typeTrajet: TypeTrajet.LOCATION,
      },
    }),
    // Transfert aéroport terminé
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0003',
        clientId: clients[2].id,
        vehiculeId: vehicules[4].id,
        agentId: agent1.id,
        dateDebut: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 20),
        dateFin: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 20),
        lieuPriseEnCharge: 'Dakar Centre',
        lieuRetour: 'Aéroport AIBD',
        nombreJours: 1,
        prixTotal: 25000,
        avance: 25000,
        statut: StatutReservation.TERMINEE,
        typeTrajet: TypeTrajet.TRANSFERT_AEROPORT,
      },
    }),
    // Réservation en cours actuellement
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0004',
        clientId: clients[3].id,
        vehiculeId: vehicules[2].id,
        agentId: agent1.id,
        dateDebut: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 2),
        dateFin: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 5),
        lieuPriseEnCharge: 'Agence ASM - Grand Yoff',
        lieuRetour: 'Agence ASM - Grand Yoff',
        nombreJours: 7,
        prixTotal: 95000,
        avance: 47500,
        statut: StatutReservation.EN_COURS,
        typeTrajet: TypeTrajet.LOCATION,
      },
    }),
    // Réservation confirmée pour la semaine prochaine
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0005',
        clientId: clients[4].id,
        vehiculeId: vehicules[0].id,
        agentId: agent2.id,
        dateDebut: dans_1_semaine,
        dateFin: dans_2_semaines,
        lieuPriseEnCharge: 'Aéroport AIBD',
        lieuRetour: 'Hôtel King Fahd Palace',
        nombreJours: 7,
        prixTotal: 80000,
        avance: 40000,
        statut: StatutReservation.CONFIRMEE,
        typeTrajet: TypeTrajet.LOCATION,
        notes: 'Client VIP - Accueil prioritaire',
      },
    }),
    // Réservation en attente
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0006',
        clientId: clients[5].id,
        vehiculeId: vehicules[3].id,
        agentId: agent1.id,
        dateDebut: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 3),
        dateFin: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 10),
        lieuPriseEnCharge: 'Agence ASM',
        lieuRetour: 'Agence ASM',
        nombreJours: 7,
        prixTotal: 35000,
        avance: 0,
        statut: StatutReservation.EN_ATTENTE,
        typeTrajet: TypeTrajet.LOCATION,
      },
    }),
    // Longue durée (mois précédent - terminée)
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0007',
        clientId: clients[8].id,
        vehiculeId: vehicules[1].id,
        agentId: agent2.id,
        dateDebut: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 1),
        dateFin: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth() + 1, 0),
        lieuPriseEnCharge: 'Orange Sonatel',
        lieuRetour: 'Orange Sonatel',
        nombreJours: 30,
        prixTotal: 200000,
        avance: 100000,
        statut: StatutReservation.TERMINEE,
        typeTrajet: TypeTrajet.LONGUE_DUREE,
        notes: 'Contrat mensuel entreprise',
      },
    }),
    // Réservation annulée
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0008',
        clientId: clients[6].id,
        vehiculeId: vehicules[0].id,
        agentId: agent1.id,
        dateDebut: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1),
        dateFin: new Date(maintenant.getFullYear(), maintenant.getMonth(), 3),
        lieuPriseEnCharge: 'Agence ASM',
        lieuRetour: 'Agence ASM',
        nombreJours: 2,
        prixTotal: 30000,
        avance: 0,
        statut: StatutReservation.ANNULEE,
        typeTrajet: TypeTrajet.LOCATION,
        notes: 'Annulée par le client',
      },
    }),
    // Réservation du mois précédent - terminée avec Mazda
    prisma.reservation.create({
      data: {
        numeroReservation: 'RES-SEED-0009',
        clientId: clients[7].id,
        vehiculeId: vehicules[2].id,
        agentId: agent2.id,
        dateDebut: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 5),
        dateFin: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 19),
        lieuPriseEnCharge: 'Agence ASM',
        lieuRetour: 'Agence ASM',
        nombreJours: 14,
        prixTotal: 170000,
        avance: 85000,
        statut: StatutReservation.TERMINEE,
        typeTrajet: TypeTrajet.LOCATION,
      },
    }),
  ]);

  console.log('📅 9 réservations créées');

  // ---- 5. Contrats pour les réservations terminées/en cours ----
  const contratRes1 = await prisma.contrat.create({
    data: {
      numeroContrat: 'CTR-SEED-0001',
      reservationId: reservations[0].id,
      clientId: clients[0].id,
      agentId: agent1.id,
      kilometrageDepart: 44200,
      kilometrageRetour: 44850,
      etatDepart: 'Excellent - Aucune rayure',
      etatRetour: 'Bon état général',
      caution: 100000,
      cautionRendue: true,
      statut: StatutContrat.TERMINE,
    },
  });

  const contratRes2 = await prisma.contrat.create({
    data: {
      numeroContrat: 'CTR-SEED-0002',
      reservationId: reservations[1].id,
      clientId: clients[1].id,
      agentId: agent2.id,
      kilometrageDepart: 31500,
      kilometrageRetour: 32100,
      etatDepart: 'Bon état',
      etatRetour: 'Bon état',
      caution: 75000,
      cautionRendue: true,
      statut: StatutContrat.TERMINE,
    },
  });

  const contratRes3 = await prisma.contrat.create({
    data: {
      numeroContrat: 'CTR-SEED-0003',
      reservationId: reservations[2].id,
      clientId: clients[2].id,
      agentId: agent1.id,
      kilometrageDepart: 54800,
      kilometrageRetour: 54850,
      etatDepart: 'Très bon état',
      etatRetour: 'Très bon état',
      caution: 50000,
      cautionRendue: true,
      statut: StatutContrat.TERMINE,
    },
  });

  // Contrat actif (en cours)
  const contratRes4 = await prisma.contrat.create({
    data: {
      numeroContrat: 'CTR-SEED-0004',
      reservationId: reservations[3].id,
      clientId: clients[3].id,
      agentId: agent1.id,
      kilometrageDepart: 11800,
      etatDepart: 'Excellent - Neuf',
      caution: 150000,
      cautionRendue: false,
      statut: StatutContrat.ACTIF,
    },
  });

  const contratRes7 = await prisma.contrat.create({
    data: {
      numeroContrat: 'CTR-SEED-0005',
      reservationId: reservations[6].id,
      clientId: clients[8].id,
      agentId: agent2.id,
      kilometrageDepart: 31000,
      kilometrageRetour: 32900,
      etatDepart: 'Bon état',
      etatRetour: 'Bon état - Légère usure normale',
      caution: 200000,
      cautionRendue: true,
      statut: StatutContrat.TERMINE,
    },
  });

  const contratRes9 = await prisma.contrat.create({
    data: {
      numeroContrat: 'CTR-SEED-0006',
      reservationId: reservations[8].id,
      clientId: clients[7].id,
      agentId: agent2.id,
      kilometrageDepart: 11500,
      kilometrageRetour: 12800,
      etatDepart: 'Excellent',
      etatRetour: 'Bon état',
      caution: 150000,
      cautionRendue: false,  // Caution non encore rendue
      statut: StatutContrat.TERMINE,
    },
  });

  console.log('📄 6 contrats créés');

  // ---- 6. Paiements ----
  await Promise.all([
    // Paiements contrat 1 (terminé)
    prisma.paiement.create({
      data: {
        contratId: contratRes1.id,
        montant: 30000,
        methode: MethodePaiement.WAVE,
        reference: 'WAVE-2024-001',
        datePaiement: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 5),
        notes: 'Avance au départ',
      },
    }),
    prisma.paiement.create({
      data: {
        contratId: contratRes1.id,
        montant: 50000,
        methode: MethodePaiement.ESPECES,
        datePaiement: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 12),
        notes: 'Solde au retour',
      },
    }),

    // Paiements contrat 2 (terminé)
    prisma.paiement.create({
      data: {
        contratId: contratRes2.id,
        montant: 55000,
        methode: MethodePaiement.ORANGE_MONEY,
        reference: 'OM-2024-002',
        datePaiement: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 10),
      },
    }),

    // Paiements contrat 3 (transfert)
    prisma.paiement.create({
      data: {
        contratId: contratRes3.id,
        montant: 25000,
        methode: MethodePaiement.WAVE,
        reference: 'WAVE-2024-003',
        datePaiement: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 20),
      },
    }),

    // Paiement partiel contrat 4 (en cours)
    prisma.paiement.create({
      data: {
        contratId: contratRes4.id,
        montant: 47500,
        methode: MethodePaiement.VIREMENT,
        reference: 'VIR-2024-004',
        datePaiement: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 2),
        notes: 'Avance 50%',
      },
    }),

    // Paiements contrat longue durée entreprise
    prisma.paiement.create({
      data: {
        contratId: contratRes7.id,
        montant: 100000,
        methode: MethodePaiement.VIREMENT,
        reference: 'VIR-ORANGE-001',
        datePaiement: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 1),
        notes: 'Premier versement Orange',
      },
    }),
    prisma.paiement.create({
      data: {
        contratId: contratRes7.id,
        montant: 100000,
        methode: MethodePaiement.VIREMENT,
        reference: 'VIR-ORANGE-002',
        datePaiement: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 1),
        notes: 'Deuxième versement',
      },
    }),

    // Paiements contrat 9
    prisma.paiement.create({
      data: {
        contratId: contratRes9.id,
        montant: 85000,
        methode: MethodePaiement.WAVE,
        reference: 'WAVE-2024-009',
        datePaiement: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 5),
        notes: 'Avance 50%',
      },
    }),
    prisma.paiement.create({
      data: {
        contratId: contratRes9.id,
        montant: 85000,
        methode: MethodePaiement.ORANGE_MONEY,
        reference: 'OM-2024-010',
        datePaiement: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 19),
        notes: 'Solde final',
      },
    }),
  ]);

  console.log('💰 9 paiements créés');

  // ---- 7. Maintenances ----
  await Promise.all([
    // Terminée - Toyota Corolla vidange
    prisma.maintenance.create({
      data: {
        vehiculeId: vehicules[3].id,
        type: 'Vidange complète',
        description: 'Vidange huile moteur + filtre à huile + filtre à air + contrôle niveaux',
        cout: 45000,
        dateDebut: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 15),
        dateFin: new Date(il_y_a_1_mois.getFullYear(), il_y_a_1_mois.getMonth(), 15),
        statut: 'TERMINEE',
      },
    }),
    // Terminée - Peugeot 308 freins
    prisma.maintenance.create({
      data: {
        vehiculeId: vehicules[1].id,
        type: 'Remplacement plaquettes de frein',
        description: 'Remplacement plaquettes avant et arrière, disques contrôlés',
        cout: 85000,
        dateDebut: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 20),
        dateFin: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 21),
        statut: 'TERMINEE',
      },
    }),
    // En cours - Mitsubishi Outlander révision générale
    prisma.maintenance.create({
      data: {
        vehiculeId: vehicules[0].id,
        type: 'Révision générale 50 000 km',
        description: 'Révision complète: vidange, filtres, bougies, courroie de distribution, contrôle géométrie',
        cout: 180000,
        dateDebut: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1),
        statut: 'EN_COURS',
      },
    }),
    // Planifiée - Mercedes Vito pneumatiques
    prisma.maintenance.create({
      data: {
        vehiculeId: vehicules[4].id,
        type: 'Remplacement pneus',
        description: 'Remplacement des 4 pneus + rééquilibrage + parallélisme',
        cout: 220000,
        dateDebut: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 5),
        statut: 'PLANIFIEE',
      },
    }),
    // Terminée - Mazda CX-5 climatisation
    prisma.maintenance.create({
      data: {
        vehiculeId: vehicules[2].id,
        type: 'Recharge climatisation',
        description: 'Recharge gaz climatisation + contrôle compresseur + remplacement filtre habitacle',
        cout: 65000,
        dateDebut: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 10),
        dateFin: new Date(il_y_a_2_mois.getFullYear(), il_y_a_2_mois.getMonth(), 10),
        statut: 'TERMINEE',
      },
    }),
    // Planifiée - Toyota Corolla contrôle technique
    prisma.maintenance.create({
      data: {
        vehiculeId: vehicules[3].id,
        type: 'Contrôle technique annuel',
        description: 'Passage contrôle technique obligatoire + mise en conformité si nécessaire',
        dateDebut: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 10),
        statut: 'PLANIFIEE',
      },
    }),
  ]);

  console.log('🔧 6 maintenances créées');

  // ---- 8. Zones tarifaires ----
  const [zoneDakar, zoneThies, zoneAutres] = await Promise.all([
    prisma.tarifZone.create({ data: { nom: 'Dakar', actif: true } }),
    prisma.tarifZone.create({ data: { nom: 'Thiès / Région', actif: true } }),
    prisma.tarifZone.create({ data: { nom: 'Autres régions', actif: true } }),
  ]);

  console.log('🗺️  3 zones tarifaires créées');

  // ---- 9. Matrice tarifaire (catégorie × zone) ----
  //
  //  Catégorie    | Dakar  | Thiès  | Autres
  //  -------------|--------|--------|--------
  //  Économique   | 25 000 | 30 000 | 35 000
  //  Standard     | 30 000 | 35 000 | 40 000
  //  SUV          | 40 000 | 45 000 | 50 000
  //  Luxe         | 60 000 | 65 000 | 70 000
  //  Utilitaire   | 35 000 | 40 000 | 45 000
  //
  await Promise.all([
    // --- Dakar ---
    prisma.prixCategorie.create({ data: { zoneId: zoneDakar.id, categorie: Categorie.ECONOMIQUE,  prixJournalier: 25000, prixSemaine: 150000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneDakar.id, categorie: Categorie.STANDARD,    prixJournalier: 30000, prixSemaine: 180000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneDakar.id, categorie: Categorie.SUV,         prixJournalier: 40000, prixSemaine: 240000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneDakar.id, categorie: Categorie.LUXE,        prixJournalier: 60000, prixSemaine: 360000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneDakar.id, categorie: Categorie.UTILITAIRE,  prixJournalier: 35000, prixSemaine: 210000 } }),
    // --- Thiès / Région ---
    prisma.prixCategorie.create({ data: { zoneId: zoneThies.id, categorie: Categorie.ECONOMIQUE,  prixJournalier: 30000, prixSemaine: 180000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneThies.id, categorie: Categorie.STANDARD,    prixJournalier: 35000, prixSemaine: 210000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneThies.id, categorie: Categorie.SUV,         prixJournalier: 45000, prixSemaine: 270000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneThies.id, categorie: Categorie.LUXE,        prixJournalier: 65000, prixSemaine: 390000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneThies.id, categorie: Categorie.UTILITAIRE,  prixJournalier: 40000, prixSemaine: 240000 } }),
    // --- Autres régions ---
    prisma.prixCategorie.create({ data: { zoneId: zoneAutres.id, categorie: Categorie.ECONOMIQUE, prixJournalier: 35000, prixSemaine: 210000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneAutres.id, categorie: Categorie.STANDARD,   prixJournalier: 40000, prixSemaine: 240000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneAutres.id, categorie: Categorie.SUV,        prixJournalier: 50000, prixSemaine: 300000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneAutres.id, categorie: Categorie.LUXE,       prixJournalier: 70000, prixSemaine: 420000 } }),
    prisma.prixCategorie.create({ data: { zoneId: zoneAutres.id, categorie: Categorie.UTILITAIRE, prixJournalier: 45000, prixSemaine: 270000 } }),
  ]);

  console.log('💲 15 prix catégorie × zone créés');

  // ---- Résumé ----
  console.log('\n✅ Seed terminé avec succès!');
  console.log('\n🔐 Comptes de connexion:');
  console.log('   Admin:     admin@asm.sn       / Admin123!');
  console.log('   Agent 1:   agent1@asm.sn      / Agent123!');
  console.log('   Agent 2:   agent2@asm.sn      / Agent123!');
  console.log('   Comptable: comptable@asm.sn   / Compta123!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
