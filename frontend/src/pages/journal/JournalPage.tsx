// Page journal d'activité — admin uniquement
import { useState } from 'react';
import { useQuery } from '../../components/hooks/useQuery';
import { journalApi } from '../../services/api';
import { formatDate } from '../../utils/format';
import {
  Activity,
  Search,
  Filter,
  User,
  LogIn,
  LogOut,
  Car,
  FileText,
  DollarSign,
  Wrench,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ---- Types ----
interface JournalEntry {
  id: string;
  userId: string;
  userNom: string;
  userRole: string;
  action: string;
  entite: string;
  entiteId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface JournalUser {
  userId: string;
  userNom: string;
  userRole: string;
}

// ---- Labels et couleurs ----
const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  RESERVATION_CREEE: 'Réservation créée',
  RESERVATION_STATUT_MODIFIE: 'Statut réservation modifié',
  RESERVATION_SUPPRIMEE: 'Réservation supprimée',
  CONTRAT_CREE: 'Contrat créé',
  CONTRAT_CLOTURE: 'Contrat clôturé',
  PAIEMENT_ENREGISTRE: 'Paiement enregistré',
  PAIEMENT_VALIDE: 'Paiement validé',
  PAIEMENT_INVALIDE: 'Paiement invalidé',
  VEHICULE_CREE: 'Véhicule ajouté',
  VEHICULE_MODIFIE: 'Véhicule modifié',
  VEHICULE_SUPPRIME: 'Véhicule supprimé',
  MAINTENANCE_CREEE: 'Maintenance créée',
  MAINTENANCE_MODIFIEE: 'Maintenance mise à jour',
  CLIENT_CREE: 'Client créé',
  CLIENT_MODIFIE: 'Client modifié',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  RESERVATION_CREEE: 'bg-blue-100 text-blue-700',
  RESERVATION_STATUT_MODIFIE: 'bg-sky-100 text-sky-700',
  RESERVATION_SUPPRIMEE: 'bg-red-100 text-red-700',
  CONTRAT_CREE: 'bg-purple-100 text-purple-700',
  CONTRAT_CLOTURE: 'bg-violet-100 text-violet-700',
  PAIEMENT_ENREGISTRE: 'bg-yellow-100 text-yellow-700',
  PAIEMENT_VALIDE: 'bg-emerald-100 text-emerald-700',
  PAIEMENT_INVALIDE: 'bg-red-100 text-red-600',
  VEHICULE_CREE: 'bg-orange-100 text-orange-700',
  VEHICULE_MODIFIE: 'bg-amber-100 text-amber-700',
  VEHICULE_SUPPRIME: 'bg-red-100 text-red-700',
  MAINTENANCE_CREEE: 'bg-indigo-100 text-indigo-700',
  MAINTENANCE_MODIFIEE: 'bg-indigo-100 text-indigo-600',
  CLIENT_CREE: 'bg-teal-100 text-teal-700',
  CLIENT_MODIFIE: 'bg-teal-100 text-teal-600',
};

const ENTITE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  AUTH: LogIn,
  RESERVATION: FileText,
  CONTRAT: FileText,
  PAIEMENT: DollarSign,
  VEHICULE: Car,
  MAINTENANCE: Wrench,
  CLIENT: Users,
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-asm-or/20 text-yellow-700',
  AGENT: 'bg-blue-100 text-blue-700',
  COMPTABLE: 'bg-purple-100 text-purple-700',
};

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return '';
  const parts: string[] = [];
  if (details.email) parts.push(`${details.email}`);
  if (details.numeroReservation) parts.push(`Réf. ${details.numeroReservation}`);
  if (details.numeroContrat) parts.push(`N° ${details.numeroContrat}`);
  if (details.montant) parts.push(`${Number(details.montant).toLocaleString('fr-FR')} FCFA`);
  if (details.methode) parts.push(`${details.methode}`);
  if (details.nouveauStatut) parts.push(`→ ${details.nouveauStatut}`);
  if (details.marque && details.modele) parts.push(`${details.marque} ${details.modele}`);
  if (details.nom) parts.push(`${details.nom}`);
  if (details.champsModifies && Array.isArray(details.champsModifies)) {
    parts.push(`Champs : ${(details.champsModifies as string[]).join(', ')}`);
  }
  return parts.join(' · ') || JSON.stringify(details);
}

