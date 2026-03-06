import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ArrowLeft, Printer, CheckSquare, Loader2, DollarSign } from 'lucide-react';
import { contratsApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatFCFA, formatDate, STATUT_LABELS, METHODE_LABELS } from '../../utils/format';
import { useIsAdmin, useIsAgent, useIsComptable } from '../../store/authStore';

export function ContratDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isAgent = useIsAgent();
  const isComptable = useIsComptable();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pendingPaiementId, setPendingPaiementId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    ['contrat', id],
    () => contratsApi.getById(id!),
    { enabled: Boolean(id) }
  );

  const contrat = data?.data;

  // Compute financial totals from paiements (getById doesn't pre-compute these)
  const allPaiements = contrat?.paiements || [];
  const montantTotal = Number(contrat?.reservation?.prixTotal || 0);
  const montantPaye = allPaiements.filter((p: { valide: boolean }) => p.valide).reduce((sum: number, p: { montant: number }) => sum + Number(p.montant), 0);
  const resteAPayer = Math.max(0, montantTotal - montantPaye);

  async function handleGeneratePdf() {
    if (!contrat) return;
    setGeneratingPdf(true);
    try {
      const response = await contratsApi.generatePdf(id!);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handleValiderPaiement(paiementId: string) {
    setPendingPaiementId(paiementId);
  }

  async function confirmValiderPaiement() {
    if (!pendingPaiementId) return;
    try {
      const { paiementsApi } = await import('../../services/api');
      await paiementsApi.valider(pendingPaiementId, true);
      refetch();
    } catch { /* ignore */ } finally {
      setPendingPaiementId(null);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>;
  }

  if (!contrat) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Contrat introuvable</p>
        <button onClick={() => navigate('/contrats')} className="mt-3 text-asm-vert hover:underline text-sm">Retour</button>
      </div>
    );
  }

  const paiements = allPaiements;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button aria-label="Retour" onClick={() => navigate('/contrats')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contrat {contrat.numeroContrat}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                contrat.statut === 'ACTIF' ? 'bg-green-100 text-green-800' :
                contrat.statut === 'TERMINE' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-800'
              }`}>
                {STATUT_LABELS[contrat.statut] || contrat.statut}
              </span>
              <span className="text-gray-400 text-xs">Créé le {formatDate(contrat.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGeneratePdf} disabled={generatingPdf}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-60">
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Imprimer
          </button>
          {(isAdmin || isAgent) && contrat.statut === 'ACTIF' && (
            <button onClick={() => navigate(`/contrats/${id}/cloture`)}
              className="flex items-center gap-1.5 bg-asm-vert text-white px-3 py-2 rounded-lg hover:bg-asm-vert-fonce transition-colors text-sm">
              <CheckSquare className="h-4 w-4" /> Clôturer
            </button>
          )}
        </div>
      </div>

      {/* Infos contrat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Parties</h2>
          <div className="text-sm">
            <div className="text-gray-500 mb-0.5">Client</div>
            <div className="font-semibold text-gray-900">{contrat.reservation?.client?.prenom} {contrat.reservation?.client?.nom}</div>
            <div className="text-gray-400">{contrat.reservation?.client?.telephone}</div>
          </div>
          <div className="text-sm">
            <div className="text-gray-500 mb-0.5">Véhicule</div>
            <div className="font-semibold text-gray-900">{contrat.reservation?.vehicule?.marque} {contrat.reservation?.vehicule?.modele}</div>
            <div className="font-mono text-gray-400">{contrat.reservation?.vehicule?.immatriculation}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Période & Kilométrage</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Début</div><div className="font-medium">{formatDate(contrat.reservation?.dateDebut)}</div>
            <div className="text-gray-500">Fin</div><div className="font-medium">{formatDate(contrat.reservation?.dateFin)}</div>
            <div className="text-gray-500">Km départ</div><div className="font-medium">{contrat.kilometrageDepart?.toLocaleString()} km</div>
            {contrat.kilometrageRetour && (
              <>
                <div className="text-gray-500">Km retour</div><div className="font-medium">{contrat.kilometrageRetour?.toLocaleString()} km</div>
                <div className="text-gray-500">Km parcourus</div>
                <div className="font-medium">{(contrat.kilometrageRetour - contrat.kilometrageDepart).toLocaleString()} km</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Montants */}
      <div className="bg-asm-vert-pale rounded-xl p-5 border border-asm-vert/20">
        <h2 className="text-sm font-semibold text-asm-vert uppercase tracking-wide mb-3">Situation financière</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Montant total</div>
            <div className="text-xl font-bold text-gray-900">{formatFCFA(montantTotal)}</div>
          </div>
          <div>
            <div className="text-gray-500">Montant payé</div>
            <div className="text-xl font-bold text-green-700">{formatFCFA(montantPaye)}</div>
          </div>
          <div>
            <div className="text-gray-500">Reste à payer</div>
            <div className={`text-xl font-bold ${resteAPayer > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {formatFCFA(resteAPayer)}
            </div>
          </div>
        </div>
        <div className="mt-3 bg-white rounded-lg h-2 overflow-hidden">
          <div className="bg-asm-vert h-2 transition-all" style={{ width: `${Math.min(100, (montantPaye / (montantTotal || 1)) * 100)}%` }} />
        </div>
      </div>

      {/* Paiements */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Paiements ({paiements.length})
          </h2>
          {(isAdmin || isAgent) && contrat.statut === 'ACTIF' && resteAPayer > 0 && (
            <button onClick={() => navigate(`/paiements/nouveau?contratId=${contrat.id}`)} className="text-sm text-asm-vert hover:underline">
              + Ajouter un paiement
            </button>
          )}
        </div>
        {paiements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Aucun paiement enregistré</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Méthode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Référence</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paiements.map((p: { id: string; createdAt: string; methode: string; reference?: string; montant: number; valide: boolean }) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">{METHODE_LABELS[p.methode] || p.methode}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.reference || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-right">{formatFCFA(p.montant)}</td>
                  <td className="px-4 py-3 text-center">
                    {p.valide ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Validé</span>
                    ) : (isAdmin || isComptable) ? (
                      <button onClick={() => handleValiderPaiement(p.id)} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full hover:bg-yellow-200 transition-colors">
                        Valider
                      </button>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">En attente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingPaiementId}
        title="Valider le paiement"
        message="Confirmer la validation de ce paiement ? Cette action est définitive."
        confirmLabel="Valider"
        variant="info"
        onConfirm={confirmValiderPaiement}
        onCancel={() => setPendingPaiementId(null)}
      />
    </div>
  );
}
