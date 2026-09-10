export type PlatformType = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'web' | 'manual' | 'video_upload';

export type RecipeCategory = 
  | 'Todas'
  | 'Desayuno'
  | 'Almuerzo/Cena'
  | 'Postre'
  | 'Snack'
  | 'Bebida'
  | 'Otros';

export type RecipeDifficulty = 'Fácil' | 'Media' | 'Difícil';

export interface Ingredient {
  id: string;
  item: string;
  amount?: number | null;
  unit?: string;
  notes?: string;
  checked?: boolean; // For cooking mode checklist
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
  tip?: string;
  completed?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  sourceUrl: string;
  sourcePlatform: PlatformType;
  videoUrl?: string;
  author?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings: number;
  category: 'Desayuno' | 'Almuerzo/Cena' | 'Postre' | 'Snack' | 'Bebida' | 'Otros';
  difficulty?: RecipeDifficulty;
  ingredients: Ingredient[];
  instructions: RecipeStep[];
  imageUrl?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExtractionResult {
  success: boolean;
  recipe?: Partial<Recipe>;
  error?: string;
  isProtected?: boolean; // e.g. private Instagram post / login wall
  message?: string;
  extractedFrom?: 'gemini_url' | 'gemini_text' | 'oembed' | 'heuristic_fallback';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}