const LIMIT = 50;

export function JournalPage() {
  const [page, setPage] = useState(1);
  const [filtreUserId, setFiltreUserId] = useState('');
  const [filtreAction, setFiltreAction] = useState('');
  const [filtreEntite, setFiltreEntite] = useState('');
  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');

  // Récupérer la liste des agents pour le filtre
  const { data: usersData } = useQuery(
    ['journal-users'],
    () => journalApi.getUsers()
  );
  const users: JournalUser[] = usersData?.data || [];

  // Récupérer le journal
  const params: Record<string, unknown> = { page, limit: LIMIT };
  if (filtreUserId) params.userId = filtreUserId;
  if (filtreAction) params.action = filtreAction;
  if (filtreEntite) params.entite = filtreEntite;
  if (filtreDateDebut) params.dateDebut = filtreDateDebut;
  if (filtreDateFin) params.dateFin = filtreDateFin;

  const { data: journalData, isLoading } = useQuery(
    ['journal', page, filtreUserId, filtreAction, filtreEntite, filtreDateDebut, filtreDateFin],
    () => journalApi.getAll(params)
  );

  const entries: JournalEntry[] = journalData?.data || [];
  const pagination = journalData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

  const resetFiltres = () => {
    setFiltreUserId('');
    setFiltreAction('');
    setFiltreEntite('');
    setFiltreDateDebut('');
    setFiltreDateFin('');
    setPage(1);
  };

  const hasFiltres = filtreUserId || filtreAction || filtreEntite || filtreDateDebut || filtreDateFin;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-asm-vert" />
            Journal d'activité
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Traçabilité complète de toutes les actions des utilisateurs
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {total} entrée{total > 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres</span>
          {hasFiltres && (
            <button
              type="button"
              onClick={resetFiltres}
              className="ml-auto text-xs text-asm-vert hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Par agent */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Agent</label>
            <select
              aria-label="Filtrer par agent"
              value={filtreUserId}
              onChange={(e) => { setFiltreUserId(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
            >
              <option value="">Tous les agents</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.userNom} ({u.userRole})
                </option>
              ))}
            </select>
          </div>

          {/* Par action */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action</label>
            <select
              aria-label="Filtrer par type d'action"
              value={filtreAction}
              onChange={(e) => { setFiltreAction(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
            >
              <option value="">Toutes les actions</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Par entité */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Module</label>
            <select
              aria-label="Filtrer par module"
              value={filtreEntite}
              onChange={(e) => { setFiltreEntite(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
            >
              <option value="">Tous les modules</option>
              {['AUTH', 'RESERVATION', 'CONTRAT', 'PAIEMENT', 'VEHICULE', 'MAINTENANCE', 'CLIENT'].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Date début */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input
              type="date"
              aria-label="Date de début du filtre"
              value={filtreDateDebut}
              onChange={(e) => { setFiltreDateDebut(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input
              type="date"
              aria-label="Date de fin du filtre"
              value={filtreDateFin}
              onChange={(e) => { setFiltreDateFin(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert"
            />
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin h-6 w-6 border-4 border-asm-vert border-t-transparent rounded-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune activité trouvée</p>
            <p className="text-gray-400 text-sm mt-1">
              {hasFiltres ? 'Essayez de modifier les filtres' : 'Les actions seront affichées ici'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date & Heure
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Agent
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Module
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => {
                  const EntiteIcon = ENTITE_ICONS[entry.entite] || Activity;
                  const detail = formatDetails(entry.details);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(entry.createdAt)}
                        <span className="block text-xs text-gray-400">
                          {new Date(entry.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Agent */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-asm-vert/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-asm-vert" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-xs">{entry.userNom}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[entry.userRole] || 'bg-gray-100 text-gray-600'}`}>
                              {entry.userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700'}`}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <EntiteIcon className="h-3.5 w-3.5" />
                          <span className="text-xs">{entry.entite}</span>
                        </div>
                      </td>

                      {/* Détails */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-gray-500 truncate" title={detail}>
                          {detail || '—'}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} sur {totalPages} · {total} entrées
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Page précédente"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Page suivante"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
