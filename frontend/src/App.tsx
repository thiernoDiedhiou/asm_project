// Application principale - Routing et protection des routes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { VitrineLayout } from './layouts/VitrineLayout';

// Vitrine publique
import { LandingPage } from './pages/vitrine/LandingPage';
import { FlottePage } from './pages/vitrine/FlottePage';
import { DemandeReservationPage } from './pages/vitrine/DemandeReservationPage';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

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

// Protection des routes — redirige vers /login si non authentifié
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken } = useAuthStore();
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== Vitrine publique ===== */}
        <Route element={<VitrineLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/flotte" element={<FlottePage />} />
          <Route path="/reserver" element={<DemandeReservationPage />} />
        </Route>

        {/* ===== Auth ===== */}
        <Route path="/login" element={<LoginPage />} />

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

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
