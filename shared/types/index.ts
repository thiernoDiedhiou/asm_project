// ============================================================
// TYPES PARTAGÉS — Plateforme SaaS Multi-Tenant
// Source de vérité unique : backend + frontend
// Synchronisé avec prisma/schema.prisma
// Dernière mise à jour : Mars 2026
// ============================================================

// ============================================================
// ENUMS — Miroir exact du schema Prisma
// ============================================================

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN', // Administrateur plateforme (Innosoft Creation)
  ADMIN       = 'ADMIN',       // Administrateur d'un tenant
  AGENT       = 'AGENT',
  COMPTABLE   = 'COMPTABLE',
}

export enum Categorie {
  ECONOMIQUE  = 'ECONOMIQUE',
  STANDARD    = 'STANDARD',
  SUV         = 'SUV',
  LUXE        = 'LUXE',
  UTILITAIRE  = 'UTILITAIRE',
}

export enum StatutVehicule {
  DISPONIBLE      = 'DISPONIBLE',
  LOUE            = 'LOUE',
  EN_MAINTENANCE  = 'EN_MAINTENANCE',
  HORS_SERVICE    = 'HORS_SERVICE',
}

export enum TypeClient {
  PARTICULIER = 'PARTICULIER',
  ENTREPRISE  = 'ENTREPRISE',
  VIP         = 'VIP',
}

export enum StatutReservation {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE  = 'CONFIRMEE',
  EN_COURS   = 'EN_COURS',
  TERMINEE   = 'TERMINEE',
  ANNULEE    = 'ANNULEE',
}

export enum TypeTrajet {
  LOCATION           = 'LOCATION',
  TRANSFERT_AEROPORT = 'TRANSFERT_AEROPORT',
  LONGUE_DUREE       = 'LONGUE_DUREE',
}

export enum StatutContrat {
  ACTIF   = 'ACTIF',
  TERMINE = 'TERMINE',
  LITIGE  = 'LITIGE',
}

export enum MethodePaiement {
  ESPECES      = 'ESPECES',
  WAVE         = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  FREE_MONEY   = 'FREE_MONEY',
  VIREMENT     = 'VIREMENT',
  CHEQUE       = 'CHEQUE',
}

export enum StatutMaintenance {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS  = 'EN_COURS',
  TERMINEE  = 'TERMINEE',
}

// Types plan SaaS (stockés en String dans Prisma, pas enum)
export type PlanType         = 'STARTER' | 'PRO' | 'ENTERPRISE';
export type StatutAbonnement = 'ACTIF' | 'EXPIRE' | 'SUSPENDU';

// ============================================================
// INTERFACES — PLATEFORME (Super Admin / SaaS)
// ============================================================

/** Tenant = entreprise cliente de la plateforme */
export interface Tenant {
  id:                string;
  slug:              string;        // "asm", "boucotteauto"
  domaine:           string | null; // domaine custom optionnel
  nomEntreprise:     string;
  slogan:            string;
  activite:          string;
  couleurPrimaire:   string;
  couleurSecondaire: string;
  logo:              string | null;
  actif:             boolean;
  // Abonnement
  planType:          PlanType;
  montantMensuel:    number | null;
  dateExpiration:    Date | null;
  statutAbonnement:  StatutAbonnement;
  createdAt:         Date;
  updatedAt:         Date;
}

/** Configuration d'un plan tarifaire SaaS (géré par Super Admin) */
export interface PlanConfig {
  id:             string;
  code:           PlanType;
  nom:            string;
  description:    string | null;
  montantMensuel: number;
  montantAnnuel:  number | null;
  maxAgents:      number;
  maxVehicules:   number;
  features:       string[];
  actif:          boolean;
  createdAt:      Date;
  updatedAt:      Date;
}

/** Paiement d'abonnement SaaS d'un tenant */
export interface PaiementAbonnement {
  id:        string;
  tenantId:  string;
  tenant?:   Tenant;
  montant:   number;
  methode:   string;
  reference: string | null;
  periode:   string; // "2026-03"
  notes:     string | null;
  pdfUrl:    string | null;
  createdAt: Date;
}

// ============================================================
// INTERFACES — MÉTIER (par tenant)
// ============================================================

export interface User {
  id:               string;
  nom:              string;
  prenom:           string;
  email:            string;
  telephone:        string | null;
  role:             Role;
  actif:            boolean;
  tenantId:         string | null; // null pour SUPER_ADMIN
  resetToken?:      string | null; // jamais exposé en API, ici pour typage interne
  resetTokenExpiry?: Date | null;
  createdAt:        Date;
  updatedAt:        Date;
}

export interface Vehicule {
  id:             string;
  marque:         string;
  modele:         string;
  annee:          number;
  immatriculation: string;
  couleur:        string;
  categorie:      Categorie;
  kilometrage:    number;
  prixJournalier: number;
  prixSemaine:    number;
  statut:         StatutVehicule;
  photos:         string[];
  description:    string | null;
  tenantId:       string;
  createdAt:      Date;
  updatedAt:      Date;
}

