// Header principal avec notifications et recherche globale
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Menu, Search, X, User, Car, FileText, ChevronDown, LogOut, Settings, Phone, Mail, Pencil, ArrowLeft, Eye, EyeOff, Lock, CalendarCheck } from 'lucide-react';
import { io as socketIO } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { dashboardApi, clientsApi, vehiculesApi, contratsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatRelative } from '../../utils/format';
import api from '../../services/api';

interface HeaderProps {
  onMenuClick: () => void;
}

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  type: 'client' | 'vehicule' | 'contrat';
  path: string;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

export function Header({ onMenuClick }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { user, logout, fetchMe } = useAuthStore();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalView, setModalView] = useState<'profil' | 'password'>('profil');
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [pwdForm, setPwdForm] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [nouvelleDemande, setNouvelleDemande] = useState<{
    message: string;
    reservationId: string;
    numeroReservation: string;
    client: { prenom: string; nom: string; telephone: string };
  } | null>(null);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowProfile(false);
    await logout();
    navigate('/login');
  };

  // Recherche globale avec debounce
  const performSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const [clientsRes, vehiculesRes, contratsRes] = await Promise.allSettled([
        clientsApi.getAll({ search: q, limit: 4 }),
        vehiculesApi.getAll({ search: q, limit: 4 }),
        contratsApi.getAll({ search: q, limit: 4 }),
      ]);

      const results: SearchResult[] = [];

      if (clientsRes.status === 'fulfilled') {
        const clients = clientsRes.value.data?.data || [];
        clients.forEach((c: { id: string; prenom: string; nom: string; telephone?: string; typeClient: string }) => {
          results.push({
            id: c.id,
            type: 'client',
            label: `${c.prenom} ${c.nom}`,
            sublabel: c.telephone || c.typeClient,
            path: `/clients/${c.id}`,
          });
        });
      }

      if (vehiculesRes.status === 'fulfilled') {
        const vehicules = vehiculesRes.value.data?.data || [];
        vehicules.forEach((v: { id: string; marque: string; modele: string; immatriculation: string; statut: string }) => {
          results.push({
            id: v.id,
            type: 'vehicule',
            label: `${v.marque} ${v.modele}`,
            sublabel: v.immatriculation,
            path: `/vehicules/${v.id}`,
          });
        });
      }

      if (contratsRes.status === 'fulfilled') {
        const contrats = contratsRes.value.data?.data || [];
        contrats.forEach((c: { id: string; numeroContrat: string; client?: { prenom: string; nom: string } }) => {
          results.push({
            id: c.id,
            type: 'contrat',
            label: c.numeroContrat?.slice(-14) || c.id,
            sublabel: c.client ? `${c.client.prenom} ${c.client.nom}` : '',
            path: `/contrats/${c.id}`,
          });
        });
      }

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  function handleSelect(result: SearchResult) {
    navigate(result.path);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  // Icône selon le type
  const TypeIcon = {
    client: User,
    vehicule: Car,
    contrat: FileText,
  };

  const typeLabel = {
    client: 'Clients',
    vehicule: 'Véhicules',
    contrat: 'Contrats',
  };

  const typeColor = {
    client: 'text-blue-600 bg-blue-50',
    vehicule: 'text-asm-vert bg-green-50',
    contrat: 'text-purple-600 bg-purple-50',
  };

  // Grouper les résultats par type
  const grouped = searchResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Écoute socket — nouvelles demandes vitrine (toutes pages)
  useEffect(() => {
    if (!user) return;
    const socket = socketIO(window.location.origin, { path: '/socket.io' });
    socket.on('notification:nouvelle_demande', (data) => {
      setNouvelleDemande(data);
    });
    return () => { socket.disconnect(); };
  }, [user]);

  // Récupérer les alertes (seulement si l'utilisateur est authentifié)
  const { data: alertesData } = useQuery(
    ['alertes'],
    () => dashboardApi.getAlertes(),
    { refetchInterval: 60000, enabled: !!user }
  );

  const alertes = alertesData?.data || [];
  const totalAlertes = alertes.length + (nouvelleDemande ? 1 : 0);

  return (
    <>
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-30 shadow-sm">
      {/* Bouton menu mobile */}
      <button
        aria-label="Ouvrir le menu"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Recherche globale */}
      <div className="flex-1 max-w-md relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Recherche globale"
            placeholder="Rechercher client, véhicule, contrat..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= MIN_QUERY_LENGTH && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown résultats */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                <div className="h-4 w-4 border-2 border-asm-vert border-t-transparent rounded-full animate-spin" />
                Recherche en cours...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">
                Aucun résultat pour «&nbsp;{searchQuery}&nbsp;»
              </div>
            ) : (
              (Object.entries(grouped) as [string, SearchResult[]][]).map(([type, items]) => {
                const Icon = TypeIcon[type as keyof typeof TypeIcon];
                return (
                  <div key={type}>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {typeLabel[type as keyof typeof typeLabel]}
                      </span>
                    </div>
                    {items.map(result => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className={`p-1.5 rounded-lg flex-shrink-0 ${typeColor[type as keyof typeof typeColor]}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{result.label}</p>
                          {result.sublabel && (
                            <p className="text-xs text-gray-500 truncate">{result.sublabel}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {totalAlertes > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {totalAlertes > 9 ? '9+' : totalAlertes}
              </span>
            )}
          </button>

          {/* Panneau de notifications */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">
                  Alertes ({totalAlertes})
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alertes.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-6">
                    Aucune alerte
                  </p>
                ) : (
                  alertes.slice(0, 10).map((alerte: {
                    id: string;
                    type: string;
                    message: string;
                    severite: string;
                    lien?: string;
                    createdAt: string;
                  }) => (
                    <button
                      key={alerte.id}
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        if (alerte.lien) navigate(alerte.lien);
                      }}
                      className={`w-full text-left p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                        alerte.severite === 'ERROR'
                          ? 'border-l-2 border-l-red-500'
                          : alerte.severite === 'WARNING'
                          ? 'border-l-2 border-l-yellow-500'
                          : 'border-l-2 border-l-blue-500'
                      }`}
                    >
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {alerte.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelative(alerte.createdAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar utilisateur + dropdown profil */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => { setShowProfile(v => !v); setShowNotifications(false); }}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Menu utilisateur"
          >
            <div className="h-8 w-8 rounded-full bg-asm-vert flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <ChevronDown className={`hidden md:block h-3.5 w-3.5 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown profil */}
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {/* Infos utilisateur */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-asm-vert flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {user?.prenom?.[0]}{user?.nom?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.prenom} {user?.nom}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded bg-asm-vert/10 text-asm-vert">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => { setShowProfile(false); setEditingPhone(false); setModalView('profil'); setPwdError(''); setPwdSuccess(''); setPwdForm({ actuel: '', nouveau: '', confirmation: '' }); setShowProfileModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  Mon profil
                </button>
                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => { setShowProfile(false); navigate('/parametres'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    Paramètres
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal Mon Profil */}
      {showProfileModal && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            {/* En-tête */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modalView === 'password' && (
                  <button type="button" aria-label="Retour" onClick={() => { setModalView('profil'); setPwdError(''); setPwdSuccess(''); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <h2 className="text-lg font-bold text-gray-900">
                  {modalView === 'profil' ? 'Mon profil' : 'Mot de passe'}
                </h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Vue Profil */}
            {modalView === 'profil' && (
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-asm-vert flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {user.prenom?.[0]}{user.nom?.[0]}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{user.prenom} {user.nom}</p>
                    <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-asm-vert/10 text-asm-vert">
                      {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'AGENT' ? 'Agent' : 'Comptable'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {editingPhone ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input aria-label="Numéro de téléphone" type="text" value={phoneValue}
                          onChange={e => setPhoneValue(e.target.value)} placeholder="+221 77 000 00 00" autoFocus
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                        <button type="button" disabled={savingPhone}
                          onClick={async () => {
                            setSavingPhone(true);
                            try { await api.put(`/users/${user.id}`, { telephone: phoneValue }); await fetchMe(); setEditingPhone(false); }
                            catch { /* ignore */ } finally { setSavingPhone(false); }
                          }}
                          className="px-3 py-1.5 bg-asm-vert text-white rounded-lg text-xs font-medium hover:bg-asm-vert-fonce disabled:opacity-60">
                          {savingPhone ? '...' : 'OK'}
                        </button>
                        <button type="button" onClick={() => setEditingPhone(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-gray-600">
                          {user.telephone || <span className="text-gray-300 italic text-xs">Non renseigné</span>}
                        </span>
                        <button type="button" title="Modifier le téléphone"
                          onClick={() => { setPhoneValue(user.telephone || ''); setEditingPhone(true); }}
                          className="p-1 text-gray-300 hover:text-asm-vert rounded transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => { setModalView('password'); setPwdError(''); setPwdSuccess(''); setPwdForm({ actuel: '', nouveau: '', confirmation: '' }); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <Lock className="h-4 w-4 text-gray-400" />
                    Changer le mot de passe
                  </button>
                </div>
              </div>
            )}

            {/* Vue Changement de mot de passe */}
            {modalView === 'password' && (
              <form className="p-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPwdError('');
                  if (pwdForm.nouveau !== pwdForm.confirmation) { setPwdError('Les mots de passe ne correspondent pas'); return; }
                  if (pwdForm.nouveau.length < 8) { setPwdError('Au moins 8 caractères requis'); return; }
                  setSavingPwd(true);
                  try {
                    await api.put('/auth/password', { motDePasseActuel: pwdForm.actuel, nouveauMotDePasse: pwdForm.nouveau });
                    setPwdSuccess('Mot de passe modifié avec succès');
                    setPwdForm({ actuel: '', nouveau: '', confirmation: '' });
                    setTimeout(() => { setPwdSuccess(''); setModalView('profil'); }, 2000);
                  } catch (err: unknown) {
                    const e = err as { response?: { data?: { message?: string } } };
                    setPwdError(e?.response?.data?.message || 'Erreur lors de la modification');
                  } finally { setSavingPwd(false); }
                }}>
                {pwdError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{pwdError}</div>}
                {pwdSuccess && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">{pwdSuccess}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <div className="relative">
                    <input aria-label="Mot de passe actuel" required type={showPwd ? 'text' : 'password'}
                      value={pwdForm.actuel} onChange={e => setPwdForm(f => ({ ...f, actuel: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input aria-label="Nouveau mot de passe" required type="password"
                    value={pwdForm.nouveau} onChange={e => setPwdForm(f => ({ ...f, nouveau: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                  <input aria-label="Confirmer le mot de passe" required type="password"
                    value={pwdForm.confirmation} onChange={e => setPwdForm(f => ({ ...f, confirmation: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
                </div>
                <button type="submit" disabled={savingPwd}
                  className="w-full bg-asm-vert text-white py-2.5 rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors">
                  {savingPwd ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </header>

    {/* Toast — nouvelle demande vitrine (visible sur toutes les pages) */}
    {nouvelleDemande && (
      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl border border-asm-vert/30 p-4 flex items-start gap-3 animate-fade-in">
        <div className="h-9 w-9 rounded-full bg-asm-vert/10 flex items-center justify-center flex-shrink-0">
          <CalendarCheck className="h-5 w-5 text-asm-vert" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Nouvelle demande vitrine</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{nouvelleDemande.message}</p>
          {nouvelleDemande.client && (
            <p className="text-xs text-gray-400 mt-0.5">{nouvelleDemande.client.telephone}</p>
          )}
          <button
            type="button"
            onClick={() => {
              navigate(`/reservations/${nouvelleDemande.reservationId}`);
              setNouvelleDemande(null);
            }}
            className="mt-2 text-xs font-semibold text-asm-vert hover:underline"
          >
            Voir la demande →
          </button>
        </div>
        <button
          type="button"
          aria-label="Fermer la notification"
          onClick={() => setNouvelleDemande(null)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}
    </>
  );
}
