import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Car, User, Calendar, FileText, CheckCircle, XCircle, CalendarPlus } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { reservationsApi } from '../../services/api';
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
  const [showProlonger, setShowProlonger] = useState(false);
  const [nouvelleDataFin, setNouvelleDataFin] = useState('');
  const [prolongerLoading, setProlongerLoading] = useState(false);
  const [prolongerError, setProlongerError] = useState('');

  const { data, isLoading, refetch } = useQuery(
    ['reservation', id],
    () => reservationsApi.getById(id!),
    { enabled: Boolean(id) }
  );

  const r = data?.data;

  // Estimation côté client (prixJournalier du véhicule × nouveaux jours)
  const prixEstime = useMemo(() => {
    if (!r || !nouvelleDataFin) return null;
    const fin = new Date(nouvelleDataFin);
    const debut = new Date(r.dateDebut);
    const actuelle = new Date(r.dateFin);
    if (fin <= actuelle) return null;
    const totalJours = Math.max(1, Math.ceil((fin.getTime() - debut.getTime()) / 86400000));
    const prixJ = Number(r.vehicule?.prixJournalier ?? 0);
    const prixS = Number(r.vehicule?.prixSemaine ?? prixJ * 6);
    const semaines = Math.floor(totalJours / 7);
    const joursRestants = totalJours % 7;
    return semaines * prixS + joursRestants * prixJ;
  }, [r, nouvelleDataFin]);

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

  function openProlonger() {
    setNouvelleDataFin('');
    setProlongerError('');
    setShowProlonger(true);
  }

  async function handleProlonger() {
    if (!nouvelleDataFin) { setProlongerError('Veuillez sélectionner une date.'); return; }
    setProlongerLoading(true);
    setProlongerError('');
    try {
      await reservationsApi.prolonger(id!, nouvelleDataFin);
      setShowProlonger(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la prolongation';
      setProlongerError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? msg);
    } finally {
      setProlongerLoading(false);
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
  const canProlonger = canEdit && ['CONFIRMEE', 'EN_COURS'].includes(r.statut);

  // Date minimale pour la prolongation : lendemain de la date de fin actuelle
  const minDateProlonger = (() => {
    const d = new Date(r.dateFin);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
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

        {/* Actions */}
        {canEdit && (
          <div className="flex flex-wrap gap-2 justify-end">
            {transitions.map(({ label, next, icon: Icon, color }) => (
              <button key={next} onClick={() => handleStatut(next)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${color}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
            {canProlonger && (
              <button onClick={openProlonger}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-asm-or text-asm-vert hover:bg-yellow-400 transition-colors">
                <CalendarPlus className="h-4 w-4" /> Prolonger
              </button>
            )}
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
            { label: 'Durée', value: `${r.nombreJours} jour${r.nombreJours > 1 ? 's' : ''}` },
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

      {/* Dialog changement de statut */}
      <ConfirmDialog
        open={!!pendingStatut}
        title="Changer le statut"
        message={`Passer la réservation en "${STATUT_LABELS[pendingStatut ?? ''] || pendingStatut}" ?`}
        confirmLabel="Confirmer"
        variant={pendingStatut === 'ANNULEE' ? 'danger' : 'info'}
        onConfirm={confirmStatut}
        onCancel={() => setPendingStatut(null)}
      />

      {/* Modal prolongation */}
      {showProlonger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-asm-or/20 flex items-center justify-center">
                <CalendarPlus className="h-5 w-5 text-asm-vert" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Prolonger la réservation</h2>
                <p className="text-xs text-gray-500">#{r.id?.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* Durée actuelle */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Date de début</span>
                <span className="font-medium">{formatDate(r.dateDebut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date de fin actuelle</span>
                <span className="font-medium text-orange-600">{formatDate(r.dateFin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Durée actuelle</span>
                <span className="font-medium">{r.nombreJours} jour{r.nombreJours > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Sélecteur nouvelle date de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nouvelle date de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={nouvelleDataFin}
                min={minDateProlonger}
                onChange={e => { setNouvelleDataFin(e.target.value); setProlongerError(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
              />
            </div>

            {/* Estimation du nouveau prix */}
            {nouvelleDataFin && prixEstime !== null && (
              <div className="bg-asm-vert/5 border border-asm-vert/20 rounded-xl p-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Nouveau montant estimé</span>
                  <span className="text-xl font-bold text-asm-vert">{formatFCFA(prixEstime)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Le prix exact est calculé par le serveur (remises éventuelles comprises).
                </p>
              </div>
            )}

            {/* Erreur */}
            {prolongerError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {prolongerError}
              </p>
            )}

            {/* Boutons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowProlonger(false)}
                disabled={prolongerLoading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleProlonger}
                disabled={prolongerLoading || !nouvelleDataFin}
                className="flex-1 px-4 py-2.5 rounded-lg bg-asm-vert text-white text-sm font-semibold hover:bg-asm-vert/90 transition-colors disabled:opacity-50"
              >
                {prolongerLoading ? 'En cours…' : 'Confirmer la prolongation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
