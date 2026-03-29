// Page publique — Flotte globale (admin.location.innosft.com/flotte)
// Accessible sans authentification, liste tous les véhicules de toutes les agences actives
import { useState } from 'react';
import { Car, Search, Building2, ExternalLink, Phone } from 'lucide-react';
import { useQuery } from '../../components/hooks/useQuery';
import { publicApi } from '../../services/api';
import { formatFCFA, getStatutVehiculeColor, STATUT_LABELS, CATEGORIE_LABELS } from '../../utils/format';

const STATUTS    = ['DISPONIBLE', 'LOUE', 'EN_MAINTENANCE', 'HORS_SERVICE'];
const CATEGORIES = ['ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'];

interface VehiculePublic {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string;
  categorie: string;
  statut: string;
  prixJournalier: number;
  prixSemaine: number;
  photos: string[];
  tenant: {
    slug: string;
    nomEntreprise: string;
    couleurPrimaire: string;
  };
}

export function FlottePubliquePage() {
  const [search, setSearch]             = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');

  const { data, isLoading } = useQuery(
    ['flotte-globale-publique'],
    () => publicApi.getFlotteGlobale()
  );

  const tous: VehiculePublic[] = data?.data ?? [];

  const vehicules = tous.filter((v) => {
    if (filterStatut && v.statut !== filterStatut) return false;
    if (filterCategorie && v.categorie !== filterCategorie) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.marque.toLowerCase().includes(q) ||
        v.modele.toLowerCase().includes(q) ||
        v.tenant.nomEntreprise.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const nbDisponibles = tous.filter((v) => v.statut === 'DISPONIBLE').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête hero */}
      <div className="bg-asm-vert text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-asm-or flex items-center justify-center">
              <Car className="h-6 w-6 text-asm-vert" />
            </div>
            <h1 className="text-3xl font-bold">InnoSoft Location</h1>
          </div>
          <p className="text-white/80 text-lg mb-2">Flotte globale — toutes les agences</p>
          <p className="text-asm-or font-semibold text-xl">
            {nbDisponibles} véhicule{nbDisponibles > 1 ? 's' : ''} disponible{nbDisponibles > 1 ? 's' : ''} en ce moment
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Filtres */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Marque, modèle, agence..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert"
            />
          </div>

          <select
            aria-label="Filtrer par statut"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>

          <select
            aria-label="Filtrer par catégorie"
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORIE_LABELS[c]}</option>
            ))}
          </select>

          {(filterStatut || filterCategorie || search) && (
            <button
              onClick={() => { setSearch(''); setFilterStatut(''); setFilterCategorie(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Compteur résultats */}
        {!isLoading && (
          <p className="text-sm text-gray-500">
            {vehicules.length} véhicule{vehicules.length > 1 ? 's' : ''} trouvé{vehicules.length > 1 ? 's' : ''}
          </p>
        )}

        {/* Grille */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin h-8 w-8 border-4 border-asm-vert border-t-transparent rounded-full" />
          </div>
        ) : vehicules.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Car className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun véhicule trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essayez d'autres critères de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {vehicules.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Photo */}
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  {v.photos?.[0] ? (
                    <img
                      src={v.photos[0]}
                      alt={`${v.marque} ${v.modele}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Car className="h-14 w-14 text-gray-300" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatutVehiculeColor(v.statut)}`}>
                    {STATUT_LABELS[v.statut]}
                  </span>
                </div>

                {/* Infos */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Badge agence */}
                  <a
                    href={`https://${v.tenant.slug}.location.innosft.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold text-white w-fit"
                    style={{ backgroundColor: v.tenant.couleurPrimaire }}
                  >
                    <Building2 className="h-3 w-3" />
                    {v.tenant.nomEntreprise}
                    <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                  </a>

                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900">{v.marque} {v.modele}</h3>
                      <p className="text-xs text-gray-500">{v.annee} • {v.couleur}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {CATEGORIE_LABELS[v.categorie]}
                    </span>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-500 text-xs">À partir de</span>
                      <div className="text-right">
                        <span className="font-bold text-asm-vert">{formatFCFA(v.prixJournalier)}/j</span>
                        {v.prixSemaine > 0 && (
                          <span className="text-gray-400 text-xs ml-1">| {formatFCFA(v.prixSemaine)}/sem</span>
                        )}
                      </div>
                    </div>
                    {v.statut === 'DISPONIBLE' && (
                      <a
                        href={`https://${v.tenant.slug}.location.innosft.com/reserver`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-asm-vert text-white text-sm font-semibold rounded-lg hover:bg-asm-vert-clair transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Réserver maintenant
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer minimal */}
        <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-100">
          <a href="https://location.innosft.com" className="hover:text-asm-vert transition-colors font-medium">
            Propulsé par InnoSoft Location
          </a>
          {' '}— Plateforme de location de véhicules multi-agences
        </div>
      </div>
    </div>
  );
}
