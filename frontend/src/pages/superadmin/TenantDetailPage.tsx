// Page super-admin — détail d'un tenant
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, Car, Calendar, CreditCard,
  CheckCircle, XCircle, Globe, Palette, LogIn, User,
  AlertTriangle, ShieldCheck, Plus, Trash2, FileText, X,
} from 'lucide-react';
import { useQuery } from '../../components/hooks/useQuery';
import { api, API_FILE_BASE } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatFCFA, getStatutReservationColor, STATUT_LABELS } from '../../utils/format';
import { useState } from 'react';

// ---- Types ----

interface TenantUser {
  id: string; nom: string; prenom: string; email: string;
  role: string; actif: boolean; createdAt: string;
}

interface Reservation {
  id: string; statut: string; dateDebut: string; dateFin: string; prixTotal: number;
  client: { nom: string; prenom: string };
  vehicule: { marque: string; modele: string; immatriculation: string };
}

interface PaiementAbonnement {
  id: string; montant: number; methode: string; reference: string | null;
  periode: string; notes: string | null; pdfUrl: string | null; createdAt: string;
}

interface TenantDetail {
  id: string; slug: string; nomEntreprise: string; slogan: string;
  couleurPrimaire: string; couleurSecondaire: string; logo: string | null; domaine: string | null;
  actif: boolean; planType: string; montantMensuel: number | null;
  dateExpiration: string | null; statutAbonnement: string; createdAt: string;
  _count: { users: number; vehicules: number; clients: number; reservations: number };
  users: TenantUser[];
  recentReservations: Reservation[];
  revenusTotal: number;
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-600', PRO: 'bg-blue-100 text-blue-700', ENTERPRISE: 'bg-purple-100 text-purple-700',
};
const STATUT_COLORS: Record<string, string> = {
  ACTIF: 'bg-green-100 text-green-700', EXPIRE: 'bg-red-100 text-red-700', SUSPENDU: 'bg-orange-100 text-orange-700',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-asm-vert/10 text-asm-vert', AGENT: 'bg-blue-50 text-blue-600', COMPTABLE: 'bg-purple-50 text-purple-600',
};
const METHODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', WAVE: 'Wave', ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money', VIREMENT: 'Virement', CHEQUE: 'Chèque',
};
const PERIODES = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

