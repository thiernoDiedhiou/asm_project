// Page catalogue de la flotte publique
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ChevronRight, Filter, SlidersHorizontal } from 'lucide-react';
import { publicApi } from '../../services/api';

interface VehiculePublic {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string;
  categorie: string;
  prixJournalier: string | number;
  prixSemaine: string | number;
  photos: string[];
  description?: string;
  nombreDisponibles: number;
  vehiculeIds: string[];
}

const CATEGORIES = ['TOUTES', 'ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'];

const CATEGORIE_LABELS: Record<string, string> = {
  ECONOMIQUE: 'Économique',
  STANDARD: 'Standard',
  SUV: 'SUV',
  LUXE: 'Luxe',
  UTILITAIRE: 'Utilitaire',
};

const CATEGORIE_COLORS: Record<string, string> = {
  ECONOMIQUE: 'bg-blue-100 text-blue-700',
  STANDARD: 'bg-green-100 text-green-700',
  SUV: 'bg-orange-100 text-orange-700',
  LUXE: 'bg-purple-100 text-purple-700',
  UTILITAIRE: 'bg-gray-200 text-gray-700',
};

function formatPrix(prix: string | number) {
  return Number(prix).toLocaleString('fr-FR') + ' FCFA';
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="flex items-end justify-between pt-2">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-9 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function FlottePage() {
  const navigate = useNavigate();
  const [vehicules, setVehicules] = useState<VehiculePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState('TOUTES');
  const [prixMax, setPrixMax] = useState<number>(500000);

  useEffect(() => {
    setLoading(true);
    publicApi.getVehicules()
      .then((res) => {
        const data = res.data?.data || [];
        setVehicules(data);
        // Calculer le prix max pour le slider
        if (data.length > 0) {
          const max = Math.max(...data.map((v: VehiculePublic) => Number(v.prixJournalier)));
          setPrixMax(Math.ceil(max / 10000) * 10000);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [prixFiltre, setPrixFiltre] = useState<number | null>(null);

  const vehiculesFiltres = vehicules.filter((v) => {
    if (categorie !== 'TOUTES' && v.categorie !== categorie) return false;
    if (prixFiltre !== null && Number(v.prixJournalier) > prixFiltre) return false;
    return true;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Notre Flotte</h1>
          <p className="text-gray-500 text-lg">
            {vehicules.length} modèle{vehicules.length > 1 ? 's' : ''} disponible{vehicules.length > 1 ? 's' : ''} —
            récents, assurés et prêts à partir
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Filtre catégorie */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mr-2">
                <Filter className="h-4 w-4" />
                Catégorie :
              </div>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategorie(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    categorie === cat
                      ? 'bg-asm-vert text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'TOUTES' ? 'Toutes' : CATEGORIE_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Filtre prix */}
            <div className="flex items-center gap-3 lg:ml-auto">
              <SlidersHorizontal className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600 whitespace-nowrap">Prix max / jour :</span>
              <input
                type="range"
                aria-label="Prix maximum par jour"
                min={10000}
                max={prixMax || 200000}
                step={5000}
                value={prixFiltre ?? (prixMax || 200000)}
                onChange={(e) => setPrixFiltre(Number(e.target.value))}
                className="w-36 accent-asm-vert"
              />
              <span className="text-sm font-semibold text-asm-vert whitespace-nowrap">
                {formatPrix(prixFiltre ?? (prixMax || 200000))}
              </span>
              {prixFiltre !== null && (
                <button
                  onClick={() => setPrixFiltre(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grille véhicules */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : vehiculesFiltres.length === 0 ? (
          <div className="text-center py-20">
            <Car className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Aucun véhicule ne correspond à vos filtres</p>
            <button
              onClick={() => { setCategorie('TOUTES'); setPrixFiltre(null); }}
              className="mt-4 text-asm-vert font-semibold hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehiculesFiltres.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden group border border-gray-100"
              >
                {/* Photo */}
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {v.photos?.[0] ? (
                    <img
                      src={v.photos[0]}
                      alt={`${v.marque} ${v.modele}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-asm-vert/10 to-asm-vert/5">
                      <Car className="h-16 w-16 text-asm-vert/25" />
                    </div>
                  )}
                  {/* Badge catégorie */}
                  <span
                    className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      CATEGORIE_COLORS[v.categorie] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {CATEGORIE_LABELS[v.categorie] || v.categorie}
                  </span>
                  {/* Badge disponibilités */}
                  {v.nombreDisponibles > 1 && (
                    <span className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-asm-vert text-white shadow">
                      {v.nombreDisponibles} disponibles
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900">
                    {v.marque} {v.modele}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {v.annee} · {v.couleur}
                  </p>
                  {v.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{v.description}</p>
                  )}

                  {/* Prix */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-extrabold text-asm-vert">
                        {formatPrix(v.prixJournalier)}
                      </p>
                      <p className="text-xs text-gray-400">/ jour</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-600">
                        {formatPrix(v.prixSemaine)}
                      </p>
                      <p className="text-xs text-gray-400">/ semaine</p>
                    </div>
                  </div>

                  {/* Bouton */}
                  <button
                    onClick={() => navigate(`/reserver?vehiculeId=${v.id}`)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-asm-vert text-white font-semibold rounded-xl hover:bg-asm-vert-clair transition-colors"
                  >
                    {v.nombreDisponibles > 1 ? 'Réserver ce modèle' : 'Réserver ce véhicule'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
