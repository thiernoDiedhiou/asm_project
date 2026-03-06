// ============================================================
// TYPES PARTAGÉS - ASM Multi-Services
// Utilisés par le frontend et le backend
// ============================================================

// ---- Enums ----

export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  COMPTABLE = 'COMPTABLE',
}

export enum Categorie {
  ECONOMIQUE = 'ECONOMIQUE',
  STANDARD = 'STANDARD',
  SUV = 'SUV',
  LUXE = 'LUXE',
  UTILITAIRE = 'UTILITAIRE',
}

export enum StatutVehicule {
  DISPONIBLE = 'DISPONIBLE',
  LOUE = 'LOUE',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  HORS_SERVICE = 'HORS_SERVICE',
}

export enum TypeClient {
  PARTICULIER = 'PARTICULIER',
  ENTREPRISE = 'ENTREPRISE',
}

export enum StatutReservation {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE = 'CONFIRMEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum TypeTrajet {
  LOCATION = 'LOCATION',
  TRANSFERT_AEROPORT = 'TRANSFERT_AEROPORT',
  LONGUE_DUREE = 'LONGUE_DUREE',
}

export enum StatutContrat {
  ACTIF = 'ACTIF',
  TERMINE = 'TERMINE',
  LITIGE = 'LITIGE',
}

export enum MethodePaiement {
  ESPECES = 'ESPECES',
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  FREE_MONEY = 'FREE_MONEY',
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
}

export enum StatutMaintenance {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
}

// ---- Interfaces de base ----

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  actif: boolean;
  createdAt: Date;
}

export interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  immatriculation: string;
  couleur: string;
  categorie: Categorie;
  kilometrage: number;
  prixJournalier: number;
  prixSemaine: number;
  statut: StatutVehicule;
  photos: string[];
  description?: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone: string;
  adresse?: string;
  typeClient: TypeClient;
  numeroCNI?: string;
  numeroPasseport?: string;
  permisConduire?: string;
  createdAt: Date;
}

export interface Reservation {
  id: string;
  numeroReservation: string;
  clientId: string;
  client?: Client;
  vehiculeId: string;
  vehicule?: Vehicule;
  dateDebut: Date;
  dateFin: Date;
  lieuPriseEnCharge: string;
  lieuRetour: string;
  nombreJours: number;
  prixTotal: number;
  avance: number;
  statut: StatutReservation;
  typeTrajet: TypeTrajet;
  notes?: string;
  agentId: string;
  agent?: User;
  contrat?: Contrat;
  createdAt: Date;
}

export interface Contrat {
  id: string;
  numeroContrat: string;
  reservationId: string;
  reservation?: Reservation;
  clientId: string;
  client?: Client;
  agentId: string;
  agent?: User;
  dateSignature: Date;
  kilometrageDepart: number;
  kilometrageRetour?: number;
  etatDepart: string;
  etatRetour?: string;
  caution: number;
  cautionRendue: boolean;
  paiements?: Paiement[];
  statut: StatutContrat;
  pdfUrl?: string;
  createdAt: Date;
}

export interface Paiement {
  id: string;
  contratId: string;
  contrat?: Contrat;
  montant: number;
  methode: MethodePaiement;
  reference?: string;
  datePaiement: Date;
  notes?: string;
  valide: boolean;
}

export interface Maintenance {
  id: string;
  vehiculeId: string;
  vehicule?: Vehicule;
  type: string;
  description: string;
  cout?: number;
  dateDebut: Date;
  dateFin?: Date;
  statut: StatutMaintenance;
  createdAt: Date;
}

// ---- Types pour les réponses API ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'createdAt'>;
}

// ---- Types pour les formulaires ----

export interface LoginDto {
  email: string;
  motDePasse: string;
}

export interface CreateVehiculeDto {
  marque: string;
  modele: string;
  annee: number;
  immatriculation: string;
  couleur: string;
  categorie: Categorie;
  kilometrage?: number;
  prixJournalier: number;
  prixSemaine: number;
  description?: string;
}

export interface CreateClientDto {
  nom: string;
  prenom: string;
  email?: string;
  telephone: string;
  adresse?: string;
  typeClient?: TypeClient;
  numeroCNI?: string;
  numeroPasseport?: string;
  permisConduire?: string;
}

export interface CreateReservationDto {
  clientId: string;
  vehiculeId: string;
  dateDebut: string;
  dateFin: string;
  lieuPriseEnCharge: string;
  lieuRetour: string;
  typeTrajet?: TypeTrajet;
  avance?: number;
  notes?: string;
}

export interface CreateContratDto {
  reservationId: string;
  kilometrageDepart: number;
  etatDepart: string;
  caution: number;
}

export interface CreatePaiementDto {
  contratId: string;
  montant: number;
  methode: MethodePaiement;
  reference?: string;
  notes?: string;
}

export interface CreateMaintenanceDto {
  vehiculeId: string;
  type: string;
  description: string;
  cout?: number;
  dateDebut: string;
  dateFin?: string;
}

// ---- Types pour le Dashboard ----

export interface DashboardStats {
  revenusMois: number;
  revenusMoisPrecedent: number;
  vehiculesDisponibles: number;
  vehiculesLoues: number;
  reservationsActives: number;
  tauxOccupation: number;
  nouveauxClients: number;
  paiementsEnAttente: number;
}

export interface RevenusParPeriode {
  periode: string;
  montant: number;
}

export interface VehiculePerformance {
  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  nombreLocations: number;
  revenuTotal: number;
  tauxOccupation: number;
}

export interface AlerteSysteme {
  id: string;
  type: 'MAINTENANCE' | 'PAIEMENT' | 'CAUTION' | 'CONTRAT' | 'RESERVATION';
  message: string;
  severite: 'INFO' | 'WARNING' | 'ERROR';
  lien?: string;
  createdAt: Date;
}

// ---- Filtres de recherche ----

export interface VehiculeFilters {
  statut?: StatutVehicule;
  categorie?: Categorie;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}

export interface ReservationFilters {
  statut?: StatutReservation;
  agentId?: string;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ClientFilters {
  search?: string;
  typeClient?: TypeClient;
  page?: number;
  limit?: number;
}

export interface PaiementFilters {
  methode?: MethodePaiement;
  dateDebut?: string;
  dateFin?: string;
  valide?: boolean;
  page?: number;
  limit?: number;
}
