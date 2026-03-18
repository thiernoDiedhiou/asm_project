// Page super-admin — gestion complète SaaS multi-tenant
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Users, Car, Calendar, CheckCircle, XCircle,
  Globe, Palette, Pencil, BookOpen, LogIn, Search, Filter,
  TrendingUp, Wrench, CreditCard, AlertTriangle, X, Download, Eye, Settings,
  BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { useQuery } from '../../components/hooks/useQuery';
import { api, API_FILE_BASE } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatFCFA } from '../../utils/format';

// ---- Types ----

interface Tenant {
  id: string;
  slug: string;
  domaine: string | null;
  nomEntreprise: string;
  slogan: string;
  couleurPrimaire: string;
  couleurSecondaire: string;
  logo: string | null;
  actif: boolean;
  planType: string;
  montantMensuel: number | null;
  dateExpiration: string | null;
  statutAbonnement: string;
  createdAt: string;
  _count: { users: number; vehicules: number; reservations: number };
}

interface PlatformStats {
  totalTenants: number;
  tenantsActifs: number;
  totalVehicules: number;
  totalReservations: number;
  totalClients: number;
  totalMaintenances: number;
  revenusMois: number;
  revenusMoisPrec: number;
  croissanceMRR: number | null;
}

interface JournalEntry {
  id: string;
  userId: string;
  userNom: string;
  userRole: string;
  action: string;
  entite: string;
  details: Record<string, unknown> | null;
  tenantId: string;
  createdAt: string;
  tenant: { nomEntreprise: string; couleurPrimaire: string };
}

interface MrrStats {
  mrrParMois: { mois: string; mrr: number }[];
  topTenants: { id: string; nomEntreprise: string; total: number }[];
  churnCount: number;
  tauxChurn: number;
}

interface PlanConfig {
  id: string; code: string; nom: string; description: string | null;
  montantMensuel: number; montantAnnuel: number | null;
  maxAgents: number; maxVehicules: number; features: string[]; actif: boolean;
}

interface CreateForm {
  slug: string; nomEntreprise: string; slogan: string; domaine: string;
  couleurPrimaire: string; couleurSecondaire: string;
  adminEmail: string; adminPassword: string; adminNom: string; adminPrenom: string;
  planType: string; montantMensuel: string; dateExpiration: string;
}

interface EditForm {
  nomEntreprise: string; slogan: string; couleurPrimaire: string;
  couleurSecondaire: string; domaine: string;
  planType: string; montantMensuel: string; dateExpiration: string; statutAbonnement: string;
}

// ---- Constantes ----

const EMPTY_CREATE: CreateForm = {
  slug: '', nomEntreprise: '', slogan: 'Location de Véhicules', domaine: '',
  couleurPrimaire: '#1B5E20', couleurSecondaire: '#F9A825',
  adminEmail: '', adminPassword: '', adminNom: '', adminPrenom: '',
  planType: 'STARTER', montantMensuel: '', dateExpiration: '',
};

const PLAN_LABELS: Record<string, string> = { STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Enterprise' };
const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-600',
  PRO: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};
const STATUT_COLORS: Record<string, string> = {
  ACTIF: 'bg-green-100 text-green-700',
  EXPIRE: 'bg-red-100 text-red-700',
  SUSPENDU: 'bg-orange-100 text-orange-700',
};

// ---- Composant ----

