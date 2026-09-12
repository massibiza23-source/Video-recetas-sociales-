import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, RecipeCategory, ToastMessage } from './types';
import { initialRecipes } from './data/sampleRecipes';
import { Navbar } from './components/Navbar';
import { UrlExtractorBar } from './components/UrlExtractorBar';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeEditModal } from './components/RecipeEditModal';
import { RecipeVideoModal } from './components/RecipeVideoModal';
import { RecipePhotoModal } from './components/RecipePhotoModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { MobileConnectModal } from './components/MobileConnectModal';
import { InstallAppModal } from './components/InstallAppModal';
import { InstallBanner } from './components/InstallBanner';
import { ImportBackupModal } from './components/ImportBackupModal';
import { ShareInteractiveHtmlModal } from './components/ShareInteractiveHtmlModal';
import { NotificationToast } from './components/NotificationToast';
import { ChefHat, Plus, SearchX, Sparkles, BookOpen, Upload } from 'lucide-react';

const STORAGE_KEY = 'recetas_social_data_v1';

const CATEGORIES: RecipeCategory[] = [
  'Todas',
  'Desayuno',
  'Almuerzo/Cena',
  'Postre',
  'Snack',
  'Bebida',
  'Otros'
];

export default function App() {
  // 1. Persistence State
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved recipes from localStorage:', e);
    }
    return initialRecipes;
  });

  // Mobile connect modal & share target
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [sharedUrlFromMobile, setSharedUrlFromMobile] = useState<string>('');

  // Handle incoming mobile PWA share_target params (?url=... &text=... &title=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      let incomingUrl = params.get('url') || '';

      // If url is not directly passed, scan text and title params (common on Android share sheets)
      if (!incomingUrl || !/^https?:\/\//i.test(incomingUrl)) {
        const textParam = params.get('text') || '';
        const titleParam = params.get('title') || '';
        const combined = `${textParam} ${titleParam}`;
        const match = combined.match(/https?:\/\/[^\s]+/i);
        if (match) {
          incomingUrl = match[0];
        }
      }

      if (incomingUrl) {
        setSharedUrlFromMobile(incomingUrl);
        addToast(
          'info',
          'Enlace recibido desde el móvil',
          'Iniciando extracción automática de la receta...'
        );
        // Clean URL so refresh doesn't trigger again
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Error parsing mobile share parameters:', e);
    }
  }, []);

  // Save on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch (e) {
      console.error('Failed to persist recipes to localStorage:', e);
    }
  }, [recipes]);

  // 2. Filters & Search State
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('Todas');
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Modals State
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [videoRecipe, setVideoRecipe] = useState<Recipe | null>(null);
  const [photoRecipe, setPhotoRecipe] = useState<Recipe | null>(null);
  const [shoppingListRecipe, setShoppingListRecipe] = useState<Recipe | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [shareHtmlRecipe, setShareHtmlRecipe] = useState<Recipe | null>(null);

  // 4. Notifications / Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Recipe Handlers
  const handleRecipeExtracted = (newRecipe: Recipe) => {
    setRecipes(prev => [newRecipe, ...prev]);
    // Optionally open the newly extracted recipe immediately for review
    setDetailRecipe(newRecipe);
  };

  const handleExtractionFailedFallback = (partialData: Partial<Recipe>, message: string) => {
    // Open edit modal pre-filled with whatever was captured
    setEditingRecipe(partialData);
    setIsEditModalOpen(true);
  };

  const handleSaveRecipe = (recipeToSave: Recipe) => {
    setRecipes(prev => {
      const exists = prev.some(r => r.id === recipeToSave.id);
      if (exists) {
        return prev.map(r => r.id === recipeToSave.id ? recipeToSave : r);
      } else {
        return [recipeToSave, ...prev];
      }
    });

    if (detailRecipe && detailRecipe.id === recipeToSave.id) {
      setDetailRecipe(recipeToSave);
    }

    addToast('success', 'Receta guardada', `"${recipeToSave.title}" está en tu lista.`);
  };

  const handleSavePhoto = (recipeId: string, newImageUrl: string) => {
    setRecipes(prev => prev.map(r => {
      if (r.id === recipeId) {
        return { ...r, imageUrl: newImageUrl, updatedAt: new Date().toISOString() };
      }
      return r;
    }));

    if (detailRecipe && detailRecipe.id === recipeId) {
      setDetailRecipe(prev => prev ? { ...prev, imageUrl: newImageUrl, updatedAt: new Date().toISOString() } : null);
    }

    if (videoRecipe && videoRecipe.id === recipeId) {
      setVideoRecipe(prev => prev ? { ...prev, imageUrl: newImageUrl, updatedAt: new Date().toISOString() } : null);
    }

    addToast('success', 'Foto de receta actualizada', 'Se ha guardado la nueva imagen.');
  };

  const handleDeleteRecipe = (id: string) => {
    const target = recipes.find(r => r.id === id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (detailRecipe && detailRecipe.id === id) {
      setDetailRecipe(null);
    }
    addToast('info', 'Receta eliminada', target ? `"${target.title}" fue eliminada.` : undefined);
  };

  const handleOpenManualModal = () => {
    setEditingRecipe(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsEditModalOpen(true);
  };

  const handleResetSamples = () => {
    setRecipes(initialRecipes);
    addToast('info', 'Ejemplos restaurados', 'Se cargaron recetas de YouTube, Instagram y Facebook.');
  };

  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipes, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `recetas_social_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addToast('success', 'Copia exportada', 'Archivo JSON generado correctamente.');
    } catch {
      addToast('error', 'Error al exportar', 'No se pudo generar la descarga del JSON.');
    }
  };

  const handleImportRecipes = (importedRecipes: Recipe[], mode: 'merge' | 'replace') => {
    if (!importedRecipes || importedRecipes.length === 0) {
      addToast('warning', 'Sin datos', 'No se encontraron recetas para importar.');
      return;
    }

    if (mode === 'replace') {
      setRecipes(importedRecipes);
      addToast(
        'success',
        'Copia restaurada',
        `Colección reemplazada exitosamente con ${importedRecipes.length} recetas.`
      );
    } else {
      // Merge mode:
      setRecipes(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const updated = [...prev];
        let addedCount = 0;
        let updatedCount = 0;

        importedRecipes.forEach(imported => {
          const existingIdx = updated.findIndex(r => r.id === imported.id);
          if (existingIdx >= 0) {
            updated[existingIdx] = imported;
            updatedCount++;
          } else {
            let finalId = imported.id;
            if (existingIds.has(finalId)) {
              finalId = `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            }
            existingIds.add(finalId);
            updated.unshift({ ...imported, id: finalId });
            addedCount++;
          }
        });

        addToast(
          'success',
          'Importación completada',
          `Se añadieron ${addedCount} recetas nuevas${updatedCount > 0 ? ` y se actualizaron ${updatedCount}` : ''}. Total: ${updated.length} recetas.`
        );
        return updated;
      });
    }
  };

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // 1. Category filter
      if (activeCategory !== 'Todas') {
        if (recipe.category !== activeCategory) return false;
      }

      // 2. Platform filter
      if (activePlatform !== 'all') {
        if (recipe.sourcePlatform !== activePlatform) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = recipe.title.toLowerCase().includes(q);
        const matchesDesc = recipe.description?.toLowerCase().includes(q);
        const matchesAuthor = recipe.author?.toLowerCase().includes(q);
        const matchesTag = recipe.tags?.some(t => t.toLowerCase().includes(q));
        const matchesIngredient = recipe.ingredients?.some(i => i.item.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesTag && !matchesIngredient) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, activeCategory, activePlatform, searchQuery]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification Container */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

      {/* PWA Install Banner */}
      <InstallBanner onOpenInstallModal={() => setIsInstallModalOpen(true)} />

      {/* Top Navbar */}
      <Navbar
        recipeCount={recipes.length}
        onOpenManualModal={handleOpenManualModal}
        onExportJson={handleExportJson}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onResetSamples={handleResetSamples}
        onOpenMobileConnectModal={() => setIsMobileModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* URL Extractor Bar */}
        <UrlExtractorBar
          onRecipeExtracted={handleRecipeExtracted}
          onExtractionFailedFallback={handleExtractionFailedFallback}
          onShowToast={addToast}
          onOpenMobileConnectModal={() => setIsMobileModalOpen(true)}
          sharedUrl={sharedUrlFromMobile}
        />

        {/* Filters and List Section */}
        <section id="recipe-list-section" aria-label="Colección de recetas guardadas" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>Mis Recetas Guardadas</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-500">
                Tu recetario centralizado de redes sociales listo para cocinar
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <CategoryFilterBar
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            activePlatform={activePlatform}
            onSelectPlatform={setActivePlatform}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalVisible={filteredRecipes.length}
          />

          {/* Recipe Grid */}
          {filteredRecipes.length > 0 ? (
            <div 
              id="recipes-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
            >
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onOpenDetail={setDetailRecipe}
                  onOpenVideo={setVideoRecipe}
                  onOpenEdit={handleOpenEditModal}
                  onOpenPhotoModal={setPhotoRecipe}
                  onOpenShoppingList={setShoppingListRecipe}
                  onOpenShareHtml={setShareHtmlRecipe}
                  onDelete={handleDeleteRecipe}
                  onShowToast={addToast}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div 
              id="empty-recipes-state"
              className="p-10 sm:p-14 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-4 max-w-md mx-auto my-6"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <SearchX className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  No se encontraron recetas
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {searchQuery || activeCategory !== 'Todas' || activePlatform !== 'all'
                    ? 'Intenta ajustar los filtros de búsqueda o categoría.'
                    : 'Pega un enlace de Instagram, YouTube o Facebook en el extractor superior.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {(searchQuery || activeCategory !== 'Todas' || activePlatform !== 'all') && (
                  <button
                    id="btn-reset-filters"
                    onClick={() => {
                      setActiveCategory('Todas');
                      setActivePlatform('all');
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Restablecer filtros
                  </button>
                )}

                <button
                  id="btn-empty-import-json"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-700" />
                  <span>Importar backup JSON</span>
                </button>

                <button
                  id="btn-empty-create-manual"
                  onClick={handleOpenManualModal}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear manual</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-stone-800">Recetas Social</span>
            <span>— Prototipo Móvil-Friendly</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Compatible con Reels de Instagram, Shorts/Videos de YouTube y Publicaciones de Facebook.
          </p>
        </div>
      </footer>

      {/* Dedicated Screen / Modal to Watch Recipe Video */}
      {videoRecipe && (
        <RecipeVideoModal
          isOpen={!!videoRecipe}
          recipe={videoRecipe}
          onClose={() => setVideoRecipe(null)}
          onOpenEdit={handleOpenEditModal}
          onOpenPhotoModal={setPhotoRecipe}
          onOpenShoppingList={setShoppingListRecipe}
          onOpenShareHtml={setShareHtmlRecipe}
          onUpdateRecipe={handleSaveRecipe}
          onShowToast={addToast}
        />
      )}

      {/* Detail Modal with Portions Scaler & Cooking Mode */}
      {detailRecipe && (
        <RecipeDetailModal
          recipe={detailRecipe}
          onClose={() => setDetailRecipe(null)}
          onOpenVideo={setVideoRecipe}
          onOpenEdit={handleOpenEditModal}
          onOpenPhotoModal={setPhotoRecipe}
          onOpenShoppingList={setShoppingListRecipe}
          onOpenShareHtml={setShareHtmlRecipe}
          onUpdateRecipe={handleSaveRecipe}
          onShowToast={addToast}
        />
      )}

      {/* Shopping List Modal (Interactive, Scalable, Copy & Send via WhatsApp/Share/Email) */}
      {shoppingListRecipe && (
        <ShoppingListModal
          isOpen={!!shoppingListRecipe}
          recipe={shoppingListRecipe}
          onClose={() => setShoppingListRecipe(null)}
          onShowToast={addToast}
        />
      )}

      {/* Edit / Create Manual Modal */}
      {isEditModalOpen && (
        <RecipeEditModal
          isOpen={isEditModalOpen}
          initialRecipe={editingRecipe}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecipe(null);
          }}
          onSave={handleSaveRecipe}
        />
      )}

      {/* Photo Correction Modal ("Corregir foto de video") */}
      {photoRecipe && (
        <RecipePhotoModal
          isOpen={!!photoRecipe}
          recipe={photoRecipe}
          onClose={() => setPhotoRecipe(null)}
          onSavePhoto={handleSavePhoto}
          onShowToast={addToast}
        />
      )}

      {/* Mobile Connect & Send Videos Modal */}
      <MobileConnectModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onShowToast={addToast}
        onOpenInstallModal={() => {
          setIsMobileModalOpen(false);
          setIsInstallModalOpen(true);
        }}
      />

      {/* PWA Install & Add to Home Screen Modal with Icon Preview */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onShowToast={addToast}
      />

      {/* JSON Backup Import Modal */}
      <ImportBackupModal
        isOpen={isImportModalOpen}
        currentRecipeCount={recipes.length}
        onClose={() => setIsImportModalOpen(false)}
        onImportRecipes={handleImportRecipes}
        onShowToast={addToast}
      />

      {/* Interactive HTML with Embedded Video Sharing Modal */}
      <ShareInteractiveHtmlModal
        isOpen={!!shareHtmlRecipe}
        recipe={shareHtmlRecipe}
        onClose={() => setShareHtmlRecipe(null)}
        onShowToast={addToast}
      />
    </div>
  );
}
