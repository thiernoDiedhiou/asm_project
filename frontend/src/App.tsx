// Application principale - Routing et protection des routes
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { authApi } from './services/api';
import { AppLayout } from './components/layout/AppLayout';
import { VitrineLayout } from './layouts/VitrineLayout';
import { ContratVerifLayout } from './layouts/ContratVerifLayout';

// Vitrine publique
import { LandingPage } from './pages/vitrine/LandingPage';
import { FlottePage } from './pages/vitrine/FlottePage';
import { DemandeReservationPage } from './pages/vitrine/DemandeReservationPage';
import { ContratVerificationPage } from './pages/vitrine/ContratVerificationPage';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Pages principales
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { VehiculesPage } from './pages/vehicules/VehiculesPage';
import { VehiculeFormPage } from './pages/vehicules/VehiculeFormPage';
import { VehiculeDetailPage } from './pages/vehicules/VehiculeDetailPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { ClientFormPage } from './pages/clients/ClientFormPage';
import { ClientDetailPage } from './pages/clients/ClientDetailPage';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { ReservationFormPage } from './pages/reservations/ReservationFormPage';
import { ReservationDetailPage } from './pages/reservations/ReservationDetailPage';
import { ContratsPage } from './pages/contrats/ContratsPage';
import { ContratFormPage } from './pages/contrats/ContratFormPage';
import { ContratDetailPage } from './pages/contrats/ContratDetailPage';
import { ContratCloturePage } from './pages/contrats/ContratCloturePage';
import { PaiementsPage } from './pages/paiements/PaiementsPage';
import { PaiementFormPage } from './pages/paiements/PaiementFormPage';
import { MaintenancesPage } from './pages/maintenances/MaintenancesPage';
import { CalendrierPage } from './pages/calendrier/CalendrierPage';
import { RapportsPage } from './pages/rapports/RapportsPage';
import { ParametresPage } from './pages/parametres/ParametresPage';
import { JournalPage } from './pages/journal/JournalPage';
import { TenantsPage } from './pages/superadmin/TenantsPage';
import { TenantDetailPage } from './pages/superadmin/TenantDetailPage';

// URL du tableau de bord Super Admin (définie dans .env / .env.production)
const SUPERADMIN_URL = import.meta.env.VITE_SUPERADMIN_URL || '/tenants';

// Origin extrait de SUPERADMIN_URL (ex: "https://admin.location.innosft.com")
function getSuperAdminOrigin(): string | null {
  try {
    return new URL(SUPERADMIN_URL).origin;
  } catch {
    return null; // URL relative → pas de redirection inter-domaine
  }
}

// Protection des routes — redirige vers /login si non authentifié, et bloque SUPER_ADMIN
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, user } = useAuthStore();
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }
  // Le SUPER_ADMIN n'a pas de tenant — rediriger vers admin.location.innosft.com/tenants
  if (user?.role === 'SUPER_ADMIN') {
    const adminOrigin = getSuperAdminOrigin();
    if (adminOrigin && window.location.origin !== adminOrigin) {
      window.location.replace(SUPERADMIN_URL);
      return null;
    }
    return <Navigate to="/tenants" replace />;
  }
  return <>{children}</>;
}

// Route super-admin uniquement
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, user } = useAuthStore();
  if (!isAuthenticated || !accessToken) return <Navigate to="/login" replace />;
  if (user?.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Remonte en haut de page à chaque changement de route
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Composant interne qui vérifie périodiquement la validité de la session
function SessionWatcher() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    async function checkSession() {
      try {
        await authApi.me(); // Le intercepteur 403 force le logout automatiquement
      } catch {
        // Erreur 401/403 → déjà géré par l'intercepteur axios (forceLogout)
      }
    }

    // Vérifier au retour sur l'onglet (l'utilisateur revient après suspension)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Vérifier toutes les 60 secondes (même sans interaction)
    const interval = setInterval(checkSession, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SessionWatcher />
      <Routes>
        {/* ===== Vitrine publique ===== */}
        <Route element={<VitrineLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/flotte" element={<FlottePage />} />
          <Route path="/reserver" element={<DemandeReservationPage />} />
          <Route path="/tarifs" element={<FlottePage />} />
        </Route>

        {/* ===== Vérification de contrat (navbar minimale) ===== */}
        <Route element={<ContratVerifLayout />}>
          <Route path="/contrats/verifier/:numero" element={<ContratVerificationPage />} />
        </Route>

        {/* ===== Auth ===== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Raccourci /admin → /login */}
        <Route path="/admin" element={<Navigate to="/login" replace />} />

        {/* ===== Back-office protégé (pathless layout route) ===== */}
        {/* Toutes les routes ci-dessous sont des chemins absolus */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Véhicules */}
          <Route path="/vehicules" element={<VehiculesPage />} />
          <Route path="/vehicules/nouveau" element={<VehiculeFormPage />} />
          <Route path="/vehicules/:id" element={<VehiculeDetailPage />} />
          <Route path="/vehicules/:id/modifier" element={<VehiculeFormPage />} />

          {/* Calendrier */}
          <Route path="/calendrier" element={<CalendrierPage />} />

          {/* Réservations */}
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/reservations/nouvelle" element={<ReservationFormPage />} />
          <Route path="/reservations/:id" element={<ReservationDetailPage />} />

          {/* Clients */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/nouveau" element={<ClientFormPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/clients/:id/modifier" element={<ClientFormPage />} />

          {/* Contrats */}
          <Route path="/contrats" element={<ContratsPage />} />
          <Route path="/contrats/nouveau" element={<ContratFormPage />} />
          <Route path="/contrats/:id" element={<ContratDetailPage />} />
          <Route path="/contrats/:id/cloture" element={<ContratCloturePage />} />

          {/* Paiements */}
          <Route path="/paiements" element={<PaiementsPage />} />
          <Route path="/paiements/nouveau" element={<PaiementFormPage />} />

          {/* Maintenances */}
          <Route path="/maintenances" element={<MaintenancesPage />} />

          {/* Rapports */}
          <Route path="/rapports" element={<RapportsPage />} />

          {/* Paramètres */}
          <Route path="/parametres" element={<ParametresPage />} />

          {/* Journal d'activité */}
          <Route path="/journal" element={<JournalPage />} />
        </Route>

        {/* ===== Super Admin ===== */}
        <Route
          element={
            <SuperAdminRoute>
              <AppLayout />
            </SuperAdminRoute>
          }
        >
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
