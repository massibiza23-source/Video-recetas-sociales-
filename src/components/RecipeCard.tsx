import React, { useState } from 'react';
import { 
  Clock, 
  Users, 
  ChefHat, 
  ExternalLink, 
  Youtube, 
  Instagram, 
  Facebook, 
  Video, 
  Globe, 
  PenTool, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Share2,
  CheckCircle,
  Play,
  Camera,
  ShoppingCart,
  FileCode
} from 'lucide-react';
import { Recipe, PlatformType } from '../types';

interface Props {
  recipe: Recipe;
  onOpenDetail: (recipe: Recipe) => void;
  onOpenVideo: (recipe: Recipe) => void;
  onOpenEdit: (recipe: Recipe) => void;
  onOpenPhotoModal?: (recipe: Recipe) => void;
  onOpenShoppingList?: (recipe: Recipe) => void;
  onOpenShareHtml?: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const RecipeCard: React.FC<Props> = ({
  recipe,
  onOpenDetail,
  onOpenVideo,
  onOpenEdit,
  onOpenPhotoModal,
  onOpenShoppingList,
  onOpenShareHtml,
  onDelete,
  onShowToast
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-white" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-white" />;
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5 text-white" />;
      case 'tiktok':
        return <Video className="w-3.5 h-3.5 text-white" />;
      case 'web':
        return <Globe className="w-3.5 h-3.5 text-white" />;
      default:
        return <PenTool className="w-3.5 h-3.5 text-white" />;
    }
  };

  const getPlatformBadgeColor = (platform: PlatformType) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-600';
      case 'instagram':
        return 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500';
      case 'facebook':
        return 'bg-blue-600';
      case 'tiktok':
        return 'bg-stone-900';
      case 'web':
        return 'bg-amber-600';
      default:
        return 'bg-stone-700';
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recipe.sourceUrl) {
      navigator.clipboard.writeText(recipe.sourceUrl);
      onShowToast('success', 'Enlace copiado', 'URL de la publicación copiada al portapapeles.');
    } else {
      onShowToast('info', 'Receta local', 'Esta receta fue creada manualmente.');
    }
    setShowMenu(false);
  };

  const defaultPlaceholderImg = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80';

  return (
    <article 
      id={`recipe-card-${recipe.id}`}
      onClick={() => onOpenDetail(recipe)}
      className="group relative bg-white rounded-2xl border border-stone-200 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Thumbnail with overlay badges */}
      <div className="relative aspect-video w-full bg-stone-100 overflow-hidden">
        <img
          src={imgError || !recipe.imageUrl ? defaultPlaceholderImg : recipe.imageUrl}
          alt={recipe.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent opacity-80" />

        {/* Central Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="w-11 h-11 rounded-full bg-amber-600/90 text-white flex items-center justify-center shadow-lg backdrop-blur-xs group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-200"
            title="Ver video de la receta"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Platform Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span 
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-sm capitalize ${getPlatformBadgeColor(recipe.sourcePlatform)}`}
          >
            {getPlatformIcon(recipe.sourcePlatform)}
            <span>{recipe.sourcePlatform}</span>
          </span>

          {recipe.difficulty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-900/70 text-white backdrop-blur-xs">
              {recipe.difficulty}
            </span>
          )}
        </div>

        {/* Context Menu toggle */}
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              id={`btn-menu-${recipe.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white backdrop-blur-xs transition-colors"
              aria-label="Opciones de receta"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div 
                className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-20 animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  id={`btn-action-video-${recipe.id}`}
                  onClick={() => {
                    setShowMenu(false);
                    onOpenVideo(recipe);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left font-medium"
                >
                  <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <span>Ver video receta</span>
                </button>

                <button
                  id={`btn-action-edit-${recipe.id}`}
                  onClick={() => {
                    setShowMenu(false);
                    onOpenEdit(recipe);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Editar receta</span>
                </button>

                {onOpenPhotoModal && (
                  <button
                    id={`btn-action-photo-${recipe.id}`}
                    onClick={() => {
                      setShowMenu(false);
                      onOpenPhotoModal(recipe);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left font-medium"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-500" />
                    <span>Corregir foto del video</span>
                  </button>
                )}

                {onOpenShoppingList && (
                  <button
                    id={`btn-action-shopping-${recipe.id}`}
                    onClick={() => {
                      setShowMenu(false);
                      onOpenShoppingList(recipe);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left font-medium"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lista de compras</span>
                  </button>
                )}

                {onOpenShareHtml && (
                  <button
                    id={`btn-action-share-html-${recipe.id}`}
                    onClick={() => {
                      setShowMenu(false);
                      onOpenShareHtml(recipe);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100/80 flex items-center gap-2 text-left font-semibold"
                    title="Compartir receta con video en formato HTML interactivo"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-700" />
                    <span>Compartir HTML con video</span>
                  </button>
                )}

                <button
                  id={`btn-action-share-${recipe.id}`}
                  onClick={handleShare}
                  className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>Copiar enlace</span>
                </button>

                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2 text-left"
                    onClick={() => setShowMenu(false)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ver fuente</span>
                  </a>
                )}

                <div className="my-1 border-t border-stone-100" />

                <button
                  id={`btn-action-delete-${recipe.id}`}
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(recipe.id);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-left font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancelar / Eliminar receta</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category tag at bottom of image */}
        <div className="absolute bottom-2.5 left-3">
          <span className="text-[11px] font-semibold text-amber-200 tracking-wide uppercase">
            {recipe.category}
          </span>
        </div>

        {/* Quick photo correction shortcut if image fails to load */}
        {imgError && onOpenPhotoModal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPhotoModal(recipe);
            }}
            className="absolute bottom-2 right-3 z-10 px-2.5 py-1 rounded-lg bg-amber-600/95 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md transition-colors"
            title="Corregir o cambiar foto del video"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Corregir foto</span>
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Recipe Quick Metrics */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-1.5" title="Tiempo total">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{recipe.totalTimeMinutes || (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || 20} min</span>
          </div>

          <div className="flex items-center gap-1.5" title="Porciones">
            <Users className="w-3.5 h-3.5 text-stone-500" />
            <span>{recipe.servings} porc.</span>
          </div>

          {onOpenShoppingList ? (
            <button
              id={`btn-card-shopping-${recipe.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenShoppingList(recipe);
              }}
              className="flex items-center gap-1.5 hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded-lg transition-colors"
              title="Crear lista de compras para esta receta"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium text-stone-700">{recipe.ingredients.length} ingr.</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5" title="Ingredientes">
              <ChefHat className="w-3.5 h-3.5 text-stone-500" />
              <span>{recipe.ingredients.length} ingr.</span>
            </div>
          )}
        </div>

        {/* Card Footer Dual Buttons */}
        <div className="pt-1 grid grid-cols-2 gap-2">
          <button
            id={`btn-view-video-${recipe.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenVideo(recipe);
            }}
            className="py-2 px-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 shadow-xs group/btn"
          >
            <Play className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" />
            <span>Ver Video</span>
          </button>

          <button
            id={`btn-view-detail-${recipe.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(recipe);
            }}
            className="py-2 px-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5"
          >
            <ChefHat className="w-3.5 h-3.5 text-stone-500" />
            <span>Detalles</span>
          </button>
        </div>
      </div>
    </article>
  );
};
