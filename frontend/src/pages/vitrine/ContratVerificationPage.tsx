// Page publique de vérification d'authenticité d'un contrat ASM
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Car, User, Calendar, MapPin, Loader2, FileText } from 'lucide-react';
import { publicApi } from '../../services/api';

interface ContratVerifie {
  id: string;
  numeroContrat: string;
  statut: string;
  dateSignature: string;
  createdAt: string;
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
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [numero]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-asm-vert" />
        <p className="text-sm">Vérification en cours…</p>
      </div>
    );
  }

  if (notFound || !contrat) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <ShieldX className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Contrat introuvable</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Le numéro <span className="font-mono font-semibold text-gray-800">{numero}</span> ne correspond à aucun contrat enregistré dans notre système.
          </p>
          <p className="text-xs text-gray-400">
            Vérifiez que vous avez bien scanné le QR code du document officiel ASM Multi-Services.
          </p>
          <Link to="/" className="inline-block mt-2 text-asm-vert hover:underline text-sm">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const r = contrat.reservation;
  const statutColor = STATUT_COLORS[contrat.statut] || 'text-gray-700 bg-gray-50 border-gray-200';

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-start px-4 py-12">
      <div className="max-w-lg w-full space-y-6">

        {/* Badge authenticité */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-asm-vert/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-9 w-9 text-asm-vert" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Contrat authentique</h1>
          <p className="text-sm text-gray-500">
            Ce document a été émis par <span className="font-semibold text-asm-vert">ASM Multi-Services</span> et son authenticité est confirmée.
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
            <User className="h-4 w-4 text-asm-or mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-gray-500 text-xs mb-0.5">Locataire</div>
              <div className="font-semibold text-gray-900">{r.client.prenom} {r.client.nom}</div>
            </div>
          </div>

          {/* Véhicule */}
          <div className="px-5 py-4 flex items-start gap-3">
            <Car className="h-4 w-4 text-asm-or mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-gray-500 text-xs mb-0.5">Véhicule</div>
              <div className="font-semibold text-gray-900">{r.vehicule.marque} {r.vehicule.modele}</div>
              <div className="font-mono text-xs text-gray-500 mt-0.5">{r.vehicule.immatriculation}</div>
            </div>
          </div>

          {/* Dates */}
          <div className="px-5 py-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-asm-or mt-0.5 flex-shrink-0" />
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
            <MapPin className="h-4 w-4 text-asm-or mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-gray-500 text-xs mb-0.5">Lieu de prise en charge</div>
              <div className="font-semibold text-gray-900">{r.lieuPriseEnCharge}</div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
          <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Cette page de vérification est fournie par ASM Multi-Services pour confirmer l'authenticité des documents de location. Les informations financières ne sont pas affichées pour des raisons de confidentialité.
          </p>
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm text-asm-vert hover:underline">
            ← Retour à l'accueil ASM Multi-Services
          </Link>
        </div>

      </div>
    </div>
  );
}
