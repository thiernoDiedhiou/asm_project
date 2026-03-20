// Layout minimaliste pour la page publique de vérification de contrat
import { Outlet } from 'react-router-dom';
import { Car } from 'lucide-react';
import { useState, useEffect } from 'react';
import { publicApi, API_FILE_BASE } from '../services/api';

const SITE_URL = 'https://location.innosft.com/';

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
    </div>
  );
}
