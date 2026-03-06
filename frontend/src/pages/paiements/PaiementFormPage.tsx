import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, DollarSign, User, Car, CheckCircle2, AlertCircle } from 'lucide-react';
import { paiementsApi, contratsApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatFCFA, formatDate, METHODE_LABELS } from '../../utils/format';

const METHODES = ['ESPECES', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'VIREMENT', 'CHEQUE'];

type ContratOption = {
  id: string;
  numeroContrat: string;
  reservation?: {
    client?: { prenom: string; nom: string };
    vehicule?: { marque: string; modele: string };
    dateDebut: string;
    dateFin: string;
    prixTotal: number;
  };
  totalPaye: number;
  resteADu: number;
};

interface FormData {
  contratId: string;
  montant: string;
  methode: string;
  reference: string;
  notes: string;
}

function ContratCard({
  c,
  selected,
  onClick,
  readOnly,
}: {
  c: ContratOption;
  selected: boolean;
  onClick?: () => void;
  readOnly?: boolean;
}) {
  const resteADu = c.resteADu ?? 0;
  const totalPaye = c.totalPaye ?? 0;
  const prixTotal = c.reservation?.prixTotal ?? 0;
  const progression = prixTotal > 0 ? Math.round((totalPaye / prixTotal) * 100) : 0;

  return (
    <div
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      onClick={readOnly ? undefined : onClick}
      onKeyDown={readOnly ? undefined : (e) => e.key === 'Enter' && onClick?.()}
      className={`relative rounded-xl border-2 p-4 transition-all ${
        readOnly
          ? 'border-asm-vert bg-asm-vert-pale cursor-default'
          : selected
          ? 'border-asm-vert bg-asm-vert-pale cursor-pointer'
          : 'border-gray-200 bg-white hover:border-asm-vert/40 hover:bg-gray-50 cursor-pointer'
      }`}
    >
      {(selected || readOnly) && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-5 w-5 text-asm-vert" />
        </div>
      )}

      <div className="space-y-2.5 pr-6">
        {/* Numéro de contrat */}
        <span className="font-mono text-xs font-semibold text-asm-vert bg-asm-vert/10 px-2 py-0.5 rounded">
          {c.numeroContrat}
        </span>

        {/* Client + Véhicule */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-gray-900 text-sm">
              {c.reservation?.client?.prenom} {c.reservation?.client?.nom}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Car className="h-3.5 w-3.5 flex-shrink-0" />
            {c.reservation?.vehicule?.marque} {c.reservation?.vehicule?.modele}
          </div>
        </div>

        {/* Période */}
        {c.reservation?.dateDebut && (
          <div className="text-xs text-gray-400">
            {formatDate(c.reservation.dateDebut)} → {formatDate(c.reservation.dateFin)}
          </div>
        )}

        {/* Barre de progression + montants */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Payé : <span className="font-medium text-green-700">{formatFCFA(totalPaye)}</span>
              {' / '}
              <span className="text-gray-600">{formatFCFA(prixTotal)}</span>
            </span>
            <span className="font-bold text-red-600 text-sm">
              Reste : {formatFCFA(resteADu)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-asm-vert rounded-full transition-all"
              style={{ width: `${Math.min(progression, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaiementFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contratIdParam = searchParams.get('contratId') || '';

  const [form, setForm] = useState<FormData>({
    contratId: contratIdParam,
    montant: '',
    methode: 'WAVE',
    reference: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: contratsData, isLoading: loadingContrats } = useQuery(
    ['contrats-actifs'],
    () => contratsApi.getAll({ statut: 'ACTIF', limit: 100 })
  );

  const contrats: ContratOption[] = contratsData?.data || [];

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const selectedContrat = contrats.find(c => c.id === form.contratId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await paiementsApi.create({
        contratId: form.contratId,
        montant: parseFloat(form.montant),
        methode: form.methode,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      });
      navigate('/paiements');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button aria-label="Retour" onClick={() => navigate('/paiements')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enregistrer un paiement</h1>
          <p className="text-gray-500 text-sm mt-0.5">Ajouter un règlement à un contrat</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

        {/* ===== SECTION CONTRAT ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Contrat
          </h2>

          {contratIdParam ? (
            /* Pré-sélectionné depuis le détail contrat — lecture seule */
            <>
              <p className="text-xs text-gray-500 mb-2">Contrat sélectionné</p>
              {selectedContrat ? (
                <ContratCard c={selectedContrat} selected readOnly />
              ) : (
                <div className="rounded-xl border-2 border-gray-200 p-4 animate-pulse bg-gray-50 h-24" />
              )}
            </>
          ) : (
            /* Sélection libre — cartes cliquables */
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Sélectionnez le contrat à régler *</p>
                {!loadingContrats && contrats.length > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {contrats.length} contrat{contrats.length > 1 ? 's' : ''} actif{contrats.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {loadingContrats ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="rounded-xl border-2 border-gray-100 p-4 animate-pulse bg-gray-50 h-24" />
                  ))}
                </div>
              ) : contrats.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <span>
                    Aucun contrat actif disponible.{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/contrats')}
                      className="underline hover:text-yellow-900"
                    >
                      Gérer les contrats →
                    </button>
                  </span>
                </div>
              ) : (
                <div className={`space-y-2 ${contrats.length > 3 ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
                  {contrats.map(c => (
                    <ContratCard
                      key={c.id}
                      c={c}
                      selected={form.contratId === c.id}
                      onClick={() => set('contratId', c.id)}
                    />
                  ))}
                </div>
              )}
              <input
                type="text"
                required
                readOnly
                value={form.contratId}
                className="sr-only"
                aria-label="Contrat sélectionné"
              />
            </>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* ===== DÉTAILS DU PAIEMENT ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Détails du paiement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
              <input
                required
                type="number"
                min={1}
                placeholder="50000"
                value={form.montant}
                onChange={e => set('montant', e.target.value)}
                max={selectedContrat?.resteADu}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
              />
              {selectedContrat && selectedContrat.resteADu > 0 && (
                <button
                  type="button"
                  onClick={() => set('montant', String(selectedContrat.resteADu))}
                  className="text-xs text-asm-vert hover:underline mt-1"
                >
                  Solde complet : {formatFCFA(selectedContrat.resteADu)}
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Méthode *</label>
              <select
                aria-label="Méthode de paiement"
                required
                value={form.methode}
                onChange={e => set('methode', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
              >
                {METHODES.map(m => <option key={m} value={m}>{METHODE_LABELS[m] || m}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
            <input
              type="text"
              placeholder="N° de transaction, reçu..."
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
            />
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              aria-label="Notes"
              rows={2}
              placeholder="Remarques..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/paiements')}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !form.contratId}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </button>
        </div>
      </form>
    </div>
  );
}
