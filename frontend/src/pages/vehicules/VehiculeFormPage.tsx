import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Car, Save, Upload, X, Image } from 'lucide-react';
import { vehiculesApi, getUploadUrl } from '../../services/api';

const CATEGORIES = ['ECONOMIQUE', 'STANDARD', 'SUV', 'LUXE', 'UTILITAIRE'];
const CAT_LABELS: Record<string, string> = {
  ECONOMIQUE: 'Économique', STANDARD: 'Standard', SUV: 'SUV', LUXE: 'Luxe', UTILITAIRE: 'Utilitaire',
};

interface FormData {
  marque: string;
  modele: string;
  annee: string;
  immatriculation: string;
  couleur: string;
  categorie: string;
  kilometrage: string;
  prixJournalier: string;
  prixSemaine: string;
  description: string;
}

export function VehiculeFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    marque: '', modele: '', annee: String(new Date().getFullYear()), immatriculation: '',
    couleur: '', categorie: 'STANDARD', kilometrage: '0', prixJournalier: '', prixSemaine: '', description: '',
  });
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotosPreviews, setNewPhotosPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      vehiculesApi.getById(id).then(res => {
        const v = res.data.data;
        setForm({
          marque: v.marque || '', modele: v.modele || '', annee: String(v.annee || new Date().getFullYear()),
          immatriculation: v.immatriculation || '', couleur: v.couleur || '', categorie: v.categorie || 'STANDARD',
          kilometrage: String(v.kilometrage || 0), prixJournalier: String(v.prixJournalier || ''),
          prixSemaine: String(v.prixSemaine || ''), description: v.description || '',
        });
        setExistingPhotos(v.photos || []);
      }).catch(() => setError('Véhicule introuvable')).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos total
    const remaining = 5 - existingPhotos.length - newPhotos.length;
    const toAdd = files.slice(0, remaining);

    setNewPhotos(prev => [...prev, ...toAdd]);

    // Generate previews
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotosPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  }

  function removeNewPhoto(index: number) {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    setNewPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        marque: form.marque, modele: form.modele, annee: parseInt(form.annee),
        immatriculation: form.immatriculation, couleur: form.couleur, categorie: form.categorie,
        kilometrage: parseInt(form.kilometrage) || 0, prixJournalier: parseFloat(form.prixJournalier),
        prixSemaine: parseFloat(form.prixSemaine),
        ...(form.description && { description: form.description }),
      };

      let vehiculeId = id;
      if (isEdit && id) {
        await vehiculesApi.update(id, { ...payload, photos: existingPhotos });
      } else {
        const res = await vehiculesApi.create(payload);
        vehiculeId = res.data.data?.id;
      }

      // Upload new photos if any
      if (newPhotos.length > 0 && vehiculeId) {
        const formData = new FormData();
        newPhotos.forEach(photo => formData.append('photos', photo));
        await vehiculesApi.uploadPhotos(vehiculeId, formData);
      }

      navigate('/vehicules');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" />
      </div>
    );
  }

  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Retour" onClick={() => navigate('/vehicules')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Modifier le véhicule' : 'Nouveau véhicule'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isEdit ? 'Mettez à jour les informations du véhicule' : 'Ajoutez un nouveau véhicule à la flotte'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

        {/* Photos */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Image className="h-4 w-4" /> Photos du véhicule
          </h2>

          <div className="flex flex-wrap gap-3">
            {/* Photos existantes */}
            {existingPhotos.map((url, i) => (
              <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200">
                <img src={getUploadUrl(url)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  title="Supprimer cette photo"
                  onClick={() => removeExistingPhoto(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Nouvelles photos (previews) */}
            {newPhotosPreviews.map((preview, i) => (
              <div key={`new-${i}`} className="relative h-24 w-24 rounded-lg overflow-hidden border-2 border-asm-vert">
                <img src={preview} alt={`Nouvelle photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  title="Supprimer cette photo"
                  onClick={() => removeNewPhoto(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Bouton ajouter photo */}
            {totalPhotos < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-asm-vert hover:bg-asm-vert-pale transition-colors text-gray-400 hover:text-asm-vert"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Ajouter</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            aria-label="Sélectionner des photos du véhicule"
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-xs text-gray-400 mt-2">
            {totalPhotos}/5 photos · JPEG, PNG, WebP · Max 5 Mo chacune
          </p>
        </div>

        <hr className="border-gray-100" />

        {/* Identité */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Car className="h-4 w-4" /> Informations générales
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
              <input required type="text" placeholder="Toyota" value={form.marque} onChange={e => set('marque', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modèle *</label>
              <input required type="text" placeholder="Corolla" value={form.modele} onChange={e => set('modele', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
              <input aria-label="Année" required type="number" min={1990} max={new Date().getFullYear() + 1} value={form.annee} onChange={e => set('annee', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Couleur *</label>
              <input required type="text" placeholder="Blanc" value={form.couleur} onChange={e => set('couleur', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
              <input required type="text" placeholder="DK-0000-AA" value={form.immatriculation} onChange={e => set('immatriculation', e.target.value.toUpperCase())}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select aria-label="Catégorie" required value={form.categorie} onChange={e => set('categorie', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Tarification */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Tarification (FCFA)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix/jour *</label>
              <input required type="number" min={0} placeholder="15000" value={form.prixJournalier} onChange={e => set('prixJournalier', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix/semaine *</label>
              <input required type="number" min={0} placeholder="75000" value={form.prixSemaine} onChange={e => set('prixSemaine', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage</label>
              <input type="number" min={0} placeholder="0" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
          <textarea rows={3} placeholder="Caractéristiques, équipements, remarques..." value={form.description} onChange={e => set('description', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asm-vert/30 resize-none" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/vehicules')} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-asm-vert text-white rounded-lg text-sm font-medium hover:bg-asm-vert-fonce disabled:opacity-60 transition-colors">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer le véhicule')}
          </button>
        </div>
      </form>
    </div>
  );
}
