import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Car, User, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { reservationsApi, contratsApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatFCFA, formatDate, getStatutReservationColor, STATUT_LABELS, TYPE_TRAJET_LABELS } from '../../utils/format';
import { useIsAdmin, useIsAgent } from '../../store/authStore';

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isAgent = useIsAgent();
  const canEdit = isAdmin || isAgent;

  const [pendingStatut, setPendingStatut] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    ['reservation', id],
    () => reservationsApi.getById(id!),
    { enabled: Boolean(id) }
  );

  const r = data?.data;

  const TRANSITIONS: Record<string, { label: string; next: string; icon: React.ElementType; color: string }[]> = {
    EN_ATTENTE: [
      { label: 'Confirmer', next: 'CONFIRMEE', icon: CheckCircle, color: 'bg-blue-600 text-white' },
      { label: 'Annuler', next: 'ANNULEE', icon: XCircle, color: 'bg-red-100 text-red-700 border border-red-200' },
    ],
    CONFIRMEE: [
      { label: 'Démarrer', next: 'EN_COURS', icon: Car, color: 'bg-asm-vert text-white' },
      { label: 'Annuler', next: 'ANNULEE', icon: XCircle, color: 'bg-red-100 text-red-700 border border-red-200' },
    ],
    EN_COURS: [
      { label: 'Terminer', next: 'TERMINEE', icon: CheckCircle, color: 'bg-gray-700 text-white' },
    ],
  };

  function handleStatut(statut: string) {
    setPendingStatut(statut);
  }

  async function confirmStatut() {
    if (!pendingStatut) return;
    try {
      await reservationsApi.updateStatut(id!, { statut: pendingStatut });
      refetch();
    } catch {
      // error
    } finally {
      setPendingStatut(null);
    }
  }

  function handleCreerContrat() {
    navigate(`/contrats/nouveau?reservationId=${id}`);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>;
  }

  if (!r) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Réservation introuvable</p>
        <button onClick={() => navigate('/reservations')} className="mt-3 text-asm-vert hover:underline text-sm">Retour</button>
      </div>
    );
  }

  const transitions = TRANSITIONS[r.statut] || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button aria-label="Retour" onClick={() => navigate('/reservations')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Réservation #{r.id?.slice(-8).toUpperCase()}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatutReservationColor(r.statut)}`}>
                {STATUT_LABELS[r.statut] || r.statut}
              </span>
              <span className="text-gray-400 text-xs">{formatDate(r.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions de transition */}
        {canEdit && transitions.length > 0 && (
          <div className="flex gap-2">
            {transitions.map(({ label, next, icon: Icon, color }) => (
              <button key={next} onClick={() => handleStatut(next)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${color}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <User className="h-4 w-4" /> Client
          </h2>
          <div className="space-y-2 text-sm">
            <div className="text-gray-900 font-semibold text-base">{r.client?.prenom} {r.client?.nom}</div>
            {r.client?.telephone && <div className="text-gray-500">{r.client.telephone}</div>}
            {r.client?.email && <div className="text-gray-500">{r.client.email}</div>}
            <button onClick={() => navigate(`/clients/${r.client?.id}`)} className="text-asm-vert hover:underline text-xs mt-2">
              Voir la fiche client →
            </button>
          </div>
        </div>

        {/* Véhicule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Car className="h-4 w-4" /> Véhicule
          </h2>
          <div className="space-y-2 text-sm">
            <div className="text-gray-900 font-semibold text-base">{r.vehicule?.marque} {r.vehicule?.modele}</div>
            <div className="font-mono text-gray-500">{r.vehicule?.immatriculation}</div>
            <button onClick={() => navigate(`/vehicules/${r.vehicule?.id}`)} className="text-asm-vert hover:underline text-xs mt-2">
              Voir le véhicule →
            </button>
          </div>
        </div>
      </div>

      {/* Détails location */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Détails de la location
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Date de début', value: formatDate(r.dateDebut) },
            { label: 'Date de fin', value: formatDate(r.dateFin) },
            { label: 'Type de trajet', value: TYPE_TRAJET_LABELS[r.typeTrajet] || r.typeTrajet },
            { label: 'Lieu de départ', value: r.lieuPriseEnCharge },
            { label: 'Lieu de retour', value: r.lieuRetour },
            { label: 'Avance versée', value: formatFCFA(r.avance) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-gray-500 mb-0.5">{label}</div>
              <div className="font-medium text-gray-900">{value || '-'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {r.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notes
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{r.notes}</p>
        </div>
      )}

      {/* Montant */}
      <div className="bg-asm-vert-pale rounded-xl p-5 border border-asm-vert/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Montant total</div>
            <div className="text-3xl font-bold text-asm-vert">{formatFCFA(r.prixTotal)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Avance : {formatFCFA(r.avance)}</div>
            <div className="text-sm font-medium text-red-600">Reste : {formatFCFA((r.prixTotal || 0) - (r.avance || 0))}</div>
          </div>
        </div>
      </div>

      {/* Contrat associé */}
      {r.contrat ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-asm-vert" />
              <div>
                <div className="font-semibold text-gray-900">Contrat {r.contrat.numeroContrat}</div>
                <div className="text-sm text-gray-500">Statut: {STATUT_LABELS[r.contrat.statut] || r.contrat.statut}</div>
              </div>
            </div>
            <button onClick={() => navigate(`/contrats/${r.contrat.id}`)} className="text-asm-vert hover:underline text-sm">
              Voir le contrat →
            </button>
          </div>
        </div>
      ) : canEdit && r.statut === 'CONFIRMEE' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm text-yellow-800">
            <span className="font-medium">Aucun contrat associé.</span> Créez un contrat pour formaliser cette location.
          </div>
          <button onClick={handleCreerContrat} className="flex items-center gap-1.5 bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-700 transition-colors">
            <FileText className="h-4 w-4" /> Créer le contrat
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingStatut}
        title="Changer le statut"
        message={`Passer la réservation en "${STATUT_LABELS[pendingStatut ?? ''] || pendingStatut}" ?`}
        confirmLabel="Confirmer"
        variant={pendingStatut === 'ANNULEE' ? 'danger' : 'info'}
        onConfirm={confirmStatut}
        onCancel={() => setPendingStatut(null)}
      />
    </div>
  );
}
