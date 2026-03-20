// Page publique de vérification d'authenticité d'un contrat — layout autonome
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Car, User, Calendar, MapPin, Loader2, FileText, Phone, Mail } from 'lucide-react';
import { publicApi, API_FILE_BASE } from '../../services/api';

interface TenantInfo {
  nomEntreprise: string;
  slogan: string | null;
  logo: string | null;
  couleurPrimaire: string | null;
  parametre: {
    telephone: string | null;
    email: string | null;
    adresse: string | null;
    ville: string | null;
  } | null;
}

interface ContratVerifie {
  id: string;
  numeroContrat: string;
  statut: string;
  dateSignature: string;
  createdAt: string;
  tenant: TenantInfo;
  reservation: {
    dateDebut: string;
    dateFin: string;
    nombreJours: number;
    lieuPriseEnCharge: string;
    client: { prenom: string; nom: string };
    vehicule: { marque: string; modele: string; immatriculation: string; categorie: string };
  };
}

const STATUT_LABELS: Record<string, string> = {
  ACTIF: 'Actif',
  CLOTURE: 'Clôturé',
  RESILIE: 'Résilié',
};

const STATUT_COLORS: Record<string, string> = {
  ACTIF: 'text-green-700 bg-green-50 border-green-200',
  CLOTURE: 'text-gray-700 bg-gray-50 border-gray-200',
  RESILIE: 'text-red-700 bg-red-50 border-red-200',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ContratVerificationPage() {
  const { numero } = useParams<{ numero: string }>();
  const [contrat, setContrat] = useState<ContratVerifie | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!numero) return;
    publicApi.verifierContrat(numero)
      .then(res => {
        if (res.data?.data) setContrat(res.data.data);
        else setNotFound(true);
      })
      .catch((err) => {
        console.error('[ContratVerification] Erreur API:', err?.response?.status, err?.response?.data);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [numero]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-asm-vert" />
        <p className="text-sm">Vérification en cours…</p>
      </div>
    );
  }

  if (notFound || !contrat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <ShieldX className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Contrat introuvable</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Le numéro <span className="font-mono font-semibold text-gray-800">{numero}</span> ne correspond à aucun contrat enregistré dans notre système.
          </p>
          <p className="text-xs text-gray-400">
            Vérifiez que vous avez bien scanné le QR code du document officiel.
          </p>
        </div>
      </div>
    );
  }

  const t = contrat.tenant;
  const p = t.parametre;
  const r = contrat.reservation;
  const statutColor = STATUT_COLORS[contrat.statut] || 'text-gray-700 bg-gray-50 border-gray-200';
  const couleur = t.couleurPrimaire || '#1B5E20';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ===== NAVBAR — infos du tenant émetteur du contrat ===== */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {t.logo ? (
            <img
              src={`${API_FILE_BASE}${t.logo}`}
              alt={t.nomEntreprise}
              className="h-10 w-auto max-w-[130px] object-contain"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: couleur }}
            >
              <Car className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="leading-tight">
            <span className="font-bold text-gray-900 text-base block">{t.nomEntreprise}</span>
            {t.slogan && <span className="text-xs text-gray-500 block -mt-0.5">{t.slogan}</span>}
          </div>
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">Vérification de contrat</span>
        </div>
      </header>

      {/* ===== CONTENU ===== */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="max-w-lg w-full space-y-6">

          {/* Badge authenticité */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${couleur}1A` }}
            >
              <ShieldCheck className="h-9 w-9" style={{ color: couleur }} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Contrat authentique</h1>
            <p className="text-sm text-gray-500">
              Ce document a été émis par{' '}
              <span className="font-semibold" style={{ color: couleur }}>{t.nomEntreprise}</span>{' '}
              et son authenticité est confirmée.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="font-mono text-lg font-bold text-gray-900 tracking-wide">
                {contrat.numeroContrat}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statutColor}`}>
                {STATUT_LABELS[contrat.statut] || contrat.statut}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Signé le {formatDate(contrat.dateSignature)}
            </p>
          </div>

          {/* Informations du contrat */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">

            {/* Client */}
            <div className="px-5 py-4 flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: couleur }} />
              <div className="text-sm">
                <div className="text-gray-500 text-xs mb-0.5">Locataire</div>
                <div className="font-semibold text-gray-900">{r.client.prenom} {r.client.nom}</div>
              </div>
            </div>

            {/* Véhicule */}
            <div className="px-5 py-4 flex items-start gap-3">
              <Car className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: couleur }} />
              <div className="text-sm">
                <div className="text-gray-500 text-xs mb-0.5">Véhicule</div>
                <div className="font-semibold text-gray-900">{r.vehicule.marque} {r.vehicule.modele}</div>
                <div className="font-mono text-xs text-gray-500 mt-0.5">{r.vehicule.immatriculation}</div>
              </div>
            </div>

            {/* Dates */}
            <div className="px-5 py-4 flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: couleur }} />
              <div className="text-sm">
                <div className="text-gray-500 text-xs mb-0.5">Période de location</div>
                <div className="font-semibold text-gray-900">
                  {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{r.nombreJours} jour{r.nombreJours > 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Lieu */}
            <div className="px-5 py-4 flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: couleur }} />
              <div className="text-sm">
                <div className="text-gray-500 text-xs mb-0.5">Lieu de prise en charge</div>
                <div className="font-semibold text-gray-900">{r.lieuPriseEnCharge}</div>
              </div>
            </div>

          </div>

          {/* Note confidentialité */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Cette page est fournie par <strong>{t.nomEntreprise}</strong> pour confirmer l'authenticité
              des documents de location. Les informations financières ne sont pas affichées.
            </p>
          </div>

        </div>
      </main>

      {/* ===== FOOTER — coordonnées du tenant émetteur ===== */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">{t.nomEntreprise}</p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {p?.telephone && (
              <a href={`tel:${p.telephone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-gray-700">
                <Phone className="h-3.5 w-3.5" />
                {p.telephone}
              </a>
            )}
            {p?.email && (
              <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-gray-700">
                <Mail className="h-3.5 w-3.5" />
                {p.email}
              </a>
            )}
            {p?.adresse && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {p.adresse}{p.ville ? `, ${p.ville}` : ''}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            © {new Date().getFullYear()} {t.nomEntreprise}. Tous droits réservés.
          </p>
        </div>
      </footer>

    </div>
  );
}
