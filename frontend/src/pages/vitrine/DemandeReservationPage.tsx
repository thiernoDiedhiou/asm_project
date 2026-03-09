// Page de demande de réservation publique — formulaire 2 étapes
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Car,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Tag,
  Navigation,
  Check,
} from 'lucide-react';
import { publicApi, getUploadUrl } from '../../services/api';

interface VehiculePublic {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  categorie: string;
  prixJournalier: string | number;
  prixSemaine: string | number;
  photos: string[];
  couleur?: string;
}

interface ZonePublic {
  id: string;
  nom: string;
  prixCategories: {
    categorie: string;
    prixJournalier: string | number;
    prixSemaine: string | number;
  }[];
}

const TYPE_TRAJET_OPTIONS = [
  { value: 'LOCATION', label: 'Location classique', icon: '🚗' },
  { value: 'TRANSFERT_AEROPORT', label: 'Transfert aéroport (AIBD)', icon: '✈️' },
  { value: 'LONGUE_DUREE', label: 'Longue durée (7j+)', icon: '📅' },
];

const CATEGORIE_LABELS: Record<string, string> = {
  ECONOMIQUE: 'Économique',
  STANDARD: 'Standard',
  SUV: 'SUV',
  LUXE: 'Luxe',
  UTILITAIRE: 'Utilitaire',
};

const CATEGORIE_COLORS: Record<string, string> = {
  ECONOMIQUE: 'bg-blue-100 text-blue-700',
  STANDARD: 'bg-asm-vert/10 text-asm-vert',
  SUV: 'bg-orange-100 text-orange-700',
  LUXE: 'bg-purple-100 text-purple-700',
  UTILITAIRE: 'bg-gray-100 text-gray-700',
};

function formatPrix(prix: string | number) {
  return Number(prix).toLocaleString('fr-FR') + ' FCFA';
}

function extractLocalDigits(phone: string): string {
  return phone.replace(/^\+?221\s*/, '').replace(/\D/g, '').slice(0, 9);
}

function formatLocalPhone(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0, 2) + ' ' + d.slice(2);
  if (d.length <= 7) return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
  return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7, 9);
}

function calculerPrix(
  vehicule: VehiculePublic,
  dateDebut: string,
  dateFin: string,
  zone?: ZonePublic | null
): number {
  if (!dateDebut || !dateFin || !vehicule) return 0;
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const diffMs = fin.getTime() - debut.getTime();
  if (diffMs <= 0) return 0;
  const jours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let prixJour = Number(vehicule.prixJournalier);
  let prixSem = Number(vehicule.prixSemaine);
  if (zone) {
    const pc = zone.prixCategories.find((p) => p.categorie === vehicule.categorie);
    if (pc && Number(pc.prixJournalier) > 0) {
      prixJour = Number(pc.prixJournalier);
      prixSem = Number(pc.prixSemaine) || prixJour * 7;
    }
  }

  if (jours >= 7) {
    const semaines = Math.floor(jours / 7);
    const reste = jours % 7;
    return semaines * prixSem + reste * prixJour;
  }
  return jours * prixJour;
}

