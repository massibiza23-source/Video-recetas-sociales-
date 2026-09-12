import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  PlusSquare,
  Smartphone,
  Check,
  ExternalLink,
  Laptop,
  Apple,
  Chrome,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  Image as ImageIcon,
  Copy,
  AlertCircle,
  HelpCircle,
  ArrowDown
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const InstallAppModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
      if (/android/.test(ua)) return 'android';
    }
    return 'android';
  });

  const [installing, setInstalling] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(true);

  if (!isOpen) return null;

  const handleCopyAppUrl = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
      onShowToast('success', '¡Enlace copiado!', 'Abre Google Chrome en tu móvil y pega el enlace para instalar la app.');
    } catch {
      onShowToast('info', 'Enlace', typeof window !== 'undefined' ? window.location.href : '');
    }
  };

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const accepted = await install();
      if (accepted) {
        onShowToast('success', '¡App instalada con éxito!', 'El icono ya está en tu pantalla de inicio.');
        onClose();
      } else {
        onShowToast('info', 'Instalación cancelada', 'Puedes instalarla en cualquier momento desde aquí.');
      }
    } catch (err) {
      console.error('Install error:', err);
      onShowToast('error', 'Error al instalar', 'Sigue las instrucciones manuales para añadir a inicio.');
    } finally {
      setInstalling(false);
    }
  };

  const handleDownloadIcon = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('success', 'Icono descargado', `${filename} guardado en tus descargas.`);
  };

  return (
    <div
      id="install-app-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="install-app-modal-card"
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instalación PWA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif leading-tight">
              Añadir a Pantalla de Inicio
            </h2>
            <p className="text-xs sm:text-sm text-amber-100">
              Instala Recetas Social como una app nativa en tu móvil u ordenador.
            </p>
          </div>

          <button
            id="btn-close-install-modal"
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs transition-colors shrink-0"
            aria-label="Cerrar ventana de instalación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6 scrollbar-thin">
          {/* App Icon Visual Preview on Home Screen */}
          <div className="bg-stone-100 rounded-2xl p-4 border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* App Icon Presentation */}
              <div className="relative group shrink-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Icono Recetas Social"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-md border border-amber-200/60 object-cover"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-stone-900 text-base">Recetas Social</h3>
                  <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    App
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Icono oficial optimizado para iOS y Android
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleDownloadIcon('/pwa-512x512.png', 'recetas-icono-512.png')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-white hover:bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 transition-colors shadow-2xs"
                    title="Descargar imagen del icono en alta resolución"
                  >
                    <Download className="w-3 h-3" />
                    <span>Descargar icono (PNG)</span>
                  </button>
                  <button
                    onClick={() => handleDownloadIcon('/icon.svg', 'recetas-icono.svg')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-800 bg-white hover:bg-stone-50 px-2 py-1 rounded-lg border border-stone-200 transition-colors shadow-2xs"
                    title="Descargar formato vectorial SVG"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>SVG</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Native Install Button (if available) */}
            {isInstallable && !isInstalled && (
              <button
                id="btn-trigger-pwa-install-modal"
                onClick={handleNativeInstall}
                disabled={installing}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 shrink-0 animate-pulse"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Instalando...' : 'Instalar ahora'}</span>
              </button>
            )}

            {isInstalled && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡App ya instalada!</span>
              </div>
            )}
          </div>

          {/* Device Tabs Selector */}
          <div className="flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone / iPad</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'android'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Android</span>
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'desktop'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-blue-600" />
              <span>PC / Mac</span>
            </button>
          </div>

          {/* Guide Steps based on active tab */}
          {activeTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-stone-600">
                En Safari de iOS (iPhone e iPad), sigue estos 3 pasos rápidos:
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    Pulsa el icono Compartir
                    <span className="inline-flex items-center justify-center p-1 rounded bg-stone-200 text-stone-700">
                      <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    </span>
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Se encuentra en la barra inferior de Safari (en iPhone) o en la barra superior (en iPad).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    Selecciona &quot;Añadir a pantalla de inicio&quot;
                    <span className="inline-flex items-center justify-center p-1 rounded bg-stone-200 text-stone-700">
                      <PlusSquare className="w-3.5 h-3.5 text-stone-800" />
                    </span>
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Desplaza el menú hacia abajo hasta encontrar el icono de suma en un recuadro.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  3
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900">
                    Pulsa &quot;Añadir&quot; en la esquina superior derecha
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    ¡Listo! El icono aparecerá en tu pantalla de inicio como una aplicación independiente sin barras de navegador.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-stone-600">
                En Chrome u otros navegadores de Android:
              </p>

              {isInstallable && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">Instalador directo listo</p>
                    <p className="text-amber-700">Tu navegador permite la instalación inmediata con un toque.</p>
                  </div>
                  <button
                    onClick={handleNativeInstall}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors shrink-0"
                  >
                    Instalar
                  </button>
                </div>
              )}

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    Pulsa el menú de opciones (tres puntos verticales ⋮)
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Ubicado en la esquina superior derecha de Google Chrome o de tu navegador.
                  </p>
                  <p className="text-amber-800 font-medium mt-1 bg-amber-50 p-1.5 rounded-lg text-[11px] border border-amber-200/60">
                    💡 <strong>¿No ves los 3 puntos?</strong> Desliza la pantalla hacia abajo con el dedo para que reaparezcan, o consulta la sección de ayuda más abajo.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    Toca &quot;Instalar aplicación&quot; o &quot;Añadir a pantalla principal&quot;
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Recibirás una confirmación y el icono con el gorro de chef se colocará en tu pantalla de inicio.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  3
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900">
                    Compartir videos desde TikTok, Instagram o YouTube
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Al tener la app instalada, al pulsar &quot;Compartir&quot; en cualquier video, podrás elegir directamente <strong>Recetas Social</strong> para extraerla.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-stone-600">
                En ordenadores (Google Chrome, Microsoft Edge, Brave en Windows, Mac o Linux):
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    Icono de instalación en la barra de direcciones
                    <span className="inline-flex items-center justify-center p-1 rounded bg-stone-200 text-stone-700">
                      <Download className="w-3 h-3 text-stone-700" />
                    </span>
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Busca el icono de pantalla con flecha o suma a la derecha de la barra de URL (junto a la estrella de favoritos).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </div>
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-stone-900">
                    Haz clic en &quot;Instalar&quot;
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    La aplicación se abrirá en su propia ventana aislada con acceso directo en tu escritorio y barra de tareas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Missing 3 Dots Helper & Direct Solutions */}
          <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/90 to-orange-50/40 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span>¿No ves los 3 puntos (⋮) en tu navegador?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTroubleshoot(prev => !prev)}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
              >
                {showTroubleshoot ? 'Ocultar' : 'Ver solución'}
              </button>
            </div>

            {showTroubleshoot && (
              <div className="space-y-2.5 text-xs text-stone-700 animate-in fade-in">
                <p className="text-[11px] text-stone-600">
                  Si los 3 puntos desaparecieron de la pantalla, suele deberse a una de estas situaciones:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="font-bold text-amber-800 text-xs px-1.5 py-0.5 rounded bg-amber-100 shrink-0">1</span>
                    <div className="text-[11px]">
                      <strong className="text-stone-900">Desliza la pantalla hacia abajo con el dedo</strong>: En Chrome para Android, los 3 puntos se esconden automáticamente al hacer scroll hacia abajo. Al deslizar el dedo hacia abajo reaparecen de inmediato.
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="font-bold text-amber-800 text-xs px-1.5 py-0.5 rounded bg-amber-100 shrink-0">2</span>
                    <div className="text-[11px]">
                      <strong className="text-stone-900">¿Abriste desde WhatsApp, Instagram o TikTok?</strong>: Estás en el visor interno de la red social. Toca el menú de opciones de esa app (arriba a la derecha) y pulsa <em>&quot;Abrir en Chrome&quot;</em> o <em>&quot;Abrir en navegador&quot;</em>.
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="font-bold text-amber-800 text-xs px-1.5 py-0.5 rounded bg-amber-100 shrink-0">3</span>
                    <div className="text-[11px]">
                      <strong className="text-stone-900">¿Estás en un iPhone o iPad?</strong>: En Apple NO existen los 3 puntos. El botón para instalar es el icono de <strong>Compartir</strong> (cuadrado con flecha hacia arriba ⎋) en la barra inferior de Safari.
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="font-bold text-amber-800 text-xs px-1.5 py-0.5 rounded bg-amber-100 shrink-0">4</span>
                    <div className="text-[11px]">
                      <strong className="text-stone-900">Solución directa para abrir en Chrome</strong>: Copia el enlace directo con el botón de abajo y pégalo directamente en la barra de Google Chrome en tu teléfono.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-copy-app-url"
                    onClick={handleCopyAppUrl}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 active:bg-stone-100 border border-amber-300 text-xs font-bold text-stone-800 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">¡Enlace copiado! Pégalo en Chrome</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-600" />
                        <span>Copiar enlace de la App</span>
                      </>
                    )}
                  </button>

                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir en pestaña nueva</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* App Advantages summary */}
          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-600" />
              <span>Ventajas de instalar en pantalla de inicio:</span>
            </p>
            <ul className="list-disc list-inside text-amber-800 space-y-0.5 pl-1 text-[11px]">
              <li>Acceso instantáneo con un solo toque desde tu móvil</li>
              <li>Apertura a pantalla completa sin barra del navegador</li>
              <li>Compartir videos directamente a la app desde TikTok, Instagram o YouTube</li>
              <li>Tus recetas guardadas y listas de compras siempre disponibles</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 font-medium hidden sm:block">
            Icono oficial para pantalla de inicio (PWA)
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-close-install-modal-footer"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-200 bg-stone-100 transition-colors"
            >
              Entendido
            </button>
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={handleNativeInstall}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar App</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
