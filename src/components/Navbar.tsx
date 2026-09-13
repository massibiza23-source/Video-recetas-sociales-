import React from 'react';
import { ChefHat, Plus, Download, Upload, Sparkles, RefreshCw, Smartphone } from 'lucide-react';

interface Props {
  recipeCount: number;
  onOpenManualModal: () => void;
  onExportJson: () => void;
  onOpenImportModal?: () => void;
  onOpenMobileConnectModal?: () => void;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<Props> = ({
  recipeCount,
  onOpenManualModal,
  onExportJson,
  onOpenImportModal,
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
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge counter */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
            <span>Recetas:</span>
            <span className="font-bold text-stone-900">{recipeCount}</span>
          </div>

          {/* Backup Dropdown / Group */}
          <div className="flex items-center rounded-md border border-stone-200 bg-white overflow-hidden shadow-2xs">
            {onOpenImportModal && (
              <button
                id="btn-import-recipes"
                onClick={onOpenImportModal}
                title="Importar JSON"
                className="p-1.5 sm:px-2 sm:py-1.5 hover:bg-amber-50 transition-colors flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden lg:inline text-[11px] font-semibold text-amber-900">Importar</span>
              </button>
            )}
            <div className="w-px h-3.5 bg-stone-200"></div>
            <button
              id="btn-export-recipes"
              onClick={onExportJson}
              title="Exportar JSON"
              className="p-1.5 sm:px-2 sm:py-1.5 hover:bg-stone-50 transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden lg:inline text-[11px] font-medium text-stone-700">Exportar</span>
            </button>
          </div>

          <button
            id="btn-open-manual-recipe"
            onClick={onOpenManualModal}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-md shadow-sm shadow-amber-600/20 transition-all hover:shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Crear Manual</span>
            <span className="sm:hidden">Crear</span>
          </button>
        </div>
      </div>
    </header>
  );
};
