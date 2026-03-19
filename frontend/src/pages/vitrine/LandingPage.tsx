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
  Tag,
  CalendarClock,
} from 'lucide-react';
import { publicApi } from '../../services/api';

// ── Keyframes injected once for the floating car animation ──
const CAR_ANIM_CSS = `
  @keyframes vitrine-bob   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
  @keyframes vitrine-shade { 0%,100%{transform:scaleX(1);opacity:.7} 50%{transform:scaleX(.8);opacity:.3} }
  @keyframes vitrine-fc    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-7px)} }
`;

function FloatingCarVisual({ disponibles }: { disponibles: number }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CAR_ANIM_CSS }} />
      <div style={{ position: 'relative', width: '100%', animation: 'vitrine-bob 5s ease-in-out infinite' }}>

        {/* ── Top-left floating card ── */}
        <div style={{
          position: 'absolute', top: '4px', left: '-10px',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '11px 15px', boxShadow: '0 4px 24px rgba(0,0,0,.12)',
          zIndex: 2, animation: 'vitrine-fc 6s ease-in-out infinite', minWidth: '140px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '2px' }}>
            Flotte disponible
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            {disponibles > 0 ? disponibles : '–'}
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8' }}> véhicules</span>
          </div>
          <div style={{ fontSize: '10.5px', fontWeight: 600, marginTop: '2px', color: '#059669' }}>↑ Prêts à partir</div>
        </div>

        {/* ── Bottom-right floating card ── */}
        <div style={{
          position: 'absolute', bottom: '20px', right: '-10px',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '11px 15px', boxShadow: '0 4px 24px rgba(0,0,0,.12)',
          zIndex: 2, animation: 'vitrine-fc 6s ease-in-out infinite', animationDelay: '-2.5s', minWidth: '130px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '2px' }}>
            Réservation
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1.1, color: '#f59e0b' }}>En ligne</div>
          <div style={{ fontSize: '10.5px', fontWeight: 600, marginTop: '2px', color: '#d97706' }}>↑ Rapide & simple</div>
        </div>

        {/* ── Car SVG ── */}
        <svg viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', filter: 'drop-shadow(0 14px 44px rgba(0,0,0,.35))' }}>
          <rect x="40" y="140" width="420" height="70" rx="12" fill="url(#vcb1)"/>
          <path d="M130 140 L160 85 Q200 60 250 55 Q300 50 340 65 L380 100 L390 140Z" fill="url(#vcb2)"/>
          <path d="M155 130 L178 88 Q210 70 250 65 Q285 62 315 72 L345 100 L355 130Z" fill="url(#vcw)"/>
          <line x1="250" y1="140" x2="250" y2="208" stroke="rgba(255,255,255,.08)" strokeWidth="1"/>
          <rect x="195" y="170" width="28" height="4" rx="2" fill="rgba(255,255,255,.12)"/>
          <rect x="277" y="170" width="28" height="4" rx="2" fill="rgba(255,255,255,.12)"/>
          <ellipse cx="450" cy="162" rx="13" ry="8" fill="url(#vcl)" opacity=".9"/>
          <path d="M463 158 L490 146 L490 178 L463 166Z" fill="url(#vcb3)" opacity=".22"/>
          <rect x="50" y="156" width="15" height="9" rx="3" fill="#ef4444" opacity=".7"/>
          {/* Front wheel */}
          <circle cx="150" cy="210" r="30" fill="#111827"/>
          <circle cx="150" cy="210" r="22" fill="#1e293b"/>
          <circle cx="150" cy="210" r="13" fill="#0f172a"/>
          <circle cx="150" cy="210" r="5"  fill="url(#vcr)"/>
          <line x1="150" y1="188" x2="150" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <line x1="172" y1="210" x2="150" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <line x1="150" y1="232" x2="150" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <line x1="128" y1="210" x2="150" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          {/* Rear wheel */}
          <circle cx="360" cy="210" r="30" fill="#111827"/>
          <circle cx="360" cy="210" r="22" fill="#1e293b"/>
          <circle cx="360" cy="210" r="13" fill="#0f172a"/>
          <circle cx="360" cy="210" r="5"  fill="url(#vcr2)"/>
          <line x1="360" y1="188" x2="360" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <line x1="382" y1="210" x2="360" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <line x1="360" y1="232" x2="360" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <line x1="338" y1="210" x2="360" y2="210" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
          <defs>
            <linearGradient id="vcb1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--color-secondary)', stopOpacity: 0.9 }}/>
              <stop offset="100%" style={{ stopColor: 'var(--color-secondary)', stopOpacity: 0.7 }}/>
            </linearGradient>
            <linearGradient id="vcb2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--color-secondary)', stopOpacity: 0.95 }}/>
              <stop offset="100%" style={{ stopColor: 'var(--color-secondary)', stopOpacity: 0.75 }}/>
            </linearGradient>
            <linearGradient id="vcw" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06"/>
            </linearGradient>
            <linearGradient id="vcl" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d"/>
              <stop offset="100%" stopColor="#fef9c3"/>
            </linearGradient>
            <linearGradient id="vcb3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d"/>
              <stop offset="100%" stopColor="transparent"/>
            </linearGradient>
            <radialGradient id="vcr">
              <stop offset="0%" stopColor="rgba(255,255,255,.8)"/>
              <stop offset="100%" style={{ stopColor: 'var(--color-secondary)' }}/>
            </radialGradient>
            <radialGradient id="vcr2">
              <stop offset="0%" stopColor="rgba(255,255,255,.8)"/>
              <stop offset="100%" style={{ stopColor: 'var(--color-secondary)' }}/>
            </radialGradient>
          </defs>
        </svg>

        {/* ── Shadow ── */}
        <div style={{
          position: 'absolute', bottom: '-14px', left: '12%', right: '12%',
          height: '22px', borderRadius: '50%',
          background: 'rgba(0,0,0,.18)', filter: 'blur(14px)',
          animation: 'vitrine-shade 5s ease-in-out infinite',
        }}/>
      </div>
    </>
  );
}

