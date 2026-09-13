import React from 'react';
import { Search, Filter, Youtube, Instagram, Facebook, Video, Globe, PenTool, X } from 'lucide-react';
import { PlatformType, RecipeCategory } from '../types';

interface Props {
  categories: RecipeCategory[];
  activeCategory: RecipeCategory;
  onSelectCategory: (cat: RecipeCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalVisible: number;
}

export const CategoryFilterBar: React.FC<Props> = ({
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  totalVisible
}) => {
  return (
    <div className="space-y-4" id="category-filter-bar">
      {/* Search Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-search-recipes"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título, ingrediente (ej: queso, pollo)..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
          {searchQuery && (
            <button
              id="btn-clear-search"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                id={`btn-category-${cat.toLowerCase().replace('/', '-')}`}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-stone-500 font-medium whitespace-nowrap pl-3 shrink-0">
          Mostrando <span className="font-bold text-stone-800">{totalVisible}</span>
        </div>
      </div>
    </div>
  );
};
