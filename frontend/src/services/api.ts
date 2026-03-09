// Client API Axios avec gestion automatique des tokens JWT
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Convertit un chemin relatif /uploads/... en URL absolue vers le backend
export const getUploadUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = BASE_URL.replace(/\/api$/, '');
  return `${backendBase}${path}`;
};

// Instance Axios principale
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Flag pour éviter les boucles d'appels au refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur: ajout automatique du token Bearer
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur: rafraîchissement automatique du token expiré
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Pas de refresh token, rediriger vers login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ---- Fonctions API par module ----

// Auth
export const authApi = {
  login: (email: string, motDePasse: string) =>
    api.post('/auth/login', { email, motDePasse }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Véhicules
export const vehiculesApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/vehicules', { params }),
  getById: (id: string) => api.get(`/vehicules/${id}`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post('/vehicules', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/vehicules/${id}`, data),
  delete: (id: string) => api.delete(`/vehicules/${id}`),
  checkDisponibilite: (id: string, debut: string, fin: string) =>
    api.get(`/vehicules/${id}/disponibilite`, { params: { debut, fin } }),
  uploadPhotos: (id: string, formData: FormData) =>
    api.post(`/vehicules/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Clients
export const clientsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/clients', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  getHistorique: (id: string) => api.get(`/clients/${id}/historique`),
  create: (data: Record<string, unknown>) => api.post('/clients', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/clients/${id}`, data),
};

// Réservations
export const reservationsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/reservations', { params }),
  getCalendrier: (mois: number, annee: number) =>
    api.get('/reservations/calendrier', { params: { mois, annee } }),
  getById: (id: string) => api.get(`/reservations/${id}`),
  create: (data: Record<string, unknown>) => api.post('/reservations', data),
  updateStatut: (id: string, data: Record<string, unknown>) =>
    api.put(`/reservations/${id}/statut`, data),
  delete: (id: string) => api.delete(`/reservations/${id}`),
};

// Contrats
export const contratsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/contrats', { params }),
  getById: (id: string) => api.get(`/contrats/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contrats', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/contrats/${id}`, data),
  generatePdf: (id: string) =>
    api.get(`/contrats/${id}/pdf`, { responseType: 'blob' }),
  cloture: (id: string, data: Record<string, unknown>) =>
    api.post(`/contrats/${id}/cloture`, data),
};

// Paiements
export const paiementsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/paiements', { params }),
  getByContrat: (contratId: string) =>
    api.get(`/paiements/contrat/${contratId}`),
  create: (data: Record<string, unknown>) => api.post('/paiements', data),
  valider: (id: string, valide: boolean) =>
    api.put(`/paiements/${id}/valider`, { valide }),
  getStats: (params?: Record<string, unknown>) =>
    api.get('/paiements/stats', { params }),
  generateRecu: (id: string) =>
    api.get(`/paiements/${id}/recu`, { responseType: 'blob' }),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRevenus: (periode?: string) =>
    api.get('/dashboard/revenus', { params: { periode } }),
  getVehiculesPerformance: () => api.get('/dashboard/vehicules/performance'),
  getAlertes: () => api.get('/dashboard/alertes'),
  getRecentesReservations: () =>
    api.get('/dashboard/reservations/recentes'),
};

// Maintenances
export const maintenancesApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/maintenances', { params }),
  create: (data: Record<string, unknown>) => api.post('/maintenances', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/maintenances/${id}`, data),
};

// Utilisateurs (Admin)
export const usersApi = {
  getAll: () => api.get('/users'),
};

// Journal d'activité (admin uniquement)
export const journalApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/journal', { params }),
  getUsers: () => api.get('/journal/users'),
  getStats: (params?: Record<string, unknown>) => api.get('/journal/stats', { params }),
};

// API publique vitrine (sans token — le même intercepteur s'applique mais sans token si non connecté)
export const publicApi = {
  getVehicules: () => api.get('/public/vehicules'),
  getZones: () => api.get('/public/zones'),
  createDemande: (data: Record<string, unknown>) =>
    api.post('/public/reservation', data),
  getSettings: () => api.get('/settings'),
};

// Zones tarifaires
export const tarifZonesApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/tarif-zones', { params }),
  create: (data: Record<string, unknown>) => api.post('/tarif-zones', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/tarif-zones/${id}`, data),
  delete: (id: string) => api.delete(`/tarif-zones/${id}`),
};

// Matrice tarifaire (catégorie × zone)
export const tarificationApi = {
  getMatrix: () => api.get('/tarification'),
  updateCell: (id: string, data: { prixJournalier: number; prixSemaine?: number | null }) =>
    api.put(`/tarification/${id}`, data),
};

// Paramètres de l'entreprise (admin)
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.put('/settings', data),
};

export default api;
