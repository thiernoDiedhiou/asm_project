import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Calendar, Search, X, User, Check, Car,
  Plane, Clock, CheckCircle2, MapPin, Banknote, FileText,
} from 'lucide-react';
import { reservationsApi, clientsApi, vehiculesApi, tarificationApi } from '../../services/api';
import { useQuery } from '../../components/hooks/useQuery';
import { formatFCFA } from '../../utils/format';

const TYPE_TRAJET = [
  {
    value: 'LOCATION',
    icon: Car,
    label: 'Location classique',
    description: 'À la journée ou à la semaine',
  },
  {
    value: 'TRANSFERT_AEROPORT',
    icon: Plane,
    label: 'Transfert aéroport',
    description: 'Course AIBD — 1 jour facturé',
  },
  {
    value: 'LONGUE_DUREE',
    icon: Clock,
    label: 'Longue durée',
    description: '7 jours et plus — tarifs semaine',
  },
];

interface Client {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
  typeClient: string;
}

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  prixJournalier: number;
  categorie: string;
  couleur?: string;
}

interface TarifZone {
  id: string;
  nom: string;
  actif: boolean;
  prixCategories: { categorie: string; prixJournalier: number | string }[];
}

interface FormData {
  clientId: string;
  vehiculeId: string;
  dateDebut: string;
  dateFin: string;
  lieuPriseEnCharge: string;
  lieuRetour: string;
  typeTrajet: string;
  avance: string;
  notes: string;
  zoneId: string;
}

const CATEGORIE_COLORS: Record<string, string> = {
  ECONOMIQUE: 'bg-green-50 text-green-700',
  STANDARD:   'bg-blue-50 text-blue-700',
  SUV:        'bg-purple-50 text-purple-700',
  LUXE:       'bg-yellow-50 text-yellow-700',
  UTILITAIRE: 'bg-orange-50 text-orange-700',
};

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-7 w-7 rounded-lg bg-asm-vert/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-asm-vert" />
      </div>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

