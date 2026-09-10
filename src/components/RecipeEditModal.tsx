import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  ChefHat, 
  Clock, 
  Users, 
  Sparkles,
  Link,
  Image as ImageIcon,
  Upload,
  Camera,
  Video
} from 'lucide-react';
import { Recipe, Ingredient, RecipeStep, PlatformType, RecipeCategory, RecipeDifficulty } from '../types';
import { extractYouTubeId } from '../utils/videoUtils';

interface Props {
  isOpen: boolean;
  initialRecipe?: Partial<Recipe> | null;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

const PRESET_FOOD_IMAGES = [
  { label: 'Pasta', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&auto=format&fit=crop&q=80' },
  { label: 'Tacos / Carne', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80' },
  { label: 'Postre / Dulce', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80' },
  { label: 'Ensalada / Bowl', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80' },
  { label: 'Desayuno / Toast', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80' },
  { label: 'Bebida / Smoothie', url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80' }
];

export const RecipeEditModal: React.FC<Props> = ({
  isOpen,
  initialRecipe,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.sourceUrl || '');
  const [sourcePlatform, setSourcePlatform] = useState<PlatformType>(initialRecipe?.sourcePlatform || 'manual');
  const [author, setAuthor] = useState(initialRecipe?.author || '');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(initialRecipe?.prepTimeMinutes || 15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(initialRecipe?.cookTimeMinutes || 20);
  const [servings, setServings] = useState(initialRecipe?.servings || 2);
  const [category, setCategory] = useState<RecipeCategory>(initialRecipe?.category || 'Almuerzo/Cena');
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>(initialRecipe?.difficulty || 'Fácil');
  const [imageUrl, setImageUrl] = useState(initialRecipe?.imageUrl || PRESET_FOOD_IMAGES[0].url);
  const [notes, setNotes] = useState(initialRecipe?.notes || '');
  const [tagsStr, setTagsStr] = useState((initialRecipe?.tags || []).join(', '));

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients && initialRecipe.ingredients.length > 0
      ? initialRecipe.ingredients
      : [
          { id: '1', item: 'Ingrediente principal', amount: 200, unit: 'g' },
          { id: '2', item: 'Condimento o salsa', amount: 1, unit: 'cucharada' }
        ]
  );

  const [instructions, setInstructions] = useState<RecipeStep[]>(
    initialRecipe?.instructions && initialRecipe.instructions.length > 0
      ? initialRecipe.instructions
      : [
          { id: '1', stepNumber: 1, instruction: 'Preparar y lavar los ingredientes.' },
          { id: '2', stepNumber: 2, instruction: 'Cocinar a fuego medio según preferencia.' }
        ]
  );

  // Synchronize state whenever modal opens or initialRecipe changes
  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialRecipe?.title || '');
    setDescription(initialRecipe?.description || '');
    setSourceUrl(initialRecipe?.sourceUrl || '');
    setSourcePlatform(initialRecipe?.sourcePlatform || 'manual');
    setAuthor(initialRecipe?.author || '');
    setPrepTimeMinutes(initialRecipe?.prepTimeMinutes || 15);
    setCookTimeMinutes(initialRecipe?.cookTimeMinutes || 20);
    setServings(initialRecipe?.servings || 2);
    setCategory(initialRecipe?.category || 'Almuerzo/Cena');
    setDifficulty(initialRecipe?.difficulty || 'Fácil');
    setImageUrl(initialRecipe?.imageUrl || PRESET_FOOD_IMAGES[0].url);
    setNotes(initialRecipe?.notes || '');
    setTagsStr((initialRecipe?.tags || []).join(', '));

    setIngredients(
      initialRecipe?.ingredients && initialRecipe.ingredients.length > 0
        ? initialRecipe.ingredients
        : [
            { id: '1', item: 'Ingrediente principal', amount: 200, unit: 'g' },
            { id: '2', item: 'Condimento o salsa', amount: 1, unit: 'cucharada' }
          ]
    );

    setInstructions(
      initialRecipe?.instructions && initialRecipe.instructions.length > 0
        ? initialRecipe.instructions
        : [
            { id: '1', stepNumber: 1, instruction: 'Preparar y lavar los ingredientes.' },
            { id: '2', stepNumber: 2, instruction: 'Cocinar a fuego medio según preferencia.' }
          ]
    );
  }, [isOpen, initialRecipe]);

  // Add ingredient row
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: `ing-${Date.now()}`, item: '', amount: null, unit: '' }
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Add step row
  const handleAddStep = () => {
    setInstructions([
      ...instructions,
      { id: `step-${Date.now()}`, stepNumber: instructions.length + 1, instruction: '' }
    ]);
  };

  const handleUpdateStep = (index: number, field: keyof RecipeStep, value: any) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], [field]: value };
    setInstructions(updated);
  };

