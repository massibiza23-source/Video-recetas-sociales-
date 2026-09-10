import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  ChefHat, 
  Minus, 
  Plus, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Youtube, 
  Instagram, 
  Facebook, 
  Video as VideoIcon, 
  Globe, 
  AlertCircle,
  Play,
  RotateCcw,
  Camera,
  ShoppingCart
} from 'lucide-react';
import { Recipe, RecipeStep, Ingredient } from '../types';
import { getVideoEmbedInfo, VideoEmbedInfo } from '../utils/videoUtils';

interface Props {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onOpenEdit?: (recipe: Recipe) => void;
  onOpenPhotoModal?: (recipe: Recipe) => void;
  onOpenShoppingList?: (recipe: Recipe) => void;
  onUpdateRecipe?: (recipe: Recipe) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

type TabType = 'steps' | 'ingredients' | 'info';

export const RecipeVideoModal: React.FC<Props> = ({
  isOpen,
  recipe,
  onClose,
  onOpenEdit,
  onOpenPhotoModal,
  onOpenShoppingList,
  onUpdateRecipe,
  onShowToast
}) => {
  // 1. Hooks unconditionally declared at top
  const [activeTab, setActiveTab] = useState<TabType>('steps');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [currentServings, setCurrentServings] = useState(recipe?.servings || 2);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Sync state whenever recipe changes or modal opens
  useEffect(() => {
    if (!isOpen || !recipe) return;
    setCurrentServings(recipe.servings || 2);
    setCurrentStepIndex(0);

    const initIngs: Record<string, boolean> = {};
    (recipe.ingredients || []).forEach(i => { initIngs[i.id] = !!i.checked; });
    setCheckedIngredients(initIngs);

    const initSteps: Record<string, boolean> = {};
    (recipe.instructions || []).forEach(s => { initSteps[s.id] = !!s.completed; });
    setCompletedSteps(initSteps);
  }, [isOpen, recipe]);

  // Keyboard controls (Esc to close, Left/Right for steps)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (recipe && currentStepIndex < recipe.instructions.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, recipe, onClose]);

  // Video embed info memo
  const embedInfo: VideoEmbedInfo = useMemo(() => {
    if (!recipe) {
      return {
        type: 'unsupported',
        canEmbed: false,
        platformName: 'Sin video'
      };
    }
    return getVideoEmbedInfo(recipe.sourceUrl, recipe.sourcePlatform, recipe.videoUrl);
  }, [recipe]);

  // Early return only after all hooks are declared
  if (!isOpen || !recipe) return null;

  // Servings ratio
  const baseServings = recipe.servings || 2;
  const ratio = currentServings / baseServings;

  const handleToggleIngredient = (id: string) => {
    setCheckedIngredients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleStep = (id: string) => {
    setCompletedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleServingsChange = (delta: number) => {
    setCurrentServings(prev => Math.max(1, Math.min(24, prev + delta)));
  };

  const formatAmount = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '';
    const scaled = amount * ratio;
    if (Number.isInteger(scaled)) return scaled.toString();
    return scaled.toFixed(1).replace('.0', '');
  };

  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;
  const totalStepsCount = recipe.instructions.length || 1;
  const progressPercent = Math.round((completedStepsCount / totalStepsCount) * 100);

  const activeStep = recipe.instructions[currentStepIndex] || recipe.instructions[0];

  const handleCopyIngredients = () => {
    const lines = [
      `🛒 Ingredientes para ${recipe.title} (${currentServings} porciones):`,
      '',
      ...recipe.ingredients.map(ing => {
        const amt = formatAmount(ing.amount);
        const unit = ing.unit ? ` ${ing.unit}` : '';
        const notes = ing.notes ? ` (${ing.notes})` : '';
        return `• ${amt}${unit} ${ing.item}${notes}`.trim();
      })
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    onShowToast('success', 'Ingredientes copiados', 'Copiados al portapapeles.');
    setTimeout(() => setCopied(false), 2500);
  };

  const getPlatformBadge = () => {
    switch (embedInfo.type) {
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600/90 text-white shadow-xs">
            <Youtube className="w-3.5 h-3.5" />
            <span>{embedInfo.platformName}</span>
          </span>
        );
      case 'instagram':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xs">
            <Instagram className="w-3.5 h-3.5" />
            <span>{embedInfo.platformName}</span>
          </span>
        );
      case 'tiktok':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-900 text-white border border-stone-700 shadow-xs">
            <VideoIcon className="w-3.5 h-3.5" />
            <span>TikTok</span>
          </span>
        );
      case 'facebook':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs">
            <Facebook className="w-3.5 h-3.5" />
            <span>Facebook</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs">
            <Globe className="w-3.5 h-3.5" />
            <span>Video Receta</span>
          </span>
        );
    }
  };

  return (
    <div 
      id="recipe-video-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Video Header */}
      <header 
        id="recipe-video-header"
        className="w-full bg-stone-900/90 border-b border-stone-800 px-4 sm:px-6 py-3 flex items-center justify-between text-white shrink-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="btn-back-from-video"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-semibold transition-colors border border-stone-700/80 shadow-xs"
            title="Volver a la receta"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            {getPlatformBadge()}
            <h2 className="text-sm sm:text-base font-bold truncate text-stone-100 font-serif">
              {recipe.title}
            </h2>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenPhotoModal && (
            <button
              id="btn-edit-photo-from-video-player"
              type="button"
              onClick={() => onOpenPhotoModal(recipe)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700/80 rounded-xl transition-colors shadow-xs"
              title="Corregir la foto o miniatura de este video"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Corregir foto</span>
            </button>
          )}

          {recipe.sourceUrl && (
            <a
              id="btn-open-original-video-source"
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 rounded-xl transition-colors"
              title="Abrir en la aplicación o sitio original"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Abrir en {recipe.sourcePlatform}</span>
            </a>
          )}

          {/* Theater Mode Toggle (Desktop only) */}
          <button
            id="btn-toggle-theater-mode"
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="hidden lg:flex items-center gap-1.5 p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs transition-colors border border-stone-700/60"
            title={isTheaterMode ? 'Mostrar panel lateral de pasos' : 'Modo Cine / Pantalla completa'}
          >
            {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal */}
          <button
            id="btn-close-video-modal"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
            aria-label="Cerrar reproductor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container: Video + Companion Panel */}
      <div 
        id="recipe-video-content-body"
        className="flex-1 flex flex-col lg:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column: Video Screen */}
        <div 
          id="recipe-video-player-section"
          className={`flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 bg-stone-950 overflow-y-auto ${
            isTheaterMode ? 'w-full' : ''
          }`}
        >
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center h-full">
            {/* 1. YouTube Embed */}
            {embedInfo.type === 'youtube' && embedInfo.embedUrl && (
              <div 
                className={`relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black border border-stone-800 ${
                  embedInfo.isVertical 
                    ? 'max-w-xs sm:max-w-sm aspect-9/16 max-h-[78vh]' 
                    : 'aspect-video max-h-[78vh]'
                }`}
              >
                <iframe
                  id="iframe-youtube-player"
                  src={embedInfo.embedUrl}
                  title={recipe.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}

            {/* 2. Direct Video File */}
            {embedInfo.type === 'direct' && embedInfo.directUrl && (
              <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-stone-800">
                <video
                  id="html5-video-player"
                  src={embedInfo.directUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* 3. Instagram / TikTok / Facebook */}
            {(embedInfo.type === 'instagram' || embedInfo.type === 'tiktok' || embedInfo.type === 'facebook') && (
              <div className="w-full flex flex-col items-center gap-4 max-w-md">
                <div 
                  className={`relative w-full rounded-2xl overflow-hidden shadow-2xl bg-stone-900 border border-stone-800 ${
                    embedInfo.isVertical ? 'aspect-9/16 max-h-[68vh]' : 'aspect-video max-h-[68vh]'
                  }`}
                >
                  <iframe
                    id="iframe-social-player"
                    src={embedInfo.embedUrl}
                    title={recipe.title}
                    className="w-full h-full border-0 bg-stone-900"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Direct Launch Alert Bar for Social Networks */}
                <div className="w-full p-3 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-3 text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>¿El reproductor tarda o requiere login?</span>
                  </div>
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <span>Abrir en {recipe.sourcePlatform}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* 4. Unsupported or Manual Recipe Fallback */}
            {embedInfo.type === 'unsupported' && (
              <div className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
                <div className="relative aspect-video max-w-md mx-auto rounded-2xl overflow-hidden shadow-md">
                  <img
                    src={recipe.imageUrl || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80'}
                    alt={recipe.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-stone-950/50 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg">
                      <ChefHat className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white font-serif">
                    Asistente de Cocina Interactivo
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto mt-1">
                    Esta receta se registró de forma manual o desde una publicación sin video embebible. Puedes seguir la guía paso a paso en el panel lateral.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Visitar fuente web</span>
                    </a>
                  )}

                  {onOpenEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEdit(recipe);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Añadir enlace de video</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Cooking Step Navigator under Video (especially handy on desktop) */}
            <div className="w-full max-w-4xl mt-3 hidden sm:flex items-center justify-between p-3 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  Paso {currentStepIndex + 1} de {recipe.instructions.length}:
                </span>
                <span className="font-medium text-stone-200 truncate max-w-md">
                  {activeStep?.instruction}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-prev-step-bar"
                  onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-white font-semibold transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  id="btn-toggle-step-completed-bar"
                  onClick={() => activeStep && handleToggleStep(activeStep.id)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                    activeStep && completedSteps[activeStep.id]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  {activeStep && completedSteps[activeStep.id] ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                  <span>{activeStep && completedSteps[activeStep.id] ? 'Hecho' : 'Completar'}</span>
                </button>

                <button
                  id="btn-next-step-bar"
                  onClick={() => setCurrentStepIndex(prev => Math.min(recipe.instructions.length - 1, prev + 1))}
                  disabled={currentStepIndex >= recipe.instructions.length - 1}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-white font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Recipe Companion (Collapsible in Theater Mode) */}
        {!isTheaterMode && (
          <aside 
            id="recipe-video-companion-sidebar"
            className="w-full lg:w-96 xl:w-104 bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-800 flex flex-col shrink-0 max-h-[45vh] lg:max-h-full overflow-hidden"
          >
            {/* Tabs Header */}
            <div className="flex items-center border-b border-stone-800 px-3 pt-2 bg-stone-900 shrink-0">
              <button
                id="tab-btn-steps"
                onClick={() => setActiveTab('steps')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'steps'
                    ? 'border-amber-500 text-amber-400 bg-stone-800/50'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Paso a paso</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300">
                  {recipe.instructions.length}
                </span>
              </button>

              <button
                id="tab-btn-ingredients"
                onClick={() => setActiveTab('ingredients')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'ingredients'
                    ? 'border-amber-500 text-amber-400 bg-stone-800/50'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Ingredientes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300">
                  {recipe.ingredients.length}
                </span>
              </button>

              <button
                id="tab-btn-info"
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'info'
                    ? 'border-amber-500 text-amber-400 bg-stone-800/50'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Info & Tips</span>
              </button>
            </div>

            {/* Tab 1: Step by Step */}
            {activeTab === 'steps' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-medium">Progreso de la receta</span>
                    <span className="font-bold text-amber-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                  {recipe.instructions.map((step, idx) => {
                    const isDone = completedSteps[step.id];
                    const isActive = idx === currentStepIndex;

                    return (
                      <div
                        key={step.id || idx}
                        id={`video-step-item-${idx}`}
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                            : isDone
                            ? 'bg-stone-900/50 border-stone-800/60 opacity-60'
                            : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStep(step.id);
                            }}
                            className={`shrink-0 mt-0.5 transition-colors ${
                              isDone ? 'text-emerald-500' : 'text-stone-500 hover:text-stone-300'
                            }`}
                            aria-label={`Marcar paso ${step.stepNumber} como ${isDone ? 'pendiente' : 'completado'}`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                isActive ? 'text-amber-400' : 'text-stone-400'
                              }`}>
                                Paso {step.stepNumber}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                                  En foco
                                </span>
                              )}
                            </div>

                            <p className={`text-xs sm:text-sm leading-relaxed ${
                              isDone ? 'line-through text-stone-500' : 'text-stone-200'
                            }`}>
                              {step.instruction}
                            </p>

                            {step.tip && (
                              <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-200/90">
                                <span className="font-bold">Tip: </span>
                                <span>{step.tip}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Ingredients & Scaler */}
            {activeTab === 'ingredients' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                {/* Servings Scaler Header */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-800/60 border border-stone-800">
                  <div className="flex items-center gap-2 text-xs text-stone-300 font-medium">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Porciones:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleServingsChange(-1)}
                      disabled={currentServings <= 1}
                      className="w-7 h-7 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                      aria-label="Disminuir porción"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-sm text-white">
                      {currentServings}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleServingsChange(1)}
                      disabled={currentServings >= 24}
                      className="w-7 h-7 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                      aria-label="Aumentar porción"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Shopping List and Copy Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {onOpenShoppingList && (
                    <button
                      id="btn-shopping-modal-from-video"
                      type="button"
                      onClick={() => onOpenShoppingList(recipe)}
                      className="py-2 px-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Lista de compras</span>
                    </button>
                  )}

                  <button
                    id="btn-copy-ingredients-video"
                    type="button"
                    onClick={handleCopyIngredients}
                    className={`py-2 px-3 text-xs font-semibold text-stone-200 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl border border-stone-700 transition-colors flex items-center justify-center gap-2 ${!onOpenShoppingList ? 'w-full' : ''}`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-stone-400" />}
                    <span>{copied ? '¡Copiada!' : 'Copiar texto'}</span>
                  </button>
                </div>

                {/* Ingredients List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {recipe.ingredients.map((ing) => {
                    const isChecked = checkedIngredients[ing.id];
                    const formattedAmt = formatAmount(ing.amount);

                    return (
                      <div
                        key={ing.id}
                        onClick={() => handleToggleIngredient(ing.id)}
                        className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-2.5 ${
                          isChecked
                            ? 'bg-stone-900/40 border-stone-800 text-stone-500'
                            : 'bg-stone-850 border-stone-800 text-stone-200 hover:bg-stone-800'
                        }`}
                      >
                        <button
                          type="button"
                          className={`shrink-0 ${isChecked ? 'text-emerald-500' : 'text-stone-500'}`}
                        >
                          {isChecked ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>

                        <div className="flex-1 text-xs min-w-0">
                          <span className={isChecked ? 'line-through' : 'font-medium'}>
                            {formattedAmt && <span className="font-bold text-amber-400 mr-1">{formattedAmt}</span>}
                            {ing.unit && <span className="text-stone-400 mr-1">{ing.unit}</span>}
                            <span>{ing.item}</span>
                            {ing.notes && <span className="text-stone-500 text-[11px] ml-1">({ing.notes})</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Info & Notes */}
            {activeTab === 'info' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-1 scrollbar-thin text-xs text-stone-300">
                {/* Recipe Metrics */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-stone-850 border border-stone-800">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Tiempo preparación</span>
                    <span className="font-bold text-white text-sm">{recipe.prepTimeMinutes || 10} min</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Tiempo cocción</span>
                    <span className="font-bold text-white text-sm">{recipe.cookTimeMinutes || 15} min</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Categoría</span>
                    <span className="font-bold text-amber-400 text-sm">{recipe.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Dificultad</span>
                    <span className="font-bold text-white text-sm">{recipe.difficulty || 'Fácil'}</span>
                  </div>
                </div>

                {/* Description */}
                {recipe.description && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Descripción</span>
                    <p className="p-3 rounded-xl bg-stone-850 border border-stone-800 leading-relaxed text-stone-300">
                      {recipe.description}
                    </p>
                  </div>
                )}

                {/* Chef Notes */}
                {recipe.notes && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Consejos del Chef</span>
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 leading-relaxed text-amber-200">
                      {recipe.notes}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Etiquetas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-stone-800 text-stone-400 text-[10px]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
