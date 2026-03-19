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

        {/* ── Car SVG — berline premium midnight blue ── */}
        <svg viewBox="0 0 540 215" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', filter: 'drop-shadow(0 18px 50px rgba(0,0,0,.50))' }}>

          {/* ── Halo ambiant sous la voiture ── */}
          <ellipse cx="270" cy="210" rx="195" ry="8" fill="rgba(14,30,64,0.55)"/>

          {/* ── Carrosserie principale ── */}
          <path d="
            M 62 174
            C 50 164 46 150 50 136
            C 54 124 66 114 80 106
            L 108 94
            C 132 84 160 76 190 70
            L 212 56
            C 236 44 262 38 292 38
            L 330 38
            C 360 38 388 46 412 60
            L 450 86
            C 466 100 474 118 474 138
            C 474 156 466 170 454 178
            L 435 182
            A 35 22 0 0 0 365 182
            L 183 182
            A 35 22 0 0 0 113 182
            L 88 182
            C 76 180 66 178 62 174
            Z
          " fill="url(#vcBody)"/>

          {/* ── Panneau bas de caisse (assombri) ── */}
          <path d="
            M 113 162 L 113 182
            A 35 22 0 0 0 183 182
            L 365 182
            A 35 22 0 0 0 435 182
            L 454 178
            C 460 174 464 168 466 163 Z
          " fill="rgba(0,0,0,0.18)"/>

          {/* ── Reflet capot / toit ── */}
          <path d="M 190 72 Q 292 50 412 62 Q 400 52 330 38 Q 262 38 212 56 Q 196 64 190 72 Z"
            fill="rgba(255,255,255,0.07)"/>

          {/* ── Bande chromée bas de caisse ── */}
          <rect x="113" y="180" width="252" height="5" rx="2.5" fill="url(#vcChrome)"/>

          {/* ── Vitres ── */}
          <path d="
            M 204 120
            L 224 63
            C 246 47 270 40 296 40
            L 330 40
            C 358 40 380 52 398 68
            L 430 106
            L 430 120
            Z
          " fill="url(#vcGlass)"/>

          {/* ── Reflets vitre ── */}
          <path d="M 212 118 L 232 64 C 242 50 252 44 258 42 L 244 44 C 228 50 216 68 206 90 Z"
            fill="rgba(255,255,255,0.05)"/>
          <path d="M 340 42 L 348 42 L 428 118 L 420 118 Z"
            fill="rgba(255,255,255,0.04)"/>

          {/* ── Montant A ── */}
          <line x1="262" y1="40" x2="204" y2="120" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5"/>

          {/* ── Montant B ── */}
          <rect x="316" y="40" width="11" height="80" rx="2" fill="rgba(0,0,0,0.65)"/>

          {/* ── Ligne de ceinture ── */}
          <path d="M 112 120 Q 272 114 430 120"
            stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

          {/* ── Highlight principal carrosserie ── */}
          <path d="M 116 137 Q 274 127 442 137"
            stroke="rgba(255,255,255,0.20)" strokeWidth="5" fill="none" strokeLinecap="round"/>

          {/* ── Ligne de porte ── */}
          <path d="M 116 158 Q 274 153 432 155"
            stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" fill="none"/>

          {/* ── Poignées chromées ── */}
          <rect x="224" y="153" width="34" height="6" rx="3" fill="rgba(203,213,225,0.55)"/>
          <rect x="350" y="151" width="34" height="6" rx="3" fill="rgba(203,213,225,0.55)"/>

          {/* ── Rétroviseur ── */}
          <path d="M 203 118 L 188 115 L 186 126 L 201 128 Z" fill="url(#vcMirrorGrad)"/>
          <rect x="188" y="115" width="1.5" height="13" rx="0.75" fill="#4a6fa5"/>

          {/* ── Phare avant LED ── */}
          <path d="M 52 148 L 84 136 L 86 165 L 55 170 Z" fill="#0a1528"/>
          <path d="M 56 150 L 82 140 L 83 163 L 58 167 Z" fill="#060e1a"/>
          {/* DRL barre */}
          <rect x="57" y="136" width="27" height="4" rx="2" fill="white" opacity="0.96"/>
          <rect x="70" y="136" width="1.5" height="4" fill="rgba(255,255,255,0.45)"/>
          {/* Optique principale */}
          <ellipse cx="70" cy="153" rx="9" ry="7" fill="#040b15"/>
          <ellipse cx="70" cy="153" rx="6" ry="4.5" fill="url(#vcHeadlight)"/>
          {/* Anneau halo LED */}
          <ellipse cx="70" cy="153" rx="7.5" ry="5.8" fill="none" stroke="rgba(147,197,253,0.50)" strokeWidth="1.5"/>
          {/* Bande LED signature */}
          <path d="M 57 159 L 82 150" stroke="rgba(147,197,253,0.55)" strokeWidth="1.5" strokeLinecap="round"/>

          {/* ── Calandre avant ── */}
          <path d="M 49 168 Q 56 160 74 160 L 75 171 Q 58 173 51 176 Z" fill="#060e1a" opacity="0.92"/>
          <line x1="56" y1="163" x2="57" y2="172" stroke="#1e3a5f" strokeWidth="1.2"/>
          <line x1="62" y1="161" x2="63" y2="171" stroke="#1e3a5f" strokeWidth="1.2"/>
          <line x1="68" y1="160" x2="69" y2="170" stroke="#1e3a5f" strokeWidth="1.2"/>
          {/* Feu de brouillard */}
          <ellipse cx="62" cy="174" rx="5" ry="3" fill="rgba(253,224,71,0.85)"/>

          {/* ── Feux arrière LED ── */}
          <path d="M 456 144 L 477 154 L 475 174 L 454 168 Z" fill="#060e1a"/>
          <path d="M 458 147 L 474 155 L 472 171 L 456 166 Z" fill="url(#vcTaillight)"/>
          {/* Barre LED supérieure */}
          <rect x="454" y="140" width="21" height="4.5" rx="2.25" fill="#f87171" opacity="0.92"/>
          {/* Halo rouge */}
          <rect x="452" y="138" width="25" height="10" rx="5" fill="rgba(239,68,68,0.18)"/>

          {/* ── Ligne coffre ── */}
          <path d="M 454 178 C 462 162 468 144 472 138" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" fill="none"/>

          {/* ── Roue arrière — jante 10 branches ── */}
          <circle cx="400" cy="199" r="34" fill="#07090f"/>
          <circle cx="400" cy="199" r="27" fill="#0f1520"/>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i * 36 - 90) * (Math.PI / 180);
            return (
              <line key={`rs${i}`}
                x1={400} y1={199}
                x2={400 + 23 * Math.cos(a)}
                y2={199 + 23 * Math.sin(a)}
                stroke="#64748b" strokeWidth="3" strokeLinecap="round"
              />
            );
          })}
          <circle cx="400" cy="199" r="19" fill="none" stroke="#334155" strokeWidth="2"/>
          <circle cx="400" cy="199" r="10" fill="#07090f"/>
          <circle cx="400" cy="199" r="5.5" fill="url(#vcHub)"/>

          {/* ── Roue avant — jante 10 branches ── */}
          <circle cx="148" cy="199" r="34" fill="#07090f"/>
          <circle cx="148" cy="199" r="27" fill="#0f1520"/>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i * 36 - 90) * (Math.PI / 180);
            return (
              <line key={`fs${i}`}
                x1={148} y1={199}
                x2={148 + 23 * Math.cos(a)}
                y2={199 + 23 * Math.sin(a)}
                stroke="#64748b" strokeWidth="3" strokeLinecap="round"
              />
            );
          })}
          <circle cx="148" cy="199" r="19" fill="none" stroke="#334155" strokeWidth="2"/>
          <circle cx="148" cy="199" r="10" fill="#07090f"/>
          <circle cx="148" cy="199" r="5.5" fill="url(#vcHub)"/>

          <defs>
            {/* Carrosserie bleu midnight premium */}
            <linearGradient id="vcBody" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f"/>
              <stop offset="45%" stopColor="#152d4c"/>
              <stop offset="100%" stopColor="#0d1f36"/>
            </linearGradient>
            {/* Vitres teintées bleu nuit */}
            <linearGradient id="vcGlass" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#0d1f36" stopOpacity="0.96"/>
              <stop offset="100%" stopColor="#162d4e" stopOpacity="0.88"/>
            </linearGradient>
            {/* Chrome sill */}
            <linearGradient id="vcChrome" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0"/>
              <stop offset="50%" stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#cbd5e1"/>
            </linearGradient>
            {/* Rétroviseur */}
            <linearGradient id="vcMirrorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f"/>
              <stop offset="100%" stopColor="#0d1f36"/>
            </linearGradient>
            {/* Phare LED blanc-bleu */}
            <radialGradient id="vcHeadlight" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
              <stop offset="35%" stopColor="#bfdbfe" stopOpacity="0.92"/>
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.35"/>
            </radialGradient>
            {/* Feux arrière rouge vif */}
            <linearGradient id="vcTaillight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.97"/>
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.82"/>
            </linearGradient>
            {/* Centre jante */}
            <radialGradient id="vcHub" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#334155"/>
            </radialGradient>
          </defs>
        </svg>

        {/* ── Ombre au sol ── */}
        <div style={{
          position: 'absolute', bottom: '-14px', left: '10%', right: '10%',
          height: '22px', borderRadius: '50%',
          background: 'rgba(0,0,0,.25)', filter: 'blur(16px)',
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