  const handleRemoveStep = (index: number) => {
    const filtered = instructions.filter((_, i) => i !== index);
    const renumbered = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setInstructions(renumbered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validIngredients = ingredients
      .map(i => ({ ...i, item: i.item.trim() }))
      .filter(i => i.item.length > 0);

    const validInstructions = instructions
      .map(s => ({ ...s, instruction: s.instruction.trim() }))
      .filter(s => s.instruction.length > 0);

    const parsedTags = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const recipe: Recipe = {
      id: initialRecipe?.id || `receta-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      sourceUrl: sourceUrl.trim(),
      sourcePlatform,
      author: author.trim() || undefined,
      prepTimeMinutes: Number(prepTimeMinutes) || 10,
      cookTimeMinutes: Number(cookTimeMinutes) || 15,
      totalTimeMinutes: (Number(prepTimeMinutes) || 10) + (Number(cookTimeMinutes) || 15),
      servings: Number(servings) || 2,
      category: category as any,
      difficulty,
      ingredients: validIngredients.length > 0 ? validIngredients : [{ id: '1', item: 'Ingrediente principal' }],
      instructions: validInstructions.length > 0 ? validInstructions : [{ id: '1', stepNumber: 1, instruction: 'Seguir preparación tradicional.' }],
      imageUrl: imageUrl.trim() || PRESET_FOOD_IMAGES[0].url,
      tags: parsedTags,
      notes: notes.trim(),
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(recipe);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="recipe-edit-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="recipe-edit-modal-card"
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">
                {initialRecipe?.id ? 'Editar Receta' : 'Crear Receta Manual'}
              </h2>
              <p className="text-xs text-stone-500">
                Completa los datos de la receta para organizarla en tu recetario
              </p>
            </div>
          </div>

          <button
            id="btn-close-edit-modal"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label htmlFor="input-edit-title" className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Título de la receta *
              </label>
              <input
                id="input-edit-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Pasta Alfredo Cremosa con Ajo y Parmesano"
                className="w-full p-2.5 text-sm sm:text-base font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="input-edit-desc" className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Breve descripción o resumen
              </label>
              <textarea
                id="input-edit-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Receta rápida explicada en un Reel con pocos ingredientes..."
                className="w-full p-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Source & Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="input-edit-url" className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Enlace de origen (opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    id="input-edit-url"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="select-edit-platform" className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Plataforma
                </label>
                <select
                  id="select-edit-platform"
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value as PlatformType)}
                  className="w-full p-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none capitalize"
                >
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="web">Sitio Web</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            {/* Times, Servings, Category */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <div>
                <label htmlFor="input-edit-prep" className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Prep (min)
                </label>
                <input
                  id="input-edit-prep"
                  type="number"
                  min="0"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                  className="w-full p-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-center font-bold"
                />
              </div>

              <div>
                <label htmlFor="input-edit-cook" className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Cocción (min)
                </label>
                <input
                  id="input-edit-cook"
                  type="number"
                  min="0"
                  value={cookTimeMinutes}
                  onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                  className="w-full p-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-center font-bold"
                />
              </div>

              <div>
                <label htmlFor="input-edit-servings" className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Porciones
                </label>
                <input
                  id="input-edit-servings"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-full p-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-center font-bold"
                />
              </div>

              <div>
                <label htmlFor="select-edit-category" className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Categoría
                </label>
                <select
                  id="select-edit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg font-medium"
                >
                  <option value="Desayuno">Desayuno</option>
                  <option value="Almuerzo/Cena">Almuerzo/Cena</option>
                  <option value="Postre">Postre</option>
                  <option value="Snack">Snack</option>
                  <option value="Bebida">Bebida</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            {/* Image Selector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Foto de la receta
                </label>

                {/* Quick actions: Use Video Thumbnail & Upload */}
                <div className="flex items-center gap-2">
                  {sourceUrl && extractYouTubeId(sourceUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        const ytId = extractYouTubeId(sourceUrl);
                        if (ytId) {
                          setImageUrl(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                      title="Usar la miniatura HD oficial del video de YouTube"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Usar foto del video</span>
                    </button>
                  )}

                  <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            if (res) setImageUrl(res);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Preview & URL Input */}
              <div className="flex gap-3 items-center">
                {imageUrl && (
                  <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-stone-900 border border-stone-300 shrink-0 shadow-xs">
                    <img
                      src={imageUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <input
                  id="input-edit-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL de la imagen (https://...)"
                  className="flex-1 p-2 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Preset images tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-stone-500 font-medium">Sugeridas:</span>
                {PRESET_FOOD_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`px-2 py-0.5 text-[11px] rounded-md border font-medium transition-colors ${
                      imageUrl === preset.url
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Ingredients Section */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Ingredientes ({ingredients.length})
              </h3>
              <button
                id="btn-add-ingredient-row"
                type="button"
                onClick={handleAddIngredient}
                className="px-2.5 py-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir ingrediente</span>
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, index) => (
                <div key={ing.id || index} className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Cant."
                    value={ing.amount !== null && ing.amount !== undefined ? ing.amount : ''}
                    onChange={(e) => handleUpdateIngredient(index, 'amount', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-16 p-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-center"
                  />
                  <input
                    type="text"
                    placeholder="Unidad (g, ml, cda)"
                    value={ing.unit || ''}
                    onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                    className="w-24 p-2 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre del ingrediente (ej: Queso Parmesano)"
                    value={ing.item}
                    onChange={(e) => handleUpdateIngredient(index, 'item', e.target.value)}
                    className="flex-1 p-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    disabled={ingredients.length <= 1}
                    className="p-2 text-stone-400 hover:text-rose-600 disabled:opacity-30 rounded-lg"
                    title="Eliminar fila"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Steps Section */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Paso a paso ({instructions.length})
              </h3>
              <button
                id="btn-add-step-row"
                type="button"
                onClick={handleAddStep}
                className="px-2.5 py-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir paso</span>
              </button>
            </div>

            <div className="space-y-2">
              {instructions.map((step, index) => (
                <div key={step.id || index} className="flex items-start gap-2">
                  <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-stone-500 shrink-0">
                    {step.stepNumber}.
                  </span>
                  <textarea
                    rows={2}
                    required
                    placeholder={`Describe el paso ${step.stepNumber}...`}
                    value={step.instruction}
                    onChange={(e) => handleUpdateStep(index, 'instruction', e.target.value)}
                    className="flex-1 p-2 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    disabled={instructions.length <= 1}
                    className="p-2 text-stone-400 hover:text-rose-600 disabled:opacity-30 rounded-lg"
                    title="Eliminar paso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Tags */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div>
              <label htmlFor="input-edit-tags" className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Etiquetas (separadas por comas)
              </label>
              <input
                id="input-edit-tags"
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Italiana, Rápido, Fin de Semana, Postres"
                className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="input-edit-notes" className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Consejos o notas del chef
              </label>
              <textarea
                id="input-edit-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tips de almacenamiento o advertencias..."
                className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          {/* Submit / Save Bar */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              id="btn-cancel-edit"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-save-recipe-submit"
              type="submit"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Receta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