function formatPeriode(p: string) {
  const [year, month] = p.split('-');
  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${mois[parseInt(month) - 1]} ${year}`;
}

// ---- Composant ----

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setTokens, fetchMe } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'apercu' | 'abonnements'>('apercu');
  const [confirmImpersonate, setConfirmImpersonate] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState('');

  // Abonnements state
  const [showAddPaiement, setShowAddPaiement] = useState(false);
  const [paiementForm, setPaiementForm] = useState({ montant: '', methode: 'WAVE', reference: '', periode: PERIODES[0], notes: '' });
  const [savingPaiement, setSavingPaiement] = useState(false);
  const [paiementError, setPaiementError] = useState('');
  const [confirmDeletePaiement, setConfirmDeletePaiement] = useState<PaiementAbonnement | null>(null);

  const { data, isLoading } = useQuery(['tenant-detail', id!], () => api.get(`/tenants/${id}/detail`));
  const { data: abData, isLoading: loadingAb, refetch: refetchAb } = useQuery(
    ['abonnements', id!],
    () => api.get(`/tenants/${id}/abonnements`),
    { enabled: activeTab === 'abonnements' }
  );

  const tenant: TenantDetail | null = data?.data ?? null;
  const paiements: PaiementAbonnement[] = abData?.data ?? [];

  const totalAbonnements = paiements.reduce((s, p) => s + Number(p.montant), 0);

  async function handleRenouveler() {
    if (!tenant) return;
    setRenewing(true); setRenewSuccess('');
    try {
      await api.post(`/tenants/${tenant.id}/renouveler`, {});
      setRenewSuccess('Abonnement renouvelé d\'1 mois avec succès.');
      setTimeout(() => setRenewSuccess(''), 5000);
      // Rafraîchir les données
      window.location.reload();
    } catch {
      setRenewing(false);
    }
  }

  async function handleImpersonate() {
    if (!tenant) return;
    setImpersonating(true);
    try {
      const res = await api.post(`/tenants/${tenant.id}/impersonate`, {});
      const { accessToken, refreshToken } = res.data.data;
      setTokens(accessToken, refreshToken);
      await fetchMe();
      navigate('/dashboard');
    } catch {
      setImpersonating(false);
      setConfirmImpersonate(false);
    }
  }

  async function handleAddPaiement() {
    if (!paiementForm.montant || !paiementForm.methode || !paiementForm.periode) {
      setPaiementError('Montant, méthode et période sont obligatoires.');
      return;
    }
    setSavingPaiement(true); setPaiementError('');
    try {
      await api.post(`/tenants/${id}/abonnements`, paiementForm);
      setShowAddPaiement(false);
      setPaiementForm({ montant: '', methode: 'WAVE', reference: '', periode: PERIODES[0], notes: '' });
      refetchAb();
    } catch (err: unknown) {
      setPaiementError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setSavingPaiement(false);
    }
  }

  async function handleDeletePaiement() {
    if (!confirmDeletePaiement) return;
    try {
      await api.delete(`/tenants/${id}/abonnements/${confirmDeletePaiement.id}`);
      setConfirmDeletePaiement(null);
      refetchAb();
    } catch { /* ignore */ }
  }

  const isExpiringSoon = tenant?.dateExpiration
    ? (() => { const diff = new Date(tenant.dateExpiration!).getTime() - Date.now(); return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; })()
    : false;
  const isExpired = tenant?.dateExpiration ? new Date(tenant.dateExpiration).getTime() < Date.now() : false;

  if (isLoading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" />
    </div>
  );

  if (!tenant) return (
    <div className="text-center py-24 text-gray-400">
      <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>Tenant introuvable</p>
      <button onClick={() => navigate('/tenants')} className="mt-4 text-sm text-asm-vert hover:underline">Retour à la liste</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/tenants')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{tenant.nomEntreprise}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenant.slogan}</p>
        </div>
        <button
          onClick={handleRenouveler}
          disabled={renewing}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {renewing ? 'Renouvellement…' : 'Renouveler +1 mois'}
        </button>
        <button onClick={() => setConfirmImpersonate(true)} className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: tenant.couleurPrimaire }}>
          <LogIn className="h-4 w-4" /> Accéder au dashboard
        </button>
      </div>

      {/* Toast renouvellement */}
      {renewSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" /> {renewSuccess}
        </div>
      )}

      {/* Bandeau identité */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-3" style={{ backgroundColor: tenant.couleurPrimaire }} />
        <div className="p-6">
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex-1 min-w-64 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[tenant.planType] ?? PLAN_COLORS.STARTER}`}>{tenant.planType}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUT_COLORS[tenant.statutAbonnement] ?? STATUT_COLORS.ACTIF}`}>{tenant.statutAbonnement}</span>
                {tenant.actif
                  ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Actif</span>
                  : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="h-3.5 w-3.5" /> Inactif</span>
                }
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400 shrink-0" /><span className="font-mono text-xs">{tenant.slug}.votre-plateforme.sn</span></div>
                {tenant.domaine && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-asm-vert shrink-0" /><span className="font-mono text-xs text-asm-vert">{tenant.domaine}</span></div>}
              </div>
              <div className="text-xs text-gray-400">Créé le {formatDate(tenant.createdAt)}</div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Abonnement</p>
              {tenant.montantMensuel && (
                <div className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-gray-400" /><span className="font-semibold text-gray-800">{formatFCFA(tenant.montantMensuel)}</span><span className="text-gray-400">/ mois</span></div>
              )}
              {tenant.dateExpiration && (
                <div className={`flex items-center gap-2 text-sm font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-500' : 'text-gray-600'}`}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {isExpired ? 'Expiré le' : 'Expire le'} {formatDate(tenant.dateExpiration)}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Charte graphique</p>
              {tenant.logo && (
                <div className="mb-2">
                  <img
                    src={`${API_FILE_BASE}${tenant.logo}`}
                    alt={`Logo ${tenant.nomEntreprise}`}
                    className="h-12 w-auto max-w-[160px] object-contain rounded-lg border border-gray-100 bg-gray-50 p-1"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2"><span className="h-6 w-10 rounded border border-gray-200 inline-block" style={{ backgroundColor: tenant.couleurPrimaire }} /><span className="text-xs font-mono text-gray-500">{tenant.couleurPrimaire}</span></div>
                <div className="flex items-center gap-2"><span className="h-6 w-10 rounded border border-gray-200 inline-block" style={{ backgroundColor: tenant.couleurSecondaire }} /><span className="text-xs font-mono text-gray-500">{tenant.couleurSecondaire}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Users, label: 'Utilisateurs', value: tenant._count.users, color: 'text-asm-vert' },
          { icon: Car, label: 'Véhicules', value: tenant._count.vehicules, color: 'text-blue-600' },
          { icon: Users, label: 'Clients', value: tenant._count.clients, color: 'text-orange-500' },
          { icon: Calendar, label: 'Réservations', value: tenant._count.reservations, color: 'text-purple-600' },
          { icon: CreditCard, label: 'Revenus totaux', value: formatFCFA(tenant.revenusTotal), color: 'text-green-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'apercu' as const, label: 'Aperçu', Icon: Building2 },
          { key: 'abonnements' as const, label: 'Abonnements', Icon: CreditCard },
        ]).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === key ? 'border-asm-vert text-asm-vert' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Aperçu */}
      {activeTab === 'apercu' && (
        <div className="space-y-6">
          {/* Utilisateurs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-asm-vert" />
              <h2 className="font-semibold text-gray-900">Utilisateurs ({tenant.users.length})</h2>
            </div>
            {tenant.users.length === 0 ? (
              <p className="py-8 text-center text-gray-400 text-sm">Aucun utilisateur</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Nom', 'Email', 'Rôle', 'Statut', 'Créé le'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tenant.users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{u.prenom[0]}{u.nom[0]}</div>
                            <span className="font-medium text-gray-800">{u.prenom} {u.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}><User className="h-3 w-3" /> {u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.actif ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Actif</span> : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" /> Inactif</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Réservations récentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Dernières réservations</h2>
              <span className="text-xs text-gray-400 ml-1">(10 dernières)</span>
            </div>
            {tenant.recentReservations.length === 0 ? (
              <p className="py-8 text-center text-gray-400 text-sm">Aucune réservation</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Client', 'Véhicule', 'Période', 'Statut', 'Montant'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tenant.recentReservations.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{r.client.prenom} {r.client.nom}</td>
                        <td className="px-4 py-3 text-gray-600"><div>{r.vehicule.marque} {r.vehicule.modele}</div><div className="text-xs text-gray-400 font-mono">{r.vehicule.immatriculation}</div></td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.dateDebut)} → {formatDate(r.dateFin)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatutReservationColor(r.statut)}`}>{STATUT_LABELS[r.statut] ?? r.statut}</span></td>
                        <td className="px-4 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">{formatFCFA(r.prixTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Abonnements */}
      {activeTab === 'abonnements' && (
        <div className="space-y-4">
          {/* Header abonnements */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total encaissé : <span className="font-bold text-gray-900">{formatFCFA(totalAbonnements)}</span></p>
            </div>
            <button onClick={() => setShowAddPaiement(true)} className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-asm-vert/90 transition-colors">
              <Plus className="h-4 w-4" /> Enregistrer un paiement
            </button>
          </div>

          {/* Tableau paiements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingAb ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-asm-vert" /></div>
            ) : paiements.length === 0 ? (
              <div className="py-12 text-center">
                <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">Aucun paiement d'abonnement enregistré</p>
                <button onClick={() => setShowAddPaiement(true)} className="mt-3 text-sm text-asm-vert hover:underline">Enregistrer le premier paiement</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Période', 'Montant', 'Méthode', 'Référence', 'Date', 'Facture', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paiements.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{formatPeriode(p.periode)}</td>
                        <td className="px-4 py-3 font-bold text-asm-vert">{formatFCFA(p.montant)}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{METHODE_LABELS[p.methode] ?? p.methode}</span></td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.reference || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-3">
                          {p.pdfUrl ? (
                            <a href={`${API_FILE_BASE}${p.pdfUrl}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-asm-vert hover:underline font-medium">
                              <FileText className="h-3.5 w-3.5" /> PDF
                            </a>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setConfirmDeletePaiement(p)} className="text-gray-300 hover:text-red-400 transition-colors" aria-label="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Ajouter paiement */}
      {showAddPaiement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><CreditCard className="h-5 w-5 text-asm-vert" /> Enregistrer un paiement</h2>
              <button onClick={() => { setShowAddPaiement(false); setPaiementError(''); }} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
                  <input type="number" value={paiementForm.montant} onChange={e => setPaiementForm(p => ({ ...p, montant: e.target.value }))} placeholder="75000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Méthode *</label>
                  <select value={paiementForm.methode} onChange={e => setPaiementForm(p => ({ ...p, methode: e.target.value }))}
                    aria-label="Méthode de paiement"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert">
                    {Object.entries(METHODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Période *</label>
                  <select value={paiementForm.periode} onChange={e => setPaiementForm(p => ({ ...p, periode: e.target.value }))}
                    aria-label="Période"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert">
                    {PERIODES.map(p => <option key={p} value={p}>{formatPeriode(p)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                  <input value={paiementForm.reference} onChange={e => setPaiementForm(p => ({ ...p, reference: e.target.value }))} placeholder="WAVE-123456"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input value={paiementForm.notes} onChange={e => setPaiementForm(p => ({ ...p, notes: e.target.value }))} placeholder="Renouvellement annuel..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert" />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                ✓ Une facture PDF sera générée automatiquement après l'enregistrement.
              </div>
            </div>
            {paiementError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{paiementError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowAddPaiement(false); setPaiementError(''); }} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleAddPaiement} disabled={savingPaiement} className="flex-1 px-4 py-2.5 rounded-lg bg-asm-vert text-white text-sm font-semibold hover:bg-asm-vert/90 disabled:opacity-50">
                {savingPaiement ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Supprimer paiement */}
      {confirmDeletePaiement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-500" /> Supprimer ce paiement ?</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Paiement de <strong>{formatFCFA(confirmDeletePaiement.montant)}</strong> ({formatPeriode(confirmDeletePaiement.periode)}) sera supprimé définitivement.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeletePaiement(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleDeletePaiement} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Impersonation */}
      {confirmImpersonate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><LogIn className="h-5 w-5 text-asm-vert" /> Accéder au tenant</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Vous allez vous connecter en tant qu'administrateur de <strong>{tenant.nomEntreprise}</strong>. Votre session Super Admin sera remplacée.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmImpersonate(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleImpersonate} disabled={impersonating} className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-colors" style={{ backgroundColor: tenant.couleurPrimaire }}>
                {impersonating ? 'Connexion…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
