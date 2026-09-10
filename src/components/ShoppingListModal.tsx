import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  Share2, 
  MessageCircle, 
  Mail, 
  ShoppingCart, 
  Users, 
  Minus, 
  Plus, 
  CheckSquare, 
  Square, 
  Layers, 
  ListFilter,
  CheckCheck,
  ExternalLink
} from 'lucide-react';
import { Recipe } from '../types';
import {
  ShoppingItem,
  transformIngredientsToShoppingList,
  generateShoppingListText,
  copyToClipboard,
  sendViaWhatsApp,
  sendViaTelegram,
  sendViaEmail,
  shareNative,
  formatItemLine
} from '../utils/shoppingList';

interface Props {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const ShoppingListModal: React.FC<Props> = ({
  isOpen,
  recipe,
  onClose,
  onShowToast
}) => {
  if (!isOpen || !recipe) return null;

  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 2);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // By default all are selected
    return new Set((recipe.ingredients || []).map((_, idx) => recipe.ingredients[idx].id || `ing-${idx}`));
  });
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);

  // Compute transformed shopping list items
  const { items, categories } = useMemo(() => {
    return transformIngredientsToShoppingList(recipe, {
      servings: currentServings,
      selectedIds
    });
  }, [recipe, currentServings, selectedIds]);

  const selectedCount = items.filter(i => i.selected).length;
  const totalCount = items.length;

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map(i => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleServingsChange = (delta: number) => {
    setCurrentServings(prev => Math.max(1, Math.min(30, prev + delta)));
  };

  // Generate output text for sharing
  const formattedText = useMemo(() => {
    return generateShoppingListText(recipe, items, {
      groupByCategory,
      servings: currentServings
    });
  }, [recipe, items, groupByCategory, currentServings]);

  const handleCopy = async () => {
    const success = await copyToClipboard(formattedText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      onShowToast('success', 'Lista de compras copiada', 'Pegala en WhatsApp, tus Notas o donde prefieras.');
    } else {
      onShowToast('error', 'Error al copiar', 'No se pudo acceder al portapapeles.');
    }
  };

  const handleWhatsApp = () => {
    sendViaWhatsApp(formattedText);
    onShowToast('info', 'Abriendo WhatsApp', 'Tu lista está lista para ser enviada.');
  };

  const handleTelegram = () => {
    sendViaTelegram(formattedText);
    onShowToast('info', 'Abriendo Telegram', 'Comparte tu lista en Telegram.');
  };

  const handleEmail = () => {
    sendViaEmail(recipe.title, formattedText);
  };

  const handleNativeShare = async () => {
    const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
    if (hasNativeShare) {
      const shared = await shareNative(recipe.title, formattedText);
      if (shared) {
        onShowToast('success', 'Lista compartida', 'Lista de compras enviada.');
        return;
      }
    }
    // If not supported or cancelled, toggle menu
    setShowShareMenu(!showShareMenu);
  };

  return (
    <div
      id="shopping-list-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="shopping-list-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-start justify-between relative">
          <div className="space-y-1.5 pr-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Lista de Compras Simplificada</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif leading-tight">
              {recipe.title}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100">
              Selecciona los ingredientes que necesitas comprar y compártelos al instante.
            </p>
          </div>

          <button
            id="btn-close-shopping-modal"
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs transition-colors shrink-0"
            aria-label="Cerrar modal de lista de compras"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar: Servings + Category Toggle + Selection */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Servings Scaler */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Porciones:</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                id="btn-shopping-decrease-servings"
                onClick={() => handleServingsChange(-1)}
                disabled={currentServings <= 1}
                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 font-bold transition-colors"
                title="Reducir porciones"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center font-bold text-stone-900 text-xs">
                {currentServings}
              </span>
              <button
                id="btn-shopping-increase-servings"
                onClick={() => handleServingsChange(1)}
                disabled={currentServings >= 30}
                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 font-bold transition-colors"
                title="Aumentar porciones"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grouping Toggle */}
          <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-xl">
            <button
              id="btn-toggle-group-category"
              onClick={() => setGroupByCategory(true)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                groupByCategory
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3 h-3 text-amber-600" />
              <span>Por pasillo</span>
            </button>
            <button
              id="btn-toggle-group-flat"
              onClick={() => setGroupByCategory(false)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                !groupByCategory
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ListFilter className="w-3 h-3 text-amber-600" />
              <span>Simple</span>
            </button>
          </div>

          {/* Select all / Deselect all */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 font-medium">
              {selectedCount} de {totalCount} selec.
            </span>
            {selectedCount < totalCount ? (
              <button
                id="btn-shopping-select-all"
                onClick={handleSelectAll}
                className="text-amber-700 hover:text-amber-800 font-semibold underline text-[11px]"
              >
                Marcar todos
              </button>
            ) : (
              <button
                id="btn-shopping-deselect-all"
                onClick={handleDeselectAll}
                className="text-stone-500 hover:text-stone-700 font-semibold underline text-[11px]"
              >
                Desmarcar todos
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Ingredients Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 max-h-[50vh] scrollbar-thin">
          {groupByCategory ? (
            /* Categorized view */
            categories.map(category => {
              const catSelectedCount = category.items.filter(i => i.selected).length;

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                      <span>{category.emoji}</span>
                      <span>{category.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {catSelectedCount}/{category.items.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(item.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                          item.selected
                            ? 'bg-amber-50/50 border-amber-200 text-stone-900 shadow-xs'
                            : 'bg-stone-50/70 border-stone-200 text-stone-400 line-through opacity-60'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-amber-600">
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4 fill-amber-50 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1 leading-snug">
                          <span className="font-semibold text-stone-900">
                            {item.displayAmount} {item.unit}
                          </span>{' '}
                          <span>{item.simplifiedName}</span>
                          {item.notes && (
                            <span className="block text-[10px] text-stone-500 font-normal no-underline">
                              {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Simple list view */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleToggleItem(item.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                    item.selected
                      ? 'bg-amber-50/50 border-amber-200 text-stone-900 shadow-xs'
                      : 'bg-stone-50/70 border-stone-200 text-stone-400 line-through opacity-60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-amber-600">
                    {item.selected ? (
                      <CheckSquare className="w-4 h-4 fill-amber-50 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 leading-snug">
                    <span className="font-semibold text-stone-900">
                      {item.displayAmount} {item.unit}
                    </span>{' '}
                    <span>{item.simplifiedName}</span>
                    {item.notes && (
                      <span className="block text-[10px] text-stone-500 font-normal no-underline">
                        {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text preview box */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide mb-1.5">
              Vista previa del texto a enviar o copiar:
            </label>
            <pre className="p-3 bg-stone-100 rounded-xl text-stone-700 text-xs font-mono whitespace-pre-wrap max-h-36 overflow-y-auto border border-stone-200 leading-relaxed">
              {formattedText}
            </pre>
          </div>
        </div>

        {/* Footer Actions: Copiar & Enviar */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* WhatsApp Send Button */}
            <button
              id="btn-send-whatsapp"
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all duration-150 active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Enviar por WhatsApp</span>
            </button>

            {/* Native Share or Share Menu */}
            <div className="relative">
              <button
                id="btn-share-native"
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200 shadow-2xs transition-colors"
                title="Compartir lista"
              >
                <Share2 className="w-4 h-4 text-stone-600" />
                <span className="hidden sm:inline">Enviar / Compartir</span>
              </button>

              {showShareMenu && (
                <div 
                  className="absolute bottom-full mb-2 left-0 w-44 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-30 animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    id="btn-send-telegram"
                    type="button"
                    onClick={() => {
                      setShowShareMenu(false);
                      handleTelegram();
                    }}
                    className="w-full px-3 py-2 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left font-medium"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-500" />
                    <span>Telegram</span>
                  </button>

                  <button
                    id="btn-send-email"
                    type="button"
                    onClick={() => {
                      setShowShareMenu(false);
                      handleEmail();
                    }}
                    className="w-full px-3 py-2 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left font-medium"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                    <span>Correo electrónico</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy to Clipboard Button */}
            <button
              id="btn-copy-shopping-list-main"
              type="button"
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all duration-150 active:scale-95 ${
                copied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Copiada al portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar al portapapeles</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
