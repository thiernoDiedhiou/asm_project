// Page de gestion des véhicules
import { useState } from 'react';
import { Plus, Search, Filter, Car, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../components/hooks/useQuery';
import { vehiculesApi } from '../../services/api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  formatFCFA,
  getStatutVehiculeColor,
  STATUT_LABELS,
  CATEGORIE_LABELS,
} from '../../utils/format';
import { useIsAdmin } from '../../store/authStore';

const CATEGORIES = ['ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'];
const STATUTS = ['DISPONIBLE', 'LOUE', 'EN_MAINTENANCE', 'HORS_SERVICE'];

export function VehiculesPage() {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery(
    ['vehicules', filterStatut, filterCategorie, String(page)],
    () =>
      vehiculesApi.getAll({
        ...(filterStatut && { statut: filterStatut }),
        ...(filterCategorie && { categorie: filterCategorie }),
        page,
        limit: 12,
      })
  );

  const vehicules = data?.data || [];
  const pagination = data?.pagination;

  // Filtrage local par recherche
  const vehiculesFiltres = vehicules.filter((v: { marque: string; modele: string; immatriculation: string }) =>
    !search ||
    v.marque.toLowerCase().includes(search.toLowerCase()) ||
    v.modele.toLowerCase().includes(search.toLowerCase()) ||
    v.immatriculation.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => { setDeleteId(id); setDeleteError(''); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await vehiculesApi.delete(deleteId);
      setDeleteId(null);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDeleteError(msg || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Véhicules</h1>
          <p className="text-gray-500 text-sm">
            Gestion du parc automobile ({pagination?.total || 0} véhicules)
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/vehicules/nouveau')}
            className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2.5 rounded-lg font-medium hover:bg-asm-vert-clair transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Nouveau véhicule
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher marque, modèle, immat..."
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
        <select
          aria-label="Filtrer par catégorie"
          value={filterCategorie}
          onChange={(e) => { setFilterCategorie(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORIE_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {/* Grille de véhicules */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-asm-vert border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehiculesFiltres.map((vehicule: {
            id: string;
            marque: string;
            modele: string;
            annee: number;
            immatriculation: string;
            couleur: string;
            categorie: string;
            statut: string;
            kilometrage: number;
            prixJournalier: number;
            prixSemaine: number;
            photos: string[];
          }) => (
            <div
              key={vehicule.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Photo */}
              <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                {vehicule.photos?.[0] ? (
                  <img
                    src={vehicule.photos[0]}
                    alt={`${vehicule.marque} ${vehicule.modele}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-12 w-12 text-gray-300" />
                )}
                {/* Badge statut */}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatutVehiculeColor(vehicule.statut)}`}
                >
                  {STATUT_LABELS[vehicule.statut]}
                </span>
              </div>

              {/* Infos */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {vehicule.marque} {vehicule.modele}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {vehicule.annee} • {vehicule.couleur}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {CATEGORIE_LABELS[vehicule.categorie]}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono font-semibold text-gray-700">
                    {vehicule.immatriculation}
                  </span>
                  <span>{vehicule.kilometrage.toLocaleString('fr-SN')} km</span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Tarif:</span>
                    <div className="text-right">
                      <span className="font-semibold text-asm-vert">
                        {formatFCFA(vehicule.prixJournalier)}/j
                      </span>
                      <span className="text-gray-400 ml-1">
                        | {formatFCFA(vehicule.prixSemaine)}/sem
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => navigate(`/vehicules/${vehicule.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Détails
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => navigate(`/vehicules/${vehicule.id}/modifier`)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-asm-vert/30 rounded-lg hover:bg-asm-vert-pale text-asm-vert transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(vehicule.id)}
                        className="p-1.5 text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Suivant
          </button>
        </div>
      )}

      {vehiculesFiltres.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Car className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Aucun véhicule trouvé</p>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer le véhicule"
        message="Cette action est irréversible. Le véhicule sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="danger"
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteId(null); setDeleteError(''); }}
      />
    </div>
  );
}
