import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { contratsApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatDate, formatFCFA } from '../../utils/format';

interface FormData {
  kilometrageRetour: string;
  etatRetour: string;
  cautionRendue: boolean;
  montantSupplementaire: string;
  notes: string;
}

export function ContratCloturePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    kilometrageRetour: '', etatRetour: 'Bon état',
    cautionRendue: true, montantSupplementaire: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery(
    ['contrat', id],
    () => contratsApi.getById(id!),
    { enabled: Boolean(id) }
  );

  const contrat = data?.data;

  function set(field: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const kmParcourus = contrat && form.kilometrageRetour
    ? parseInt(form.kilometrageRetour) - (contrat.kilometrageDepart || 0)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contratsApi.cloture(id!, {
        kilometrageRetour: parseInt(form.kilometrageRetour),
        etatRetour: form.etatRetour,
        cautionRendue: form.cautionRendue,
        ...(form.montantSupplementaire && { montantSupplementaire: parseFloat(form.montantSupplementaire) }),
        ...(form.notes && { notes: form.notes }),
      });
      navigate('/contrats');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>;
  }

  if (!contrat) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Contrat introuvable</p>
        <button onClick={() => navigate('/contrats')} className="mt-3 text-asm-vert hover:underline text-sm">Retour aux contrats</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button aria-label="Retour" onClick={() => navigate('/contrats')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clôturer le contrat</h1>
          <p className="text-gray-500 text-sm mt-0.5">N° {contrat.numeroContrat}</p>
        </div>
      </div>

      {/* Résumé contrat */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase mb-3">Résumé du contrat</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-500">Client</span>
          <span className="font-medium">{contrat.reservation?.client?.prenom} {contrat.reservation?.client?.nom}</span>
          <span className="text-gray-500">Véhicule</span>
          <span className="font-medium">{contrat.reservation?.vehicule?.marque} {contrat.reservation?.vehicule?.modele}</span>
          <span className="text-gray-500">Période</span>
          <span className="font-medium">{formatDate(contrat.reservation?.dateDebut)} → {formatDate(contrat.reservation?.dateFin)}</span>
          <span className="text-gray-500">Montant total</span>
          <span className="font-bold text-asm-vert">{formatFCFA(contrat.reservation?.prixTotal)}</span>
          <span className="text-gray-500">Kilométrage départ</span>
          <span className="font-medium">{contrat.kilometrageDepart?.toLocaleString()} km</span>
          <span className="text-gray-500">Caution versée</span>
          <span className="font-medium">{formatFCFA(contrat.caution)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">État de retour</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage retour *</label>
              <input required type="number" min={contrat.kilometrageDepart || 0} placeholder="45500" value={form.kilometrageRetour} onChange={e => set('kilometrageRetour', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
              {kmParcourus !== null && kmParcourus >= 0 && (
                <p className="text-xs text-gray-500 mt-1">{kmParcourus.toLocaleString()} km parcourus</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplément (FCFA)</label>
              <input type="number" min={0} placeholder="0" value={form.montantSupplementaire} onChange={e => set('montantSupplementaire', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
              <p className="text-xs text-gray-400 mt-1">Frais additionnels si applicable</p>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">État de retour *</label>
            <textarea required rows={3} placeholder="Décrivez l'état du véhicule au retour..." value={form.etatRetour} onChange={e => set('etatRetour', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.cautionRendue} onChange={e => set('cautionRendue', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-asm-vert focus:ring-asm-vert" />
            <span className="text-sm font-medium text-gray-700">Caution rendue au client ({formatFCFA(contrat.caution)})</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
          <textarea aria-label="Notes" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/contrats')} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors">
            <CheckCircle className="h-4 w-4" />
            {saving ? 'Clôture en cours...' : 'Clôturer le contrat'}
          </button>
        </div>
      </form>
    </div>
  );
}