export function ReservationFormPage() {
  const navigate = useNavigate();
  const clientRef   = useRef<HTMLDivElement>(null);
  const vehiculeRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormData>({
    clientId: '', vehiculeId: '',
    dateDebut: '', dateFin: '',
    lieuPriseEnCharge: 'Agence ASM', lieuRetour: 'Agence ASM',
    typeTrajet: 'LOCATION', avance: '', notes: '', zoneId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dispoError, setDispoError] = useState('');

  // Combobox client
  const [clientSearch, setClientSearch]     = useState('');
  const [clientOpen, setClientOpen]         = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Combobox véhicule
  const [vehiculeSearch, setVehiculeSearch]     = useState('');
  const [vehiculeOpen, setVehiculeOpen]         = useState(false);
  const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | null>(null);

  const { data: clientsData }  = useQuery(['clients-list'],   () => clientsApi.getAll({ limit: 200 }));
  const { data: vehiculesData } = useQuery(['vehicules-dispo'], () => vehiculesApi.getAll({ statut: 'DISPONIBLE', limit: 100 }));
  const { data: zonesData }    = useQuery(['tarif-matrix'],   () => tarificationApi.getMatrix());

  const clients:  Client[]    = clientsData?.data  || [];
  const vehicules: Vehicule[] = vehiculesData?.data || [];
  const zones: TarifZone[]    = (zonesData?.data || []).filter((z: TarifZone) => z.actif);

  // Fermer au clic en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current   && !clientRef.current.contains(e.target as Node))  setClientOpen(false);
      if (vehiculeRef.current && !vehiculeRef.current.contains(e.target as Node)) setVehiculeOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filtres
  const filteredClients = clientSearch.trim() === ''
    ? clients.slice(0, 8)
    : clients.filter(c => {
        const q = clientSearch.toLowerCase();
        return c.prenom.toLowerCase().includes(q) || c.nom.toLowerCase().includes(q) || c.telephone.includes(q);
      }).slice(0, 8);

  const filteredVehicules = vehiculeSearch.trim() === ''
    ? vehicules.slice(0, 8)
    : vehicules.filter(v => {
        const q = vehiculeSearch.toLowerCase();
        return (
          v.marque.toLowerCase().includes(q) ||
          v.modele.toLowerCase().includes(q) ||
          v.immatriculation.toLowerCase().includes(q) ||
          v.categorie.toLowerCase().includes(q)
        );
      }).slice(0, 8);

  function selectClient(c: Client) {
    setSelectedClient(c);
    setForm(f => ({ ...f, clientId: c.id }));
    setClientSearch('');
    setClientOpen(false);
  }
  function clearClient() {
    setSelectedClient(null);
    setForm(f => ({ ...f, clientId: '' }));
    setClientSearch('');
  }

  function selectVehicule(v: Vehicule) {
    setSelectedVehicule(v);
    setForm(f => ({ ...f, vehiculeId: v.id }));
    setVehiculeSearch('');
    setVehiculeOpen(false);
    setDispoError('');
  }
  function clearVehicule() {
    setSelectedVehicule(null);
    setForm(f => ({ ...f, vehiculeId: '' }));
    setVehiculeSearch('');
    setDispoError('');
  }

  function set(field: keyof FormData, value: string) {
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (field === 'typeTrajet') {
        if (value === 'TRANSFERT_AEROPORT') {
          updated.dateFin = f.dateDebut;
          updated.lieuPriseEnCharge = 'Agence ASM';
          updated.lieuRetour = 'Aéroport AIBD';
          const dakarZone = zones.find(z => z.nom.toLowerCase().includes('dakar'));
          if (dakarZone) updated.zoneId = dakarZone.id;
        } else if (f.typeTrajet === 'TRANSFERT_AEROPORT') {
          updated.dateFin = '';
          if (f.lieuRetour === 'Aéroport AIBD') updated.lieuRetour = 'Agence ASM';
          if (f.lieuPriseEnCharge === 'Agence ASM') updated.lieuPriseEnCharge = 'Agence ASM';
          updated.zoneId = '';
        }
      }
      if (field === 'dateDebut' && f.typeTrajet === 'TRANSFERT_AEROPORT') {
        updated.dateFin = value;
      }
      return updated;
    });
    if (field === 'dateDebut' || field === 'dateFin') setDispoError('');
  }

  async function checkDispo() {
    if (!form.vehiculeId || !form.dateDebut || !form.dateFin) return;
    try {
      const res = await vehiculesApi.checkDisponibilite(form.vehiculeId, form.dateDebut, form.dateFin);
      if (!res.data.data?.disponible) {
        setDispoError('Ce véhicule est déjà réservé sur cette période');
      }
    } catch { /* ignore */ }
  }

  const isTransfert = form.typeTrajet === 'TRANSFERT_AEROPORT';

  const duration = form.dateDebut && form.dateFin
    ? Math.max(0, Math.ceil((new Date(form.dateFin).getTime() - new Date(form.dateDebut).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const effectiveDuration = isTransfert ? 1 : duration;

  const selectedZone = zones.find(z => z.id === form.zoneId) || null;
  const prixMatrice = selectedZone && selectedVehicule
    ? Number(selectedZone.prixCategories.find(pc => pc.categorie === selectedVehicule.categorie)?.prixJournalier ?? 0)
    : 0;
  const prixEffectif = prixMatrice > 0 ? prixMatrice : (selectedVehicule?.prixJournalier ?? 0);

  const showEstimation = Boolean(selectedVehicule) && !dispoError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId)   { setError('Veuillez sélectionner un client');   return; }
    if (!form.vehiculeId) { setError('Veuillez sélectionner un véhicule'); return; }
    if (dispoError) return;
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        clientId: form.clientId, vehiculeId: form.vehiculeId,
        dateDebut: form.dateDebut, dateFin: form.dateFin,
        lieuPriseEnCharge: form.lieuPriseEnCharge, lieuRetour: form.lieuRetour,
        typeTrajet: form.typeTrajet,
        ...(form.avance && { avance: parseFloat(form.avance) }),
        ...(form.notes  && { notes: form.notes }),
        ...(form.zoneId && { zoneId: form.zoneId }),
      };
      await reservationsApi.create(payload);
      navigate('/reservations');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Retour"
          onClick={() => navigate('/reservations')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle réservation</h1>
          <p className="text-gray-500 text-sm mt-0.5">Créer une réservation de véhicule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════
            BLOC 1 — Type de trajet
        ══════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionHeader icon={Car} title="Type de trajet" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TYPE_TRAJET.map(({ value, icon: Icon, label, description }) => {
              const isSelected = form.typeTrajet === value;
              return (
                <div
                  key={value}
                  role="button"
                  tabIndex={0}
                  onClick={() => set('typeTrajet', value)}
                  onKeyDown={(e) => e.key === 'Enter' && set('typeTrajet', value)}
                  className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-asm-vert bg-asm-vert-pale'
                      : 'border-gray-200 bg-white hover:border-asm-vert/40 hover:bg-gray-50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-4 w-4 text-asm-vert" />
                    </div>
                  )}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-asm-vert/15' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-asm-vert' : 'text-gray-500'}`} />
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${isSelected ? 'text-asm-vert' : 'text-gray-900'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════
            BLOC 2 — Client & Véhicule
        ══════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Client */}
          <div>
            <SectionHeader icon={User} title="Client" />
            {selectedClient ? (
              <div className="flex items-center gap-3 border-2 border-asm-vert bg-asm-vert-pale rounded-xl px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-asm-vert/15 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-asm-vert" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedClient.prenom} {selectedClient.nom}
                  </div>
                  <div className="text-xs text-gray-500">{selectedClient.telephone}</div>
                </div>
                <Check className="h-4 w-4 text-asm-vert flex-shrink-0" />
                <button
                  type="button"
                  aria-label="Changer de client"
                  onClick={clearClient}
                  className="p-1 hover:bg-asm-vert/10 rounded-lg text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div ref={clientRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    aria-label="Rechercher un client"
                    placeholder="Nom, prénom ou numéro de téléphone..."
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setClientOpen(true); }}
                    onFocus={() => setClientOpen(true)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
                    autoComplete="off"
                  />
                </div>
                {clientOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredClients.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        {clientSearch ? 'Aucun client trouvé' : 'Commencez à taper pour rechercher'}
                      </div>
                    ) : (
                      <>
                        {filteredClients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectClient(c)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {c.prenom} {c.nom}
                              </div>
                              <div className="text-xs text-gray-400">{c.telephone}</div>
                            </div>
                            {c.typeClient === 'ENTREPRISE' && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
                                Ent.
                              </span>
                            )}
                          </button>
                        ))}
                        {clients.length > 8 && clientSearch.trim() === '' && (
                          <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                            Tapez pour affiner ({clients.length} clients au total)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Véhicule */}
          <div>
            <SectionHeader icon={Car} title="Véhicule" />
            {selectedVehicule ? (
              <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-colors ${
                dispoError ? 'border-red-300 bg-red-50' : 'border-asm-vert bg-asm-vert-pale'
              }`}>
                <div className="h-9 w-9 rounded-full bg-asm-vert/15 flex items-center justify-center flex-shrink-0">
                  <Car className="h-4 w-4 text-asm-vert" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedVehicule.marque} {selectedVehicule.modele}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedVehicule.immatriculation} · {formatFCFA(selectedVehicule.prixJournalier)}/j
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  CATEGORIE_COLORS[selectedVehicule.categorie] || 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedVehicule.categorie}
                </span>
                {!dispoError && <Check className="h-4 w-4 text-asm-vert flex-shrink-0" />}
                <button
                  type="button"
                  aria-label="Changer de véhicule"
                  onClick={clearVehicule}
                  className="p-1 hover:bg-asm-vert/10 rounded-lg text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div ref={vehiculeRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    aria-label="Rechercher un véhicule"
                    placeholder="Marque, modèle, immatriculation..."
                    value={vehiculeSearch}
                    onChange={e => { setVehiculeSearch(e.target.value); setVehiculeOpen(true); }}
                    onFocus={() => setVehiculeOpen(true)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
                    autoComplete="off"
                  />
                </div>
                {vehiculeOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredVehicules.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        {vehiculeSearch ? 'Aucun véhicule trouvé' : 'Aucun véhicule disponible'}
                      </div>
                    ) : (
                      <>
                        {filteredVehicules.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => selectVehicule(v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Car className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {v.marque} {v.modele}
                                <span className="text-gray-400 font-normal"> · {v.immatriculation}</span>
                              </div>
                              <div className="text-xs text-gray-400">{formatFCFA(v.prixJournalier)}/jour</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              CATEGORIE_COLORS[v.categorie] || 'bg-gray-100 text-gray-600'
                            }`}>
                              {v.categorie}
                            </span>
                          </button>
                        ))}
                        {vehicules.length > 8 && vehiculeSearch.trim() === '' && (
                          <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                            Tapez pour affiner ({vehicules.length} véhicules disponibles)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════
            BLOC 3 — Période
        ══════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionHeader icon={Calendar} title={isTransfert ? 'Date de la course' : 'Période'} />
          {isTransfert ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date de la course <span className="text-red-500">*</span>
              </label>
              <input
                aria-label="Date de la course"
                required
                type="date"
                value={form.dateDebut}
                onChange={e => set('dateDebut', e.target.value)}
                onBlur={checkDispo}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
                <Plane className="h-3 w-3" />
                Transfert aéroport AIBD — durée comptée : 1 jour
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    aria-label="Date de début"
                    required
                    type="date"
                    value={form.dateDebut}
                    onChange={e => set('dateDebut', e.target.value)}
                    onBlur={checkDispo}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    aria-label="Date de fin"
                    required
                    type="date"
                    value={form.dateFin}
                    onChange={e => set('dateFin', e.target.value)}
                    onBlur={checkDispo}
                    min={form.dateDebut || new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
                  />
                </div>
              </div>
              {duration > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Durée : <span className="font-semibold text-gray-800">{duration} jour{duration > 1 ? 's' : ''}</span>
                </p>
              )}
            </>
          )}
          {dispoError && (
            <div className="mt-2 text-red-600 text-sm flex items-center gap-1.5">
              <span>⚠</span> {dispoError}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════
            BLOC 4 — Lieux & Informations
        ══════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <SectionHeader icon={MapPin} title="Lieux & Informations" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isTransfert ? 'Point de départ' : 'Lieu de prise en charge'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                aria-label="Lieu de prise en charge"
                required
                type="text"
                value={form.lieuPriseEnCharge}
                onChange={e => set('lieuPriseEnCharge', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isTransfert ? 'Destination' : 'Lieu de retour'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                aria-label="Lieu de retour"
                required
                type="text"
                value={form.lieuRetour}
                onChange={e => set('lieuRetour', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Avance (FCFA)</label>
              <input
                aria-label="Avance"
                type="number"
                min={0}
                placeholder="0"
                value={form.avance}
                onChange={e => set('avance', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent"
              />
              {form.avance && prixEffectif > 0 && effectiveDuration > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  {Math.round((parseFloat(form.avance) / (prixEffectif * effectiveDuration)) * 100)}% du total estimé
                </p>
              )}
            </div>
            {zones.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone tarifaire</label>
                <select
                  aria-label="Zone tarifaire"
                  value={form.zoneId}
                  onChange={e => set('zoneId', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent bg-white"
                >
                  <option value="">— Tarif de base ({selectedVehicule ? formatFCFA(selectedVehicule.prixJournalier) : '—'}/j)</option>
                  {zones.map(z => {
                    const zonePrice = selectedVehicule
                      ? Number(z.prixCategories.find(pc => pc.categorie === selectedVehicule.categorie)?.prixJournalier ?? 0)
                      : 0;
                    return (
                      <option key={z.id} value={z.id}>
                        {z.nom}{zonePrice > 0 ? ` — ${formatFCFA(zonePrice)}/j` : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedZone && prixMatrice > 0 && (
                  <p className="mt-1 text-xs text-asm-vert">
                    Tarif {selectedZone.nom} appliqué : {formatFCFA(prixMatrice)}/jour
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              Notes (optionnel)
            </label>
            <textarea
              aria-label="Notes"
              rows={2}
              placeholder="Remarques particulières..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* ══════════════════════════════════════
            BLOC 5 — Estimation (conditionnel)
        ══════════════════════════════════════ */}
        {showEstimation && (
          <div className="bg-asm-vert rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Banknote className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white/80 mb-3">Estimation du tarif</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">
                      Prix journalier
                      {selectedZone && (
                        <span className="ml-1 text-white/50 text-xs">(zone {selectedZone.nom})</span>
                      )}
                    </span>
                    <span className="text-white font-medium">{formatFCFA(prixEffectif)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Durée</span>
                    <span className="text-white font-medium">
                      {isTransfert
                        ? 'Course — 1 jour'
                        : effectiveDuration > 0
                          ? `${effectiveDuration} jour${effectiveDuration > 1 ? 's' : ''}`
                          : <span className="text-white/50 italic">sélectionner les dates</span>
                      }
                    </span>
                  </div>
                  {(isTransfert || effectiveDuration > 0) && (
                    <div className="border-t border-white/20 pt-2.5 mt-1 flex justify-between items-center">
                      <span className="text-white font-semibold">Total estimé</span>
                      <span className="text-2xl font-extrabold text-asm-or">
                        {formatFCFA(prixEffectif * effectiveDuration)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={() => navigate('/reservations')}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || Boolean(dispoError)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-asm-vert text-white rounded-xl text-sm font-semibold hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Création...' : 'Créer la réservation'}
          </button>
        </div>
      </form>
    </div>
  );
}
