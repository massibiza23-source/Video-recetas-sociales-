import React, { useState, useRef } from 'react';
import { 
  Smartphone, 
  UploadCloud, 
  Camera, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Film, 
  AlertCircle,
  X,
  Clock
} from 'lucide-react';
import { Recipe } from '../types';
import { extractFramesFromVideoFile, ExtractedVideoData } from '../utils/videoFramesExtractor';

interface Props {
  onRecipeExtracted: (recipe: Recipe) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  onClose?: () => void;
}

export const MobileVideoUploader: React.FC<Props> = ({
  onRecipeExtracted,
  onShowToast,
  onClose
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoData, setVideoData] = useState<ExtractedVideoData | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      onShowToast('warning', 'Formato no válido', 'Por favor selecciona un archivo de video (.mp4, .mov, .webm).');
      return;
    }

    setSelectedFile(file);
    setCustomTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    setIsExtractingFrames(true);
    setStatusMessage('Cargando video y extrayendo fotogramas clave...');

    try {
      const extracted = await extractFramesFromVideoFile(file, 4);
      setVideoData(extracted);
      setStatusMessage('¡4 fotogramas capturados con éxito! Listo para analizar.');
    } catch (err: any) {
      console.error('Frame extraction error:', err);
      onShowToast('error', 'Error al procesar video', err.message || 'No se pudo leer el archivo de video.');
      setSelectedFile(null);
      setVideoData(null);
    } finally {
      setIsExtractingFrames(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSendToAI = async () => {
    if (!videoData || videoData.frames.length === 0) {
      onShowToast('warning', 'Sin video', 'Primero debes seleccionar o grabar un video.');
      return;
    }

    setIsAnalyzingAI(true);
    setStatusMessage('La IA está analizando los fotogramas del video...');

    try {
      const res = await fetch('/api/extract-recipe-from-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: videoData.frames,
          videoTitle: customTitle.trim() || videoData.fileName,
          notes: notes.trim() || undefined,
          durationSeconds: videoData.durationSeconds
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.recipe) {
        throw new Error(data.error || 'No se pudo procesar la receta del video.');
      }

      onShowToast(
        'success', 
        '¡Receta extraída del video!', 
        `"${data.recipe.title}" (${data.recipe.ingredients?.length || 0} ingredientes detectados).`
      );
      onRecipeExtracted(data.recipe);
      if (onClose) onClose();
    } catch (err: any) {
      onShowToast('error', 'Error al analizar', err.message || 'Ocurrió un error inesperado al procesar el video.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setVideoData(null);
    setCustomTitle('');
    setNotes('');
    setStatusMessage('');
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
              Subir o Grabar Video desde el Teléfono
            </h3>
            <p className="text-xs text-stone-500">
              Analizamos los fotogramas de tu video con IA para extraer ingredientes y pasos de cocina.
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hidden file inputs */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="video/mp4,video/quicktime,video/webm,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {/* State 1: No file chosen */}
      {!selectedFile && (
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-6 sm:p-8 text-center transition-colors bg-stone-50/50"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Film className="w-6 h-6" />
          </div>

          <h4 className="text-sm sm:text-base font-semibold text-stone-800 mb-1">
            Elige un video de tu teléfono o graba uno ahora
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-5">
            Admite videos en formato MP4, MOV o WebM. Funciona al instante en iPhone, Android y tabletas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="btn-pick-phone-video"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Seleccionar de la Galería</span>
            </button>

            <button
              type="button"
              id="btn-record-phone-camera"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4 text-stone-600" />
              <span>Grabar con Cámara</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: Processing frames */}
      {isExtractingFrames && (
        <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-800">{statusMessage}</p>
          <p className="text-xs text-stone-500 mt-1">
            Esto solo toma 1-2 segundos en tu dispositivo...
          </p>
        </div>
      )}

      {/* State 3: Video frames ready for inspection & AI analysis */}
      {selectedFile && videoData && !isExtractingFrames && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-stone-900 block truncate">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-stone-500 flex items-center gap-2">
                  <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {videoData.durationSeconds}s
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={isAnalyzingAI}
              className="text-xs font-medium text-stone-500 hover:text-red-600 px-2 py-1 rounded hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cambiar video
            </button>
          </div>

          {/* Captured keyframes preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-700">
                Fotogramas analizados ({videoData.frames.length} capturas secuenciales):
              </span>
              <span className="text-[11px] text-stone-500">
                La IA identificará ingredientes y pasos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {videoData.frames.map((frameUrl, idx) => (
                <div 
                  key={idx} 
                  className="relative aspect-video rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shadow-xs"
                >
                  <img 
                    src={frameUrl} 
                    alt={`Paso ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono">
                    Paso {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Title & user notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre sugerido del plato (opcional)
              </label>
              <input 
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ej: Pasta carbonara cremosa"
                disabled={isAnalyzingAI}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Indicaciones o ingredientes especiales (opcional)
              </label>
              <input 
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Es vegetariana, lleva 3 huevos y queso parmesano"
                disabled={isAnalyzingAI}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            id="btn-analyze-video-recipe"
            onClick={handleSendToAI}
            disabled={isAnalyzingAI}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {isAnalyzingAI ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando video y creando receta...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extraer Receta del Video con IA</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