function getNbJours(dateDebut: string, dateFin: string): number {
  if (!dateDebut || !dateFin) return 0;
  const diffMs = new Date(dateFin).getTime() - new Date(dateDebut).getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function DemandeReservationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vehiculeIdParam = searchParams.get('vehiculeId') || '';

  const [step, setStep] = useState<1 | 2>(1);
  const [vehicules, setVehicules] = useState<VehiculePublic[]>([]);
  const [zones, setZones] = useState<ZonePublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ numeroReservation: string; prixTotal: number } | null>(null);
  const [error, setError] = useState('');

  // Étape 1 — Coordonnées
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');

  // Étape 2 — Réservation
  const [vehiculeId, setVehiculeId] = useState(vehiculeIdParam);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [heureDepart, setHeureDepart] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [lieuPriseEnCharge, setLieuPriseEnCharge] = useState('');
  const [lieuRetour, setLieuRetour] = useState('');
  const [typeTrajet, setTypeTrajet] = useState('LOCATION');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([publicApi.getVehicules(), publicApi.getZones()])
      .then(([vRes, zRes]) => {
        const vs: VehiculePublic[] = vRes.data?.data || [];
        const zs: ZonePublic[] = zRes.data?.data || [];
        setVehicules(vs);
        setZones(zs);
        // Pré-sélectionner Dakar si disponible
        const dakar = zs.find((z) => z.nom.toLowerCase() === 'dakar');
        if (dakar) setZoneId(dakar.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const vehiculePreselectionne = !!vehiculeIdParam;
  const vehiculeSelectionne = vehicules.find((v) => v.id === vehiculeId);
  const zoneSelectionnee = zones.find((z) => z.id === zoneId) ?? null;
  const isTransfert = typeTrajet === 'TRANSFERT_AEROPORT';

  const estimation = vehiculeSelectionne && !isTransfert
    ? calculerPrix(vehiculeSelectionne, dateDebut, dateFin, zoneSelectionnee)
    : 0;
  const nbJours = getNbJours(dateDebut, dateFin);

  const tarifZone = zoneSelectionnee?.prixCategories.find(
    (p) => p.categorie === vehiculeSelectionne?.categorie && Number(p.prixJournalier) > 0
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vehiculeId) { setError('Veuillez sélectionner un véhicule.'); return; }
    if (!dateDebut) { setError('Veuillez choisir une date.'); return; }
    if (!isTransfert && !dateFin) { setError('Veuillez choisir la date de fin.'); return; }
    if (!isTransfert && new Date(dateFin) < new Date(dateDebut)) {
      setError('La date de fin doit être après la date de début.');
      return;
    }

    // Pour un transfert, dateFin = dateDebut (même jour)
    const dateFinEffective = isTransfert ? dateDebut : dateFin;
    const notesFinales = [
      notes,
      isTransfert && heureDepart ? `Heure de prise en charge : ${heureDepart}` : '',
    ].filter(Boolean).join('\n') || undefined;

    setSubmitting(true);
    try {
      const res = await publicApi.createDemande({
        prenom,
        nom,
        telephone,
        email: email || undefined,
        vehiculeId,
        dateDebut,
        dateFin: dateFinEffective,
        lieuPriseEnCharge: lieuPriseEnCharge || 'À préciser',
        lieuRetour: lieuRetour || lieuPriseEnCharge || 'À préciser',
        typeTrajet,
        notes: notesFinales,
        zoneId: zoneId || undefined,
      });
      const data = res.data?.data;
      setSuccess({
        numeroReservation: data?.numeroReservation || '—',
        prixTotal: data?.prixTotal || estimation,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Une erreur est survenue. Veuillez réessayer.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Écran de succès
  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Demande envoyée !</h2>
          <p className="text-gray-500 mb-6">
            Votre demande de réservation a bien été reçue. Notre équipe vous contactera rapidement
            pour confirmer la disponibilité.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">N° de référence :</span>
              <span className="font-bold text-gray-900">{success.numeroReservation}</span>
            </div>
            {success.prixTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Estimation :</span>
                <span className="font-bold text-asm-vert">{formatPrix(success.prixTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Téléphone :</span>
              <span className="font-medium text-gray-800">{telephone}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/flotte')}
              className="flex-1 px-4 py-3 border-2 border-asm-vert text-asm-vert font-semibold rounded-xl hover:bg-asm-vert hover:text-white transition-colors"
            >
              Voir la flotte
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-4 py-3 bg-asm-vert text-white font-semibold rounded-xl hover:bg-asm-vert-clair transition-colors"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Demande de réservation</h1>
          <p className="text-gray-500">Remplissez ce formulaire, nous vous recontactons sous 2h</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s ? 'bg-asm-vert text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              <span className={`text-sm font-medium ${step >= s ? 'text-asm-vert' : 'text-gray-400'}`}>
                {s === 1 ? 'Vos coordonnées' : 'Votre location'}
              </span>
              {s === 1 && <ChevronRight className="h-4 w-4 text-gray-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {/* ===== ÉTAPE 1 ===== */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-asm-vert" />
                Vos coordonnées
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    aria-label="Prénom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Abdou"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    aria-label="Nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Diallo"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    Téléphone <span className="text-red-500">*</span>
                  </span>
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-asm-vert focus-within:border-transparent">
                  <span className="flex items-center px-3 bg-gray-50 text-gray-600 text-sm font-medium border-r border-gray-200 select-none">
                    +221
                  </span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    aria-label="Téléphone"
                    placeholder="77 000 00 00"
                    value={formatLocalPhone(extractLocalDigits(telephone))}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                      const formatted = formatLocalPhone(digits);
                      setTelephone(digits.length > 0 ? '+221 ' + formatted : '');
                    }}
                    maxLength={12}
                    pattern="[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
                    title="Format : XX XXX XX XX — ex : 77 990 21 34"
                    className="flex-1 px-4 py-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    Email <span className="text-gray-400 font-normal">(optionnel)</span>
                  </span>
                </label>
                <input
                  type="email"
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-asm-vert text-white font-semibold rounded-xl hover:bg-asm-vert-clair transition-colors"
              >
                Continuer
                <ChevronRight className="h-5 w-5" />
              </button>
            </form>
          )}

          {/* ===== ÉTAPE 2 ===== */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Car className="h-5 w-5 text-asm-vert" />
                  Votre location
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>
              </div>

              {/* 1. Type de trajet — boutons visuels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    Type de trajet
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_TRAJET_OPTIONS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setTypeTrajet(value);
                        if (value === 'TRANSFERT_AEROPORT') { setDateFin(''); setHeureDepart(''); }
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        typeTrajet === value
                          ? 'border-asm-vert bg-asm-vert/5 text-asm-vert'
                          : 'border-gray-200 text-gray-600 hover:border-asm-vert/40'
                      }`}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Véhicule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Car className="h-4 w-4" />
                    Véhicule souhaité <span className="text-red-500">*</span>
                  </span>
                </label>

                {loading ? (
                  <div className="flex items-center gap-2 py-3 text-gray-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des véhicules...
                  </div>
                ) : vehiculeId && vehiculeSelectionne ? (
                  /* Card véhicule sélectionné (pré-sélection ou choix) */
                  <div className="flex items-center gap-4 p-4 bg-asm-vert/5 border-2 border-asm-vert rounded-xl">
                    {vehiculeSelectionne.photos?.[0] ? (
                      <img
                        src={getUploadUrl(vehiculeSelectionne.photos[0])}
                        alt={`${vehiculeSelectionne.marque} ${vehiculeSelectionne.modele}`}
                        className="h-16 w-24 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-24 bg-asm-vert/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Car className="h-8 w-8 text-asm-vert/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">
                        {vehiculeSelectionne.marque} {vehiculeSelectionne.modele}
                      </p>
                      <p className="text-sm text-gray-500">
                        {vehiculeSelectionne.annee}
                        {vehiculeSelectionne.couleur && ` · ${vehiculeSelectionne.couleur}`}
                        {' · '}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORIE_COLORS[vehiculeSelectionne.categorie] || 'bg-gray-100 text-gray-600'}`}>
                          {CATEGORIE_LABELS[vehiculeSelectionne.categorie] || vehiculeSelectionne.categorie}
                        </span>
                      </p>
                      <p className="text-sm font-semibold text-asm-vert mt-0.5">
                        {formatPrix(vehiculeSelectionne.prixJournalier)}/jour
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => vehiculePreselectionne ? navigate('/flotte') : setVehiculeId('')}
                      className="text-xs text-gray-400 hover:text-asm-vert underline flex-shrink-0"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  /* Grille de cards de véhicules */
                  <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {vehicules.length === 0 ? (
                      <p className="col-span-2 text-sm text-gray-400 text-center py-6">
                        Aucun véhicule disponible pour le moment.
                      </p>
                    ) : (
                      vehicules.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVehiculeId(v.id)}
                          className="text-left border-2 border-gray-100 rounded-xl overflow-hidden hover:border-asm-vert/60 hover:shadow-md transition-all group"
                        >
                          {v.photos?.[0] ? (
                            <img
                              src={getUploadUrl(v.photos[0])}
                              alt={`${v.marque} ${v.modele}`}
                              className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                              <Car className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                          <div className="p-2.5">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {v.marque} {v.modele}
                            </p>
                            <p className="text-xs text-gray-400 mb-1">{v.annee}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORIE_COLORS[v.categorie] || 'bg-gray-100 text-gray-600'}`}>
                              {CATEGORIE_LABELS[v.categorie] || v.categorie}
                            </span>
                            <p className="text-xs font-bold text-asm-vert mt-1.5">
                              {formatPrix(v.prixJournalier)}/jour
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. Date(s) — adapté selon type trajet */}
              {isTransfert ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        Date du transfert <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      required
                      type="date"
                      aria-label="Date du transfert"
                      min={todayStr}
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Heure de prise en charge
                        <span className="text-gray-400 font-normal">(optionnel)</span>
                      </span>
                    </label>
                    <input
                      type="time"
                      aria-label="Heure de prise en charge"
                      value={heureDepart}
                      onChange={(e) => setHeureDepart(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        Date de début <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      required
                      type="date"
                      aria-label="Date de début de location"
                      min={todayStr}
                      value={dateDebut}
                      onChange={(e) => {
                        setDateDebut(e.target.value);
                        if (dateFin && dateFin < e.target.value) setDateFin('');
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        Date de fin <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      required
                      type="date"
                      aria-label="Date de fin de location"
                      min={dateDebut || todayStr}
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* 4. Région / Zone tarifaire */}
              {zones.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="h-4 w-4" />
                      Région de prise en charge
                      <span className="text-gray-400 font-normal">(pour estimer le tarif)</span>
                    </span>
                  </label>
                  <select
                    aria-label="Région de prise en charge"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent bg-white"
                  >
                    <option value="">— Sélectionner une région —</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.nom}</option>
                    ))}
                  </select>
                  {zoneId && !tarifZone && vehiculeSelectionne && (
                    <p className="text-xs text-amber-600 mt-1">
                      Pas de tarif zone configuré pour cette catégorie — tarif de base appliqué.
                    </p>
                  )}
                </div>
              )}

              {/* 5. Lieu de prise en charge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    Lieu de prise en charge
                  </span>
                </label>
                <input
                  type="text"
                  aria-label="Lieu de prise en charge"
                  value={lieuPriseEnCharge}
                  onChange={(e) => setLieuPriseEnCharge(e.target.value)}
                  placeholder={isTransfert ? 'Ex: Aéroport AIBD, Terminal 1' : 'Ex: Plateau, Dakar'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                />
              </div>

              {!isTransfert && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      Lieu de retour <span className="text-gray-400 font-normal">(si différent)</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    aria-label="Lieu de retour"
                    value={lieuRetour}
                    onChange={(e) => setLieuRetour(e.target.value)}
                    placeholder="Identique au lieu de prise en charge par défaut"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
                  />
                </div>
              )}

              {/* 6. Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Notes ou demandes spéciales
                  </span>
                </label>
                <textarea
                  aria-label="Notes ou demandes spéciales"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isTransfert ? 'Ex: nombre de passagers, bagages, numéro de vol...' : 'Ex: siège enfant, heure de départ précise, etc.'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent resize-none"
                />
              </div>

              {/* Estimation prix (seulement pour location/longue durée) */}
              {estimation > 0 && vehiculeSelectionne && !isTransfert && (
                <div className="bg-asm-vert/5 border border-asm-vert/20 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-asm-vert flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    Estimation du coût
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {nbJours} jour{nbJours > 1 ? 's' : ''} × {vehiculeSelectionne.marque} {vehiculeSelectionne.modele}
                      {zoneSelectionnee && tarifZone && (
                        <span className="ml-1 text-xs text-gray-400">({zoneSelectionnee.nom})</span>
                      )}
                    </span>
                    <span className="text-xl font-extrabold text-asm-vert">
                      {formatPrix(estimation)}
                    </span>
                  </div>
                  {tarifZone && (
                    <p className="text-xs text-gray-500">
                      Tarif zone : {formatPrix(tarifZone.prixJournalier)}/j — {formatPrix(tarifZone.prixSemaine)}/sem
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Prix indicatif, le tarif final sera confirmé par notre équipe.
                  </p>
                </div>
              )}

              {/* Message transfert */}
              {isTransfert && vehiculeSelectionne && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800 font-medium">✈️ Transfert aéroport</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Tarif de transfert sur devis — notre équipe vous confirmera le prix lors de la prise de contact.
                  </p>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Bouton soumettre */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-asm-vert text-white font-semibold rounded-xl hover:bg-asm-vert-clair transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Envoyer ma demande
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                En soumettant ce formulaire, vous acceptez d&apos;être contacté par notre équipe
                pour confirmer votre réservation.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
