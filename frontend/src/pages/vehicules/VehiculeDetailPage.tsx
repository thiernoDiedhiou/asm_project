import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ArrowLeft, Edit, Trash2, Car, Wrench, Calendar, ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { vehiculesApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatFCFA, formatDate, getStatutVehiculeColor, STATUT_LABELS, CATEGORIE_LABELS } from '../../utils/format';
import { useIsAdmin } from '../../store/authStore';

export function VehiculeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading } = useQuery(['vehicule', id], () => vehiculesApi.getById(id!), { enabled: Boolean(id) });

  const v = data?.data;

  async function confirmDelete() {
    try {
      await vehiculesApi.delete(id!);
      navigate('/vehicules');
    } catch {
      setShowDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>;
  }

  if (!v) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Car className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Véhicule introuvable</p>
        <button type="button" onClick={() => navigate('/vehicules')} className="mt-3 text-asm-vert hover:underline text-sm">Retour</button>
      </div>
    );
  }

  const photos: string[] = v.photos || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Retour" onClick={() => navigate('/vehicules')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{v.marque} {v.modele}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-gray-500">{v.immatriculation}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatutVehiculeColor(v.statut)}`}>
                {STATUT_LABELS[v.statut] || v.statut}
              </span>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(`/vehicules/${id}/modifier`)} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Edit className="h-4 w-4" /> Modifier
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Galerie photos */}
      {photos.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative h-64 bg-gray-100">
            <img
              src={photos[photoIndex]}
              alt={`${v.marque} ${v.modele} - photo ${photoIndex + 1}`}
              className="h-full w-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  title="Photo précédente"
                  onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="Photo suivante"
                  onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      title={`Photo ${i + 1}`}
                      onClick={() => setPhotoIndex(i)}
                      className={`h-2 w-2 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/60'}`}
                    />
                  ))}
                </div>
              </>
            )}
            <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full">
              {photoIndex + 1} / {photos.length}
            </span>
          </div>
          {/* Miniatures */}
          {photos.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  title={`Voir photo ${i + 1}`}
                  onClick={() => setPhotoIndex(i)}
                  className={`flex-shrink-0 h-16 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                    i === photoIndex ? 'border-asm-vert' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Miniature ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-48 flex flex-col items-center justify-center text-gray-300 gap-3">
          <Image className="h-12 w-12" />
          <div className="text-center">
            <p className="text-sm text-gray-400">Aucune photo disponible</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate(`/vehicules/${id}/modifier`)}
                className="mt-2 text-xs text-asm-vert hover:underline"
              >
                Ajouter des photos →
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Informations générales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Car className="h-4 w-4" /> Informations générales
          </h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: 'Marque', value: v.marque },
              { label: 'Modèle', value: v.modele },
              { label: 'Année', value: v.annee },
              { label: 'Couleur', value: v.couleur },
              { label: 'Catégorie', value: CATEGORIE_LABELS[v.categorie] || v.categorie },
              { label: 'Kilométrage', value: `${(v.kilometrage || 0).toLocaleString()} km` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Tarification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Tarification</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Prix journalier</dt>
              <dd className="font-bold text-gray-900">{formatFCFA(v.prixJournalier)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Prix à la semaine</dt>
              <dd className="font-bold text-gray-900">{formatFCFA(v.prixSemaine)}</dd>
            </div>
            {v._count && (
              <div className="flex justify-between pt-2 border-t border-gray-50">
                <dt className="text-gray-500">Total réservations</dt>
                <dd className="font-bold text-asm-vert">{v._count.reservations}</dd>
              </div>
            )}
          </dl>
          {v.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">{v.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Réservations récentes */}
      {v.reservations && v.reservations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Dernières réservations
          </h2>
          <div className="space-y-2">
            {v.reservations.slice(0, 5).map((r: { id: string; client?: { prenom: string; nom: string }; dateDebut: string; dateFin: string; statut: string; prixTotal: number }) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate(`/reservations/${r.id}`)}>
                <div>
                  <span className="font-medium">{r.client?.prenom} {r.client?.nom}</span>
                  <span className="text-gray-400 ml-2">{formatDate(r.dateDebut)} → {formatDate(r.dateFin)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatFCFA(r.prixTotal)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.statut === 'TERMINEE' ? 'bg-gray-100 text-gray-600' : r.statut === 'EN_COURS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {STATUT_LABELS[r.statut] || r.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenances */}
      {v.maintenances && v.maintenances.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Historique maintenances
          </h2>
          <div className="space-y-2">
            {v.maintenances.slice(0, 5).map((m: { id: string; type: string; description: string; dateDebut: string; cout: number; statut: string }) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <span className="font-medium">{m.type}</span>
                  <span className="text-gray-400 ml-2 text-xs">{formatDate(m.dateDebut)}</span>
                  {m.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{m.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                    m.statut === 'EN_COURS' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{m.statut}</span>
                  <span className="font-medium text-gray-700">{m.cout ? formatFCFA(m.cout) : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Supprimer le véhicule"
        message="Cette action est irréversible. Le véhicule sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
