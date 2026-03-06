import { useState, useMemo } from 'react';
import { Plus, CheckCircle, X, Shield, Building2, Save, MapPin, Pencil, Trash2, DollarSign } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQuery } from '../../components/hooks/useQuery';
import { usersApi, settingsApi, tarifZonesApi, tarificationApi } from '../../services/api';
import { useAuthStore, useIsAdmin } from '../../store/authStore';
import { formatDate, formatFCFA } from '../../utils/format';
import api from '../../services/api';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
  COMPTABLE: 'Comptable',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  AGENT: 'bg-blue-100 text-blue-800',
  COMPTABLE: 'bg-purple-100 text-purple-800',
};

const CATEGORIES = ['ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'] as const;

const CATEGORIE_LABELS: Record<string, string> = {
  ECONOMIQUE: 'Économique',
  STANDARD: 'Standard',
  SUV: 'SUV / 4×4',
  LUXE: 'Luxe',
  UTILITAIRE: 'Utilitaire',
};

const CATEGORIE_COLORS: Record<string, string> = {
  ECONOMIQUE: 'bg-blue-100 text-blue-800',
  STANDARD: 'bg-green-100 text-green-800',
  SUV: 'bg-orange-100 text-orange-800',
  LUXE: 'bg-purple-100 text-purple-800',
  UTILITAIRE: 'bg-gray-100 text-gray-700',
};

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: string;
  actif: boolean;
  createdAt: string;
}

interface UserFormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: string;
  motDePasse: string;
}

interface PrixCategorie {
  id: string;
  categorie: string;
  zoneId: string;
  prixJournalier: number | string;
  prixSemaine?: number | string | null;
}

interface TarifZone {
  id: string;
  nom: string;
  actif: boolean;
  prixCategories: PrixCategorie[];
}

interface ZoneFormData {
  nom: string;
  actif: boolean;
}

interface SettingsFormData {
  nomEntreprise: string;
  slogan: string;
  activite: string;
  telephone: string;
  telephone2: string;
  email: string;
  adresse: string;
  ville: string;
  rccm: string;
  ninea: string;
  heuresLunVen: string;
  heuresSamedi: string;
  noteTransfert: string;
  bannierePromo: string;
}

