// Page de gestion des paiements
import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Download, Search, X, Printer, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../components/hooks/useQuery';
import { paiementsApi } from '../../services/api';
import { formatFCFA, formatDate, METHODE_LABELS } from '../../utils/format';
import { useIsAdmin, useIsComptable } from '../../store/authStore';

const METHODES = ['ESPECES', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'VIREMENT', 'CHEQUE'];

const METHODE_COLORS: Record<string, string> = {
  WAVE: 'bg-blue-100 text-blue-700',
  ORANGE_MONEY: 'bg-orange-100 text-orange-700',
  FREE_MONEY: 'bg-purple-100 text-purple-700',
  ESPECES: 'bg-green-100 text-green-700',
  VIREMENT: 'bg-gray-100 text-gray-700',
  CHEQUE: 'bg-yellow-100 text-yellow-700',
};

export function PaiementsPage() {
  const [filterMethode, setFilterMethode] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [generatingRecu, setGeneratingRecu] = useState<string | null>(null);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isComptable = useIsComptable();

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handleMethode(value: string) {
    setFilterMethode(value);
    setPage(1);
  }

  const { data, isLoading, refetch } = useQuery(
    ['paiements', filterMethode, search, String(page)],
    () =>
      paiementsApi.getAll({
        ...(filterMethode && { methode: filterMethode }),
        ...(search && { search }),
        page,
        limit: 20,
      })
  );

  const { data: statsData } = useQuery(
    ['paiements-stats'],
    () => paiementsApi.getStats()
  );

  const paiements = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const stats = statsData?.data || [];

  const handleValider = async (id: string, valide: boolean) => {
    try {
      await paiementsApi.valider(id, valide);
      refetch();
    } catch {
      alert('Erreur lors de la validation');
    }
  };

  const handleGenerateRecu = async (id: string) => {
    setGeneratingRecu(id);
    try {
      const response = await paiementsApi.generateRecu(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert('Erreur lors de la génération du reçu');
    } finally {
      setGeneratingRecu(null);
    }
  };

  const exportCSV = () => {
    const header = ['Date', 'Client', 'Contrat', 'Méthode', 'Référence', 'Montant', 'Validé'];
    const rows = paiements.map((p: {
      datePaiement: string;
      contrat?: { client?: { nom: string; prenom: string }; numeroContrat?: string };
      methode: string;
      reference?: string;
      montant: number;
      valide: boolean;
    }) => [
      formatDate(p.datePaiement),
      `${p.contrat?.client?.prenom} ${p.contrat?.client?.nom}`,
      p.contrat?.numeroContrat?.slice(-10) || '',
      METHODE_LABELS[p.methode] || p.methode,
      p.reference || '',
      Number(p.montant),
      p.valide ? 'Oui' : 'Non',
    ]);

    const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiements-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalValide = stats.reduce((sum: number, s: { total: number }) => sum + s.total, 0);

  // Nombre de colonnes actions: valider (comptable/admin) + reçu = variable
  const actionColSpan = (isAdmin || isComptable) ? 9 : 8;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500 text-sm">
            Total validé: <span className="font-semibold text-asm-vert">{formatFCFA(totalValide)}</span>
            {pagination && <> · {pagination.total} paiement{pagination.total > 1 ? 's' : ''}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-gray-600 border border-gray-200 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => navigate('/paiements/nouveau')}
            className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2.5 rounded-lg font-medium hover:bg-asm-vert-clair transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Nouveau paiement
          </button>
        </div>
      </div>

      {/* Stats par méthode */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s: { methode: string; total: number; nombre: number }) => (
          <div key={s.methode} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${METHODE_COLORS[s.methode] || 'bg-gray-100 text-gray-700'}`}>
              {METHODE_LABELS[s.methode]}
            </span>
            <p className="text-sm font-bold text-gray-900">{formatFCFA(s.total)}</p>
            <p className="text-xs text-gray-400">{s.nombre} trans.</p>
          </div>
        ))}
      </div>

      {/* Barre de recherche + filtre méthode */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            aria-label="Rechercher un paiement"
            placeholder="Client, n° contrat, référence..."
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
          aria-label="Filtrer par méthode de paiement"
          value={filterMethode}
          onChange={(e) => handleMethode(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 bg-white"
        >
          <option value="">Toutes les méthodes</option>
          {METHODES.map((m) => (
            <option key={m} value={m}>{METHODE_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contrat</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Méthode</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Référence</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="px-5 py-3" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={actionColSpan} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-4 border-asm-vert border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : paiements.length === 0 ? (
                <tr>
                  <td colSpan={actionColSpan} className="text-center text-gray-400 py-10">
                    {search || filterMethode ? 'Aucun paiement ne correspond à votre recherche' : 'Aucun paiement trouvé'}
                  </td>
                </tr>
              ) : (
                paiements.map((paiement: {
                  id: string;
                  datePaiement: string;
                  contrat?: { client?: { nom: string; prenom: string }; numeroContrat?: string; reservation?: { vehicule?: { marque: string; modele: string } } };
                  methode: string;
                  reference?: string;
                  montant: number;
                  valide: boolean;
                  notes?: string;
                }) => (
                  <tr key={paiement.id} className={`hover:bg-gray-50 transition-colors ${!paiement.valide ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                      {formatDate(paiement.datePaiement)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {paiement.contrat?.client?.prenom} {paiement.contrat?.client?.nom}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      <p className="font-mono">{paiement.contrat?.numeroContrat?.slice(-10)}</p>
                      <p className="text-gray-400">
                        {paiement.contrat?.reservation?.vehicule?.marque} {paiement.contrat?.reservation?.vehicule?.modele}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${METHODE_COLORS[paiement.methode] || 'bg-gray-100 text-gray-700'}`}>
                        {METHODE_LABELS[paiement.methode]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">
                      {paiement.reference || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap">
                      {formatFCFA(paiement.montant)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {paiement.valide ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" /> Validé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" /> Invalidé
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {/* Bouton reçu PDF */}
                        <button
                          onClick={() => handleGenerateRecu(paiement.id)}
                          disabled={generatingRecu === paiement.id}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Imprimer / Enregistrer le reçu"
                        >
                          {generatingRecu === paiement.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Printer className="h-4 w-4" />
                          )}
                        </button>
                        {/* Bouton valider/invalider (comptable ou admin) */}
                        {(isAdmin || isComptable) && (
                          <button
                            type="button"
                            onClick={() => handleValider(paiement.id, !paiement.valide)}
                            className={`text-xs px-2 py-1 rounded border transition-colors whitespace-nowrap ${
                              paiement.valide
                                ? 'border-red-200 text-red-500 hover:bg-red-50'
                                : 'border-green-200 text-green-500 hover:bg-green-50'
                            }`}
                          >
                            {paiement.valide ? 'Invalider' : 'Valider'}
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
