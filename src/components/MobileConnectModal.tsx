import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Smartphone, 
  Share2, 
  UploadCloud, 
  Copy, 
  Check, 
  X, 
  Download, 
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  onOpenVideoUpload?: () => void;
  onOpenInstallModal?: () => void;
}

export const MobileConnectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onShowToast,
  onOpenVideoUpload,
  onOpenInstallModal
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#1c1917',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      onShowToast('info', 'Enlace copiado', 'Pégalo en WhatsApp o envíatelo a tu teléfono.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('warning', 'Portapapeles', 'Copia el enlace manualmente.');
    }
  };

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onShowToast('success', '¡App instalada!', 'Recetas Social ahora está en tu pantalla de inicio.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif">
                Enviar Videos desde tu Teléfono
              </h3>
              <p className="text-xs text-amber-100">
                Abre la app en tu móvil y comparte videos de Instagram, TikTok, YouTube o tu galería.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Connect: QR Code and Link */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center shrink-0">
              {qrDataUrl ? (
                <div className="p-2 bg-white rounded-xl shadow-xs border border-stone-200">
                  <img 
                    src={qrDataUrl} 
                    alt="Escanear con el móvil" 
                    className="w-36 h-36 rounded-lg object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 bg-stone-200 rounded-xl animate-pulse" />
              )}
              <span className="text-[11px] font-medium text-stone-500 mt-2">
                Escanea con la cámara del móvil
              </span>
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-stone-900">
                  Paso 1: Abre la app en tu teléfono
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Apunta la cámara de tu móvil al código QR para abrir la app directamente en tu navegador móvil, o copia el enlace:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={currentUrl} 
                  className="w-full text-xs bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-600 truncate font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 px-3 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              {/* Install PWA button or guide */}
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Instalar en la pantalla de inicio</span>
                </button>
              ) : onOpenInstallModal ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInstallModal();
                  }}
                  className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <img src="/pwa-192x192.png" alt="" className="w-4 h-4 rounded-xs" />
                  <span>Ver cómo añadir a la pantalla de inicio</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* 3 Clear Methods to Send Videos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              3 formas de enviar videos desde tu móvil a la app:
            </h4>

            {/* Method 1: PWA Web Share Target */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900">
                    Método 1: Compartir directo desde Instagram, TikTok o YouTube
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    Más rápido
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Instala la app en la pantalla de inicio de tu teléfono (en Chrome: <em>"Añadir a pantalla de inicio"</em>; en iPhone Safari: <em>"Compartir ➔ Añadir a pantalla de inicio"</em>). 
                  Una vez instalada, cuando estés viendo cualquier Reel o video, pulsa <strong>"Compartir"</strong> en la app de la red social y selecciona <strong>"Recetas Social"</strong>. ¡El video se enviará de inmediato!
                </p>
              </div>
            </div>

            {/* Method 2: Direct Video File Upload */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-xs font-bold text-stone-900 block">
                  Método 2: Subir o Grabar video desde tu galería
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  ¿Tienes un video de cocina guardado en el carrete de tu móvil o estás cocinando ahora mismo? Puedes seleccionar el archivo de video o grabar con la cámara. Nuestra IA analiza los fotogramas y detecta los ingredientes y la preparación.
                </p>
                {onOpenVideoUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVideoUpload();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 mt-1 cursor-pointer"
                  >
                    <span>Abrir subida de video ahora</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Method 3: Copy & Paste */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                <Copy className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-900 block">
                  Método 3: Copiar enlace en tu móvil
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  En cualquier video de YouTube, Instagram o TikTok de tu móvil, pulsa <strong>"Compartir ➔ Copiar enlace"</strong>. Luego abre Recetas Social en tu móvil y pulsa el botón <strong>"Pegar"</strong>. La IA extraerá la receta en menos de 7 segundos.
                </p>
              </div>
            </div>
          </div>

          {/* iPhone Safari note */}
          {isIOS && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <span>
                <strong>Tip para iPhone / iPad:</strong> Para que la app funcione a pantalla completa y aparezca en tu móvil, pulsa el botón <strong>Compartir de Safari</strong> (icono de cuadrado con flecha hacia arriba) y elige <strong>"Añadir a pantalla de inicio"</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
