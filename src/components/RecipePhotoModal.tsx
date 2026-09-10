import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Sparkles, 
  Check, 
  Video, 
  Youtube, 
  RefreshCw, 
  Camera, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Recipe } from '../types';
import { extractYouTubeId, getYouTubeThumbnailCandidates } from '../utils/videoUtils';

interface Props {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onSavePhoto: (recipeId: string, newImageUrl: string) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

type TabMode = 'video' | 'upload' | 'url' | 'gallery';

// Curated culinary stock photos for instant 1-click aesthetic fixes
const CURATED_FOOD_GALLERY = [
  {
    category: 'Tacos & Carnes',
    items: [
      { name: 'Tacos al Pastor / Birria', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Tacos de Asada', url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Costillas Glaseadas BBQ', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Carne Asada Gourmet', url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=1000&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Pastas & Arroces',
    items: [
      { name: 'Pasta Alfredo / Carbonara', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Pasta con Tomate & Albahaca', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Lasaña Casera Horneada', url: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Risotto Cremoso', url: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=1000&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Postres & Dulces',
    items: [
      { name: 'Tarta de Queso / Cheesecake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Pastel de Chocolate Húmedo', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Tiramisú Tradicional', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Panqueques con Frutas', url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=1000&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Pizzas & Burgers',
    items: [
      { name: 'Pizza Napolitana Artesanal', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Hamburguesa Doble con Queso', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Alitas Crujientes Bufalo', url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Empanadas Doradas', url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=1000&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Ensaladas & Bowls',
    items: [
      { name: 'Bowl Saludable de Salmón', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Ensalada César con Pollo', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Avocado Toast & Huevos', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1000&auto=format&fit=crop&q=80' },
      { name: 'Sopa / Ramen Reconfortante', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1000&auto=format&fit=crop&q=80' }
    ]
  }
];

export const RecipePhotoModal: React.FC<Props> = ({
  isOpen,
  recipe,
  onClose,
  onSavePhoto,
  onShowToast
}) => {
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabMode>('video');
  const [isFetchingThumbnails, setIsFetchingThumbnails] = useState(false);
  const [serverThumbnails, setServerThumbnails] = useState<Array<{ id: string; label: string; url: string; quality?: string }>>([]);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with recipe's existing image
  useEffect(() => {
    if (!isOpen || !recipe) return;
    const initialImg = recipe.imageUrl || '';
    setSelectedUrl(initialImg);
    setInputUrl(initialImg);
    setPreviewError(false);

    // If recipe is from YouTube, auto-select 'video' tab, otherwise check what makes sense
    if (recipe.sourcePlatform === 'youtube' || (recipe.sourceUrl && recipe.sourceUrl.includes('youtu'))) {
      setActiveTab('video');
      loadVideoThumbnails(recipe.sourceUrl || recipe.videoUrl || '');
    } else if (recipe.sourceUrl && (recipe.sourceUrl.includes('instagram') || recipe.sourceUrl.includes('tiktok') || recipe.sourceUrl.includes('facebook'))) {
      setActiveTab('video');
      loadVideoThumbnails(recipe.sourceUrl);
    } else {
      setActiveTab('gallery');
    }
  }, [isOpen, recipe]);

  // Support pasting image from clipboard (e.g. screenshot of video)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            setActiveTab('upload');
            onShowToast('info', 'Captura pegada', 'Se ha cargado la captura de pantalla desde tu portapapeles.');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen || !recipe) return null;

  const ytId = extractYouTubeId(recipe.sourceUrl || recipe.videoUrl || '');

  // Fetch or calculate available video thumbnails
  async function loadVideoThumbnails(videoUrl: string) {
    if (!videoUrl) return;
    setIsFetchingThumbnails(true);

    try {
      const response = await fetch('/api/video-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
          setServerThumbnails(data.thumbnails);
          return;
        }
      }
    } catch {
      // Fall back to client calculation below
    } finally {
      setIsFetchingThumbnails(false);
    }

    // Client-side fallback for YouTube
    if (ytId) {
      const localCandidates = getYouTubeThumbnailCandidates(ytId);
      setServerThumbnails(localCandidates.map(c => ({
        id: c.id,
        label: c.label,
        url: c.url,
        quality: c.id.toUpperCase()
      })));
    }
  }

  // Handle file upload with canvas optimization to avoid gigantic payload
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'Archivo no válido', 'Por favor selecciona un archivo de imagen (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      // Optimize image resolution (max 1280px wide) via Offscreen / Canvas
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 720;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedUrl(compressedDataUrl);
          setInputUrl(compressedDataUrl);
          setPreviewError(false);
          onShowToast('success', 'Foto cargada', 'Imagen lista para asignar a la receta.');
        } else {
          setSelectedUrl(rawDataUrl);
          setInputUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      onShowToast('warning', 'Enlace vacío', 'Por favor ingresa una URL de imagen válida.');
      return;
    }
    setSelectedUrl(trimmed);
    setPreviewError(false);
    onShowToast('info', 'Vista previa actualizada', 'Comprueba que la imagen se vea correctamente antes de guardar.');
  };

  const handleSave = () => {
    if (!selectedUrl.trim()) {
      onShowToast('warning', 'Sin imagen', 'Debes seleccionar o subir una foto para la receta.');
      return;
    }
    onSavePhoto(recipe.id, selectedUrl.trim());
    onClose();
    onShowToast('success', '¡Foto de video corregida!', `La imagen de "${recipe.title}" ha sido actualizada.`);
  };

  // Build list of video thumbnail options to present to the user
  const videoThumbnails = serverThumbnails.length > 0
    ? serverThumbnails
    : (ytId ? getYouTubeThumbnailCandidates(ytId).map(c => ({
        id: c.id,
        label: c.label,
        url: c.url,
        quality: c.id.toUpperCase()
      })) : []);

  return (
    <div 
      id="recipe-photo-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="recipe-photo-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 sm:px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif leading-tight">
                Corregir Foto del Video
              </h2>
              <p className="text-xs text-stone-500 truncate max-w-sm sm:max-w-md">
                {recipe.title}
              </p>
            </div>
          </div>

          <button
            id="btn-close-photo-modal"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 scrollbar-thin">
          {/* Live Preview Box */}
          <div className="bg-stone-900 rounded-2xl p-3 sm:p-4 text-white space-y-2 border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-semibold flex items-center gap-1.5 text-stone-200">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                Vista previa de la foto actual / seleccionada:
              </span>
              {selectedUrl && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 font-medium truncate max-w-[200px]">
                  {selectedUrl.startsWith('data:') ? 'Imagen subida (Local)' : selectedUrl.split('/').pop()?.slice(0, 24) || 'Enlace'}
                </span>
              )}
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-800 flex items-center justify-center group">
              {selectedUrl && !previewError ? (
                <>
                  <img
                    src={selectedUrl}
                    alt="Vista previa de receta"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => setPreviewError(true)}
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-stone-900/80 text-[11px] font-semibold text-white backdrop-blur-xs flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Selección activa</span>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center space-y-2 text-stone-400">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs">
                    {previewError ? 'No se pudo cargar la imagen del enlace o miniatura.' : 'Selecciona o sube una imagen para visualizarla aquí.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-stone-100 rounded-2xl gap-1 text-xs font-semibold">
            <button
              id="tab-photo-video"
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'video'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-red-600" />
              <span>Miniaturas del Video</span>
            </button>

            <button
              id="tab-photo-upload"
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Subir Foto</span>
            </button>

            <button
              id="tab-photo-url"
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'url'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Pegar URL</span>
            </button>

            <button
              id="tab-photo-gallery"
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'gallery'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gourmet</span>
            </button>
          </div>

          {/* TAB 1: Miniaturas del Video */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="font-semibold">Miniaturas extraídas del enlace de video:</span>
                {(recipe.sourceUrl || recipe.videoUrl) && (
                  <button
                    type="button"
                    onClick={() => loadVideoThumbnails(recipe.sourceUrl || recipe.videoUrl || '')}
                    disabled={isFetchingThumbnails}
                    className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingThumbnails ? 'animate-spin' : ''}`} />
                    <span>Reescanear video</span>
                  </button>
                )}
              </div>

              {videoThumbnails.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videoThumbnails.map((thumb) => {
                    const isCurrent = selectedUrl === thumb.url;
                    return (
                      <div
                        key={thumb.id}
                        onClick={() => {
                          setSelectedUrl(thumb.url);
                          setInputUrl(thumb.url);
                          setPreviewError(false);
                        }}
                        className={`group cursor-pointer rounded-2xl border-2 p-2.5 transition-all flex flex-col gap-2 ${
                          isCurrent
                            ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                            : 'border-stone-200 bg-white hover:border-amber-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-900">
                          <img
                            src={thumb.url}
                            alt={thumb.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {isCurrent && (
                            <div className="absolute top-2 right-2 p-1 rounded-full bg-amber-500 text-white shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {thumb.quality && (
                            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-white uppercase">
                              {thumb.quality}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-800 line-clamp-1">
                            {thumb.label}
                          </span>
                          <span className={`text-[11px] font-bold ${isCurrent ? 'text-amber-600' : 'text-stone-400'}`}>
                            {isCurrent ? 'Elegida' : 'Usar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-stone-50 border border-dashed border-stone-300 space-y-3">
                  <Youtube className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs text-stone-600 max-w-sm mx-auto">
                    Esta receta no tiene un enlace de YouTube directo o no se pudieron cargar miniaturas automáticas.
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 rounded-xl"
                    >
                      Subir captura de pantalla
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gallery')}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl"
                    >
                      Elegir foto gourmet
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Subir Foto / Captura de Pantalla */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processImageFile(file);
                }}
                className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50/60 hover:bg-amber-50/30 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-sm font-bold text-stone-800">
                    Haz clic para elegir una imagen o arrástrala aquí
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Soporta JPG, PNG, WebP o captura de pantalla directa
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs text-stone-600 font-semibold shadow-xs">
                  <span>También puedes pegar con</span>
                  <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-[10px] font-mono">
                    Ctrl + V
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Pegar URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-700">
                Dirección web de la imagen (HTTPS):
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="input-photo-url"
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... o enlace de imagen"
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-stone-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyUrl();
                      }
                    }}
                  />
                </div>

                <button
                  id="btn-apply-photo-url"
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-colors shrink-0"
                >
                  Probar
                </button>
              </div>

              <p className="text-[11px] text-stone-500">
                Tip: Puedes copiar el enlace de imagen haciendo clic derecho en cualquier foto de internet y seleccionando "Copiar dirección de la imagen".
              </p>
            </div>
          )}

          {/* TAB 4: Galería Gourmet Curada */}
          {activeTab === 'gallery' && (
            <div className="space-y-5">
              <p className="text-xs text-stone-600">
                Elige una foto culinaria profesional en alta resolución para darle una presentación impecable a tu receta:
              </p>

              {CURATED_FOOD_GALLERY.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    {cat.category}
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {cat.items.map((item) => {
                      const isCurrent = selectedUrl === item.url;
                      return (
                        <div
                          key={item.name}
                          onClick={() => {
                            setSelectedUrl(item.url);
                            setInputUrl(item.url);
                            setPreviewError(false);
                          }}
                          className={`group cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative ${
                            isCurrent
                              ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                              : 'border-transparent hover:border-amber-300'
                          }`}
                        >
                          <div className="aspect-video w-full bg-stone-800 overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>

                          <div className="p-1.5 bg-stone-900/90 text-white">
                            <span className="text-[10px] font-semibold line-clamp-1 block">
                              {item.name}
                            </span>
                          </div>

                          {isCurrent && (
                            <div className="absolute top-1 right-1 p-1 rounded-full bg-amber-500 text-white shadow-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <button
            id="btn-cancel-photo"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-300 transition-colors"
          >
            Cancelar
          </button>

          <button
            id="btn-save-photo"
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-md transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Foto</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
