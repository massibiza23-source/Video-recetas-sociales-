import { Recipe, Ingredient } from '../types';

export interface ShoppingCategoryGroup {
  id: string;
  name: string;
  emoji: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  originalItem: string;
  simplifiedName: string;
  amount?: number | null;
  displayAmount: string;
  unit?: string;
  notes?: string;
  category: string;
  selected: boolean;
}

export interface ShoppingListOptions {
  servings?: number;
  groupByCategory?: boolean;
  selectedIds?: Set<string>;
}

// Category keywords detection for smart grouping
const CATEGORY_KEYWORDS: Record<string, { name: string; emoji: string; keywords: string[] }> = {
  produce: {
    name: 'Frutas y Verduras',
    emoji: '🥬',
    keywords: [
      'cebolla', 'ajo', 'tomate', 'limón', 'limon', 'aguacate', 'palta', 'cilantro', 'perejil',
      'albahaca', 'espinaca', 'lechuga', 'zanahoria', 'papa', 'patata', 'pimiento', 'chile',
      'calabacín', 'calabacin', 'berenjena', 'champiñon', 'seta', 'manzana', 'platano', 'banana',
      'fresa', 'naranja', 'pepino', 'jengibre', 'menta', 'romero', 'tomillo', 'apio', 'puerro',
      'coliflor', 'brocoli', 'brócoli', 'piña', 'mango', 'lima'
    ]
  },
  meat: {
    name: 'Carnes y Pescados',
    emoji: '🥩',
    keywords: [
      'pollo', 'pechuga', 'carne', 'ternera', 'res', 'cerdo', 'panceta', 'bacon', 'jamón',
      'jamon', 'pescado', 'salmón', 'salmon', 'atún', 'atun', 'merluza', 'gambas', 'camarón',
      'camaron', 'marisco', 'huevo', 'huevos', 'salchicha', 'chorizo', 'pavo', 'cordero', 'lomo'
    ]
  },
  dairy: {
    name: 'Lácteos y Refrigerados',
    emoji: '🧀',
    keywords: [
      'leche', 'queso', 'mozzarella', 'parmesano', 'cheddar', 'mantequilla', 'crema', 'nata',
      'yogur', 'yogurt', 'ricotta', 'mascarpone', 'requeijon'
    ]
  },
  grains: {
    name: 'Panadería y Cereales',
    emoji: '🍞',
    keywords: [
      'pan', 'harina', 'arroz', 'pasta', 'espagueti', 'macarrones', 'fideos', 'avena',
      'tortilla', 'tortillas', 'pan rallado', 'levadura', 'masa', 'tostada'
    ]
  },
  pantry: {
    name: 'Despensa y Condimentos',
    emoji: '🧂',
    keywords: [
      'aceite', 'oliva', 'vinagre', 'sal', 'pimienta', 'azúcar', 'azucar', 'miel', 'salsa',
      'soja', 'mostaza', 'mayonesa', 'kétchup', 'ketchup', 'orégano', 'oregano', 'comino',
      'pimentón', 'pimenton', 'curry', 'canela', 'vainilla', 'caldo', 'laurel', 'nuez moscada'
    ]
  },
  canned: {
    name: 'Conservas y Legumbres',
    emoji: '🥫',
    keywords: [
      'garbanzos', 'lentejas', 'frijoles', 'alubias', 'tomate triturado', 'tomate frito',
      'maíz', 'maiz', 'atún en lata', 'guisantes', 'aceitunas', 'alcaparras'
    ]
  }
};

/**
 * Detect the supermarket category of an ingredient based on text
 */
export function detectCategory(text: string): { key: string; name: string; emoji: string } {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [key, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of cat.keywords) {
      const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const regex = new RegExp(`\\b${normalizedKw}`, 'i');
      if (regex.test(normalized)) {
        return { key, name: cat.name, emoji: cat.emoji };
      }
    }
  }

  return { key: 'others', name: 'Otros Ingredientes', emoji: '🛒' };
}

/**
 * Clean and simplify the ingredient title (e.g. removes redundant notes or trims)
 */
export function simplifyIngredientName(item: string): string {
  if (!item) return '';
  let simplified = item.trim();

  // Remove leading numbers or hyphens if accidentally present in item string
  simplified = simplified.replace(/^[\d/.,\s•*-]+/, '').trim();

  // Capitalize first letter
  if (simplified.length > 0) {
    simplified = simplified.charAt(0).toUpperCase() + simplified.slice(1);
  }

  return simplified;
}

/**
 * Formats a scaled amount into a human-readable clean string
 */
export function formatScaledAmount(amount?: number | null, ratio: number = 1): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  const scaled = amount * ratio;

  if (scaled <= 0) return '';

  // Common fraction equivalents
  const tolerance = 0.05;
  const intPart = Math.floor(scaled);
  const frac = scaled - intPart;

  let fracStr = '';
  if (Math.abs(frac - 0.25) < tolerance) fracStr = '1/4';
  else if (Math.abs(frac - 0.33) < tolerance) fracStr = '1/3';
  else if (Math.abs(frac - 0.5) < tolerance) fracStr = '1/2';
  else if (Math.abs(frac - 0.66) < tolerance) fracStr = '2/3';
  else if (Math.abs(frac - 0.75) < tolerance) fracStr = '3/4';

  if (fracStr) {
    return intPart > 0 ? `${intPart} ${fracStr}` : fracStr;
  }

  if (Number.isInteger(scaled)) {
    return scaled.toString();
  }

  return scaled.toFixed(1).replace(/\.0$/, '');
}

