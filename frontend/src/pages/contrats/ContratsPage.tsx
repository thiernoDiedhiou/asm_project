// Page de gestion des contrats
import { useState } from 'react';
import { Eye, Printer, CheckSquare, Loader2, Search, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../components/hooks/useQuery';
import { contratsApi } from '../../services/api';
import { formatFCFA, formatDate, STATUT_LABELS } from '../../utils/format';
import { useIsAdmin, useIsAgent } from '../../store/authStore';

const STATUT_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'TERMINE', label: 'Terminé' },
  { value: 'LITIGE', label: 'Litige' },
];

export function ContratsPage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isAgent = useIsAgent();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handleStatut(value: string) {
    setStatut(value);
    setPage(1);
  }

  const { data, isLoading } = useQuery(
    ['contrats', String(page), search, statut],
    () => contratsApi.getAll({
      page,
      limit: 15,
      ...(search && { search }),
      ...(statut && { statut }),
    })
  );

  const contrats = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  const handleGeneratePdf = async (id: string, numeroContrat: string) => {
    setGeneratingPdf(id);
    try {
      const response = await contratsApi.generatePdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-500 text-sm">{pagination?.total ?? 0} contrat{(pagination?.total ?? 0) > 1 ? 's' : ''}</p>
        </div>
        {(isAdmin || isAgent) && (
          <button type="button" onClick={() => navigate('/contrats/nouveau')}
            className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2.5 rounded-lg hover:bg-asm-vert-fonce transition-colors text-sm font-medium">
            <Plus className="h-4 w-4" /> Nouveau contrat
          </button>
        )}
      </div>

      {/* Barre de recherche + filtre statut */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            aria-label="Rechercher un contrat"
            placeholder="Client, n° contrat, immatriculation..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 bg-white"
          />
          {search && (
            <button type="button" onClick={() => handleSearch('')} aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          aria-label="Filtrer par statut"
          value={statut}
          onChange={e => handleStatut(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 bg-white"
        >
          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">N° Contrat</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Véhicule</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Période</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Payé</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Reste</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-4 border-asm-vert border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : contrats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-10">
                    {search || statut ? 'Aucun contrat ne correspond à votre recherche' : 'Aucun contrat trouvé'}
                  </td>
                </tr>
              ) : (
                contrats.map((contrat: {
                  id: string;
                  numeroContrat: string;
                  client: { nom: string; prenom: string };
                  reservation: { dateDebut: string; dateFin: string; prixTotal: number; vehicule: { marque: string; modele: string; immatriculation: string } };
                  statut: string;
                  totalPaye: number;
                  resteADu: number;
                }) => (
                  <tr key={contrat.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/contrats/${contrat.id}`)}>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                      {contrat.numeroContrat?.slice(-12)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {contrat.client?.prenom} {contrat.client?.nom}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-gray-700">
                        {contrat.reservation?.vehicule?.marque} {contrat.reservation?.vehicule?.modele}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {contrat.reservation?.vehicule?.immatriculation}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(contrat.reservation?.dateDebut)} → {formatDate(contrat.reservation?.dateFin)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-900 font-medium">
                      {formatFCFA(contrat.reservation?.prixTotal)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-green-700 font-medium">
                      {formatFCFA(contrat.totalPaye)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      <span className={contrat.resteADu > 0 ? 'text-red-600' : 'text-green-600'}>
                        {contrat.resteADu > 0 ? formatFCFA(contrat.resteADu) : 'Soldé ✓'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        contrat.statut === 'ACTIF'    ? 'bg-green-100 text-green-700' :
                        contrat.statut === 'TERMINE'  ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {STATUT_LABELS[contrat.statut] || contrat.statut}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/contrats/${contrat.id}`)}
                          className="p-1.5 text-gray-400 hover:text-asm-vert hover:bg-asm-vert-pale rounded-lg transition-colors"
                          title="Voir le détail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleGeneratePdf(contrat.id, contrat.numeroContrat)}
                          disabled={generatingPdf === contrat.id}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Imprimer / Enregistrer"
                        >
                          {generatingPdf === contrat.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Printer className="h-4 w-4" />
                          )}
                        </button>
                        {(isAdmin || isAgent) && contrat.statut === 'ACTIF' && (
                          <button
                            onClick={() => navigate(`/contrats/${contrat.id}/cloture`)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Clôturer"
                          >
                            <CheckSquare className="h-4 w-4" />
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {page} sur {totalPages} · {pagination?.total} résultat{(pagination?.total ?? 0) > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <button type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