export interface Client {
  id:              string;
  nom:             string;
  prenom:          string;
  email:           string | null;
  telephone:       string;
  adresse:         string | null;
  typeClient:      TypeClient;
  societe:         string | null;
  numeroCNI:       string | null;
  numeroPasseport: string | null;
  permisConduire:  string | null;
  notes:           string | null;
  tenantId:        string;
  createdAt:       Date;
  updatedAt:       Date;
}

export interface TarifZone {
  id:             string;
  nom:            string;
  actif:          boolean;
  tenantId:       string;
  prixCategories?: PrixCategorie[];
  createdAt:      Date;
  updatedAt:      Date;
}

export interface PrixCategorie {
  id:             string;
  categorie:      Categorie;
  zoneId:         string;
  zone?:          TarifZone;
  prixJournalier: number;
  prixSemaine:    number | null;
  tenantId:       string;
  createdAt:      Date;
  updatedAt:      Date;
}

export interface Reservation {
  id:                string;
  numeroReservation: string;
  clientId:          string;
  client?:           Client;
  vehiculeId:        string;
  vehicule?:         Vehicule;
  dateDebut:         Date;
  dateFin:           Date;
  lieuPriseEnCharge: string;
  lieuRetour:        string;
  nombreJours:       number;
  prixTotal:         number;
  avance:            number;
  statut:            StatutReservation;
  typeTrajet:        TypeTrajet;
  notes:             string | null;
  agentId:           string;
  agent?:            User;
  zoneId:            string | null;
  zone?:             TarifZone;
  contrat?:          Contrat;
  tenantId:          string;
  createdAt:         Date;
  updatedAt:         Date;
}

export interface Contrat {
  id:               string;
  numeroContrat:    string;
  reservationId:    string;
  reservation?:     Reservation;
  clientId:         string;
  client?:          Client;
  agentId:          string;
  agent?:           User;
  dateSignature:    Date;
  kilometrageDepart:  number;
  kilometrageRetour:  number | null;
  etatDepart:       string;
  etatRetour:       string | null;
  caution:          number;
  cautionRendue:    boolean;
  notes:            string | null;
  paiements?:       Paiement[];
  statut:           StatutContrat;
  pdfUrl:           string | null;
  tenantId:         string;
  createdAt:        Date;
  updatedAt:        Date;
}

