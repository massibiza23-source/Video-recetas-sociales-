import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Users, 
  ChefHat, 
  ExternalLink, 
  Copy, 
  Check, 
  Flame, 
  CheckSquare, 
  Square, 
  Share2, 
  Edit3, 
  Minus, 
  Plus, 
  Sparkles,
  Youtube,
  Instagram,
  Facebook,
  Video,
  Globe,
  Tag,
  BookOpen,
  Play,
  Camera,
  ShoppingCart,
  MessageCircle,
  FileCode
} from 'lucide-react';
import { Recipe, PlatformType } from '../types';
import { sendViaWhatsApp, generateShoppingListText, transformIngredientsToShoppingList } from '../utils/shoppingList';

interface Props {
  recipe: Recipe | null;
  onClose: () => void;
  onOpenVideo: (recipe: Recipe) => void;
  onOpenEdit: (recipe: Recipe) => void;
  onOpenPhotoModal?: (recipe: Recipe) => void;
  onOpenShoppingList?: (recipe: Recipe) => void;
  onOpenShareHtml?: (recipe: Recipe) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const RecipeDetailModal: React.FC<Props> = ({
  recipe,
  onClose,
  onOpenVideo,
  onOpenEdit,
  onOpenPhotoModal,
  onOpenShoppingList,
  onOpenShareHtml,
  onUpdateRecipe,
  onShowToast
}) => {
  const [currentServings, setCurrentServings] = useState(recipe?.servings || 2);
  const [copiedIngredients, setCopiedIngredients] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!recipe) return;
    setCurrentServings(recipe.servings || 2);
    // Initialize checked states
    const initIngs: Record<string, boolean> = {};
    (recipe.ingredients || []).forEach(i => { initIngs[i.id] = !!i.checked; });
    setCheckedIngredients(initIngs);

