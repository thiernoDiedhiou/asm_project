// Page d'accueil vitrine ASM Multi-Services
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Shield,
  Clock,
  Star,
  ChevronRight,
  Plane,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
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
}

const CATEGORIE_COLORS: Record<string, string> = {
  ECONOMIQUE: 'bg-blue-100 text-blue-700',
  STANDARD: 'bg-green-100 text-green-700',
  SUV: 'bg-orange-100 text-orange-700',
  LUXE: 'bg-purple-100 text-purple-700',
  UTILITAIRE: 'bg-gray-100 text-gray-700',
};

function formatPrix(prix: string | number) {
  return Number(prix).toLocaleString('fr-FR') + ' FCFA';
}

function VehiculeCard({ v, onReserver }: { v: VehiculePublic; onReserver: () => void }) {
  const photo = v.photos?.[0];
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group border border-gray-100">
      <div className="aspect-video bg-gray-100 overflow-hidden relative">
        {photo ? (
          <img
            src={photo}
            alt={`${v.marque} ${v.modele}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-asm-vert/10 to-asm-vert/5">
            <Car className="h-16 w-16 text-asm-vert/30" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
            CATEGORIE_COLORS[v.categorie] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {v.categorie}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg">
          {v.marque} {v.modele}
        </h3>
        <p className="text-sm text-gray-500">{v.annee} · {v.couleur}</p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-asm-vert">
              {formatPrix(v.prixJournalier)}
            </p>
            <p className="text-xs text-gray-400">par jour</p>
          </div>
          <button
            onClick={onReserver}
            className="flex items-center gap-1 px-4 py-2 bg-asm-vert text-white text-sm font-semibold rounded-lg hover:bg-asm-vert-clair transition-colors"
          >
            Réserver <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [vehicules, setVehicules] = useState<VehiculePublic[]>([]);

  useEffect(() => {
    publicApi.getVehicules().then((res) => {
      const data = res.data?.data || [];
      setVehicules(data.slice(0, 3));
    }).catch(() => {});
  }, []);

  const services = [
    {
      icon: Car,
      title: 'Location classique',
      description: 'Louez un véhicule à la journée ou à la semaine pour tous vos déplacements professionnels ou personnels.',
    },
    {
      icon: Plane,
      title: 'Transfert AIBD',
      description: 'Service de navette depuis et vers l\'Aéroport International Blaise Diagne. Ponctualité garantie.',
    },
    {
      icon: Calendar,
      title: 'Longue durée',
      description: 'Des tarifs préférentiels pour les locations de plusieurs semaines ou mois. Idéal pour les expatriés.',
    },
  ];

  const avantages = [
    { icon: Car, text: 'Flotte récente et entretenue' },
    { icon: Shield, text: 'Assurance incluse' },
    { icon: Clock, text: 'Disponible 24h/24 pour les transferts' },
    { icon: CheckCircle2, text: 'Contrat signé à chaque location' },
  ];

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative bg-gradient-to-br from-asm-vert to-asm-vert-clair overflow-hidden">
        {/* Décors */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
              <Star className="h-4 w-4 text-asm-or fill-asm-or" />
              Dakar's premier car rental service
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Louez un véhicule
              <span className="text-asm-or block">en toute confiance</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              ASM Multi-Services vous offre une flotte de véhicules modernes pour tous vos
              besoins à Dakar et ses environs. Tarifs clairs, service fiable, zéro surprise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/flotte')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-asm-vert font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-colors text-base"
              >
                <Car className="h-5 w-5" />
                Voir notre flotte
              </button>
              <button
                onClick={() => navigate('/reserver')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-asm-or text-asm-vert font-bold rounded-xl shadow-lg hover:bg-yellow-400 transition-colors text-base"
              >
                Réserver maintenant
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Nos Services</h2>
            <p className="text-gray-500 text-lg">Une offre complète pour tous vos besoins de mobilité</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-asm-vert/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-asm-vert" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== APERÇU FLOTTE ===== */}
      {vehicules.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">Véhicules disponibles</h2>
                <p className="text-gray-500">Quelques-uns de nos véhicules prêts à partir</p>
              </div>
              <button
                onClick={() => navigate('/flotte')}
                className="hidden sm:flex items-center gap-2 text-asm-vert font-semibold hover:underline"
              >
                Voir tout <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicules.map((v) => (
                <VehiculeCard
                  key={v.id}
                  v={v}
                  onReserver={() => navigate(`/reserver?vehiculeId=${v.id}`)}
                />
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <button
                onClick={() => navigate('/flotte')}
                className="inline-flex items-center gap-2 text-asm-vert font-semibold"
              >
                Voir tous les véhicules <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== POURQUOI ASM ===== */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Pourquoi choisir ASM ?</h2>
            <p className="text-gray-500 text-lg">La qualité de service qui fait la différence</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {avantages.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex flex-col items-center text-center gap-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className="h-12 w-12 rounded-full bg-asm-or/15 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-asm-or" />
                </div>
                <p className="text-sm font-medium text-gray-700">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA STRIPE ===== */}
      <section className="bg-asm-or py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-asm-vert mb-4">
            Prêt à réserver votre véhicule ?
          </h2>
          <p className="text-asm-vert/80 text-lg mb-8">
            Remplissez notre formulaire en 2 minutes. Notre équipe vous confirme la disponibilité rapidement.
          </p>
          <button
            onClick={() => navigate('/reserver')}
            className="inline-flex items-center gap-2 px-10 py-4 bg-asm-vert text-white font-bold text-lg rounded-xl shadow-lg hover:bg-asm-vert-clair transition-colors"
          >
            Faire une demande de réservation
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>
    </>
  );
}
