// Page Tarifs — présente les 3 plans d'abonnement aux prospects
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Zap, Building2, Crown, Phone } from 'lucide-react';
import axios from 'axios';

interface Plan {
  code: string;
  nom: string;
  description?: string;
  montantMensuel: number;
  montantAnnuel?: number;
  maxAgents: number;
  maxVehicules: number;
  features: string[];
  actif?: boolean;
}

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  STARTER: Zap,
  PRO: Building2,
  ENTERPRISE: Crown,
};

const PLAN_STYLES: Record<string, { badge: string; border: string; btnBg: string; popular: boolean }> = {
  STARTER:    { badge: 'bg-blue-100 text-blue-700',   border: 'border-gray-200',        btnBg: 'bg-gray-800 hover:bg-gray-700',             popular: false },
  PRO:        { badge: 'bg-asm-vert text-white',       border: 'border-asm-vert shadow-xl ring-2 ring-asm-vert/30', btnBg: 'bg-asm-vert hover:bg-asm-vert-clair', popular: true  },
  ENTERPRISE: { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200',    btnBg: 'bg-purple-700 hover:bg-purple-600',         popular: false },
};

function formatFCFA(n: number) {
  return Number(n).toLocaleString('fr-SN') + ' FCFA';
}

export function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<'mensuel' | 'annuel'>('mensuel');

  useEffect(() => {
    axios.get('/api/public/plans')
      .then(res => setPlans(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-16 px-4">
      {/* En-tête */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Nos Formules d'Abonnement</h1>
        <p className="text-gray-500 text-lg">Choisissez le plan adapté à la taille de votre agence de location.</p>

        {/* Toggle mensuel / annuel */}
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-xl p-1 mt-6">
          <button
            onClick={() => setBilling('mensuel')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'mensuel' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling('annuel')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'annuel' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Annuel <span className="text-asm-vert font-bold ml-1">-20%</span>
          </button>
        </div>
      </div>

      {/* Cartes plans */}
      {loading ? (
        <div className="flex justify-center gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-80 h-96 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.filter(p => p.actif !== false).map(plan => {
            const Icon = PLAN_ICONS[plan.code] || Zap;
            const style = PLAN_STYLES[plan.code] || PLAN_STYLES.STARTER;
            const prix = billing === 'annuel' && plan.montantAnnuel
              ? plan.montantAnnuel / 12
              : plan.montantMensuel;
            const features: string[] = Array.isArray(plan.features) ? plan.features : [];

            return (
              <div
                key={plan.code}
                className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col ${style.border} transition-shadow`}
              >
                {style.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-asm-vert text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                      ⭐ Le plus populaire
                    </span>
                  </div>
                )}

                {/* Icône + nom */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${style.badge}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge}`}>
                      {plan.code}
                    </span>
                    <h3 className="font-bold text-gray-900 text-lg mt-0.5">{plan.nom}</h3>
                  </div>
                </div>

                {/* Prix */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{formatFCFA(Math.round(prix))}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {billing === 'annuel' && plan.montantAnnuel
                      ? `Facturé ${formatFCFA(plan.montantAnnuel)}/an`
                      : 'par mois'}
                  </p>
                </div>

                {/* Limites */}
                <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Agents</span>
                    <span className="font-semibold text-gray-900">{plan.maxAgents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Véhicules</span>
                    <span className="font-semibold text-gray-900">{plan.maxVehicules}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-8">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-asm-vert flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.description && (
                    <li className="text-xs text-gray-400 italic mt-1">{plan.description}</li>
                  )}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => navigate('/reserver')}
                  className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-colors ${style.btnBg}`}
                >
                  Démarrer avec {plan.nom}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Section contact */}
      <div className="max-w-xl mx-auto text-center mt-16 bg-gray-50 rounded-2xl p-8 border border-gray-100">
        <Phone className="h-8 w-8 text-asm-vert mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Besoin d'un devis personnalisé ?</h3>
        <p className="text-gray-500 text-sm mb-4">
          Pour les grandes flottes ou les besoins spécifiques, contactez-nous pour une offre sur mesure.
        </p>
        <a
          href="tel:"
          className="inline-flex items-center gap-2 px-6 py-3 bg-asm-vert text-white font-semibold rounded-xl hover:bg-asm-vert-clair transition-colors text-sm"
        >
          <Phone className="h-4 w-4" />
          Nous contacter
        </a>
      </div>
    </div>
  );
}
