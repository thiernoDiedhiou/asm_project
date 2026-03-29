// Sidebar de navigation principale
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Calendar,
  FileText,
  Users,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  X,
  Wrench,
  Activity,
  Building2,
} from 'lucide-react';
import { useAuthStore, useIsAdmin, useIsComptable } from '../../store/authStore';
import { useTenant } from '../../contexts/TenantContext';
import { cn } from '../../utils/cn';
import { API_FILE_BASE } from '../../services/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  comptableAccess?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Véhicules',
    href: '/vehicules',
    icon: Car,
  },
  {
    label: 'Calendrier',
    href: '/calendrier',
    icon: Calendar,
  },
  {
    label: 'Réservations',
    href: '/reservations',
    icon: FileText,
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    label: 'Contrats',
    href: '/contrats',
    icon: FileText,
  },
  {
    label: 'Paiements',
    href: '/paiements',
    icon: Receipt,
  },
  {
    label: 'Maintenances',
    href: '/maintenances',
    icon: Wrench,
  },
  {
    label: 'Rapports',
    href: '/rapports',
    icon: BarChart3,
    comptableAccess: true,
  },
  {
    label: 'Paramètres',
    href: '/parametres',
    icon: Settings,
    adminOnly: true,
  },
  {
    label: 'Journal d\'activité',
    href: '/journal',
    icon: Activity,
    adminOnly: true,
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, user } = useAuthStore();
  const isAdmin = useIsAdmin();
  const isComptable = useIsComptable();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const tenant = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavItems = isSuperAdmin
    ? [
        { label: 'Tenants',        href: '/tenants',        icon: Building2 },
        { label: 'Flotte globale', href: '/flotte-globale', icon: Car       },
      ]
    : navItems.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.comptableAccess && !isComptable && !isAdmin) return false;
        return true;
      });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-asm-vert flex flex-col transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* En-tête — logo cliquable → accueil */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <button
            type="button"
            onClick={() => { navigate(isSuperAdmin ? '/tenants' : '/dashboard'); onClose(); }}
            className="text-left hover:opacity-80 transition-opacity flex items-center gap-2.5"
            aria-label={isSuperAdmin ? 'Aller aux tenants' : 'Aller au tableau de bord'}
          >
            {!isSuperAdmin && tenant.logo ? (
              <img
                src={`${API_FILE_BASE}${tenant.logo}`}
                alt={tenant.nomEntreprise}
                className="h-9 w-auto max-w-[120px] object-contain rounded"
              />
            ) : (
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">
                  {isSuperAdmin ? 'Super Admin' : tenant.nomEntreprise}
                </h1>
                <p className="text-asm-or text-xs font-medium">
                  {isSuperAdmin ? 'Gestion des Tenants' : tenant.slogan}
                </p>
              </div>
            )}
          </button>
          <button
            aria-label="Fermer le menu"
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white p-1 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-asm-or text-asm-vert'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-asm-vert' : 'text-white/70'
                      )}
                    />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Déconnexion */}
        <div className="p-3 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 text-white/70" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
