// Layout minimaliste pour la page publique de vérification de contrat
import { Outlet } from 'react-router-dom';
import { Car, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { publicApi, API_FILE_BASE } from '../services/api';

const SITE_URL = 'https://location.innosft.com/';
const COMPANY_URL = 'https://innosft.com/';

export function ContratVerifLayout() {
  const [logo, setLogo] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState('InnoSoft Location');
  const [slogan, setSlogan] = useState('Location de Véhicules');

  useEffect(() => {
    publicApi.getSettings()
      .then(res => {
        if (res.data?.data) {
          const d = res.data.data;
          if (d.nomEntreprise) setNomEntreprise(d.nomEntreprise);
          if (d.slogan) setSlogan(d.slogan);
          if (d.logo) setLogo(d.logo);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar minimale */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <a href={SITE_URL} className="flex items-center gap-2.5">
              {logo ? (
                <img
                  src={`${API_FILE_BASE}${logo}`}
                  alt={nomEntreprise}
                  className="h-10 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <>
                  <div className="h-9 w-9 rounded-xl bg-asm-vert flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-asm-or" />
                  </div>
                  <div className="leading-tight">
                    <span className="font-bold text-asm-vert text-base block">{nomEntreprise}</span>
                    <span className="text-xs text-gray-500 block -mt-0.5">{slogan}</span>
                  </div>
                </>
              )}
            </a>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer SaaS */}
      <footer className="bg-asm-vert text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Colonne 1 — Plateforme */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-asm-or flex items-center justify-center shrink-0">
                  <Car className="h-4 w-4 text-asm-vert" />
                </div>
                <span className="font-bold text-lg">InnoSoft Location</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Plateforme SaaS de gestion de location de véhicules — simple, moderne et accessible.
              </p>
              <a
                href={SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-asm-or text-sm font-medium hover:text-yellow-300 transition-colors"
              >
                location.innosft.com <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Colonne 2 — Contact */}
            <div>
              <h3 className="font-semibold text-asm-or mb-4">Nous Contacter</h3>
              <ul className="space-y-2.5 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-asm-or mt-0.5 shrink-0" />
                  <span>Cité Verte, VCN<br />Thiès, Sénégal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-asm-or shrink-0" />
                  <span>
                    <a href="tel:+221769365811" className="hover:text-white transition-colors">+221 76 936 58 11</a>
                    {' / '}
                    <a href="tel:+221776484558" className="hover:text-white transition-colors">+221 77 648 45 58</a>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-asm-or shrink-0" />
                  <a href="mailto:innosoftcreation@gmail.com" className="hover:text-white transition-colors">
                    innosoftcreation@gmail.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Colonne 3 — Développeur */}
            <div>
              <h3 className="font-semibold text-asm-or mb-4">Développé par</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-3">
                Cette plateforme est conçue et maintenue par <span className="text-white font-semibold">InnoSoft</span>, agence spécialisée dans le développement de solutions numériques sur mesure.
              </p>
              <a
                href={COMPANY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-asm-or text-sm font-medium hover:text-yellow-300 transition-colors"
              >
                innosft.com <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

          </div>

          <div className="border-t border-white/20 mt-8 pt-5 text-center text-xs text-white/50">
            © {new Date().getFullYear()} InnoSoft — Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
