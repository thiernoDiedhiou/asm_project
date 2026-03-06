// Store d'authentification avec Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

export type Role = 'ADMIN' | 'AGENT' | 'COMPTABLE';

export interface AuthUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  actif: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ accessToken, refreshToken });
      },

      login: async (email, motDePasse) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, motDePasse);
          const { accessToken, refreshToken, user } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch {
          // Ignorer les erreurs de déconnexion
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      fetchMe: async () => {
        try {
          const response = await authApi.me();
          set({ user: response.data.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'asm-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hooks dérivés pour les permissions
export const useIsAdmin = () =>
  useAuthStore((state) => state.user?.role === 'ADMIN');

export const useIsAgent = () =>
  useAuthStore((state) =>
    state.user?.role === 'AGENT' || state.user?.role === 'ADMIN'
  );

export const useIsComptable = () =>
  useAuthStore((state) =>
    state.user?.role === 'COMPTABLE' || state.user?.role === 'ADMIN'
  );