export function TenantsPage() {
  const navigate = useNavigate();
  const { setTokens, fetchMe } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'tenants' | 'analytiques' | 'journal' | 'plans'>('tenants');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    nomEntreprise: '', slogan: '', couleurPrimaire: '#1B5E20', couleurSecondaire: '#F9A825',
    domaine: '', planType: 'STARTER', montantMensuel: '', dateExpiration: '', statutAbonnement: 'ACTIF',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [confirmImpersonate, setConfirmImpersonate] = useState<Tenant | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Queries
  const { data, isLoading, refetch } = useQuery(['tenants'], () => api.get('/tenants'));
  const { data: statsData } = useQuery(['platform-stats'], () => api.get('/tenants/stats'));
  const { data: mrrData, isLoading: loadingMrr } = useQuery(
    ['mrr-stats'],
    () => api.get('/tenants/mrr'),
    { enabled: activeTab === 'analytiques' }
  );
  const { data: journalData, isLoading: loadingJournal } = useQuery(
    ['global-journal'],
    () => api.get('/tenants/journal?limit=50'),
    { enabled: activeTab === 'journal' }
  );
  const { data: plansData, refetch: refetchPlans } = useQuery(
    ['plans'],
    () => api.get('/tenants/plans'),
    { enabled: activeTab === 'plans' }
  );

  const allTenants: Tenant[] = data?.data ?? [];
  const stats: PlatformStats | null = statsData?.data ?? null;
  const mrrStats: MrrStats | null = mrrData?.data ?? null;
  const journalEntries: JournalEntry[] = journalData?.data ?? [];
  const plans: PlanConfig[] = plansData?.data ?? [];

  // Plans: état édition inline
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planForms, setPlanForms] = useState<Record<string, Partial<PlanConfig>>>({});
  const [savingPlan, setSavingPlan] = useState(false);

  // Filtrage local
  const tenants = allTenants.filter(t => {
    const matchSearch = !searchQuery || t.nomEntreprise.toLowerCase().includes(searchQuery.toLowerCase()) || t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlan = !filterPlan || t.planType === filterPlan;
    const matchStatut = !filterStatut || t.statutAbonnement === filterStatut;
    return matchSearch && matchPlan && matchStatut;
  });

  // Alerte expiration (< 30 jours)
  function isExpiringSoon(tenant: Tenant): boolean {
    if (!tenant.dateExpiration) return false;
    const diff = new Date(tenant.dateExpiration).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }
  function isExpired(tenant: Tenant): boolean {
    if (!tenant.dateExpiration) return false;
    return new Date(tenant.dateExpiration).getTime() < Date.now();
  }

  // ---- Handlers ----

  function openEdit(tenant: Tenant) {
    setEditTenant(tenant);
    setEditForm({
      nomEntreprise: tenant.nomEntreprise,
      slogan: tenant.slogan,
      couleurPrimaire: tenant.couleurPrimaire,
      couleurSecondaire: tenant.couleurSecondaire,
      domaine: tenant.domaine ?? '',
      planType: tenant.planType ?? 'STARTER',
      montantMensuel: tenant.montantMensuel ? String(tenant.montantMensuel) : '',
      dateExpiration: tenant.dateExpiration ? tenant.dateExpiration.slice(0, 10) : '',
      statutAbonnement: tenant.statutAbonnement ?? 'ACTIF',
    });
    setEditError('');
  }

  async function handleEdit() {
    if (!editTenant) return;
    setEditSaving(true); setEditError('');
    try {
      await api.put(`/tenants/${editTenant.id}`, {
        ...editForm,
        montantMensuel: editForm.montantMensuel ? parseFloat(editForm.montantMensuel) : null,
        dateExpiration: editForm.dateExpiration || null,
      });
      setEditTenant(null);
      refetch();
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleCreate() {
    if (!createForm.slug || !createForm.nomEntreprise || !createForm.adminEmail || !createForm.adminPassword) {
      setCreateError('Slug, nom, email admin et mot de passe sont obligatoires.');
      return;
    }
    setCreateSaving(true); setCreateError('');
    try {
      await api.post('/tenants', {
        ...createForm,
        montantMensuel: createForm.montantMensuel ? parseFloat(createForm.montantMensuel) : null,
        dateExpiration: createForm.dateExpiration || null,
      });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      refetch();
    } catch (err: unknown) {
      setCreateError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur lors de la création');
    } finally {
      setCreateSaving(false);
    }
  }

  function exportCSV() {
    const headers = ['Nom', 'Slug', 'Domaine', 'Plan', 'Statut', 'Montant/mois', 'Expiration', 'Actif', 'Utilisateurs', 'Véhicules', 'Réservations', 'Créé le'];
    const rows = allTenants.map(t => [
      t.nomEntreprise,
      t.slug,
      t.domaine ?? '',
      t.planType,
      t.statutAbonnement,
      t.montantMensuel ?? '',
      t.dateExpiration ? t.dateExpiration.slice(0, 10) : '',
      t.actif ? 'Oui' : 'Non',
      t._count.users,
      t._count.vehicules,
      t._count.reservations,
      t.createdAt.slice(0, 10),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleToggleConfirmed() {
    if (!confirmToggle) return;
    try {
      await api.put(`/tenants/${confirmToggle.id}`, { actif: !confirmToggle.actif });
      setConfirmToggle(null);
      refetch();
    } catch { /* ignore */ }
  }

  async function handleImpersonate() {
    if (!confirmImpersonate) return;
    setImpersonating(true);
    try {
      const res = await api.post(`/tenants/${confirmImpersonate.id}/impersonate`, {});
      const { accessToken, refreshToken } = res.data.data;
      setTokens(accessToken, refreshToken);
      await fetchMe();
      navigate('/dashboard');
    } catch {
      setConfirmImpersonate(null);
    } finally {
      setImpersonating(false);
    }
  }

  function startEditPlan(plan: PlanConfig) {
    setEditingPlan(plan.code);
    setPlanForms(prev => ({ ...prev, [plan.code]: { ...plan, features: [...plan.features] } }));
  }

  async function savePlan(code: string) {
    setSavingPlan(true);
    try {
      const form = planForms[code];
      await api.put(`/tenants/plans/${code}`, {
        ...form,
        montantMensuel: form.montantMensuel ? parseFloat(String(form.montantMensuel)) : undefined,
        montantAnnuel: form.montantAnnuel ? parseFloat(String(form.montantAnnuel)) : null,
        maxAgents: form.maxAgents ? parseInt(String(form.maxAgents)) : undefined,
        maxVehicules: form.maxVehicules ? parseInt(String(form.maxVehicules)) : undefined,
      });
      setEditingPlan(null);
      refetchPlans();
    } catch { /* ignore */ } finally {
      setSavingPlan(false);
    }
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Toutes les entreprises clientes de la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-asm-vert/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouveau tenant
          </button>
        </div>
      </div>

      {/* KPIs plateforme */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { icon: Building2, label: 'Tenants actifs', value: `${stats.tenantsActifs} / ${stats.totalTenants}`, color: 'text-asm-vert', sub: null },
            { icon: Car, label: 'Véhicules', value: stats.totalVehicules, color: 'text-blue-600', sub: null },
            { icon: Calendar, label: 'Réservations', value: stats.totalReservations, color: 'text-purple-600', sub: null },
            { icon: Users, label: 'Clients', value: stats.totalClients, color: 'text-orange-500', sub: null },
            {
              icon: TrendingUp,
              label: 'Revenus ce mois',
              value: formatFCFA(stats.revenusMois),
              color: stats.croissanceMRR !== null && stats.croissanceMRR >= 0 ? 'text-green-600' : 'text-red-500',
              sub: stats.revenusMoisPrec > 0
                ? `Mois préc. : ${formatFCFA(stats.revenusMoisPrec)} ${stats.croissanceMRR !== null ? (stats.croissanceMRR >= 0 ? `▲ ${stats.croissanceMRR}%` : `▼ ${Math.abs(stats.croissanceMRR)}%`) : ''}`
                : 'Aucun revenu le mois dernier',
            },
            { icon: Wrench, label: 'Maintenances', value: stats.totalMaintenances, color: 'text-red-500', sub: null },
          ].map(({ icon: Icon, label, value, color, sub }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-0.5">
              <Icon className={`h-4 w-4 ${color}`} />
              <div className="text-lg font-bold text-gray-900 mt-0.5">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
              {sub && <div className={`text-xs mt-0.5 ${color}`}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'tenants' as const, label: 'Tenants', Icon: Building2 },
          { key: 'analytiques' as const, label: 'Analytiques', Icon: BarChart2 },
          { key: 'journal' as const, label: 'Journal Global', Icon: BookOpen },
          { key: 'plans' as const, label: 'Plans & Tarifs', Icon: Settings },
        ]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'border-asm-vert text-asm-vert'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Tenants */}
      {activeTab === 'tenants' && (
        isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>
        ) : (
          <>
          {/* Barre recherche + filtres */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un tenant..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} aria-label="Filtrer par plan"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white">
                <option value="">Tous les plans</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} aria-label="Filtrer par statut"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white">
                <option value="">Tous les statuts</option>
                <option value="ACTIF">Actif</option>
                <option value="EXPIRE">Expiré</option>
                <option value="SUSPENDU">Suspendu</option>
              </select>
            </div>
            {(searchQuery || filterPlan || filterStatut) && (
              <button onClick={() => { setSearchQuery(''); setFilterPlan(''); setFilterStatut(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <X className="h-3 w-3" /> Réinitialiser
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{tenants.length} tenant{tenants.length > 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tenants.map(tenant => (
              <div key={tenant.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border ${isExpired(tenant) ? 'border-red-300' : isExpiringSoon(tenant) ? 'border-orange-300' : 'border-gray-100'}`}>
                <div className="h-2" style={{ backgroundColor: tenant.couleurPrimaire }} />
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {tenant.logo ? (
                        <img
                          src={`${API_FILE_BASE}${tenant.logo}`}
                          alt={tenant.nomEntreprise}
                          className="h-10 w-16 object-contain rounded-lg bg-gray-50 border border-gray-100 p-1"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.couleurPrimaire}20` }}>
                          <Building2 className="h-5 w-5" style={{ color: tenant.couleurPrimaire }} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-900">{tenant.nomEntreprise}</h3>
                        <p className="text-xs text-gray-500">{tenant.slogan}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(tenant)} title="Modifier" className="text-gray-400 hover:text-asm-vert p-1 rounded" aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirmToggle(tenant)} title={tenant.actif ? 'Désactiver' : 'Activer'} className="text-gray-400 hover:text-gray-600" aria-label={tenant.actif ? 'Désactiver' : 'Activer'}>
                        {tenant.actif ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Plan & statut abonnement */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[tenant.planType] ?? PLAN_COLORS.STARTER}`}>
                      {PLAN_LABELS[tenant.planType] ?? tenant.planType}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_COLORS[tenant.statutAbonnement] ?? STATUT_COLORS.ACTIF}`}>
                      {tenant.statutAbonnement}
                    </span>
                    {tenant.montantMensuel && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> {formatFCFA(tenant.montantMensuel)}/mois
                      </span>
                    )}
                    {tenant.dateExpiration && (
                      <span className={`text-xs flex items-center gap-1 font-medium ${isExpired(tenant) ? 'text-red-600' : isExpiringSoon(tenant) ? 'text-orange-500' : 'text-gray-400'}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {isExpired(tenant) ? 'Expiré le' : 'Exp.'} {formatDate(tenant.dateExpiration)}
                      </span>
                    )}
                  </div>

                  {/* Domaines */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="font-mono">{tenant.slug}.votre-plateforme.sn</span>
                    </div>
                    {tenant.domaine && (
                      <div className="flex items-center gap-1.5 text-asm-vert">
                        <Globe className="h-3.5 w-3.5" />
                        <span className="font-mono">{tenant.domaine}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { icon: Users, label: 'Agents', count: tenant._count.users },
                      { icon: Car, label: 'Véhicules', count: tenant._count.vehicules },
                      { icon: Calendar, label: 'Réservations', count: tenant._count.reservations },
                    ].map(({ label, count }) => (
                      <div key={label} className="bg-gray-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-gray-900">{count}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Couleurs + bouton accéder */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Palette className="h-3.5 w-3.5" />
                      <span className="inline-block h-4 w-8 rounded" style={{ backgroundColor: tenant.couleurPrimaire }} />
                      <span className="inline-block h-4 w-8 rounded" style={{ backgroundColor: tenant.couleurSecondaire }} />
                      <span>{tenant.couleurPrimaire} / {tenant.couleurSecondaire}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                        title="Voir le détail"
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> Détail
                      </button>
                      <button
                        onClick={() => setConfirmImpersonate(tenant)}
                        title="Accéder au dashboard du tenant"
                        className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors"
                        style={{ backgroundColor: tenant.couleurPrimaire }}
                      >
                        <LogIn className="h-3.5 w-3.5" /> Accéder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )
      )}

      {/* Tab: Analytiques MRR */}
      {activeTab === 'analytiques' && (
        loadingMrr ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>
        ) : mrrStats ? (
          <div className="space-y-6">
            {/* KPIs churn */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">MRR ce mois</p>
                <p className="text-2xl font-extrabold text-asm-vert">
                  {formatFCFA(mrrStats.mrrParMois[mrrStats.mrrParMois.length - 1]?.mrr ?? 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Paiements abonnements enregistrés</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Churn ce mois</p>
                <p className="text-2xl font-extrabold text-red-500">{mrrStats.churnCount} tenant{mrrStats.churnCount > 1 ? 's' : ''}</p>
                <p className="text-xs text-gray-400 mt-1">Abonnements expirés ce mois</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Taux de churn</p>
                <p className={`text-2xl font-extrabold ${mrrStats.tauxChurn > 10 ? 'text-red-500' : mrrStats.tauxChurn > 5 ? 'text-orange-500' : 'text-green-600'}`}>
                  {mrrStats.tauxChurn}%
                </p>
                <p className="text-xs text-gray-400 mt-1">Par rapport aux tenants actifs</p>
              </div>
            </div>

            {/* Courbe MRR 12 mois */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">MRR — 12 derniers mois (paiements abonnements)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={mrrStats.mrrParMois} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#1B5E20" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} />
                  <Tooltip formatter={(v: number) => [formatFCFA(v), 'MRR']} labelFormatter={l => `Période : ${l}`} />
                  <Area type="monotone" dataKey="mrr" stroke="#1B5E20" strokeWidth={2} fill="url(#mrrGrad)" dot={{ r: 3, fill: '#1B5E20' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 tenants */}
            {mrrStats.topTenants.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top tenants par revenus abonnement (all-time)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mrrStats.topTenants} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} />
                    <YAxis type="category" dataKey="nomEntreprise" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: number) => [formatFCFA(v), 'Total']} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {mrrStats.topTenants.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#1B5E20' : i === 1 ? '#2e7d32' : i === 2 ? '#388e3c' : '#66bb6a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400 text-sm">Aucune donnée analytique disponible</div>
        )
      )}

      {/* Tab: Journal Global */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingJournal ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>
          ) : journalEntries.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Aucune activité enregistrée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Tenant', 'Utilisateur', 'Action', 'Entité', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {journalEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.tenant?.couleurPrimaire ?? '#ccc' }} />
                          <span className="font-medium text-gray-900 text-xs">{entry.tenant?.nomEntreprise ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{entry.userNom}</div>
                        <div className="text-xs text-gray-400">{entry.userRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{entry.entite}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Plans & Tarifs */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Configurez les prix et limites de chaque plan. Ces valeurs sont utilisées lors de la création de nouveaux tenants.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map(plan => {
              const isEditing = editingPlan === plan.code;
              const form = planForms[plan.code] ?? plan;
              const BORDER = { STARTER: 'border-gray-200', PRO: 'border-blue-200', ENTERPRISE: 'border-purple-200' } as Record<string, string>;
              const ACCENT = { STARTER: 'text-gray-600 bg-gray-50', PRO: 'text-blue-700 bg-blue-50', ENTERPRISE: 'text-purple-700 bg-purple-50' } as Record<string, string>;
              return (
                <div key={plan.code} className={`bg-white rounded-xl shadow-sm border-2 ${BORDER[plan.code] ?? 'border-gray-200'} overflow-hidden`}>
                  <div className={`px-5 py-3 flex items-center justify-between ${ACCENT[plan.code]}`}>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide">{plan.code}</span>
                      {!isEditing && <div className="text-base font-bold text-gray-900 mt-0.5">{plan.nom}</div>}
                    </div>
                    {!isEditing
                      ? <button onClick={() => startEditPlan(plan)} className="text-xs font-medium underline opacity-60 hover:opacity-100" aria-label={`Modifier ${plan.nom}`}><Pencil className="h-4 w-4" /></button>
                      : <button onClick={() => setEditingPlan(null)} className="text-xs opacity-60 hover:opacity-100" aria-label="Annuler"><X className="h-4 w-4" /></button>
                    }
                  </div>
                  <div className="p-5 space-y-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nom affiché</label>
                          <input value={String(form.nom ?? '')} onChange={e => setPlanForms(p => ({ ...p, [plan.code]: { ...p[plan.code], nom: e.target.value } }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                          <input value={String(form.description ?? '')} onChange={e => setPlanForms(p => ({ ...p, [plan.code]: { ...p[plan.code], description: e.target.value } }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Prix/mois (FCFA)</label>
                            <input type="number" value={String(form.montantMensuel ?? '')} onChange={e => setPlanForms(p => ({ ...p, [plan.code]: { ...p[plan.code], montantMensuel: parseFloat(e.target.value) } }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Prix/an (FCFA)</label>
                            <input type="number" value={String(form.montantAnnuel ?? '')} onChange={e => setPlanForms(p => ({ ...p, [plan.code]: { ...p[plan.code], montantAnnuel: parseFloat(e.target.value) } }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max agents</label>
                            <input type="number" value={String(form.maxAgents ?? '')} onChange={e => setPlanForms(p => ({ ...p, [plan.code]: { ...p[plan.code], maxAgents: parseInt(e.target.value) } }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max véhicules</label>
                            <input type="number" value={String(form.maxVehicules ?? '')} onChange={e => setPlanForms(p => ({ ...p, [plan.code]: { ...p[plan.code], maxVehicules: parseInt(e.target.value) } }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                          </div>
                        </div>
                        <button onClick={() => savePlan(plan.code)} disabled={savingPlan}
                          className="w-full py-2 bg-asm-vert text-white text-sm font-semibold rounded-lg hover:bg-asm-vert/90 disabled:opacity-50">
                          {savingPlan ? 'Enregistrement…' : 'Sauvegarder'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500">{plan.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Mensuel</span>
                            <span className="text-sm font-bold text-gray-900">{formatFCFA(plan.montantMensuel)}</span>
                          </div>
                          {plan.montantAnnuel && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Annuel <span className="text-green-600 text-xs">(économie {Math.round((1 - (plan.montantAnnuel / (plan.montantMensuel * 12))) * 100)}%)</span></span>
                              <span className="text-sm font-bold text-gray-900">{formatFCFA(plan.montantAnnuel)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                            <span className="text-xs text-gray-400">Agents max</span>
                            <span className="text-xs font-semibold text-gray-700">{plan.maxAgents >= 999 ? 'Illimité' : plan.maxAgents}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Véhicules max</span>
                            <span className="text-xs font-semibold text-gray-700">{plan.maxVehicules >= 999 ? 'Illimité' : plan.maxVehicules}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {plan.features.map(f => (
                            <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> {f}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400">* Les limites (max agents, max véhicules) sont indicatives — le système ne les bloque pas encore automatiquement.</p>
        </div>
      )}

      {/* Modal: Confirmation désactivation/activation */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {confirmToggle.actif
                  ? <XCircle className="h-5 w-5 text-red-500" />
                  : <CheckCircle className="h-5 w-5 text-green-500" />}
                {confirmToggle.actif ? 'Désactiver' : 'Activer'} le tenant
              </h2>
              <button onClick={() => setConfirmToggle(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <div className={`rounded-lg p-3 text-sm ${confirmToggle.actif ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              {confirmToggle.actif
                ? <>Désactiver <strong>{confirmToggle.nomEntreprise}</strong> bloquera l'accès de tous ses utilisateurs immédiatement.</>
                : <>Réactiver <strong>{confirmToggle.nomEntreprise}</strong> permettra à ses utilisateurs de se connecter à nouveau.</>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmToggle(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button
                onClick={handleToggleConfirmed}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold ${confirmToggle.actif ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {confirmToggle.actif ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmation impersonation */}
      {confirmImpersonate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-asm-vert" /> Accéder au tenant
              </h2>
              <button onClick={() => setConfirmImpersonate(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Vous allez vous connecter en tant qu'administrateur de <strong>{confirmImpersonate.nomEntreprise}</strong>.
              Votre session Super Admin sera remplacée. Reconnectez-vous ensuite avec vos identifiants Super Admin.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmImpersonate(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={handleImpersonate}
                disabled={impersonating}
                className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                style={{ backgroundColor: confirmImpersonate.couleurPrimaire }}
              >
                {impersonating ? 'Connexion…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Édition tenant */}
      {editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-asm-vert" /> Modifier — {editTenant.nomEntreprise}
              </h2>
              <button onClick={() => setEditTenant(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Identité</p>
            <div className="space-y-3">
              {([
                { label: 'Nom de l\'entreprise', field: 'nomEntreprise' as const },
                { label: 'Slogan', field: 'slogan' as const },
                { label: 'Domaine custom', field: 'domaine' as const },
              ]).map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={editForm[field]} onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                {([['couleurPrimaire', 'Couleur primaire'], ['couleurSecondaire', 'Couleur secondaire']] as const).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editForm[field]} onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                        className="h-9 w-14 rounded border border-gray-300 p-0.5 cursor-pointer" />
                      <span className="text-xs font-mono text-gray-500">{editForm[field]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Abonnement</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={editForm.planType} onChange={e => setEditForm(prev => ({ ...prev, planType: e.target.value }))}
                  aria-label="Plan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert">
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={editForm.statutAbonnement} onChange={e => setEditForm(prev => ({ ...prev, statutAbonnement: e.target.value }))}
                  aria-label="Statut abonnement"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert">
                  <option value="ACTIF">Actif</option>
                  <option value="EXPIRE">Expiré</option>
                  <option value="SUSPENDU">Suspendu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant mensuel (FCFA)</label>
                <input type="number" value={editForm.montantMensuel}
                  onChange={e => setEditForm(prev => ({ ...prev, montantMensuel: e.target.value }))}
                  placeholder="50000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
                <input type="date" value={editForm.dateExpiration}
                  onChange={e => setEditForm(prev => ({ ...prev, dateExpiration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
              </div>
            </div>

            {editError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditTenant(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleEdit} disabled={editSaving} className="flex-1 px-4 py-2.5 rounded-lg bg-asm-vert text-white text-sm font-semibold hover:bg-asm-vert/90 disabled:opacity-50">
                {editSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Création tenant */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-asm-vert" /> Nouveau tenant
              </h2>
              <button onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); setCreateError(''); }} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informations entreprise</p>
            <div className="space-y-3">
              {([
                { label: 'Slug (sous-domaine) *', field: 'slug' as const, placeholder: 'autocity' },
                { label: 'Nom de l\'entreprise *', field: 'nomEntreprise' as const, placeholder: 'AutoCity Dakar' },
                { label: 'Slogan', field: 'slogan' as const, placeholder: 'Location de Véhicules' },
                { label: 'Domaine custom', field: 'domaine' as const, placeholder: 'autocity.sn' },
              ]).map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={createForm[field]} onChange={e => setCreateForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                {([['couleurPrimaire', 'Couleur primaire'], ['couleurSecondaire', 'Couleur secondaire']] as const).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={createForm[field]} onChange={e => setCreateForm(prev => ({ ...prev, [field]: e.target.value }))}
                        className="h-9 w-14 rounded border border-gray-300 p-0.5 cursor-pointer" />
                      <span className="text-xs font-mono text-gray-500">{createForm[field]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Abonnement</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={createForm.planType} onChange={e => setCreateForm(prev => ({ ...prev, planType: e.target.value }))}
                  aria-label="Plan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert">
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant/mois (FCFA)</label>
                <input type="number" value={createForm.montantMensuel}
                  onChange={e => setCreateForm(prev => ({ ...prev, montantMensuel: e.target.value }))}
                  placeholder="50000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
                <input type="date" value={createForm.dateExpiration}
                  onChange={e => setCreateForm(prev => ({ ...prev, dateExpiration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Premier administrateur</p>
            <div className="space-y-3">
              {([
                { label: 'Prénom *', field: 'adminPrenom' as const },
                { label: 'Nom *', field: 'adminNom' as const },
                { label: 'Email *', field: 'adminEmail' as const, type: 'email' },
                { label: 'Mot de passe *', field: 'adminPassword' as const, type: 'password' },
              ]).map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type || 'text'} value={createForm[field]}
                    onChange={e => setCreateForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                </div>
              ))}
            </div>

            {createError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); setCreateError(''); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleCreate} disabled={createSaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-asm-vert text-white text-sm font-semibold hover:bg-asm-vert/90 disabled:opacity-50">
                {createSaving ? 'Création…' : 'Créer le tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