export interface Paiement {
  id:           string;
  contratId:    string;
  contrat?:     Contrat;
  montant:      number;
  methode:      MethodePaiement;
  reference:    string | null;
  datePaiement: Date;
  notes:        string | null;
  valide:       boolean;
  tenantId:     string;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface Maintenance {
  id:          string;
  vehiculeId:  string;
  vehicule?:   Vehicule;
  type:        string;
  description: string;
  cout:        number | null;
  dateDebut:   Date;
  dateFin:     Date | null;
  statut:      StatutMaintenance;
  tenantId:    string;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface Parametre {
  id:             string;
  tenantId:       string;
  nomEntreprise:  string;
  slogan:         string;
  activite:       string;
  telephone:      string;
  telephone2:     string;
  email:          string;
  adresse:        string;
  ville:          string;
  rccm:           string;
  ninea:          string;
  heuresLunVen:   string;
  heuresSamedi:   string;
  noteTransfert:  string;
  bannierePromo:  string | null;
  promoSousTexte: string | null;
  promoReduction: string | null;
  promoDateFin:   string | null;
  logo?:          string | null; // hérité du Tenant
  updatedAt:      Date;
}

export interface JournalActivite {
  id:        string;
  userId:    string;
  userNom:   string;
  userRole:  string;
  action:    string;
  entite:    string;
  entiteId:  string | null;
  details:   Record<string, unknown> | null;
  tenantId:  string;
  createdAt: Date;
}

// ============================================================
// RÉPONSES API
// ============================================================

export interface ApiResponse<T = unknown> {
  success:    boolean;
  data?:      T;
  message?:   string;
  errors?:    string[];
  pagination?: Pagination;
}

export interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  user: Pick<User, 'id' | 'nom' | 'prenom' | 'email' | 'telephone' | 'role' | 'actif' | 'tenantId'>;
}

// ============================================================
// DTOs — Données envoyées par les formulaires vers l'API
// ============================================================

// Auth
export interface LoginDto {
  email:      string;
  motDePasse: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token:            string;
  nouveauMotDePasse: string;
}

export interface ChangePasswordDto {
  motDePasseActuel:  string;
  nouveauMotDePasse: string;
}

// Tenant (Super Admin)
export interface CreateTenantDto {
  nomEntreprise:     string;
  slug:              string;
  domaine?:          string;
  slogan?:           string;
  couleurPrimaire?:  string;
  couleurSecondaire?: string;
  planType?:         PlanType;
  montantMensuel?:   number;
  dateExpiration?:   string;
  // Admin du tenant
  adminPrenom:       string;
  adminNom:          string;
  adminEmail:        string;
  adminTelephone?:   string;
}

export interface UpdateTenantDto {
  nomEntreprise?:    string;
  slogan?:           string;
  domaine?:          string;
  couleurPrimaire?:  string;
  couleurSecondaire?: string;
  actif?:            boolean;
  planType?:         PlanType;
  montantMensuel?:   number;
  dateExpiration?:   string;
  statutAbonnement?: StatutAbonnement;
}

// Véhicule
export interface CreateVehiculeDto {
  marque:         string;
  modele:         string;
  annee:          number;
  immatriculation: string;
  couleur:        string;
  categorie:      Categorie;
  kilometrage?:   number;
  prixJournalier: number;
  prixSemaine:    number;
  description?:   string;
}

export type UpdateVehiculeDto = Partial<CreateVehiculeDto>;

// Client
export interface CreateClientDto {
  nom:             string;
  prenom:          string;
  email?:          string;
  telephone:       string;
  adresse?:        string;
  typeClient?:     TypeClient;
  societe?:        string;
  numeroCNI?:      string;
  numeroPasseport?: string;
  permisConduire?: string;
  notes?:          string;
}

export type UpdateClientDto = Partial<CreateClientDto>;

// Réservation
export interface CreateReservationDto {
  clientId:          string;
  vehiculeId:        string;
  dateDebut:         string;
  dateFin:           string;
  lieuPriseEnCharge: string;
  lieuRetour:        string;
  typeTrajet?:       TypeTrajet;
  zoneId?:           string;
  avance?:           number;
  notes?:            string;
}

export type UpdateReservationDto = Partial<CreateReservationDto> & {
  statut?: StatutReservation;
};

// Contrat
export interface CreateContratDto {
  reservationId:    string;
  kilometrageDepart: number;
  etatDepart:       string;
  caution:          number;
  notes?:           string;
}

// Paiement
export interface CreatePaiementDto {
  contratId:  string;
  montant:    number;
  methode:    MethodePaiement;
  reference?: string;
  notes?:     string;
}

// Maintenance
export interface CreateMaintenanceDto {
  vehiculeId:  string;
  type:        string;
  description: string;
  cout?:       number;
  dateDebut:   string;
  dateFin?:    string;
}

export type UpdateMaintenanceDto = Partial<CreateMaintenanceDto> & {
  statut?: StatutMaintenance;
};

// Tarification
export interface UpsertPrixCategorieDto {
  categorie:      Categorie;
  zoneId:         string;
  prixJournalier: number;
  prixSemaine?:   number;
}

// ============================================================
// DASHBOARD & ANALYTICS
// ============================================================

export interface DashboardStats {
  revenusMois:          number;
  revenusMoisPrecedent: number;
  vehiculesDisponibles: number;
  vehiculesLoues:       number;
  vehiculesEnMaintenance: number;
  totalVehicules:       number;
  reservationsActives:  number;
  totalClients:         number;
  tauxOccupation:       number;
  nouveauxClients:      number;
  paiementsEnAttente:   number;
}

export interface RevenusParPeriode {
  periode: string;
  montant: number;
}

export interface VehiculePerformance {
  vehiculeId:     string;
  immatriculation: string;
  marque:         string;
  modele:         string;
  nombreLocations: number;
  revenuTotal:    number;
  tauxOccupation: number;
}

export interface AlerteSysteme {
  id:        string;
  type:      'MAINTENANCE' | 'PAIEMENT' | 'CAUTION' | 'CONTRAT' | 'RESERVATION';
  message:   string;
  severite:  'INFO' | 'WARNING' | 'ERROR';
  lien?:     string;
  createdAt: Date;
}

// Stats Super Admin
export interface SuperAdminStats {
  totalTenants:     number;
  tenantsActifs:    number;
  totalVehicules:   number;
  totalReservations: number;
  totalClients:     number;
  revenusMois:      number;
  revenusMoisPrecedent: number;
  totalMaintenances: number;
}

// ============================================================
// FILTRES DE RECHERCHE
// ============================================================

export interface PaginationParams {
  page?:  number;
  limit?: number;
}

export interface VehiculeFilters extends PaginationParams {
  statut?:    StatutVehicule;
  categorie?: Categorie;
  dateDebut?: string;
  dateFin?:   string;
  search?:    string;
}

export interface ReservationFilters extends PaginationParams {
  statut?:    StatutReservation;
  agentId?:   string;
  dateDebut?: string;
  dateFin?:   string;
  search?:    string;
}

export interface ClientFilters extends PaginationParams {
  search?:     string;
  typeClient?: TypeClient;
}

export interface PaiementFilters extends PaginationParams {
  methode?:   MethodePaiement;
  dateDebut?: string;
  dateFin?:   string;
  valide?:    boolean;
}

export interface MaintenanceFilters extends PaginationParams {
  statut?:     StatutMaintenance;
  vehiculeId?: string;
  dateDebut?:  string;
  dateFin?:    string;
}

export interface JournalFilters extends PaginationParams {
  userId?:    string;
  action?:    string;
  entite?:    string;
  dateDebut?: string;
  dateFin?:   string;
}

export interface TenantFilters extends PaginationParams {
  search?:           string;
  planType?:         PlanType;
  statutAbonnement?: StatutAbonnement;
  actif?:            boolean;
}
