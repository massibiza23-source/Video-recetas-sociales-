import React from 'react';
import { ChefHat, Plus, Download, Sparkles, RefreshCw, Smartphone } from 'lucide-react';

interface Props {
  recipeCount: number;
  onOpenManualModal: () => void;
  onExportJson: () => void;
  onResetSamples: () => void;
  onOpenMobileConnectModal?: () => void;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<Props> = ({
  recipeCount,
  onOpenManualModal,
  onExportJson,
  onResetSamples,
  onOpenMobileConnectModal,
  onOpenInstallModal
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 font-serif">
                Recetas Social
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Sparkles className="w-3 h-3 text-amber-600" />
                IA Extractor
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Organizador de YouTube, Instagram, TikTok y videos de tu móvil
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Install / Add to Home Screen button */}
          {onOpenInstallModal && (
            <button
              id="btn-nav-install-pwa"
              type="button"
              onClick={onOpenInstallModal}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200/90 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer group"
              title="Instalar y añadir icono a la pantalla de inicio"
            >
              <img
                src="/pwa-192x192.png"
                alt="Icono App"
                className="w-4 h-4 rounded-xs shadow-2xs group-hover:scale-110 transition-transform"
              />
              <span className="hidden sm:inline">Instalar App</span>
              <span className="sm:hidden">Instalar</span>
            </button>
          )}

          {/* Mobile phone send button */}
          {onOpenMobileConnectModal && (
            <button
              id="btn-nav-mobile-connect"
              type="button"
              onClick={onOpenMobileConnectModal}
              className="px-3 py-1.5 text-xs font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 border border-orange-200 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Abre la app en tu móvil para compartir videos directamente"
            >
              <Smartphone className="w-4 h-4 text-orange-600" />
              <span className="hidden md:inline">Enviar desde Móvil</span>
              <span className="md:hidden">Móvil</span>
            </button>
          )}

          {/* Badge counter */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
            <span>Recetas:</span>
            <span className="font-bold text-stone-900">{recipeCount}</span>
          </div>

          <button
            id="btn-export-recipes"
            onClick={onExportJson}
            title="Exportar copia de seguridad en JSON"
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1.5 border border-stone-200"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            id="btn-reset-samples"
            onClick={onResetSamples}
            title="Restaurar recetas de ejemplo"
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1 border border-stone-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ejemplos</span>
          </button>

          <button
            id="btn-open-manual-recipe"
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm shadow-amber-600/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Manual</span>
          </button>
        </div>
      </div>
    </header>
  );
};