interface PromoSettings {
  bannierePromo?: string;
  promoSousTexte?: string;
  promoReduction?: string;
  promoDateFin?: string;
}

function formatDateFin(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

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
  const [totalDisponibles, setTotalDisponibles] = useState(0);
  const [promo, setPromo] = useState<PromoSettings>({});
  const [nomEntreprise, setNomEntreprise] = useState('');
  const [ville, setVille] = useState('');
  const [activite, setActivite] = useState('');

  useEffect(() => {
    publicApi.getVehicules().then((res) => {
      const data = res.data?.data || [];
      setTotalDisponibles(data.length);
      setVehicules(data.slice(0, 3));
    }).catch(() => {});

    publicApi.getSettings().then((res) => {
      if (res.data?.data) {
        const d = res.data.data;
        setPromo(d);
        if (d.nomEntreprise) setNomEntreprise(d.nomEntreprise);
        if (d.ville) setVille(d.ville);
        if (d.activite) setActivite(d.activite);
      }
    }).catch(() => {});
  }, []);

  const promoActive = Boolean(promo.bannierePromo) &&
    (!promo.promoDateFin || new Date(promo.promoDateFin) >= new Date());

  const services = [
    {
      icon: Car,
      title: 'Location courte durée',
      description: 'Louez un véhicule à la journée ou à la semaine pour tous vos déplacements professionnels ou personnels.',
    },
    {
      icon: Plane,
      title: 'Transfert aéroport',
      description: 'Service de navette depuis et vers les aéroports et gares de la région. Ponctualité et confort garantis.',
    },
    {
      icon: Calendar,
      title: 'Location longue durée',
      description: 'Des tarifs préférentiels pour les locations de plusieurs semaines ou mois. Idéal pour les séjours prolongés.',
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: text ── */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
                <Star className="h-4 w-4 text-asm-or fill-asm-or" />
                {activite || 'Location de véhicules'}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Louez un véhicule
                <span className="text-asm-or block">en toute confiance</span>
              </h1>
              <p className="text-white/80 text-lg mb-8 leading-relaxed">
                {nomEntreprise || 'Votre agence'} vous offre une flotte de véhicules modernes pour tous vos
                besoins{ville ? ` à ${ville} et ses environs` : ''}. Tarifs clairs, service fiable, zéro surprise.
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

            {/* ── Right: floating car ── */}
            <div className="hidden lg:flex items-center justify-center px-6 py-4">
              <FloatingCarVisual disponibles={totalDisponibles} />
            </div>

          </div>
        </div>
      </section>

      {/* ===== SECTION PROMO ===== */}
      {promoActive && (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0d3d12] via-asm-vert to-[#1a5c20]">
          {/* Décors géométriques */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-asm-or/10" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-asm-or/60" />
            <div className="absolute top-8 right-1/3 w-1 h-1 rounded-full bg-white/40" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

              {/* ── Colonne gauche : badge réduction ── */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="relative">
                  {/* Badge extérieur */}
                  <div className="w-44 h-44 rounded-full border-4 border-asm-or/40 flex items-center justify-center bg-asm-or/10">
                    <div className="w-36 h-36 rounded-full bg-asm-or flex items-center justify-center flex-col shadow-2xl">
                      {promo.promoReduction ? (
                        <>
                          <span className="text-4xl font-black text-asm-vert leading-none">
                            {promo.promoReduction}
                          </span>
                          <span className="text-xs font-bold text-asm-vert/70 uppercase tracking-widest mt-1">réduction</span>
                        </>
                      ) : (
                        <Tag className="h-12 w-12 text-asm-vert" />
                      )}
                    </div>
                  </div>
                  {/* Étoile déco */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Star className="h-4 w-4 text-asm-or fill-asm-or" />
                  </div>
                </div>
                <span className="mt-4 text-xs font-bold text-asm-or uppercase tracking-[0.2em]">Offre limitée</span>
              </div>

              {/* ── Colonne droite : texte + CTA ── */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-asm-or animate-pulse" />
                  Promotion en cours
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3">
                  {promo.bannierePromo}
                </h2>

                {promo.promoSousTexte && (
                  <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-6 max-w-xl">
                    {promo.promoSousTexte}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                  <button
                    onClick={() => navigate('/reserver')}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-asm-or text-asm-vert font-bold rounded-xl shadow-lg hover:bg-yellow-400 transition-colors text-base"
                  >
                    Réserver maintenant
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {promo.promoDateFin && (
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <CalendarClock className="h-4 w-4 text-asm-or flex-shrink-0" />
                      <span>Jusqu'au <span className="text-white font-semibold">{formatDateFin(promo.promoDateFin)}</span></span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

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
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Pourquoi choisir {nomEntreprise || 'nous'} ?</h2>
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
