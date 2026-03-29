// Contexte tenant — charge les infos de branding au démarrage et les injecte dans le CSS
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { publicApi, settingsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface TenantInfo {
  slug: string;
  nomEntreprise: string;
  slogan: string;
  couleurPrimaire: string;
  couleurSecondaire: string;
  logo: string | null;
}

const DEFAULTS: TenantInfo = {
  slug: 'default',
  nomEntreprise: 'Ma Plateforme',
  slogan: 'Location de Véhicules',
  couleurPrimaire: '#1B5E20',
  couleurSecondaire: '#F9A825',
  logo: null,
};

const TenantContext = createContext<TenantInfo>(DEFAULTS);

export function useTenant() {
  return useContext(TenantContext);
}

function lighten(hex: string): string {
  // Génère une couleur légèrement plus claire (+20 sur chaque canal)
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 20);
  const g = Math.min(255, ((n >> 8) & 0xff) + 20);
  const b = Math.min(255, (n & 0xff) + 20);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function applyTheme(couleurPrimaire: string, couleurSecondaire: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', couleurPrimaire);
  root.style.setProperty('--color-primary-light', lighten(couleurPrimaire));
  root.style.setProperty('--color-primary-pale', `${couleurPrimaire}1A`); // 10% opacité
  root.style.setProperty('--color-secondary', couleurSecondaire);
  root.style.setProperty('--color-secondary-dark', couleurSecondaire); // simplifié
  root.style.setProperty('--color-secondary-pale', `${couleurSecondaire}1A`);
}

// Met à jour ou crée une balise <meta> dans le <head>
function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const [attrName, attrValue] = selector.replace('meta[', '').replace(']', '').split('="');
    el.setAttribute(attrName, attrValue.replace('"', ''));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

// Met à jour ou crée la balise <link rel="canonical">
function setCanonical(url: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function applyVitrineSeo(t: TenantInfo) {
  const origin = window.location.origin;
  const title = `${t.nomEntreprise} — ${t.slogan}`;
  const description = `${t.nomEntreprise} : réservez votre véhicule en ligne facilement. `
    + `${t.slogan}. Flotte disponible, tarifs transparents, réservation rapide.`;

  document.title = title;
  setCanonical(origin + '/');
  setMeta('meta[name="description"]',        'content', description);
  setMeta('meta[property="og:title"]',       'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]',         'content', origin + '/');
  setMeta('meta[property="og:site_name"]',   'content', t.nomEntreprise);
  setMeta('meta[property="og:type"]',        'content', 'website');
  setMeta('meta[name="twitter:title"]',      'content', title);
  setMeta('meta[name="twitter:description"]','content', description);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo>(DEFAULTS);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userRole = useAuthStore(state => state.user?.role);

  function fetchTenant(auth: boolean, role: string | undefined) {
    // Super Admin : pas de tenant — titre fixe
    if (auth && role === 'SUPER_ADMIN') {
      document.title = 'InnoSoft Location — Gestion de la Plateforme';
      return;
    }

    // Domaine admin : pas de tenant à résoudre, éviter le 404
    const isAdminDomain = window.location.hostname.startsWith('admin.');
    if (isAdminDomain && !auth) return;

    const fetchFn = auth ? settingsApi.get() : publicApi.getTenantInfo();

    fetchFn
      .then(res => {
        if (res.data?.data) {
          const t: TenantInfo = { ...DEFAULTS, ...res.data.data };
          setTenant(t);
          applyTheme(t.couleurPrimaire, t.couleurSecondaire);
          if (auth) {
            // Back-office : titre simple sans modifier les autres meta
            document.title = `${t.nomEntreprise} — ${t.slogan}`;
          } else {
            // Vitrine publique : mise à jour complète des balises SEO
            applyVitrineSeo(t);
          }
          if (t.slug && t.slug !== 'default') {
            localStorage.setItem('tenantSlug', t.slug);
          }
        }
      })
      .catch(() => { /* Garder les valeurs par défaut */ });
  }

  useEffect(() => {
    fetchTenant(isAuthenticated, userRole);
  }, [isAuthenticated, userRole]);

  // Écoute l'événement global "tenant:updated" pour rafraîchir le branding
  useEffect(() => {
    const handler = () => fetchTenant(isAuthenticated, userRole);
    window.addEventListener('tenant:updated', handler);
    return () => window.removeEventListener('tenant:updated', handler);
  }, [isAuthenticated, userRole]);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}
