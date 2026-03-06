import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';
import { clientsApi } from '../../services/api';

interface FormData {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  numeroCNI: string;
  numeroPasseport: string;
  permisConduire: string;
  typeClient: string;
  societe: string;
  notes: string;
}

const TYPE_LABELS: Record<string, string> = { PARTICULIER: 'Particulier', ENTREPRISE: 'Entreprise', VIP: 'VIP' };

// Extrait les 9 chiffres locaux depuis un numéro complet ("+221 77 990 21 34" → "779902134")
function extractLocalDigits(phone: string): string {
  return phone.replace(/^\+?221\s*/, '').replace(/\D/g, '').slice(0, 9);
}

// Formate les chiffres bruts en "XX XXX XX XX" (ex: "779902134" → "77 990 21 34")
function formatLocalPhone(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0, 2) + ' ' + d.slice(2);
  if (d.length <= 7) return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
  return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7, 9);
}

export function ClientFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>({
    nom: '', prenom: '', telephone: '', email: '', adresse: '',
    numeroCNI: '', numeroPasseport: '', permisConduire: '',
    typeClient: 'PARTICULIER', societe: '', notes: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      clientsApi.getById(id).then(res => {
        const c = res.data.data;
        setForm({
          nom: c.nom || '', prenom: c.prenom || '', telephone: c.telephone || '',
          email: c.email || '', adresse: c.adresse || '',
          numeroCNI: c.numeroCNI || '', numeroPasseport: c.numeroPasseport || '', permisConduire: c.permisConduire || '',
          typeClient: c.typeClient || 'PARTICULIER', societe: c.societe || '', notes: c.notes || '',
        });
      }).catch(() => setError('Client introuvable')).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        nom: form.nom, prenom: form.prenom, telephone: form.telephone,
        typeClient: form.typeClient,
        adresse: form.adresse || null,
        email: form.email || null,
        numeroCNI: form.numeroCNI || null,
        numeroPasseport: form.numeroPasseport || null,
        permisConduire: form.permisConduire || null,
        societe: form.societe || null,
        notes: form.notes || null,
      };
      if (isEdit && id) {
        await clientsApi.update(id, payload);
      } else {
        await clientsApi.create(payload);
      }
      navigate('/clients');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button aria-label="Retour" onClick={() => navigate('/clients')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{isEdit ? 'Mettez à jour la fiche client' : 'Enregistrez un nouveau client'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Informations personnelles
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input required type="text" placeholder="Mamadou" value={form.prenom} onChange={e => set('prenom', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input required type="text" placeholder="Diallo" value={form.nom} onChange={e => set('nom', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-asm-vert/30">
                <span className="flex items-center px-3 bg-gray-50 text-gray-600 text-sm font-medium border-r border-gray-200 select-none">
                  +221
                </span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="77 000 00 00"
                  value={formatLocalPhone(extractLocalDigits(form.telephone))}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                    const formatted = formatLocalPhone(digits);
                    set('telephone', digits.length > 0 ? '+221 ' + formatted : '');
                  }}
                  maxLength={12}
                  pattern="[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
                  title="Format : XX XXX XX XX — ex : 77 990 21 34"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="email@exemple.com" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de client</label>
              <select aria-label="Type de client" value={form.typeClient} onChange={e => set('typeClient', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pièces d'identité */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Pièces d'identité
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° CNI</label>
              <input type="text" placeholder="1-01-0000000-0" value={form.numeroCNI} onChange={e => set('numeroCNI', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Passeport</label>
              <input type="text" placeholder="A01234567" value={form.numeroPasseport} onChange={e => set('numeroPasseport', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Permis de conduire</label>
              <input type="text" placeholder="N° permis" value={form.permisConduire} onChange={e => set('permisConduire', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
          </div>
        </div>

        {form.typeClient === 'ENTREPRISE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Société</label>
            <input type="text" placeholder="Nom de la société" value={form.societe} onChange={e => set('societe', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input type="text" placeholder="Quartier, Dakar" value={form.adresse} onChange={e => set('adresse', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
          <textarea rows={2} placeholder="Informations complémentaires..." value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/clients')} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer le client')}
          </button>
        </div>
      </form>
    </div>
  );
}