/**
 * Transforms recipe ingredients into a structured, simplified shopping list
 */
export function transformIngredientsToShoppingList(
  recipe: Recipe,
  options?: ShoppingListOptions
): {
  items: ShoppingItem[];
  categories: ShoppingCategoryGroup[];
  servings: number;
} {
  const servings = options?.servings || recipe.servings || 2;
  const baseServings = recipe.servings || 2;
  const ratio = servings / baseServings;

  const items: ShoppingItem[] = (recipe.ingredients || []).map((ing, idx) => {
    const simplifiedName = simplifyIngredientName(ing.item);
    const cat = detectCategory(`${ing.item} ${ing.notes || ''}`);
    const displayAmount = formatScaledAmount(ing.amount, ratio);
    const isSelected = options?.selectedIds ? options.selectedIds.has(ing.id || String(idx)) : true;

    return {
      id: ing.id || `ing-${idx}`,
      originalItem: ing.item,
      simplifiedName,
      amount: ing.amount,
      displayAmount,
      unit: ing.unit ? ing.unit.trim() : undefined,
      notes: ing.notes ? ing.notes.trim() : undefined,
      category: cat.key,
      selected: isSelected
    };
  });

  // Group by category
  const groupsMap = new Map<string, ShoppingCategoryGroup>();

  items.forEach(item => {
    const catMeta = CATEGORY_KEYWORDS[item.category] || {
      name: 'Otros Ingredientes',
      emoji: '🛒',
      keywords: []
    };

    if (!groupsMap.has(item.category)) {
      groupsMap.set(item.category, {
        id: item.category,
        name: catMeta.name,
        emoji: catMeta.emoji,
        items: []
      });
    }

    groupsMap.get(item.category)!.items.push(item);
  });

  return {
    items,
    categories: Array.from(groupsMap.values()),
    servings
  };
}

/**
 * Formats a shopping item into a single line string
 */
export function formatItemLine(item: ShoppingItem, style: 'checkbox' | 'bullet' = 'checkbox'): string {
  const prefix = style === 'checkbox' ? '[ ]' : '•';
  const parts: string[] = [];

  if (item.displayAmount) parts.push(item.displayAmount);
  if (item.unit) parts.push(item.unit);
  parts.push(item.simplifiedName);

  if (item.notes) {
    parts.push(`(${item.notes})`);
  }

  return `${prefix} ${parts.join(' ')}`.trim();
}

/**
 * Generates ready-to-share plain text formatted shopping list
 */
export function generateShoppingListText(
  recipe: Recipe,
  items: ShoppingItem[],
  options?: { groupByCategory?: boolean; servings?: number }
): string {
  const servings = options?.servings || recipe.servings || 2;
  const activeItems = items.filter(i => i.selected);

  if (activeItems.length === 0) {
    return `🛒 Lista de compras: ${recipe.title}\n(No hay ingredientes seleccionados)`;
  }

  const lines: string[] = [
    `🛒 Lista de compras: ${recipe.title}`,
    `👥 ${servings} ${servings === 1 ? 'porción' : 'porciones'}`,
    ''
  ];

  if (options?.groupByCategory) {
    // Group active items
    const grouped = new Map<string, ShoppingItem[]>();
    activeItems.forEach(item => {
      if (!grouped.has(item.category)) grouped.set(item.category, []);
      grouped.get(item.category)!.push(item);
    });

    for (const [catKey, groupItems] of grouped.entries()) {
      const catMeta = CATEGORY_KEYWORDS[catKey] || { name: 'Otros', emoji: '🛒' };
      lines.push(`${catMeta.emoji} ${catMeta.name}:`);
      groupItems.forEach(it => {
        lines.push(`  ${formatItemLine(it, 'checkbox')}`);
      });
      lines.push('');
    }
  } else {
    activeItems.forEach(it => {
      lines.push(formatItemLine(it, 'checkbox'));
    });
    lines.push('');
  }

  if (recipe.sourceUrl) {
    lines.push(`🔗 Receta: ${recipe.sourceUrl}`);
  }

  return lines.join('\n').trim();
}

/**
 * Copy text to clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Send or share shopping list via WhatsApp
 */
export function sendViaWhatsApp(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Send or share shopping list via Telegram
 */
export function sendViaTelegram(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = `https://t.me/share/url?url=&text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Send shopping list via Email (mailto)
 */
export function sendViaEmail(title: string, text: string): void {
  const subject = encodeURIComponent(`Lista de compras: ${title}`);
  const body = encodeURIComponent(text);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Share via native Web Share API if supported
 */
export async function shareNative(title: string, text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Lista de compras: ${title}`,
        text
      });
      return true;
    } catch (err: any) {
      // User cancelled share
      if (err.name !== 'AbortError') {
        console.error('Web share error:', err);
      }
      return false;
    }
  }
  return false;
}
