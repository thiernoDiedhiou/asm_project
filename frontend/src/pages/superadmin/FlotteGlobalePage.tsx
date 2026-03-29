// Page flotte globale — Super Admin
// Affiche tous les véhicules de tous les tenants actifs
import { useState } from 'react';
import { Car, Search, Building2, ExternalLink } from 'lucide-react';
import { useQuery } from '../../components/hooks/useQuery';
import { superAdminApi } from '../../services/api';
import { formatFCFA, getStatutVehiculeColor, STATUT_LABELS, CATEGORIE_LABELS } from '../../utils/format';

const STATUTS    = ['DISPONIBLE', 'LOUE', 'EN_MAINTENANCE', 'HORS_SERVICE'];
const CATEGORIES = ['ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'];

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string;
  immatriculation: string;
  categorie: string;
  statut: string;
  kilometrage: number;
  prixJournalier: number;
  prixSemaine: number;
  photos: string[];
  tenant: {
    id: string;
    slug: string;
    nomEntreprise: string;
    couleurPrimaire: string;
  };
}

export function FlotteGlobalePage() {
  const [search, setSearch]               = useState('');
  const [filterStatut, setFilterStatut]   = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterTenant, setFilterTenant]   = useState('');

  const { data, isLoading } = useQuery(
    ['super-admin-vehicules'],
    () => superAdminApi.getAllVehicules()
  );

  const tous: Vehicule[] = data?.data?.data ?? data?.data ?? [];

  // Filtrage local
  const vehicules = tous.filter((v) => {
    if (filterStatut && v.statut !== filterStatut) return false;
    if (filterCategorie && v.categorie !== filterCategorie) return false;
    if (filterTenant && v.tenant.id !== filterTenant) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.marque.toLowerCase().includes(q) ||
        v.modele.toLowerCase().includes(q) ||
        v.immatriculation.toLowerCase().includes(q) ||
        v.tenant.nomEntreprise.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Liste unique des tenants pour le filtre
  const tenants = Array.from(
    new Map(tous.map((v) => [v.tenant.id, v.tenant])).values()
  ).sort((a, b) => a.nomEntreprise.localeCompare(b.nomEntreprise));

  // Compteurs par statut
  const nbDisponibles  = tous.filter((v) => v.statut === 'DISPONIBLE').length;
  const nbLoues        = tous.filter((v) => v.statut === 'LOUE').length;
  const nbMaintenance  = tous.filter((v) => v.statut === 'EN_MAINTENANCE').length;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Flotte globale</h1>
        <p className="text-gray-500 text-sm">
          {tous.length} véhicule{tous.length > 1 ? 's' : ''} répartis sur {tenants.length} agence{tenants.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: tous.length,      color: 'bg-gray-50   border-gray-200  text-gray-700' },
          { label: 'Disponibles',  value: nbDisponibles,    color: 'bg-green-50  border-green-200 text-green-700' },
          { label: 'Loués',        value: nbLoues,          color: 'bg-blue-50   border-blue-200  text-blue-700' },
          { label: 'Maintenance',  value: nbMaintenance,    color: 'bg-orange-50 border-orange-200 text-orange-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        {/* Recherche */}
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Marque, modèle, immat., agence..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert"
          />
        </div>

        {/* Filtre agence */}
        <select
          aria-label="Filtrer par agence"
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert bg-white"
        >
          <option value="">Toutes les agences</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.nomEntreprise}</option>
          ))}
        </select>

        {/* Filtre statut */}
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

        {/* Filtre catégorie */}
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
      </div>

      {/* Résultats */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-asm-vert border-t-transparent rounded-full" />
        </div>
      ) : vehicules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Car className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Aucun véhicule trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicules.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Photo */}
              <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                {v.photos?.[0] ? (
                  <img
                    src={v.photos[0]}
                    alt={`${v.marque} ${v.modele}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-12 w-12 text-gray-300" />
                )}
                {/* Badge statut */}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatutVehiculeColor(v.statut)}`}>
                  {STATUT_LABELS[v.statut]}
                </span>
              </div>

              {/* Infos */}
              <div className="p-4">
                {/* Badge agence */}
                <a
                  href={`https://${v.tenant.slug}.location.innosft.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: v.tenant.couleurPrimaire }}
                >
                  <Building2 className="h-3 w-3" />
                  {v.tenant.nomEntreprise}
                  <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                </a>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {v.marque} {v.modele}
                    </h3>
                    <p className="text-xs text-gray-500">{v.annee} • {v.couleur}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {CATEGORIE_LABELS[v.categorie]}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono font-semibold text-gray-700">{v.immatriculation}</span>
                  <span>{v.kilometrage.toLocaleString('fr-SN')} km</span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Tarif :</span>
                  <div className="text-right">
                    <span className="font-semibold text-asm-vert">{formatFCFA(v.prixJournalier)}/j</span>
                    <span className="text-gray-400 ml-1">| {formatFCFA(v.prixSemaine)}/sem</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
