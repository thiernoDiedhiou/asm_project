import { useState } from 'react';
import { Plus, Wrench, Search, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { useQuery } from '../../components/hooks/useQuery';
import { maintenancesApi, vehiculesApi } from '../../services/api';
import { formatFCFA, formatDate, STATUT_LABELS } from '../../utils/format';
import { useIsAdmin, useIsAgent } from '../../store/authStore';

const STATUTS_MAINTENANCE = ['PLANIFIEE', 'EN_COURS', 'TERMINEE'];

function getStatutColor(statut: string) {
  const colors: Record<string, string> = {
    PLANIFIEE: 'bg-yellow-100 text-yellow-800',
    EN_COURS: 'bg-orange-100 text-orange-800',
    TERMINEE: 'bg-green-100 text-green-800',
  };
  return colors[statut] || 'bg-gray-100 text-gray-700';
}

function getStatutIcon(statut: string) {
  if (statut === 'TERMINEE') return <CheckCircle className="h-4 w-4" />;
  if (statut === 'EN_COURS') return <Wrench className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

interface MaintenanceFormData {
  vehiculeId: string;
  type: string;
  description: string;
  cout: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
}

interface Maintenance {
  id: string;
  type: string;
  description: string;
  cout: number | null;
  dateDebut: string;
  dateFin: string | null;
  statut: string;
  vehicule: { id: string; marque: string; modele: string; immatriculation: string };
}

export function MaintenancesPage() {
  const isAdmin = useIsAdmin();
  const isAgent = useIsAgent();
  const canCreate = isAdmin || isAgent;

  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    vehiculeId: '', type: '', description: '', cout: '', dateDebut: '', dateFin: '', statut: 'EN_COURS',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [changingStatutId, setChangingStatutId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    ['maintenances', filterStatut, String(page)],
    () => maintenancesApi.getAll({ ...(filterStatut && { statut: filterStatut }), page, limit: 15 })
  );

  const { data: vehiculesData } = useQuery(['vehicules-list'], () =>
    vehiculesApi.getAll({ limit: 100 })
  );

  const maintenances: Maintenance[] = data?.data || [];
  const total: number = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / 15);

  const vehicules = vehiculesData?.data || [];

  const filtered = maintenances.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.type.toLowerCase().includes(q) ||
      m.vehicule?.marque?.toLowerCase().includes(q) ||
      m.vehicule?.modele?.toLowerCase().includes(q) ||
      m.vehicule?.immatriculation?.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditingMaintenance(null);
    setFormData({ vehiculeId: '', type: '', description: '', cout: '', dateDebut: new Date().toISOString().split('T')[0], dateFin: '', statut: 'EN_COURS' });
    setError('');
    setShowModal(true);
  }

  function openEdit(m: Maintenance) {
    setEditingMaintenance(m);
    setFormData({
      vehiculeId: m.vehicule.id,
      type: m.type,
      description: m.description,
      cout: m.cout ? String(m.cout) : '',
      dateDebut: m.dateDebut.split('T')[0],
      dateFin: m.dateFin ? m.dateFin.split('T')[0] : '',
      statut: m.statut,
    });
    setError('');
    setShowModal(true);
  }

  async function quickChangeStatut(id: string, statut: string) {
    setChangingStatutId(id);
    try {
      await maintenancesApi.update(id, { statut });
      refetch();
    } catch {
      // silently ignore
    } finally {
      setChangingStatutId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        type: formData.type,
        description: formData.description,
        statut: formData.statut,
        dateDebut: formData.dateDebut,
        ...(formData.cout && { cout: parseFloat(formData.cout) }),
        ...(formData.dateFin && { dateFin: formData.dateFin }),
      };
      if (!editingMaintenance) {
        payload.vehiculeId = formData.vehiculeId;
        await maintenancesApi.create(payload);
      } else {
        await maintenancesApi.update(editingMaintenance.id, payload);
      }
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenances</h1>
          <p className="text-gray-500 text-sm mt-1">{total} maintenance{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2 rounded-lg hover:bg-asm-vert-fonce transition-colors text-sm font-medium">
            <Plus className="h-4 w-4" />
            Nouvelle maintenance
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par type, véhicule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
            />
          </div>
          <select
            aria-label="Filtrer par statut"
            value={filterStatut}
            onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
          >
            <option value="">Tous les statuts</option>
            {STATUTS_MAINTENANCE.map((s) => (
              <option key={s} value={s}>{STATUT_LABELS[s] || s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <p>Aucune maintenance trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Véhicule</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Début</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coût</th>
                  {canCreate && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{m.vehicule?.marque} {m.vehicule?.modele}</div>
                      <div className="text-xs text-gray-400">{m.vehicule?.immatriculation}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">{m.type}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">{m.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatutColor(m.statut)}`}>
                        {getStatutIcon(m.statut)}
                        {STATUT_LABELS[m.statut] || m.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(m.dateDebut)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.dateFin ? formatDate(m.dateFin) : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{m.cout ? formatFCFA(m.cout) : '-'}</td>
                    {canCreate && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {STATUTS_MAINTENANCE.filter((s) => s !== m.statut).map((s) => {
                            const labels: Record<string, string> = { PLANIFIEE: 'Planifier', EN_COURS: 'Démarrer', TERMINEE: 'Terminer' };
                            const colors: Record<string, string> = {
                              PLANIFIEE: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
                              EN_COURS: 'border-orange-300 text-orange-700 hover:bg-orange-50',
                              TERMINEE: 'border-green-300 text-green-700 hover:bg-green-50',
                            };
                            return (
                              <button
                                key={s}
                                onClick={() => quickChangeStatut(m.id, s)}
                                disabled={changingStatutId === m.id}
                                className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors disabled:opacity-50 ${colors[s]}`}
                              >
                                {changingStatutId === m.id ? '...' : labels[s]}
                              </button>
                            );
                          })}
                          <button onClick={() => openEdit(m)} className="text-xs text-asm-vert hover:underline font-medium ml-1">Modifier</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">Page {page} sur {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-white">
                Précédent
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-white">
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingMaintenance ? 'Modifier la maintenance' : 'Nouvelle maintenance'}
              </h2>
              <button aria-label="Fermer" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

              {!editingMaintenance && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule *</label>
                  <select
                    aria-label="Véhicule"
                    required
                    value={formData.vehiculeId}
                    onChange={(e) => setFormData(f => ({ ...f, vehiculeId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                  >
                    <option value="">Sélectionner un véhicule</option>
                    {vehicules.map((v: { id: string; marque: string; modele: string; immatriculation: string }) => (
                      <option key={v.id} value={v.id}>{v.marque} {v.modele} — {v.immatriculation}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Vidange, Freins, Pneus..."
                  value={formData.type}
                  onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Détails de la maintenance..."
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
                  <input
                    aria-label="Date début"
                    required
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData(f => ({ ...f, dateDebut: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  <input
                    aria-label="Date fin"
                    type="date"
                    value={formData.dateFin}
                    onChange={(e) => setFormData(f => ({ ...f, dateFin: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coût (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={formData.cout}
                    onChange={(e) => setFormData(f => ({ ...f, cout: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    aria-label="Statut"
                    value={formData.statut}
                    onChange={(e) => setFormData(f => ({ ...f, statut: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                  >
                    {STATUTS_MAINTENANCE.map((s) => (
                      <option key={s} value={s}>{STATUT_LABELS[s] || s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors">
                  {saving ? 'Enregistrement...' : (editingMaintenance ? 'Mettre à jour' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
