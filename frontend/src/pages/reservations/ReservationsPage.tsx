// Page de gestion des réservations
import { useState } from 'react';
import { Plus, Search, Eye, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../components/hooks/useQuery';
import { reservationsApi } from '../../services/api';
import {
  formatFCFA,
  formatDate,
  getStatutReservationColor,
  STATUT_LABELS,
  TYPE_TRAJET_LABELS,
} from '../../utils/format';

const STATUTS = ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

export function ReservationsPage() {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery(
    ['reservations', filterStatut, search, String(page)],
    () =>
      reservationsApi.getAll({
        ...(filterStatut && { statut: filterStatut }),
        ...(search && { search }),
        page,
        limit: 15,
      })
  );

  const reservations = data?.data || [];
  const pagination = data?.pagination;

  const handleUpdateStatut = async (id: string, statut: string) => {
    try {
      await reservationsApi.updateStatut(id, { statut });
      refetch();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = (id: string) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await reservationsApi.delete(deleteId);
      refetch();
    } catch {
      // error
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-500 text-sm">
            {pagination?.total || 0} réservations au total
          </p>
        </div>
        <button
          onClick={() => navigate('/reservations/nouvelle')}
          className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2.5 rounded-lg font-medium hover:bg-asm-vert-clair transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par n°, client, véhicule..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert"
          />
        </div>
        <select
          aria-label="Filtrer par statut"
          value={filterStatut}
          onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>{STATUT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">N° Réservation</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Véhicule</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Période</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-4 border-asm-vert border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-10">
                    Aucune réservation trouvée
                  </td>
                </tr>
              ) : (
                reservations.map((res: {
                  id: string;
                  numeroReservation: string;
                  client: { nom: string; prenom: string; telephone: string };
                  vehicule: { marque: string; modele: string; immatriculation: string };
                  dateDebut: string;
                  dateFin: string;
                  nombreJours: number;
                  typeTrajet: string;
                  statut: string;
                  prixTotal: number;
                  contrat?: { id: string };
                }) => (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                      #{res.numeroReservation?.slice(-10)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">
                        {res.client?.prenom} {res.client?.nom}
                      </p>
                      <p className="text-xs text-gray-400">{res.client?.telephone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-gray-700">{res.vehicule?.marque} {res.vehicule?.modele}</p>
                      <p className="text-xs text-gray-400 font-mono">{res.vehicule?.immatriculation}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(res.dateDebut)} → {formatDate(res.dateFin)}
                      <p className="text-gray-400">{res.nombreJours} jour(s)</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      {TYPE_TRAJET_LABELS[res.typeTrajet]}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatutReservationColor(res.statut)}`}>
                        {STATUT_LABELS[res.statut]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatFCFA(res.prixTotal)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/reservations/${res.id}`)}
                          className="p-1.5 text-gray-400 hover:text-asm-vert hover:bg-asm-vert-pale rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {res.statut === 'EN_ATTENTE' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatut(res.id, 'CONFIRMEE')}
                              className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                              title="Confirmer"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatut(res.id, 'ANNULEE')}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              title="Annuler"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {res.statut === 'CONFIRMEE' && !res.contrat && (
                          <button
                            onClick={() => navigate(`/contrats/nouveau?reservationId=${res.id}`)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Créer contrat"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              {((page - 1) * 15) + 1} - {Math.min(page * 15, pagination.total)} sur {pagination.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer la réservation"
        message="Cette réservation sera définitivement supprimée."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
