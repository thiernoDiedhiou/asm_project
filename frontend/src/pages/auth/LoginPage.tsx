// Page de connexion
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, Car, Lock, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { publicApi } from '../../services/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [nomEntreprise, setNomEntreprise] = useState('');
  const [adresse, setAdresse] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suspensionReason = searchParams.get('reason');

  useEffect(() => {
    // Sur le domaine admin, pas de tenant à résoudre
    if (window.location.hostname.startsWith('admin.')) return;
    publicApi.getSettings().then(res => {
      const s = res.data?.data;
      if (s?.nomEntreprise) setNomEntreprise(s.nomEntreprise);
      if (s?.adresse || s?.ville) setAdresse([s.adresse, s.ville].filter(Boolean).join(', '));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, motDePasse);
      const { user } = useAuthStore.getState();
      navigate(user?.role === 'SUPER_ADMIN' ? '/tenants' : '/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Email ou mot de passe incorrect';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-asm-vert to-asm-vert-clair flex items-center justify-center p-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo et titre */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-asm-vert mb-4">
              <Car className="h-8 w-8 text-asm-or" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{nomEntreprise || 'InnoSoft Location'}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Système de gestion de location de véhicules
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-1 w-8 bg-asm-vert rounded-full" />
              <div className="h-1 w-4 bg-asm-or rounded-full" />
              <div className="h-1 w-8 bg-asm-vert rounded-full" />
            </div>
          </div>

          {/* Bandeau suspension tenant */}
          {suspensionReason && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Session terminée</p>
                <p className="text-xs text-red-600 mt-0.5">{suspensionReason}</p>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Lien mot de passe oublié */}
            <div className="text-right -mt-2">
              <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-asm-vert transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-asm-vert hover:bg-asm-vert-clair text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

        </div>

        {/* Pied de page */}
        <p className="text-center text-white/60 text-xs mt-6">
          {adresse || 'Powered by Innosoft Creation'}
        </p>
      </div>
    </div>
  );
}
