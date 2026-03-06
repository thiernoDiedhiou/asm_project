// Layout de la vitrine publique — navbar + footer + outlet
import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Car, Menu, X, Phone, Mail, MapPin, Clock, Megaphone } from 'lucide-react';
import { publicApi } from '../services/api';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface Settings {
  nomEntreprise: string;
  slogan: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  heuresLunVen: string;
  heuresSamedi: string;
  noteTransfert: string;
  bannierePromo?: string;
}

const DEFAULTS: Settings = {
  nomEntreprise: 'ASM Multi-Services',
  slogan: 'Location de Véhicules',
  telephone: '+221 33 820 00 00',
  email: 'contact@asm-location.sn',
  adresse: 'Grand Yoff — Zone de Captage',
  ville: 'Dakar, Sénégal',
  heuresLunVen: '08h00 – 18h00',
  heuresSamedi: '09h00 – 15h00',
  noteTransfert: 'Transfert aéroport disponible 24h/24 sur réservation',
};

export function VitrineLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    publicApi.getSettings()
      .then(res => {
        if (res.data?.data) setSettings({ ...DEFAULTS, ...res.data.data });
      })
      .catch(() => { /* garder les valeurs par défaut */ });
  }, []);

  const navLinks = [
    { to: '/', label: 'Accueil', end: true },
    { to: '/flotte', label: 'Notre Flotte', end: false },
    { to: '/reserver', label: 'Réserver', end: false },
  ];

  // Formater le numéro pour le href tel: et WhatsApp (retirer espaces et +)
  const telHref = `tel:${settings.telephone.replace(/\s/g, '')}`;
  const whatsappUrl = `https://wa.me/${settings.telephone.replace(/\D/g, '')}`;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-asm-vert flex items-center justify-center">
                <Car className="h-5 w-5 text-asm-or" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-asm-vert text-base block">{settings.nomEntreprise}</span>
                <span className="text-xs text-gray-500 block -mt-0.5">{settings.slogan}</span>
              </div>
            </Link>

            {/* Navigation desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-asm-vert border-b-2 border-asm-or rounded-none'
                        : 'text-gray-600 hover:text-asm-vert hover:bg-gray-50'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Actions desktop */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href={telHref}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-asm-vert transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>{settings.telephone}</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#25D366] rounded-lg hover:bg-[#1ebe5d] transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
            </div>

            {/* Burger mobile */}
            <button
              type="button"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-asm-vert/10 text-asm-vert font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <a
                href={telHref}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600"
              >
                <Phone className="h-4 w-4" />
                {settings.telephone}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#25D366] rounded-lg hover:bg-[#1ebe5d] transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Nous contacter sur WhatsApp
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ===== BANNIÈRE PROMOTIONNELLE ===== */}
      {settings.bannierePromo && !bannerDismissed && (
        <div className="bg-asm-or text-asm-vert font-medium text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 justify-center">
              <Megaphone className="h-4 w-4 flex-shrink-0" />
              <span>{settings.bannierePromo}</span>
            </div>
            <button
              type="button"
              aria-label="Fermer la bannière"
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== CONTENU PRINCIPAL ===== */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-asm-vert text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Colonne 1 — Présentation */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-asm-or flex items-center justify-center">
                  <Car className="h-4 w-4 text-asm-vert" />
                </div>
                <span className="font-bold text-lg">{settings.nomEntreprise}</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Votre partenaire de confiance pour la location de véhicules à Dakar.
                Flotte récente, tarifs transparents, service disponible 24h/24.
              </p>
            </div>

            {/* Colonne 2 — Contact */}
            <div>
              <h3 className="font-semibold text-asm-or mb-4">Nous Contacter</h3>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-asm-or mt-0.5 flex-shrink-0" />
                  <span>{settings.adresse}<br />{settings.ville}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-asm-or flex-shrink-0" />
                  <a href={telHref} className="hover:text-white transition-colors">
                    {settings.telephone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-asm-or flex-shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                    {settings.email}
                  </a>
                </li>
              </ul>
            </div>

            {/* Colonne 3 — Horaires */}
            <div>
              <h3 className="font-semibold text-asm-or mb-4">Horaires</h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-asm-or" />
                  <span>Lun – Ven : {settings.heuresLunVen}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-asm-or" />
                  <span>Samedi : {settings.heuresSamedi}</span>
                </li>
                <li className="text-white/60 text-xs mt-2">
                  {settings.noteTransfert}
                </li>
              </ul>
            </div>
          </div>

          {/* Bas de footer */}
          <div className="border-t border-white/20 mt-8 pt-6 text-center text-xs text-white/50">
            <span>© {new Date().getFullYear()} {settings.nomEntreprise}. Tous droits réservés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
