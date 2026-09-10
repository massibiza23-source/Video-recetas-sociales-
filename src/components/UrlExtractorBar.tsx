import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Link2, 
  Loader2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Youtube, 
  Instagram, 
  Facebook, 
  Globe, 
  Video,
  ArrowRight,
  Clipboard,
  Smartphone,
  UploadCloud
} from 'lucide-react';
import { PlatformType, Recipe } from '../types';
import { MobileVideoUploader } from './MobileVideoUploader';

interface Props {
  onRecipeExtracted: (recipe: Recipe) => void;
  onExtractionFailedFallback: (partialData: Partial<Recipe>, message: string) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  onOpenMobileConnectModal?: () => void;
  sharedUrl?: string;
}

export const UrlExtractorBar: React.FC<Props> = ({
  onRecipeExtracted,
  onExtractionFailedFallback,
  onShowToast,
  onOpenMobileConnectModal,
  sharedUrl
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload_video'>('url');
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [showRawTextInput, setShowRawTextInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Iniciando extracción...');

  // If a shared URL was passed via PWA Web Share Target
  useEffect(() => {
    if (sharedUrl) {
      setUrl(sharedUrl);
      setActiveTab('url');
      onShowToast('info', 'Video recibido desde el móvil', 'Procesando el enlace compartido...');
      // Small timeout to allow state to settle
      const t = setTimeout(() => {
        handleExtractWithUrl(sharedUrl);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [sharedUrl]);

  // Identify detected platform from URL
  const getDetectedPlatform = (urlStr: string): PlatformType => {
    const lower = urlStr.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (urlStr.trim().startsWith('http')) return 'web';
    return 'manual';
  };

  const detectedPlatform = getDetectedPlatform(url);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setUrl(text);
        onShowToast('info', 'Enlace pegado', text.substring(0, 40) + '...');
      } else if (text.length > 20) {
        setRawText(text);
        setShowRawTextInput(true);
        onShowToast('info', 'Texto pegado en descripción', 'Se pegaron detalles de la receta.');
      }
    } catch {
      onShowToast('warning', 'Portapapeles', 'Pega el enlace manualmente usando Ctrl+V o Cmd+V.');
    }
  };

  const handleExtractWithUrl = async (overrideUrl?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let cleanUrl = (overrideUrl !== undefined ? overrideUrl : url).trim();
    let cleanText = rawText.trim();

    if (!cleanUrl && !cleanText) {
      onShowToast('warning', 'Campo vacío', 'Por favor ingresa un enlace de YouTube, Instagram, Facebook o escribe el nombre del plato.');
      return;
    }

    // Smart detection: If user typed text without http, check if it's a domain or dish name
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be') || cleanUrl.includes('instagram.com') || cleanUrl.includes('facebook.com') || cleanUrl.includes('tiktok.com') || cleanUrl.startsWith('www.')) {
        cleanUrl = 'https://' + cleanUrl;
      } else if (!cleanText) {
        // User typed a dish name or ingredient text directly in the main input box!
        cleanText = cleanUrl;
        cleanUrl = '';
      }
    }

    setIsLoading(true);
    setLoadingStep('Conectando con la fuente...');

    const stepTimer1 = setTimeout(() => {
      setLoadingStep('Analizando ingredientes y medidas...');
    }, 1000);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Estructurando pasos cronológicos...');
    }, 2200);

    try {
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl || undefined,
          rawText: cleanText || undefined,
          platformHint: cleanUrl ? getDetectedPlatform(cleanUrl) : 'manual'
        })
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      let data;
      let rawResponseText = "";
      try {
        rawResponseText = await response.text();
        data = JSON.parse(rawResponseText);
      } catch (parseError) {
        // Handle Vercel 504 / HTML error pages
        const snippet = rawResponseText.substring(0, 100);
        throw new Error(`Error de red: La respuesta no es válida. Detalles: ${snippet}`);
      }

      if (data.isProtected && !data.recipe) {
        onShowToast(
          'warning', 
          'Publicación protegida', 
          data.message || 'La publicación requiere inicio de sesión. Hemos cargado los datos básicos.'
        );
        onExtractionFailedFallback(data.partialData || { sourceUrl: cleanUrl, sourcePlatform: detectedPlatform }, data.message);
        return;
      }

      if (!response.ok || !data.success || !data.recipe) {
        throw new Error(data.error || 'No se pudo estructurar la receta');
      }

      const ingCount = data.recipe.ingredients?.length || 0;
      const stepCount = data.recipe.instructions?.length || 0;

      onRecipeExtracted(data.recipe);
      setUrl('');
      setRawText('');
      setShowRawTextInput(false);
      onShowToast(
        'success', 
        '¡Receta extraída con éxito!', 
        `"${data.recipe.title}" (${ingCount} ingredientes, ${stepCount} pasos).`
      );

    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      onShowToast(
        'error', 
        'Error de extracción', 
        err.message || 'Ocurrió un error al procesar la receta.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('Iniciando extracción...');
    }
  };

  const handleExtract = (e?: React.FormEvent) => handleExtractWithUrl(undefined, e);

  // Sample quick tests
  const loadSampleUrl = (sampleUrl: string, sampleText?: string) => {
    setUrl(sampleUrl);
    if (sampleText) {
      setRawText(sampleText);
      setShowRawTextInput(true);
    } else {
      setRawText('');
      setShowRawTextInput(false);
    }
  };

  return (
    <section 
      id="url-extractor-section" 
      aria-label="Extractor de recetas"
      className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200 shadow-sm"
    >
      <div className="max-w-3xl mx-auto text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-3 border border-amber-200/60">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Extracción Automática Multi-Plataforma con IA</span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-stone-900 font-serif tracking-tight">
          {activeTab === 'url' ? 'Pega el enlace del Reel, Video o Post' : 'Sube o Graba un Video desde tu Móvil'}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {activeTab === 'url' 
            ? 'Convertimos videos de YouTube, Instagram, TikTok y publicaciones en recetas estructuradas.'
            : 'Sube un video de cocina de la galería de tu teléfono o grábalo con tu cámara. La IA analizará los pasos.'}
        </p>
      </div>

      {/* Tabs & Phone Help Button */}
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Link2 className="w-4 h-4 text-amber-600" />
            <span>Enlace de Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload_video')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'upload_video'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Smartphone className="w-4 h-4 text-orange-600" />
            <span>Subir Video del Móvil</span>
            <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[10px] bg-orange-100 text-orange-800 font-bold">
              IA Vision
            </span>
          </button>
        </div>

        {onOpenMobileConnectModal && (
          <button
            type="button"
            onClick={onOpenMobileConnectModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
            <span>¿Cómo enviar desde el móvil?</span>
          </button>
        )}
      </div>

      {activeTab === 'upload_video' ? (
        <div className="max-w-3xl mx-auto">
          <MobileVideoUploader
            onRecipeExtracted={onRecipeExtracted}
            onShowToast={onShowToast}
          />
        </div>
      ) : (
        <form onSubmit={handleExtract} className="max-w-3xl mx-auto space-y-3">
        {/* Main URL input bar */}
        <div className="relative flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              {detectedPlatform === 'youtube' && <Youtube className="w-5 h-5 text-red-600" />}
              {detectedPlatform === 'instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
              {detectedPlatform === 'facebook' && <Facebook className="w-5 h-5 text-blue-600" />}
              {detectedPlatform === 'tiktok' && <Video className="w-5 h-5 text-neutral-900" />}
              {detectedPlatform === 'web' && <Globe className="w-5 h-5 text-amber-600" />}
              {detectedPlatform === 'manual' && <Link2 className="w-5 h-5 text-stone-400" />}
            </div>

            <input
              id="input-recipe-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega enlace de YouTube, Instagram, TikTok o escribe el nombre del plato..."
              disabled={isLoading}
              className="w-full pl-11 pr-24 py-3 sm:py-3.5 text-sm sm:text-base bg-stone-50 hover:bg-white focus:bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-inner"
            />

            {/* Quick paste button inside input */}
            <button
              type="button"
              id="btn-paste-clipboard"
              onClick={handlePasteFromClipboard}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-200/70 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1"
              title="Pegar desde el portapapeles"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Pegar</span>
            </button>
          </div>

          <button
            id="btn-submit-extraction"
            type="submit"
            disabled={isLoading}
            className="sm:w-auto px-6 py-3.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-400 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extrayendo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extraer Receta</span>
                <ArrowRight className="w-4 h-4 hidden sm:inline" />
              </>
            )}
          </button>
        </div>

        {/* Loading Progress Feedback */}
        {isLoading && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center flex items-center justify-center gap-2.5 text-xs sm:text-sm text-amber-900 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
            <span className="font-medium">{loadingStep}</span>
          </div>
        )}

        {/* Raw Text Accordion Toggle (Ideal for private posts or copied descriptions) */}
        <div className="pt-1">
          <button
            type="button"
            id="btn-toggle-raw-text"
            onClick={() => setShowRawTextInput(!showRawTextInput)}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors mx-auto sm:mx-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>{showRawTextInput ? 'Ocultar caja de texto/descripción' : '¿Tienes la descripción copiada o es un post privado? Pega el texto aquí'}</span>
            {showRawTextInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRawTextInput && (
            <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 animate-in fade-in">
              <label htmlFor="textarea-recipe-raw" className="block text-xs font-semibold text-stone-700">
                Pega la descripción, subtítulos o ingredientes de la publicación:
              </label>
              <textarea
                id="textarea-recipe-raw"
                rows={3}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Ejemplo: 'Para esta tarta necesitamos 3 huevos, 200g de harina, 1 taza de leche... Primero batir los huevos...'"
                className="w-full p-2.5 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-stone-500">
                La IA procesará el texto y extraerá los ingredientes con sus cantidades y los pasos ordenados.
              </p>
            </div>
          )}
        </div>

        {/* Quick Sample Links */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <span className="font-medium">Probar con ejemplos rápidos:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              id="btn-sample-youtube"
              onClick={() => loadSampleUrl('https://www.youtube.com/watch?v=kY9JkXq6M8I', 'Tacos al Pastor Caseros con piña y cilantro fresco')}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors flex items-center gap-1"
            >
              <Youtube className="w-3.5 h-3.5 text-red-600" />
              <span>YouTube Tacos</span>
            </button>
            <button
              type="button"
              id="btn-sample-instagram"
              onClick={() => loadSampleUrl(
                'https://www.instagram.com/reel/C3x918LpzKl/',
                'Pasta Carbonara cremosa auténtica:\n- 200g Guanciale o panceta\n- 4 yemas de huevo\n- 80g queso Pecorino Romano rallado\n- 300g Espaguetis\n- Pimienta negra molida\n\nPaso 1: Dorar el guanciale a fuego medio sin aceite hasta que esté crujiente.\nPaso 2: Mezclar las yemas con el queso y abundante pimienta hasta formar una pasta cremosa.\nPaso 3: Cocer los espaguetis al dente en agua con poca sal.\nPaso 4: Mezclar todo fuera del fuego con un cucharón de agua de cocción hasta emulsionar.'
              )}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors flex items-center gap-1"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>Instagram Reel</span>
            </button>
            <button
              type="button"
              id="btn-sample-cheesecake"
              onClick={() => loadSampleUrl('Tarta de queso horneada estilo San Sebastián')}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Tarta de Queso</span>
            </button>
          </div>
        </div>
      </form>
      )}
    </section>
  );
};
