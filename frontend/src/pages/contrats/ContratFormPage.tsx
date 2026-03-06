import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Car, User, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { contratsApi, reservationsApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatDate, formatFCFA } from '../../utils/format';

type ReservationOption = {
  id: string;
  numeroReservation?: string;
  client?: { prenom: string; nom: string; telephone?: string };
  vehicule?: { marque: string; modele: string; immatriculation?: string };
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  prixTotal: number;
};

interface FormData {
  reservationId: string;
  kilometrageDepart: string;
  etatDepart: string;
  caution: string;
  notes: string;
}

function ReservationCard({
  r,
  selected,
  onClick,
  readOnly,
}: {
  r: ReservationOption;
  selected: boolean;
  onClick?: () => void;
  readOnly?: boolean;
}) {
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
      {/* Badge sélectionné / lecture seule */}
      {(selected || readOnly) && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-5 w-5 text-asm-vert" />
        </div>
      )}

      <div className="space-y-2 pr-6">
        {/* Client */}
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-900 text-sm">
            {r.client?.prenom} {r.client?.nom}
          </span>
          {r.client?.telephone && (
            <span className="text-xs text-gray-400">{r.client.telephone}</span>
          )}
        </div>

        {/* Véhicule */}
        <div className="flex items-center gap-2">
          <Car className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700">
            {r.vehicule?.marque} {r.vehicule?.modele}
          </span>
          {r.vehicule?.immatriculation && (
            <span className="font-mono text-xs text-gray-400">{r.vehicule.immatriculation}</span>
          )}
        </div>

        {/* Période + Montant */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
              {r.nombreJours > 0 && (
                <span className="ml-1 text-gray-400">({r.nombreJours} j)</span>
              )}
            </span>
          </div>
          <span className="text-sm font-bold text-asm-vert">
            {formatFCFA(r.prixTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ContratFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationIdParam = searchParams.get('reservationId') || '';

  const [form, setForm] = useState<FormData>({
    reservationId: reservationIdParam,
    kilometrageDepart: '',
    etatDepart: 'Bon état général',
    caution: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Réservations confirmées sans contrat
  const { data: reservationsData, isLoading: loadingRes } = useQuery(
    ['reservations-confirmees'],
    () => reservationsApi.getAll({ statut: 'CONFIRMEE', limit: 100 })
  );

  const reservations: ReservationOption[] = reservationsData?.data || [];

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const selectedRes = reservations.find(r => r.id === form.reservationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contratsApi.create({
        reservationId: form.reservationId,
        kilometrageDepart: parseInt(form.kilometrageDepart) || 0,
        etatDepart: form.etatDepart,
        ...(form.caution && { caution: parseFloat(form.caution) }),
        ...(form.notes && { notes: form.notes }),
      });
      navigate('/contrats');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button aria-label="Retour" onClick={() => navigate('/contrats')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau contrat</h1>
          <p className="text-gray-500 text-sm mt-0.5">Créer un contrat à partir d'une réservation confirmée</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

        {/* ===== SECTION RÉSERVATION ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Réservation
          </h2>

          {reservationIdParam ? (
            /* Pré-sélectionné depuis la page détail — lecture seule */
            <>
              <p className="text-xs text-gray-500 mb-2">Réservation confirmée</p>
              {selectedRes ? (
                <ReservationCard r={selectedRes} selected readOnly />
              ) : (
                <div className="rounded-xl border-2 border-gray-200 p-4 animate-pulse bg-gray-50 h-20" />
              )}
            </>
          ) : (
            /* Sélection libre — cartes cliquables */
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Sélectionnez la réservation à formaliser *</p>
                {!loadingRes && reservations.length > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {reservations.length} en attente
                  </span>
                )}
              </div>
              {loadingRes ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="rounded-xl border-2 border-gray-100 p-4 animate-pulse bg-gray-50 h-20" />
                  ))}
                </div>
              ) : reservations.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <span>
                    Aucune réservation confirmée disponible.{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/reservations')}
                      className="underline hover:text-yellow-900"
                    >
                      Gérer les réservations →
                    </button>
                  </span>
                </div>
              ) : (
                <div className={`space-y-2 ${reservations.length > 3 ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
                  {reservations.map(r => (
                    <ReservationCard
                      key={r.id}
                      r={r}
                      selected={form.reservationId === r.id}
                      onClick={() => set('reservationId', r.id)}
                    />
                  ))}
                </div>
              )}
              {/* Champ caché pour la validation required */}
              <input
                type="text"
                required
                readOnly
                value={form.reservationId}
                className="sr-only"
                aria-label="Réservation sélectionnée"
              />
            </>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* ===== ÉTAT DE DÉPART ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">État de départ du véhicule</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage départ *</label>
              <input
                required
                type="number"
                min={0}
                placeholder="45000"
                value={form.kilometrageDepart}
                onChange={e => set('kilometrageDepart', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caution (FCFA)</label>
              <input
                type="number"
                min={0}
                placeholder="100000"
                value={form.caution}
                onChange={e => set('caution', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">État de départ *</label>
            <textarea
              required
              rows={3}
              placeholder="Décrivez l'état du véhicule au départ (carrosserie, intérieur, niveaux...)"
              value={form.etatDepart}
              onChange={e => set('etatDepart', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
          <textarea
            aria-label="Notes"
            rows={2}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/contrats')}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !form.reservationId}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Création...' : 'Créer le contrat'}
          </button>
        </div>
      </form>
    </div>
  );
}
