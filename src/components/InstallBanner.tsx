import React, { useState, useEffect } from 'react';
import { Download, X, PlusSquare, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  onOpenInstallModal: () => void;
}

export const InstallBanner: React.FC<Props> = ({ onOpenInstallModal }) => {
  const { isInstalled, isIOS, isInstallable } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    }
    return false;
  });

  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    }
  };

  return (
    <div
      id="pwa-install-banner"
      className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-md border-b border-amber-400/30 transition-all"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left info with app icon */}
        <div 
          onClick={onOpenInstallModal}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer flex-1"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onOpenInstallModal()}
        >
          <img
            src="/pwa-192x192.png"
            alt="Recetas Social"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs border border-white/30 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
              <span>Instala Recetas en tu pantalla de inicio</span>
            </p>
            <p className="text-[11px] text-amber-100 hidden sm:block truncate">
              ¿No ves los 3 puntos del navegador? Toca aquí para ver cómo instalarla con 1 toque o abrirla en Chrome.
            </p>
            <p className="text-[10px] text-amber-200 sm:hidden truncate">
              ¿No ves los 3 puntos? Toca aquí para instalar
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="btn-banner-install"
            type="button"
            onClick={onOpenInstallModal}
            className="px-3 py-1 sm:py-1.5 text-xs font-bold text-amber-900 bg-white hover:bg-amber-50 active:bg-amber-100 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            {isIOS ? (
              <>
                <PlusSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>Añadir a Inicio</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Instalar</span>
              </>
            )}
          </button>

          <button
            id="btn-banner-dismiss"
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-md text-amber-100 hover:text-white hover:bg-white/10 transition-colors"
            title="Descartar aviso"
            aria-label="Cerrar aviso de instalación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
