import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { clientsApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatFCFA, formatDate, getStatutReservationColor, STATUT_LABELS } from '../../utils/format';
import { useIsAdmin, useIsAgent } from '../../store/authStore';

const TYPE_LABELS: Record<string, string> = { PARTICULIER: 'Particulier', ENTREPRISE: 'Entreprise', VIP: 'VIP' };
const TYPE_COLORS: Record<string, string> = { PARTICULIER: 'bg-gray-100 text-gray-700', ENTREPRISE: 'bg-blue-100 text-blue-700', VIP: 'bg-yellow-100 text-yellow-800' };

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isAgent = useIsAgent();

  const { data, isLoading } = useQuery(['client', id], () => clientsApi.getHistorique(id!), { enabled: Boolean(id) });

  const responseData = data?.data;
  const client = responseData?.client;
  const reservations: Array<{ id: string; statut: string; prixTotal: number; dateDebut: string; dateFin: string; vehicule?: { marque: string; modele: string } }> = responseData?.reservations || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>;
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-gray-500">
        <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Client introuvable</p>
        <button type="button" onClick={() => navigate('/clients')} className="mt-3 text-asm-vert hover:underline text-sm">Retour</button>
      </div>
    );
  }

  const totalDepense = reservations
    .filter(r => r.statut !== 'ANNULEE')
    .reduce((s, r) => s + (r.prixTotal || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button aria-label="Retour" onClick={() => navigate('/clients')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.prenom} {client.nom}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[client.typeClient] || 'bg-gray-100 text-gray-700'}`}>
              {TYPE_LABELS[client.typeClient] || client.typeClient}
            </span>
          </div>
        </div>
        {(isAdmin || isAgent) && (
          <button onClick={() => navigate(`/clients/${id}/modifier`)} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Edit className="h-4 w-4" /> Modifier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Coordonnées */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <User className="h-4 w-4" /> Coordonnées
          </h2>
          <div className="space-y-3">
            {client.telephone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{client.telephone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{client.email}</span>
              </div>
            )}
            {client.adresse && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{client.adresse}</span>
              </div>
            )}
            {client.numeroCNI && (
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">CNI: {client.numeroCNI}</span>
              </div>
            )}
            {client.societe && (
              <div className="text-sm text-gray-600">Société: <span className="font-medium">{client.societe}</span></div>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Statistiques</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total réservations</span>
              <span className="font-bold text-gray-900">{reservations.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Locations effectuées</span>
              <span className="font-bold text-gray-900">{reservations.filter((r: { statut: string }) => r.statut === 'TERMINEE').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total dépensé</span>
              <span className="font-bold text-asm-vert">{formatFCFA(totalDepense)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Client depuis</span>
              <span className="font-medium text-gray-700">{formatDate(client.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historique réservations */}
      {reservations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Historique des locations</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Véhicule</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Période</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map((r: { id: string; vehicule?: { marque: string; modele: string }; dateDebut: string; dateFin: string; prixTotal: number; statut: string }) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.vehicule?.marque} {r.vehicule?.modele}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(r.dateDebut)} → {formatDate(r.dateFin)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-right">{formatFCFA(r.prixTotal)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatutReservationColor(r.statut)}`}>
                      {STATUT_LABELS[r.statut] || r.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
