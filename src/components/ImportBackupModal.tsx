import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  RefreshCw,
  ChefHat,
  Eye,
  Check,
  ArrowRight,
  Info
} from 'lucide-react';
import { Recipe } from '../types';
import { parseBackupJson, ParseBackupResult } from '../utils/backupUtils';

interface Props {
  isOpen: boolean;
  currentRecipeCount: number;
  onClose: () => void;
  onImportRecipes: (recipes: Recipe[], mode: 'merge' | 'replace') => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const ImportBackupModal: React.FC<Props> = ({
  isOpen,
  currentRecipeCount,
  onClose,
  onImportRecipes,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParseBackupResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showPreviewList, setShowPreviewList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file) return;

    setSelectedFileName(file.name);
    setFileSizeStr(
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`
    );

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = parseBackupJson(content);
      res.filename = file.name;
      setParsedResult(res);

      if (res.success) {
        onShowToast(
          'success',
          'Archivo analizado',
          `Se encontraron ${res.recipes.length} receta${res.recipes.length === 1 ? '' : 's'} listas para importar.`
        );
      } else {
        onShowToast('error', 'Error en el archivo', res.error || 'Formato JSON inválido.');
      }
    };
    reader.onerror = () => {
      onShowToast('error', 'Error de lectura', 'No se pudo leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      onShowToast('warning', 'Texto vacío', 'Pega el código JSON de la copia de seguridad.');
      return;
    }
    const res = parseBackupJson(rawText);
    res.filename = 'JSON pegado';
    setParsedResult(res);
    setSelectedFileName('Texto JSON');
    setFileSizeStr(`${(rawText.length / 1024).toFixed(1)} KB`);

    if (res.success) {
      onShowToast(
        'success',
        'JSON válido',
        `Se detectaron ${res.recipes.length} recetas en el texto.`
      );
    } else {
      onShowToast('error', 'Error de formato', res.error || 'No se reconocieron recetas.');
    }
  };

  const handleReset = () => {
    setParsedResult(null);
    setSelectedFileName('');
    setFileSizeStr('');
    setRawText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = () => {
    if (!parsedResult || !parsedResult.success || parsedResult.recipes.length === 0) {
      onShowToast('error', 'Sin datos', 'Primero selecciona o pega un archivo JSON válido.');
      return;
    }

    onImportRecipes(parsedResult.recipes, importMode);
    onClose();
  };

  return (
    <div
      id="import-backup-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="import-backup-modal-card"
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs">
              <FileCode className="w-3.5 h-3.5" />
              <span>Copia de Seguridad</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif leading-tight">
              Importar Backup JSON
            </h2>
            <p className="text-xs sm:text-sm text-amber-100">
              Restaura o añade recetas desde un archivo de respaldo exportado previamente.
            </p>
          </div>

          <button
            id="btn-close-import-modal"
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs transition-colors shrink-0"
            aria-label="Cerrar modal de importación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 scrollbar-thin">
          {/* Method tabs */}
          {!parsedResult && (
            <div className="flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'file'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir archivo .json</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'text'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Pegar texto JSON</span>
              </button>
            </div>
          )}

          {/* TAB 1: File Upload */}
          {!parsedResult && activeTab === 'file' && (
            <div
              id="drop-zone-json-backup"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-amber-500 bg-amber-50/80 scale-[0.99]'
                  : 'border-stone-300 hover:border-amber-400 bg-stone-50/60 hover:bg-amber-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                id="input-file-json-backup"
                type="file"
                accept=".json,application/json,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-stone-800 text-sm">
                Arrastra tu archivo JSON aquí
              </p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                O haz clic para buscar el archivo <span className="font-mono text-amber-700">.json</span> de respaldo en tu dispositivo.
              </p>
              <span className="mt-4 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50">
                Seleccionar archivo
              </span>
            </div>
          )}

          {/* TAB 2: Text Paste */}
          {!parsedResult && activeTab === 'text' && (
            <div className="space-y-3">
              <label htmlFor="textarea-json-backup" className="block text-xs font-bold text-stone-700">
                Pega el contenido JSON de tu copia de seguridad:
              </label>
              <textarea
                id="textarea-json-backup"
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder='[ { "title": "Tacos al Pastor", "servings": 4, "ingredients": [...] } ]'
                className="w-full p-3 font-mono text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
              />
              <button
                type="button"
                onClick={handleParseText}
                disabled={!rawText.trim()}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Analizar JSON</span>
              </button>
            </div>
          )}

          {/* PARSED PREVIEW STATE */}
          {parsedResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* File / Content Badge */}
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 text-sm truncate">
                      {selectedFileName || 'Copia de seguridad'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {fileSizeStr && `${fileSizeStr} • `}
                      {parsedResult.success
                        ? `${parsedResult.recipes.length} receta${parsedResult.recipes.length === 1 ? '' : 's'} detectada${parsedResult.recipes.length === 1 ? '' : 's'}`
                        : 'Archivo inválido'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 shrink-0"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Status Message */}
              {parsedResult.success ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      ¡Formato correcto! {parsedResult.recipes.length} recetas listas para ser importadas.
                    </p>
                    {parsedResult.invalidCount > 0 && (
                      <p className="text-emerald-700 mt-0.5">
                        Nota: Se omitieron {parsedResult.invalidCount} elementos que no tenían el formato de receta.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">No se pudieron extraer recetas válidas</p>
                    <p className="text-rose-700 mt-0.5">{parsedResult.error}</p>
                  </div>
                </div>
              )}

              {/* Import Mode Selector */}
              {parsedResult.success && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-stone-800">
                    ¿Cómo deseas importar las recetas?
                  </label>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Merge Option */}
                    <label
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        importMode === 'merge'
                          ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500/30'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="import-mode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span>Combinar con mi colección</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                            Recomendado
                          </span>
                        </p>
                        <p className="text-stone-600 mt-0.5">
                          Conserva todas tus recetas actuales ({currentRecipeCount}) y añade las nuevas del archivo. Si hay recetas repetidas con el mismo identificador, se actualizarán.
                        </p>
                      </div>
                    </label>

                    {/* Replace Option */}
                    <label
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        importMode === 'replace'
                          ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="import-mode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-stone-900">
                          Reemplazar colección completa
                        </p>
                        <p className="text-stone-600 mt-0.5">
                          Sustituye todas las recetas que tienes actualmente en la app por las {parsedResult.recipes.length} recetas del archivo.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Recipe Preview Collapsible */}
              {parsedResult.success && (
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPreviewList(!showPreviewList)}
                    className="w-full p-3 bg-stone-50 hover:bg-stone-100 text-left flex items-center justify-between text-xs font-semibold text-stone-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ver lista de recetas a importar ({parsedResult.recipes.length})</span>
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {showPreviewList ? 'Ocultar' : 'Mostrar'}
                    </span>
                  </button>

                  {showPreviewList && (
                    <div className="max-h-48 overflow-y-auto p-2 divide-y divide-stone-100 bg-white text-xs scrollbar-thin">
                      {parsedResult.recipes.map((rec, idx) => (
                        <div key={rec.id || idx} className="py-2 px-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900 truncate">
                              {idx + 1}. {rec.title}
                            </p>
                            <p className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                              <span>{rec.category}</span>
                              <span>•</span>
                              <span>{rec.servings} porciones</span>
                              <span>•</span>
                              <span>{rec.ingredients?.length || 0} ingr.</span>
                            </p>
                          </div>
                          <span className="text-[10px] uppercase font-bold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded shrink-0">
                            {rec.sourcePlatform}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Help tip */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Compatibilidad universal:</strong> Puedes importar cualquier copia de seguridad exportada desde este recetario, así como archivos JSON con arrays de recetas o el formato estándar con <code className="font-mono text-amber-800">title</code>, <code className="font-mono text-amber-800">ingredients</code> y <code className="font-mono text-amber-800">instructions</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            id="btn-cancel-import-modal"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-200 bg-stone-100 transition-colors"
          >
            Cancelar
          </button>

          {parsedResult?.success ? (
            <button
              id="btn-confirm-import-json"
              type="button"
              onClick={handleExecuteImport}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {importMode === 'merge'
                  ? `Añadir ${parsedResult.recipes.length} recetas`
                  : `Reemplazar con ${parsedResult.recipes.length} recetas`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 bg-stone-200 cursor-not-allowed flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
