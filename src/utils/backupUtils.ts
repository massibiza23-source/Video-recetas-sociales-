import { Recipe, RecipeCategory, PlatformType, Ingredient, RecipeStep } from '../types';

export interface ParseBackupResult {
  success: boolean;
  recipes: Recipe[];
  invalidCount: number;
  error?: string;
  filename?: string;
}

const VALID_CATEGORIES: RecipeCategory[] = [
  'Desayuno',
  'Almuerzo/Cena',
  'Postre',
  'Snack',
  'Bebida',
  'Otros'
];

const VALID_PLATFORMS: PlatformType[] = [
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'web',
  'manual',
  'video_upload'
];

/**
 * Normalizes an raw ingredient from various JSON structures
 */
function normalizeIngredient(raw: any, index: number): Ingredient {
  if (typeof raw === 'string') {
    return {
      id: `ing-${index + 1}`,
      item: raw.trim(),
      amount: null,
      unit: ''
    };
  }

  if (typeof raw === 'object' && raw !== null) {
    return {
      id: raw.id ? String(raw.id) : `ing-${index + 1}`,
      item: String(raw.item || raw.name || raw.ingredient || 'Ingrediente').trim(),
      amount: typeof raw.amount === 'number' ? raw.amount : (raw.amount ? parseFloat(raw.amount) || null : null),
      unit: raw.unit ? String(raw.unit).trim() : '',
      notes: raw.notes ? String(raw.notes).trim() : undefined,
      checked: Boolean(raw.checked)
    };
  }

  return {
    id: `ing-${index + 1}`,
    item: 'Ingrediente',
    amount: null,
    unit: ''
  };
}

/**
 * Normalizes a raw step from various JSON structures
 */
function normalizeStep(raw: any, index: number): RecipeStep {
  if (typeof raw === 'string') {
    return {
      id: `step-${index + 1}`,
      stepNumber: index + 1,
      instruction: raw.trim()
    };
  }

  if (typeof raw === 'object' && raw !== null) {
    return {
      id: raw.id ? String(raw.id) : `step-${index + 1}`,
      stepNumber: typeof raw.stepNumber === 'number' ? raw.stepNumber : index + 1,
      instruction: String(raw.instruction || raw.text || raw.step || raw.description || '').trim(),
      tip: raw.tip ? String(raw.tip).trim() : undefined,
      completed: Boolean(raw.completed)
    };
  }

  return {
    id: `step-${index + 1}`,
    stepNumber: index + 1,
    instruction: ''
  };
}

/**
 * Validates and normalizes a candidate recipe object
 */
export function normalizeRecipe(raw: any, fallbackIndex: number): Recipe | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const title = String(raw.title || raw.name || '').trim();
  if (!title) {
    return null;
  }

  // Category
  let category: Recipe['category'] = 'Otros';
  if (raw.category && VALID_CATEGORIES.includes(raw.category)) {
    category = raw.category;
  }

  // Platform
  let sourcePlatform: PlatformType = 'manual';
  if (raw.sourcePlatform && VALID_PLATFORMS.includes(raw.sourcePlatform)) {
    sourcePlatform = raw.sourcePlatform;
  } else if (raw.platform && VALID_PLATFORMS.includes(raw.platform)) {
    sourcePlatform = raw.platform;
  }

  // Ingredients array
  let ingredients: Ingredient[] = [];
  if (Array.isArray(raw.ingredients)) {
    ingredients = raw.ingredients.map(normalizeIngredient);
  }

  // Instructions array
  let instructions: RecipeStep[] = [];
  if (Array.isArray(raw.instructions)) {
    instructions = raw.instructions.map(normalizeStep);
  } else if (Array.isArray(raw.steps)) {
    instructions = raw.steps.map(normalizeStep);
  }

  // Servings
  let servings = 4;
  if (typeof raw.servings === 'number' && raw.servings > 0) {
    servings = Math.round(raw.servings);
  } else if (raw.servings && !isNaN(parseInt(raw.servings, 10))) {
    servings = parseInt(raw.servings, 10);
  }

  const id = raw.id ? String(raw.id) : `backup-recipe-${Date.now()}-${fallbackIndex}`;

  return {
    id,
    title,
    description: raw.description ? String(raw.description).trim() : '',
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl).trim() : '',
    sourcePlatform,
    videoUrl: raw.videoUrl ? String(raw.videoUrl).trim() : undefined,
    author: raw.author ? String(raw.author).trim() : undefined,
    prepTimeMinutes: typeof raw.prepTimeMinutes === 'number' ? raw.prepTimeMinutes : undefined,
    cookTimeMinutes: typeof raw.cookTimeMinutes === 'number' ? raw.cookTimeMinutes : undefined,
    totalTimeMinutes: typeof raw.totalTimeMinutes === 'number' ? raw.totalTimeMinutes : undefined,
    servings,
    category,
    difficulty: raw.difficulty || 'Media',
    ingredients,
    instructions,
    imageUrl: raw.imageUrl ? String(raw.imageUrl).trim() : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    notes: raw.notes ? String(raw.notes).trim() : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined
  };
}

/**
 * Parses and validates raw JSON text from a backup file or pasted text
 */
export function parseBackupJson(jsonString: string): ParseBackupResult {
  if (!jsonString || !jsonString.trim()) {
    return {
      success: false,
      recipes: [],
      invalidCount: 0,
      error: 'El texto o archivo está vacío.'
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      success: false,
      recipes: [],
      invalidCount: 0,
      error: `Error de sintaxis JSON: ${err?.message || 'Formato no válido'}`
    };
  }

  // Determine where recipes array is
  let rawList: any[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.recipes)) {
      rawList = parsed.recipes;
    } else if (Array.isArray(parsed.data)) {
      rawList = parsed.data;
    } else if (Array.isArray(parsed.items)) {
      rawList = parsed.items;
    } else if (parsed.title) {
      // Single recipe object
      rawList = [parsed];
    } else {
      return {
        success: false,
        recipes: [],
        invalidCount: 0,
        error: 'El archivo JSON no contiene una lista de recetas reconocible.'
      };
    }
  } else {
    return {
      success: false,
      recipes: [],
      invalidCount: 0,
      error: 'Estructura JSON no reconocida.'
    };
  }

  const validRecipes: Recipe[] = [];
  let invalidCount = 0;

  rawList.forEach((item, index) => {
    const rec = normalizeRecipe(item, index);
    if (rec) {
      validRecipes.push(rec);
    } else {
      invalidCount++;
    }
  });

  if (validRecipes.length === 0) {
    return {
      success: false,
      recipes: [],
      invalidCount,
      error: 'No se encontraron recetas válidas en el archivo (se requiere al menos el título de cada receta).'
    };
  }

  return {
    success: true,
    recipes: validRecipes,
    invalidCount
  };
}