    const initSteps: Record<string, boolean> = {};
    (recipe.instructions || []).forEach(s => { initSteps[s.id] = !!s.completed; });
    setCompletedSteps(initSteps);
  }, [recipe]);

  if (!recipe) return null;

  // Scaler multiplier
  const baseServings = recipe.servings || 2;
  const ratio = currentServings / baseServings;

  const handleToggleIngredient = (id: string) => {
    const next = { ...checkedIngredients, [id]: !checkedIngredients[id] };
    setCheckedIngredients(next);
  };

  const handleToggleStep = (id: string) => {
    const next = { ...completedSteps, [id]: !completedSteps[id] };
    setCompletedSteps(next);
  };

  const handleServingsChange = (delta: number) => {
    const next = Math.max(1, Math.min(24, currentServings + delta));
    setCurrentServings(next);
  };

  const formatAmount = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '';
    const scaled = amount * ratio;
    // Format nicely without ugly decimals like 1.333333
    if (Number.isInteger(scaled)) return scaled.toString();
    return scaled.toFixed(1).replace('.0', '');
  };

  const copyShoppingList = () => {
    const { items } = transformIngredientsToShoppingList(recipe, { servings: currentServings });
    const text = generateShoppingListText(recipe, items, { groupByCategory: true, servings: currentServings });
    navigator.clipboard.writeText(text);
    setCopiedIngredients(true);
    setTimeout(() => setCopiedIngredients(false), 2500);
    onShowToast('success', 'Lista de compras copiada', 'Ingredientes simplificados y organizados para enviar por WhatsApp o notas.');
  };

  const handleSendShoppingWhatsApp = () => {
    const { items } = transformIngredientsToShoppingList(recipe, { servings: currentServings });
    const text = generateShoppingListText(recipe, items, { groupByCategory: true, servings: currentServings });
    sendViaWhatsApp(text);
    onShowToast('info', 'Abriendo WhatsApp', 'Lista de compras lista para enviar.');
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'facebook': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'tiktok': return <Video className="w-4 h-4 text-neutral-900" />;
      default: return <Globe className="w-4 h-4 text-amber-600" />;
    }
  };

  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = recipe.instructions.length > 0
    ? Math.round((completedStepsCount / recipe.instructions.length) * 100)
    : 0;

  return (
    <div 
      id="recipe-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="recipe-detail-modal-card"
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <button
          id="btn-close-detail-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white backdrop-blur-md transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {/* Header Image with Info Overlay */}
          <div className="relative aspect-video sm:aspect-21/9 w-full bg-stone-900 overflow-hidden">
            <img
              src={recipe.imageUrl || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&auto=format&fit=crop&q=80'}
              alt={recipe.title}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-stone-900 shadow-sm capitalize">
                  {getPlatformIcon(recipe.sourcePlatform)}
                  <span>{recipe.sourcePlatform}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/90 text-white backdrop-blur-xs">
                  {recipe.category}
                </span>
                {recipe.difficulty && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs">
                    {recipe.difficulty}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif leading-tight">
                {recipe.title}
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {recipe.author ? (
                  <p className="text-xs sm:text-sm text-stone-300">
                    Creador / Canal: <span className="font-semibold text-white">{recipe.author}</span>
                  </p>
                ) : <div />}

                <div className="flex items-center gap-2">
                  {onOpenShareHtml && (
                    <button
                      id="btn-share-html-hero"
                      type="button"
                      onClick={() => onOpenShareHtml(recipe)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-semibold text-xs backdrop-blur-md transition-all border border-amber-400/40 shadow-md active:scale-95"
                      title="Compartir receta con video en formato HTML interactivo"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compartir HTML</span>
                    </button>
                  )}

                  {onOpenPhotoModal && (
                    <button
                      id="btn-edit-photo-hero"
                      type="button"
                      onClick={() => onOpenPhotoModal(recipe)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-900 text-stone-200 hover:text-white font-semibold text-xs backdrop-blur-md transition-all border border-white/20 shadow-md active:scale-95"
                      title="Corregir o cambiar foto del video"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Corregir foto</span>
                    </button>
                  )}

                  <button
                    id="btn-play-video-hero"
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVideo(recipe);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-xl transition-all duration-150 active:scale-95 group/btn"
                  >
                    <Play className="w-4 h-4 fill-white group-hover/btn:scale-110 transition-transform" />
                    <span>Ver Video Receta</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Body Info Bar */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* Quick Metrics & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-stone-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-stone-500">Tiempo total</span>
                    <span className="font-bold text-stone-900">
                      {recipe.totalTimeMinutes || (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || 25} min
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-stone-500">Cocción</span>
                    <span className="font-bold text-stone-900">
                      {recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} min` : 'Variable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Servings Scaler */}
              <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span>Porciones:</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    id="btn-decrease-servings"
                    onClick={() => handleServingsChange(-1)}
                    disabled={currentServings <= 1}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 font-bold transition-colors"
                    title="Reducir porciones"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-stone-900 text-sm">
                    {currentServings}
                  </span>
                  <button
                    id="btn-increase-servings"
                    onClick={() => handleServingsChange(1)}
                    disabled={currentServings >= 24}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 font-bold transition-colors"
                    title="Aumentar porciones"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Description / Notes */}
            {recipe.description && (
              <p className="text-sm text-stone-600 leading-relaxed italic bg-amber-50/60 p-4 rounded-xl border border-amber-200/50">
                "{recipe.description}"
              </p>
            )}

            {/* Ingredients Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-bold text-stone-900 font-serif">
                    Ingredientes
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">
                    {recipe.ingredients.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {onOpenShoppingList && (
                    <button
                      id="btn-open-shopping-modal-from-detail"
                      type="button"
                      onClick={() => onOpenShoppingList(recipe)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
                      title="Abrir lista de compras interactiva para seleccionar y enviar"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Lista de compras</span>
                    </button>
                  )}

                  <button
                    id="btn-send-whatsapp-from-detail"
                    type="button"
                    onClick={handleSendShoppingWhatsApp}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                    title="Enviar ingredientes por WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    id="btn-copy-shopping-list"
                    onClick={copyShoppingList}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200"
                    title="Copiar lista de compras simplificada al portapapeles"
                  >
                    {copiedIngredients ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar lista</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipe.ingredients.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.id];
                  const scaledAmount = formatAmount(ing.amount);

                  return (
                    <div
                      key={ing.id}
                      onClick={() => handleToggleIngredient(ing.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-stone-50 border-stone-200 text-stone-400 line-through'
                          : 'bg-white border-stone-200 hover:border-amber-400 text-stone-800'
                      }`}
                    >
                      <div className="mt-0.5 text-amber-600 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 text-xs sm:text-sm">
                        <span className="font-semibold text-stone-900">
                          {scaledAmount} {ing.unit}
                        </span>{' '}
                        <span>{ing.item}</span>
                        {ing.notes && (
                          <span className="block text-[11px] text-stone-500 font-normal">
                            {ing.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preparation Steps Section */}
            <div className="space-y-4 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-bold text-stone-900 font-serif">
                    Paso a Paso
                  </h3>
                </div>

                {/* Step progress bar indicator */}
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                  <span>Progreso: {progressPercent}%</span>
                  <div className="w-20 sm:w-28 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {recipe.instructions.map((step) => {
                  const isDone = !!completedSteps[step.id];

                  return (
                    <div
                      key={step.id}
                      onClick={() => handleToggleStep(step.id)}
                      className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50/50 border-emerald-200/80 text-stone-500'
                          : 'bg-white border-stone-200 hover:border-stone-300 text-stone-800'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        <span 
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isDone 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4" /> : step.stepNumber}
                        </span>
                      </div>

                      <div className="flex-1 space-y-1">
                        <p className={`text-xs sm:text-sm leading-relaxed ${isDone ? 'line-through opacity-75' : 'text-stone-900'}`}>
                          {step.instruction}
                        </p>
                        {step.tip && (
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-900 text-xs flex items-center gap-1.5 border border-amber-200/50">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Consejo: {step.tip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chef Notes & Tags */}
            {recipe.notes && (
              <div className="p-4 rounded-2xl bg-stone-100 text-stone-700 text-xs sm:text-sm space-y-1">
                <span className="font-bold text-stone-900 block">Notas adicionales:</span>
                <p className="leading-relaxed">{recipe.notes}</p>
              </div>
            )}

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                {recipe.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="btn-open-video-from-footer"
              type="button"
              onClick={() => {
                onClose();
                onOpenVideo(recipe);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ver Video</span>
            </button>

            {recipe.sourceUrl && (
              <a
                id="btn-open-original-source"
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Abrir en {recipe.sourcePlatform}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenShareHtml && (
              <button
                id="btn-share-html-from-detail-footer"
                type="button"
                onClick={() => onOpenShareHtml(recipe)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100/90 hover:bg-amber-200 rounded-xl border border-amber-300 transition-colors"
                title="Compartir receta con video en formato HTML interactivo"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-700" />
                <span>Compartir HTML</span>
              </button>
            )}

            {onOpenShoppingList && (
              <button
                id="btn-open-shopping-modal-from-detail-footer"
                type="button"
                onClick={() => onOpenShoppingList(recipe)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                title="Lista de compras simplificada"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                <span>Lista compras</span>
              </button>
            )}

            {onOpenPhotoModal && (
              <button
                id="btn-photo-modal-from-detail-footer"
                type="button"
                onClick={() => onOpenPhotoModal(recipe)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
                title="Corregir o cambiar foto"
              >
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                <span>Foto</span>
              </button>
            )}

            <button
              id="btn-edit-recipe-from-detail"
              onClick={() => {
                onClose();
                onOpenEdit(recipe);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Editar</span>
            </button>

            <button
              id="btn-finish-cooking"
              onClick={onClose}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
