// Page de gestion des clients
import { useState } from 'react';
import { Plus, Search, Eye, Edit, Phone, Mail, Building2, User, Star, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../components/hooks/useQuery';
import { clientsApi } from '../../services/api';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(
    ['clients', filterType, search, String(page)],
    () =>
      clientsApi.getAll({
        ...(search && { search }),
        ...(filterType && { typeClient: filterType }),
        page,
        limit: 15,
      })
  );

  const clients = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{pagination?.total || 0} clients enregistrés</p>
        </div>
        <button
          onClick={() => navigate('/clients/nouveau')}
          className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2.5 rounded-lg font-medium hover:bg-asm-vert-clair transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, téléphone, email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert"
          />
        </div>
        <select
          aria-label="Filtrer par type de client"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
        >
          <option value="">Tous les types</option>
          <option value="PARTICULIER">Particulier</option>
          <option value="ENTREPRISE">Entreprise</option>
          <option value="VIP">VIP</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Documents</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Locations</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-4 border-asm-vert border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-10">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                clients.map((client: {
                  id: string;
                  nom: string;
                  prenom: string;
                  email?: string;
                  telephone: string;
                  adresse?: string;
                  typeClient: string;
                  societe?: string;
                  numeroCNI?: string;
                  permisConduire?: string;
                  notes?: string;
                  _count?: { reservations: number };
                }) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-asm-vert-pale flex items-center justify-center text-asm-vert font-semibold text-sm">
                          {client.prenom?.[0]}{client.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.prenom} {client.nom}
                          </p>
                          {client.adresse && (
                            <p className="text-xs text-gray-400 truncate max-w-48">{client.adresse}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {client.telephone}
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                          client.typeClient === 'ENTREPRISE'
                            ? 'bg-blue-100 text-blue-700'
                            : client.typeClient === 'VIP'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {client.typeClient === 'ENTREPRISE' ? (
                            <Building2 className="h-3 w-3" />
                          ) : client.typeClient === 'VIP' ? (
                            <Star className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {client.typeClient === 'ENTREPRISE' ? 'Entreprise'
                            : client.typeClient === 'VIP' ? 'VIP'
                            : 'Particulier'}
                        </span>
                        {client.societe && (
                          <span className="text-xs text-gray-500 truncate max-w-[140px]">{client.societe}</span>
                        )}
                        {client.notes && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic" title={client.notes}>
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{client.notes}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 space-y-0.5">
                      {client.numeroCNI && <p>CNI: {client.numeroCNI}</p>}
                      {client.permisConduire && <p>Permis: {client.permisConduire}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 bg-asm-vert-pale text-asm-vert rounded-full text-xs font-semibold">
                        {client._count?.reservations || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="p-1.5 text-gray-400 hover:text-asm-vert hover:bg-asm-vert-pale rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${client.id}/modifier`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{pagination.total} clients au total</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
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
