import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Eye, 
  Copy, 
  Check, 
  Play, 
  FileCode, 
  Sparkles, 
  Printer, 
  Smartphone, 
  Globe, 
  MessageCircle, 
  Users,
  CheckCircle2,
  ChefHat
} from 'lucide-react';
import { Recipe } from '../types';
import { 
  downloadRecipeHtml, 
  previewRecipeHtmlInNewTab, 
  shareRecipeHtml, 
  generateInteractiveRecipeHtml,
  sanitizeFilename 
} from '../utils/interactiveHtmlExport';
import { getVideoEmbedInfo } from '../utils/videoUtils';

interface Props {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const ShareInteractiveHtmlModal: React.FC<Props> = ({
  isOpen,
  recipe,
  onClose,
  onShowToast
}) => {
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen || !recipe) return null;

  const embedInfo = getVideoEmbedInfo(recipe.sourceUrl, recipe.sourcePlatform, recipe.videoUrl);
  const filename = `Receta-${sanitizeFilename(recipe.title)}-con-Video.html`;

  const handleDownload = () => {
    try {
      const savedName = downloadRecipeHtml(recipe);
      onShowToast(
        'success', 
        'Archivo HTML descargado', 
        `Guardado como "${savedName}". Puedes abrirlo o enviarlo por cualquier app.`
      );
    } catch (err) {
      onShowToast('error', 'Error al descargar', 'No se pudo generar el archivo HTML.');
    }
  };

  const handlePreview = () => {
    try {
      previewRecipeHtmlInNewTab(recipe);
      onShowToast(
        'info', 
        'Abriendo vista previa', 
        'Se ha abierto la receta interactiva en una nueva pestaña.'
      );
    } catch (err) {
      onShowToast('error', 'Error', 'No se pudo abrir la vista previa.');
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const res = await shareRecipeHtml(recipe);
      if (res.success) {
        if (res.method === 'share') {
          onShowToast('success', 'Compartido', 'Receta enviada exitosamente.');
        } else {
          onShowToast('info', 'Archivo descargado', 'El navegador no soporta compartir archivos directamente; se ha descargado el archivo.');
        }
      }
    } catch (err) {
      onShowToast('error', 'Error al compartir', 'Ocurrió un problema al intentar compartir el archivo.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      const html = generateInteractiveRecipeHtml(recipe);
      await navigator.clipboard.writeText(html);
      setCopiedHtml(true);
      onShowToast('success', 'Código HTML copiado', 'Código HTML completo copiado al portapapeles.');
      setTimeout(() => setCopiedHtml(false), 2500);
    } catch (err) {
      onShowToast('error', 'Error al copiar', 'No se pudo copiar el código al portapapeles.');
    }
  };

  const handleSendWhatsAppSummary = () => {
    const lines = [
      `🍳 *${recipe.title}*`,
      `👨‍🍳 ${recipe.author ? `Por ${recipe.author}` : ''}`,
      recipe.sourceUrl ? `📹 Video: ${recipe.sourceUrl}` : '',
      `⏱️ Tiempo: ${recipe.totalTimeMinutes || recipe.cookTimeMinutes || 30} min | 👥 Porciones: ${recipe.servings || 2}`,
      '',
      '🛒 *Ingredientes principales:*',
      ...(recipe.ingredients || []).slice(0, 8).map(i => `• ${i.amount ? i.amount + ' ' : ''}${i.unit ? i.unit + ' ' : ''}${i.item}`),
      (recipe.ingredients || []).length > 8 ? `... y ${(recipe.ingredients.length - 8)} más.` : '',
      '',
      '✨ _Te he preparado la receta en formato HTML interactivo para abrirla en cualquier navegador._'
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div 
      id="share-html-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="share-html-modal-card"
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-share-html-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-stone-100 bg-gradient-to-br from-amber-50/70 via-stone-50 to-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-600 text-white shadow-2xs flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              <span>HTML Interactivo con Video</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              Autónomo e imprimible
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 leading-snug">
            Compartir receta interactiva
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Genera un archivo web autónomo (.html) con el video integrado que cualquiera puede abrir en su móvil, tablet o PC sin instalar aplicaciones.
          </p>
        </div>

        {/* Recipe Preview Card */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row gap-4 items-start">
            <div className="relative w-full sm:w-28 sm:h-28 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-stone-900 shrink-0">
              <img 
                src={recipe.imageUrl || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&auto=format&fit=crop&q=80'} 
                alt={recipe.title} 
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-amber-600/90 text-white flex items-center justify-center shadow-md">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <h3 className="text-base font-bold text-stone-900 font-serif leading-tight">
                {recipe.title}
              </h3>
              {recipe.author && (
                <p className="text-xs text-stone-500">
                  Por <span className="font-semibold text-stone-700">{recipe.author}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-stone-600">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  <Play className="w-3 h-3" />
                  {embedInfo.canEmbed ? `Video ${embedInfo.platformName}` : 'Con enlace al video'}
                </span>
                <span className="bg-stone-200/80 px-2 py-0.5 rounded-md font-medium">
                  {recipe.ingredients.length} ingredientes
                </span>
                <span className="bg-stone-200/80 px-2 py-0.5 rounded-md font-medium">
                  {recipe.instructions.length} pasos
                </span>
              </div>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-left">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <Play className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                <span>Video Integrado</span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Reproduce el video directamente dentro del documento HTML.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-left">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Porciones Dinámicas</span>
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                Botones (+) y (-) para calcular ingredientes automáticamente.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-left col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Checklist Activo</span>
              </div>
              <p className="text-[11px] text-blue-900/80 leading-relaxed">
                Tacha ingredientes y pasos mientras cocinas en tiempo real.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Download Button */}
            <button
              id="btn-download-recipe-html"
              type="button"
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Descargar archivo HTML (.html)</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Native Share */}
              <button
                id="btn-native-share-html"
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                title="Compartir archivo directamente a WhatsApp, AirDrop, etc."
              >
                <Share2 className="w-4 h-4" />
                <span>{isSharing ? 'Compartiendo...' : 'Compartir archivo directo'}</span>
              </button>

              {/* Preview in New Tab */}
              <button
                id="btn-preview-html-new-tab"
                type="button"
                onClick={handlePreview}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-stone-200 cursor-pointer"
                title="Abrir y probar la receta interactiva ahora mismo"
              >
                <Eye className="w-4 h-4 text-amber-700" />
                <span>Probar vista previa en vivo</span>
              </button>
            </div>

            {/* Secondary actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <button
                id="btn-copy-raw-html"
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">¡Código copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar código HTML</span>
                  </>
                )}
              </button>

              <button
                id="btn-whatsapp-text-summary"
                type="button"
                onClick={handleSendWhatsAppSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enviar resumen a WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-[11px] text-stone-500 text-center">
          💡 El archivo <strong className="text-stone-700">{filename}</strong> incluye estilos para imprimir en papel o PDF con un solo clic.
        </div>
      </div>
    </div>
  );
};