export function ParametresPage() {
  const isAdmin = useIsAdmin();
  const { user: currentUser, fetchMe } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'utilisateurs' | 'entreprise' | 'tarifs'>('entreprise');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>({ nom: '', prenom: '', email: '', telephone: '', role: 'AGENT', motDePasse: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingsForm, setSettingsForm] = useState<SettingsFormData>({
    nomEntreprise: '', slogan: '', activite: '', telephone: '', telephone2: '',
    email: '', adresse: '', ville: '', rccm: '', ninea: '',
    heuresLunVen: '', heuresSamedi: '', noteTransfert: '', bannierePromo: '',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Zones
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<TarifZone | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneFormData>({ nom: '', actif: true });
  const [savingZone, setSavingZone] = useState(false);
  const [zoneError, setZoneError] = useState('');
  const [zoneSuccess, setZoneSuccess] = useState('');

  // Édition cellule matrice
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; value: string } | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const [matrixSuccess, setMatrixSuccess] = useState('');

  const { data: usersData, refetch: refetchUsers } = useQuery(
    ['utilisateurs'],
    () => usersApi.getAll(),
    { enabled: isAdmin === true }
  );

  const { data: settingsData } = useQuery(
    ['settings'],
    () => settingsApi.get(),
    { enabled: isAdmin === true }
  );

  if (settingsData?.data && !settingsLoaded) {
    setSettingsForm(settingsData.data as SettingsFormData);
    setSettingsLoaded(true);
  }

  // Matrice tarifaire — zones avec leurs prixCategories[]
  const { data: matrixData, isLoading: loadingMatrix, refetch: refetchMatrix } = useQuery(
    ['tarification-matrix'],
    () => tarificationApi.getMatrix(),
    { enabled: isAdmin === true }
  );
  const zones: TarifZone[] = matrixData?.data || [];

  // Lookup rapide : prixLookup[categorie][zoneId] = PrixCategorie
  const prixLookup = useMemo(() => {
    const map: Record<string, Record<string, PrixCategorie>> = {};
    zones.forEach(zone => {
      (zone.prixCategories || []).forEach(pc => {
        if (!map[pc.categorie]) map[pc.categorie] = {};
        map[pc.categorie][zone.id] = pc;
      });
    });
    return map;
  }, [zones]);

  const utilisateurs: Utilisateur[] = usersData?.data || [];

  function openNewUser() {
    setEditingUser(null);
    setUserForm({ nom: '', prenom: '', email: '', telephone: '', role: 'AGENT', motDePasse: '' });
    setError('');
    setShowUserModal(true);
  }

  function openEditUser(u: Utilisateur) {
    setEditingUser(u);
    setUserForm({ nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone || '', role: u.role, motDePasse: '' });
    setError('');
    setShowUserModal(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = { nom: userForm.nom, prenom: userForm.prenom, email: userForm.email, telephone: userForm.telephone, role: userForm.role };
        if (userForm.motDePasse) payload.motDePasse = userForm.motDePasse;
        await api.put(`/users/${editingUser.id}`, payload);
        setSuccess('Utilisateur modifié avec succès');
      } else {
        await api.post('/users', userForm);
        setSuccess('Utilisateur créé avec succès');
      }
      setShowUserModal(false);
      refetchUsers();
      if (editingUser?.id === currentUser?.id) await fetchMe();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleUser(id: string, actif: boolean) {
    try {
      await api.put(`/users/${id}`, { actif: !actif });
      refetchUsers();
    } catch { /* ignore */ }
  }

  function openNewZone() {
    setEditingZone(null);
    setZoneForm({ nom: '', actif: true });
    setZoneError('');
    setShowZoneModal(true);
  }

  function openEditZone(zone: TarifZone) {
    setEditingZone(zone);
    setZoneForm({ nom: zone.nom, actif: zone.actif });
    setZoneError('');
    setShowZoneModal(true);
  }

  async function handleSaveZone(e: React.FormEvent) {
    e.preventDefault();
    setSavingZone(true);
    setZoneError('');
    try {
      const payload = { nom: zoneForm.nom, actif: zoneForm.actif };
      if (editingZone) {
        await tarifZonesApi.update(editingZone.id, payload);
      } else {
        await tarifZonesApi.create(payload);
      }
      setShowZoneModal(false);
      setZoneSuccess(editingZone ? 'Zone mise à jour' : 'Zone créée avec succès');
      refetchMatrix();
      setTimeout(() => setZoneSuccess(''), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setZoneError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingZone(false);
    }
  }

  function handleDeleteZone(id: string) {
    setDeleteZoneId(id);
  }

  async function confirmDeleteZone() {
    if (!deleteZoneId) return;
    try {
      await tarifZonesApi.delete(deleteZoneId);
      refetchMatrix();
      setZoneSuccess('Zone supprimée');
      setTimeout(() => setZoneSuccess(''), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setZoneError(e?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteZoneId(null);
    }
  }

  async function handleSavePrix() {
    if (!editingCell) return;
    const valeur = parseFloat(editingCell.value);
    if (isNaN(valeur) || valeur <= 0) { setEditingCell(null); return; }
    setSavingCell(true);
    try {
      await tarificationApi.updateCell(editingCell.id, { prixJournalier: valeur });
      setMatrixSuccess('Prix mis à jour');
      refetchMatrix();
      setTimeout(() => setMatrixSuccess(''), 2000);
    } catch { /* revert */ }
    finally {
      setSavingCell(false);
      setEditingCell(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError('');
    try {
      await settingsApi.update(settingsForm as unknown as Record<string, unknown>);
      setSettingsSuccess('Paramètres enregistrés avec succès');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSettingsError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez votre profil et les comptes utilisateurs</p>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 gap-1">
        {[
          { key: 'entreprise', label: 'Entreprise', icon: Building2 },
          { key: 'tarifs', label: 'Tarifs & Zones', icon: DollarSign },
          { key: 'utilisateurs', label: 'Utilisateurs', icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button
            type="button"
            key={key}
            onClick={() => setActiveTab(key as 'utilisateurs' | 'entreprise' | 'tarifs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-asm-vert text-asm-vert'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Onglet Entreprise (Admin seulement) */}
      {activeTab === 'entreprise' && isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Informations de l'entreprise</h2>
          <p className="text-xs text-gray-400 mb-5">Ces informations s'affichent sur la vitrine publique.</p>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {settingsError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{settingsError}</div>}
            {settingsSuccess && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {settingsSuccess}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identité</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                  <input aria-label="Nom de l'entreprise" type="text" value={settingsForm.nomEntreprise}
                    onChange={e => setSettingsForm(f => ({ ...f, nomEntreprise: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slogan / Sous-titre</label>
                  <input aria-label="Slogan" type="text" value={settingsForm.slogan}
                    onChange={e => setSettingsForm(f => ({ ...f, slogan: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activité</label>
                  <input aria-label="Activité" type="text" value={settingsForm.activite}
                    onChange={e => setSettingsForm(f => ({ ...f, activite: e.target.value }))}
                    placeholder="Vente et location de voitures — Import/Export"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identifiants légaux</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RCCM</label>
                  <input aria-label="RCCM" type="text" value={settingsForm.rccm}
                    onChange={e => setSettingsForm(f => ({ ...f, rccm: e.target.value }))}
                    placeholder="SN.DKR.2024.A.XXXXX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NINEA</label>
                  <input aria-label="NINEA" type="text" value={settingsForm.ninea}
                    onChange={e => setSettingsForm(f => ({ ...f, ninea: e.target.value }))}
                    placeholder="XXXXXXXXX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone principal</label>
                  <input aria-label="Téléphone principal" type="text" value={settingsForm.telephone}
                    onChange={e => setSettingsForm(f => ({ ...f, telephone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone 2 (optionnel)</label>
                  <input aria-label="Téléphone secondaire" type="text" value={settingsForm.telephone2}
                    onChange={e => setSettingsForm(f => ({ ...f, telephone2: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input aria-label="Email de contact" type="email" value={settingsForm.email}
                    onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input aria-label="Adresse" type="text" value={settingsForm.adresse}
                    onChange={e => setSettingsForm(f => ({ ...f, adresse: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville / Pays</label>
                  <input aria-label="Ville et pays" type="text" value={settingsForm.ville}
                    onChange={e => setSettingsForm(f => ({ ...f, ville: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Horaires d'ouverture</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lun – Ven</label>
                  <input aria-label="Horaires lundi à vendredi" type="text" placeholder="08h00 – 18h00" value={settingsForm.heuresLunVen}
                    onChange={e => setSettingsForm(f => ({ ...f, heuresLunVen: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Samedi</label>
                  <input aria-label="Horaires samedi" type="text" placeholder="09h00 – 15h00" value={settingsForm.heuresSamedi}
                    onChange={e => setSettingsForm(f => ({ ...f, heuresSamedi: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note transfert aéroport</label>
                <input aria-label="Note transfert aéroport" type="text" value={settingsForm.noteTransfert}
                  onChange={e => setSettingsForm(f => ({ ...f, noteTransfert: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bannière promotionnelle</h3>
              <p className="text-xs text-gray-400 mb-3">
                S'affiche sur la vitrine publique en haut de chaque page. Laissez vide pour désactiver.
              </p>
              <textarea
                aria-label="Bannière promotionnelle"
                rows={2}
                placeholder="ex: 🎉 Promotion — 10% de réduction sur toutes les locations ce mois-ci !"
                value={settingsForm.bannierePromo}
                onChange={e => setSettingsForm(f => ({ ...f, bannierePromo: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 bg-asm-vert text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors"
              >
                <Save className="h-4 w-4" />
                {savingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Onglet Tarifs & Zones (Admin seulement) */}
      {activeTab === 'tarifs' && isAdmin && (
        <div className="space-y-8">

          {/* ===== GRILLE TARIFAIRE ===== */}
          <div>
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gray-900">Grille tarifaire</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Prix journalier (FCFA) par catégorie de véhicule × zone géographique.{' '}
                Cliquez sur un montant pour le modifier.
                {savingCell && <span className="ml-2 text-asm-vert font-medium">Enregistrement...</span>}
              </p>
            </div>

            {matrixSuccess && (
              <div className="mb-3 bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {matrixSuccess}
              </div>
            )}

            {loadingMatrix ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm animate-pulse">
                Chargement de la grille...
              </div>
            ) : zones.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Aucune zone configurée — créez des zones ci-dessous pour afficher la grille.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase min-w-36">
                        Catégorie
                      </th>
                      {zones.map(zone => (
                        <th key={zone.id} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase min-w-36">
                          <div className="flex items-center justify-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {zone.nom}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {CATEGORIES.map(cat => (
                      <tr key={cat} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORIE_COLORS[cat]}`}>
                            {CATEGORIE_LABELS[cat]}
                          </span>
                        </td>
                        {zones.map(zone => {
                          const pc = prixLookup[cat]?.[zone.id];
                          if (!pc) return (
                            <td key={zone.id} className="px-4 py-3 text-center text-gray-300 text-xs">—</td>
                          );
                          const isEditing = editingCell?.id === pc.id;
                          return (
                            <td key={zone.id} className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min={1}
                                  className="w-28 border-2 border-asm-vert rounded-lg px-2 py-1 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-asm-vert/30"
                                  value={editingCell.value}
                                  onChange={e => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); handleSavePrix(); }
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  onBlur={handleSavePrix}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingCell({ id: pc.id, value: String(pc.prixJournalier) })}
                                  title="Cliquer pour modifier"
                                  className="w-full text-sm font-semibold text-asm-vert hover:bg-asm-vert-pale px-2 py-1.5 rounded-lg transition-colors"
                                >
                                  {formatFCFA(Number(pc.prixJournalier))}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
                  <p className="text-xs text-gray-400">
                    ✏️ Cliquez sur un montant pour le modifier —{' '}
                    <kbd className="bg-gray-100 px-1 rounded text-gray-500 font-mono">Entrée</kbd> pour valider,{' '}
                    <kbd className="bg-gray-100 px-1 rounded text-gray-500 font-mono">Échap</kbd> pour annuler
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ===== GESTION DES ZONES ===== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Zones géographiques</h2>
                <p className="text-xs text-gray-400 mt-0.5">Gérez les zones disponibles pour les réservations.</p>
              </div>
              <button type="button" onClick={openNewZone}
                className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-asm-vert-fonce transition-colors">
                <Plus className="h-4 w-4" /> Nouvelle zone
              </button>
            </div>

            {zoneSuccess && (
              <div className="mb-3 bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {zoneSuccess}
              </div>
            )}
            {zoneError && !showZoneModal && (
              <div className="mb-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg">{zoneError}</div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {zones.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune zone configurée</p>
                  <p className="text-xs mt-1">Ajoutez vos zones (Dakar, Thiès, Autres régions...)</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Zone</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {zones.map(zone => (
                      <tr key={zone.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-asm-vert" />
                            <span className="text-sm font-medium text-gray-900">{zone.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zone.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {zone.actif ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" title="Modifier la zone" onClick={() => openEditZone(zone)}
                              className="p-1.5 text-gray-400 hover:text-asm-vert hover:bg-asm-vert-pale rounded transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Supprimer la zone" onClick={() => handleDeleteZone(zone.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal zone (simplifié — sans prix) */}
            {showZoneModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                  <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingZone ? 'Modifier la zone' : 'Nouvelle zone'}
                    </h2>
                    <button type="button" aria-label="Fermer" onClick={() => setShowZoneModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveZone} className="p-5 space-y-4">
                    {zoneError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{zoneError}</div>}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la zone *</label>
                      <input aria-label="Nom de la zone" required type="text" placeholder="ex: Dakar, Thiès, Autres régions..."
                        value={zoneForm.nom} onChange={e => setZoneForm(f => ({ ...f, nom: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                      {!editingZone && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          Les prix par catégorie se configurent dans la grille tarifaire.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="actif-zone" checked={zoneForm.actif}
                        onChange={e => setZoneForm(f => ({ ...f, actif: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-asm-vert focus:ring-asm-vert" />
                      <label htmlFor="actif-zone" className="text-sm text-gray-700">Zone active</label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowZoneModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        Annuler
                      </button>
                      <button type="submit" disabled={savingZone}
                        className="flex-1 px-4 py-2 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60">
                        {savingZone ? 'Enregistrement...' : (editingZone ? 'Mettre à jour' : 'Créer')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Utilisateurs (Admin seulement) */}
      {activeTab === 'utilisateurs' && isAdmin && (
        <div className="space-y-4">
          {success && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {success}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openNewUser}
              className="flex items-center gap-2 bg-asm-vert text-white px-4 py-2 rounded-lg hover:bg-asm-vert-fonce transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rôle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Créé le</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilisateurs.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-asm-vert-pale rounded-full flex items-center justify-center text-asm-vert font-semibold text-sm">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{u.prenom} {u.nom}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          title="Modifier l'utilisateur"
                          onClick={() => openEditUser(u)}
                          className="p-1.5 text-gray-400 hover:text-asm-vert hover:bg-asm-vert-pale rounded transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleUser(u.id, u.actif)}
                            className={`text-xs font-medium hover:underline ${u.actif ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {u.actif ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Modal création / modification utilisateur */}
          {showUserModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                  </h2>
                  <button type="button" aria-label="Fermer" onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveUser} className="p-5 space-y-4">
                  {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                      <input aria-label="Prénom" required type="text" value={userForm.prenom} onChange={(e) => setUserForm(f => ({ ...f, prenom: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                      <input aria-label="Nom" required type="text" value={userForm.nom} onChange={(e) => setUserForm(f => ({ ...f, nom: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input aria-label="Email" required type="email" value={userForm.email} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input aria-label="Téléphone" type="text" placeholder="+221 77 000 00 00" value={userForm.telephone} onChange={(e) => setUserForm(f => ({ ...f, telephone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                      <select aria-label="Rôle" value={userForm.role} onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30">
                        <option value="AGENT">Agent</option>
                        <option value="COMPTABLE">Comptable</option>
                        <option value="ADMIN">Administrateur</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe {editingUser ? '(laisser vide = inchangé)' : '*'}
                      </label>
                      <input aria-label="Mot de passe" required={!editingUser} type="password"
                        placeholder={editingUser ? '••••••••' : ''}
                        value={userForm.motDePasse}
                        onChange={(e) => setUserForm(f => ({ ...f, motDePasse: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                      Annuler
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60">
                      {saving ? 'Enregistrement...' : (editingUser ? 'Mettre à jour' : 'Créer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteZoneId}
        title="Supprimer la zone tarifaire"
        message="Cette zone et ses tarifs associés seront définitivement supprimés."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={confirmDeleteZone}
        onCancel={() => setDeleteZoneId(null)}
      />
    </div>
  );
}
