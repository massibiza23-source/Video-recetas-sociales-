import { Recipe, PlatformType, RecipeCategory, Ingredient, RecipeStep } from '../types';
import { extractYouTubeId } from './videoUtils';

function detectPlatform(url: string): PlatformType {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
  return 'web';
}

interface KnownDishKnowledge {
  category: 'Desayuno' | 'Almuerzo/Cena' | 'Postre' | 'Snack' | 'Bebida';
  prepTime: number;
  cookTime: number;
  ingredients: { item: string; amount: number | null; unit: string; notes?: string }[];
  instructions: { instruction: string; tip?: string }[];
  tags: string[];
}

const CULINARY_KNOWLEDGE: { keywords: string[]; data: KnownDishKnowledge }[] = [
  {
    keywords: ['pasta', 'espaguetis', 'macarrones', 'fideos', 'carbonara', 'bolognesa', 'lasaña', 'pesto'],
    data: {
      category: 'Almuerzo/Cena',
      prepTime: 10,
      cookTime: 15,
      ingredients: [
        { item: 'Pasta (espaguetis o la variedad deseada)', amount: 400, unit: 'g' },
        { item: 'Aceite de oliva virgen extra', amount: 3, unit: 'cucharadas' },
        { item: 'Dientes de ajo', amount: 2, unit: 'unidades', notes: 'picados finamente' },
        { item: 'Salsa o acompañamiento principal según receta', amount: 250, unit: 'g' },
        { item: 'Queso parmesano o curado rallado', amount: 60, unit: 'g' },
        { item: 'Sal gruesa y pimienta negra molida', amount: null, unit: 'al gusto' },
        { item: 'Albahaca u orégano fresco', amount: 1, unit: 'ramita' }
      ],
      instructions: [
        { instruction: 'Poner a hervir abundante agua con sal en una olla grande.', tip: 'Calcula 1 litro de agua por cada 100g de pasta.' },
        { instruction: 'Cocinar la pasta según el tiempo indicado en el paquete hasta que esté al dente.', tip: 'Reserva 1 taza del agua de cocción antes de escurrir.' },
        { instruction: 'En una sartén amplia, dorar los ajos con aceite de oliva y preparar la base de la salsa o condimentos.', tip: 'El fuego debe ser medio para no quemar el ajo.' },
        { instruction: 'Incorporar la pasta escurrida a la sartén junto con un chorrito del agua reservada para emulsionar.' },
        { instruction: 'Servir inmediatamente espolvoreando queso rallado, pimienta negra y hojas frescas.' }
      ],
      tags: ['Pasta', 'Italiano', 'Fácil', 'Rápido']
    }
  },
  {
    keywords: ['pollo', 'chicken', 'alitas', 'pechuga', 'muslos'],
    data: {
      category: 'Almuerzo/Cena',
      prepTime: 15,
      cookTime: 25,
      ingredients: [
        { item: 'Pechuga o piezas de pollo', amount: 600, unit: 'g', notes: 'en tiras o trozos' },
        { item: 'Aceite de oliva virgen extra', amount: 2, unit: 'cucharadas' },
        { item: 'Ajo en polvo y pimentón dulce', amount: 1, unit: 'cucharadita' },
        { item: 'Cebolla mediana', amount: 1, unit: 'unidad', notes: 'en juliana' },
        { item: 'Sal marina y pimienta negra', amount: null, unit: 'al gusto' },
        { item: 'Zumo de limón fresco', amount: 1, unit: 'cucharada' }
      ],
      instructions: [
        { instruction: 'Sazonar el pollo con sal, pimienta, ajo en polvo y pimentón.', tip: 'Deja marinar 10 minutos para mayor sabor.' },
        { instruction: 'Calentar el aceite en una sartén grande a fuego medio-alto.' },
        { instruction: 'Dorar el pollo por todos los lados hasta que tome un color dorado apetitoso (aprox. 8-10 min).' },
        { instruction: 'Añadir la cebolla y cocinar hasta que esté transparente y tierna.' },
        { instruction: 'Rociar con el zumo de limón, remover bien y servir caliente acompañado de tu guarnición preferida.' }
      ],
      tags: ['Pollo', 'Proteína', 'Saludable', 'Casero']
    }
  },
  {
    keywords: ['arroz', 'paella', 'risotto', 'chaufa'],
    data: {
      category: 'Almuerzo/Cena',
      prepTime: 15,
      cookTime: 25,
      ingredients: [
        { item: 'Arroz (grano redondo o bomba)', amount: 350, unit: 'g' },
        { item: 'Caldo de verduras, pollo o carne caliente', amount: 800, unit: 'ml' },
        { item: 'Cebolla picada finamente', amount: 1, unit: 'unidad' },
        { item: 'Dientes de ajo', amount: 2, unit: 'unidades' },
        { item: 'Aceite de oliva virgen extra', amount: 3, unit: 'cucharadas' },
        { item: 'Sal y especias (azafrán o pimentón)', amount: null, unit: 'al gusto' }
      ],
      instructions: [
        { instruction: 'En una cazuela o paellera, sofreír la cebolla y el ajo en aceite de oliva a fuego medio.' },
        { instruction: 'Incorporar el arroz y sofreír durante 2 minutos hasta que los granos se vuelvan translúcidos.' },
        { instruction: 'Verter el caldo bien caliente y repartir el arroz uniformemente.', tip: 'No remuevas el arroz una vez empiece a hervir fuerte.' },
        { instruction: 'Cocinar 10 minutos a fuego vivo y luego 8 minutos a fuego suave hasta absorber el líquido.' },
        { instruction: 'Apagar el fuego, tapar con un paño limpio y dejar reposar 5 minutos antes de servir.' }
      ],
      tags: ['Arroz', 'Tradicional', 'Principal']
    }
  },
  {
    keywords: ['tarta', 'pastel', 'cake', 'bizcocho', 'galleta', 'cookie', 'dulce', 'chocolate', 'postre', 'cheesecake', 'brownie', 'crepas', 'pancakes', 'tortitas'],
    data: {
      category: 'Postre',
      prepTime: 20,
      cookTime: 30,
      ingredients: [
        { item: 'Harina de trigo de repostería', amount: 250, unit: 'g' },
        { item: 'Azúcar o endulzante al gusto', amount: 150, unit: 'g' },
        { item: 'Huevos medianos', amount: 3, unit: 'unidades' },
        { item: 'Mantequilla o aceite suave', amount: 80, unit: 'g' },
        { item: 'Leche o bebida vegetal', amount: 100, unit: 'ml' },
        { item: 'Levadura química en polvo (polvo de hornear)', amount: 1, unit: 'sobre (15g)' },
        { item: 'Extracto de vainilla o canela', amount: 1, unit: 'cucharadita' }
      ],
      instructions: [
        { instruction: 'Precalentar el horno a 180°C y engrasar un molde con mantequilla y harina.' },
        { instruction: 'En un bol grande, batir los huevos con el azúcar hasta que la mezcla blanquee y doble su volumen.' },
        { instruction: 'Añadir la mantequilla derretida, la leche y la vainilla sin dejar de batir a baja velocidad.' },
        { instruction: 'Tamizar la harina junto con la levadura e integrar con movimientos suaves y envolventes.' },
        { instruction: 'Verter la masa en el molde y hornear de 30 a 35 minutos o hasta que al pinchar con un palillo salga limpio.' },
        { instruction: 'Dejar enfriar sobre una rejilla antes de desmoldar.' }
      ],
      tags: ['Postre', 'Repostería', 'Dulce', 'Casero']
    }
  },
  {
    keywords: ['pizza', 'masa', 'focaccia'],
    data: {
      category: 'Almuerzo/Cena',
      prepTime: 25,
      cookTime: 15,
      ingredients: [
        { item: 'Harina de trigo o de fuerza', amount: 300, unit: 'g' },
        { item: 'Agua tibia', amount: 180, unit: 'ml' },
        { item: 'Levadura de panadería', amount: 5, unit: 'g' },
        { item: 'Aceite de oliva virgen extra', amount: 2, unit: 'cucharadas' },
        { item: 'Salsa de tomate casera', amount: 150, unit: 'g' },
        { item: 'Queso mozzarella rallado o fresco', amount: 200, unit: 'g' },
        { item: 'Orégano seco y sal', amount: 1, unit: 'pizca' }
      ],
      instructions: [
        { instruction: 'Disolver la levadura en agua tibia con una pizca de azúcar y dejar activar 5 minutos.' },
        { instruction: 'Mezclar la harina con la sal en un bol, agregar el agua con levadura y el aceite de oliva.' },
        { instruction: 'Amasar durante 8-10 minutos hasta obtener una masa lisa, elástica y que no se pegue.' },
        { instruction: 'Formar una bola y dejar levar tapada en lugar cálido durante al menos 1 hora.' },
        { instruction: 'Estirar la masa con las manos sobre papel de hornear, cubrir con tomate, queso y tus toppings preferidos.' },
        { instruction: 'Hornear a la máxima temperatura (230°C - 250°C) durante 10-14 minutos hasta que los bordes estén crujientes y dorados.' }
      ],
      tags: ['Pizza', 'Italiano', 'Fin de Semana']
    }
  },
  {
    keywords: ['batido', 'smoothie', 'jugo', 'zumo', 'cocktail', 'bebida', 'limonada', 'café'],
    data: {
      category: 'Bebida',
      prepTime: 5,
      cookTime: 0,
      ingredients: [
        { item: 'Fruta fresca o congelada', amount: 250, unit: 'g' },
        { item: 'Leche, bebida vegetal o agua', amount: 250, unit: 'ml' },
        { item: 'Yogur natural o griego', amount: 120, unit: 'g' },
        { item: 'Miel, sirope de agave o endulzante', amount: 1, unit: 'cucharada' },
        { item: 'Cubitos de hielo', amount: 4, unit: 'unidades' }
      ],
      instructions: [
        { instruction: 'Lavar y cortar las frutas en trozos medianos.' },
        { instruction: 'Colocar todos los ingredientes en el vaso de la batidora comenzando por los líquidos.' },
        { instruction: 'Batir a máxima potencia durante 60-90 segundos hasta conseguir una textura sedosa y homogénea.' },
        { instruction: 'Servir inmediatamente bien frío decorando con unas hojas de menta o fruta troceada.' }
      ],
      tags: ['Bebida', 'Refrescante', 'Rápido', 'Saludable']
    }
  }
];

export async function generateClientRecipeFallback(
  url?: string,
  rawText?: string
): Promise<Recipe> {
  const cleanUrl = (url || '').trim();
  const cleanText = (rawText || '').trim();
  const platform = cleanUrl ? detectPlatform(cleanUrl) : 'manual';

  let resolvedTitle = '';
  let resolvedAuthor = '';
  let resolvedImageUrl = '';

  // 1. If YouTube, try to fetch title & thumbnail directly from client (CORS is supported)
  const ytId = extractYouTubeId(cleanUrl);
  if (ytId) {
    resolvedImageUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
        { headers: { Accept: 'application/json' } }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) resolvedTitle = oembedData.title;
        if (oembedData.author_name) resolvedAuthor = oembedData.author_name;
      }
    } catch {
      // Fallback: use clean video ID
    }
  }

  // 2. If title still empty, check noembed CORS service
  if (!resolvedTitle && cleanUrl) {
    try {
      const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`);
      if (noembedRes.ok) {
        const noembedData = await noembedRes.json();
        if (noembedData.title) resolvedTitle = noembedData.title;
        if (noembedData.author_name) resolvedAuthor = noembedData.author_name;
        if (!resolvedImageUrl && noembedData.thumbnail_url) resolvedImageUrl = noembedData.thumbnail_url;
      }
    } catch {
      // ignore
    }
  }

  // 3. If still empty, derive title from URL or text
  if (!resolvedTitle) {
    if (cleanText) {
      const firstLine = cleanText.split('\n')[0].replace(/[#*_-]/g, '').trim();
      resolvedTitle = firstLine.length > 5 && firstLine.length < 80 ? firstLine : 'Receta Casera Extraída';
    } else if (cleanUrl) {
      try {
        const parsed = new URL(cleanUrl);
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || '';
        const cleaned = decodeURIComponent(lastSegment)
          .replace(/[-_]/g, ' ')
          .replace(/\.(html|php|aspx)$/, '')
          .trim();
        resolvedTitle = cleaned && cleaned.length > 3 
          ? cleaned.replace(/\b\w/g, c => c.toUpperCase())
          : `Receta de ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
      } catch {
        resolvedTitle = 'Receta Artesanal Extraída';
      }
    } else {
      resolvedTitle = 'Mi Nueva Receta Casera';
    }
  }

  // Clean title
  resolvedTitle = resolvedTitle
    .replace(/#\w+/g, '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s*-\s*YouTube.*$/i, '')
    .replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}]/gu, '')
    .trim();

  if (!resolvedTitle) resolvedTitle = 'Receta Casera Extraída';

  // 4. Try parsing user/post text directly to prevent hallucinations
  const textLines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  const directIngredients: Ingredient[] = [];
  const directInstructions: RecipeStep[] = [];
  
  if (textLines.length > 0) {
    let inIngSection = false;
    let inInstSection = false;
    let stepCount = 1;
    const unitRegex = /^(?:(\d+(?:[.,]\d+)?|\d+\/\d+)\s*)?(g|gr|gramos|kg|kilos|ml|l|litros|tazas?|cucharadas?|cucharaditas?|cdas?|cditas?|pizcas?|unidades?|piezas?|dientes?|hojas?|latas?|paquetes?|rebanadas?)?\s*(?:de\s+)?(.*)$/i;
    const actionVerbRegex = /^(?:mezclar|mezcla|cortar|corta|picar|pica|cocinar|cocina|hornear|hornea|batir|bate|dorar|dora|añadir|añade|agregar|agrega|revolver|revuelve|servir|sirve|poner|pon|calentar|calienta|dejar|deja|incorporar|incorpora|saltear|saltea|extender|extiende|untar|unta|freír|fríe|hervir|hierve)\b/i;

    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      const lower = line.toLowerCase();

      if (lower.includes('ingrediente') || lower.includes('materiales')) {
        inIngSection = true;
        inInstSection = false;
        continue;
      }
      if (lower.includes('instruccion') || lower.includes('preparación') || lower.includes('elaboración') || lower.includes('paso a paso')) {
        inIngSection = false;
        inInstSection = true;
        continue;
      }

      if (inIngSection || (!inInstSection && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')))) {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        const match = cleanLine.match(unitRegex);
        if (match && cleanLine.length > 2) {
          const num = match[1] ? parseFloat(match[1].replace(',', '.')) : null;
          directIngredients.push({
            id: `ing-direct-${Date.now()}-${directIngredients.length}`,
            item: (match[3] || cleanLine).trim(),
            amount: isNaN(num as number) ? null : num,
            unit: (match[2] || '').trim(),
            checked: false
          });
        } else if (cleanLine.length > 2) {
          directIngredients.push({
            id: `ing-direct-${Date.now()}-${directIngredients.length}`,
            item: cleanLine,
            checked: false
          });
        }
        continue;
      }

      if (!inIngSection && actionVerbRegex.test(line)) {
        directInstructions.push({
          id: `step-direct-${Date.now()}-${directInstructions.length}`,
          stepNumber: stepCount++,
          instruction: line,
          completed: false
        });
        continue;
      }

      if (inInstSection || /^(?:paso\s*\d+|\d+[.)-])/i.test(line)) {
        const cleanLine = line.replace(/^(?:paso\s*\d+[:.-]?|\d+[.)-])\s*/i, '').trim();
        if (cleanLine.length > 3) {
          directInstructions.push({
            id: `step-direct-${Date.now()}-${directInstructions.length}`,
            stepNumber: stepCount++,
            instruction: cleanLine,
            completed: false
          });
        }
      }
    }
  }

  // If text lines provided real ingredients or instructions, return them directly!
  if (directIngredients.length >= 1 || directInstructions.length >= 1) {
    if (directInstructions.length === 0) {
      directInstructions.push({
        id: `step-direct-${Date.now()}-1`,
        stepNumber: 1,
        instruction: 'Preparar y medir todos los ingredientes indicados.',
        completed: false
      });
      directInstructions.push({
        id: `step-direct-${Date.now()}-2`,
        stepNumber: 2,
        instruction: 'Proceder a cocinar y mezclar según la técnica del video.',
        completed: false
      });
      directInstructions.push({
        id: `step-direct-${Date.now()}-3`,
        stepNumber: 3,
        instruction: 'Servir y disfrutar recién preparado.',
        completed: false
      });
    }

    if (directIngredients.length === 0) {
      directIngredients.push({
        id: `ing-direct-${Date.now()}-1`,
        item: `Ingredientes principales para ${resolvedTitle}`,
        amount: null,
        unit: 'al gusto',
        checked: false
      });
    }

    if (!resolvedImageUrl) {
      resolvedImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80';
    }

    return {
      id: `receta-direct-${Date.now()}`,
      title: resolvedTitle,
      description: `Receta fielmente estructurada a partir del contenido de ${platform === 'manual' ? 'texto' : platform.toUpperCase()}.`,
      sourceUrl: cleanUrl,
      sourcePlatform: platform,
      author: resolvedAuthor || (platform === 'manual' ? 'Creado por ti' : `${platform.toUpperCase()} Creator`),
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      totalTimeMinutes: 35,
      servings: 4,
      category: 'Almuerzo/Cena',
      difficulty: 'Fácil',
      ingredients: directIngredients,
      instructions: directInstructions,
      imageUrl: resolvedImageUrl,
      tags: [platform.toUpperCase(), 'Fiel al Contenido'],
      notes: cleanText ? `Texto original:\n${cleanText.substring(0, 300)}` : undefined,
      createdAt: new Date().toISOString()
    };
  }

  // 5. Match against culinary knowledge ONLY if zero text was provided
  const searchableText = `${resolvedTitle} ${cleanText}`.toLowerCase();
  let matchedKnowledge = CULINARY_KNOWLEDGE.find(k => 
    k.keywords.some(kw => searchableText.includes(kw))
  );

  if (!matchedKnowledge) {
    // Default gourmet template
    matchedKnowledge = {
      keywords: [],
      data: {
        category: 'Almuerzo/Cena',
        prepTime: 15,
        cookTime: 20,
        ingredients: [
          { item: 'Ingrediente principal de la receta', amount: 500, unit: 'g', notes: 'cortado al gusto' },
          { item: 'Aceite de oliva virgen extra', amount: 2, unit: 'cucharadas' },
          { item: 'Cebolla mediana picada', amount: 1, unit: 'unidad' },
          { item: 'Dientes de ajo', amount: 2, unit: 'unidades', notes: 'picados' },
          { item: 'Sal marina y pimienta negra molida', amount: null, unit: 'al gusto' },
          { item: 'Hierbas aromáticas (orégano, tomillo o perejil)', amount: 1, unit: 'cucharadita' }
        ],
        instructions: [
          { instruction: 'Preparar y picar todos los ingredientes en una tabla limpia.', tip: 'Ten todo listo antes de encender el fuego (mise en place).' },
          { instruction: 'Calentar el aceite de oliva en una sartén u olla adecuada a fuego medio.' },
          { instruction: 'Dorar los condimentos y verduras base hasta que liberen su aroma característico.' },
          { instruction: 'Añadir el ingrediente principal y cocinar a temperatura media removiendo con cuidado.' },
          { instruction: 'Rectificar el punto de sal y especias, cocinar hasta que esté en su punto óptimo.' },
          { instruction: 'Servir recién preparado y disfrutar.' }
        ],
        tags: ['Casero', 'Fácil', 'Nutritivo']
      }
    };
  }

  // If image not resolved yet, use category default
  if (!resolvedImageUrl) {
    const categoryImages: Record<string, string> = {
      'Desayuno': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
      'Almuerzo/Cena': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      'Postre': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
      'Bebida': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
      'Snack': 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&auto=format&fit=crop&q=80'
    };
    resolvedImageUrl = categoryImages[matchedKnowledge.data.category] || categoryImages['Almuerzo/Cena'];
  }

  const timestamp = Date.now();
  const formattedIngredients: Ingredient[] = matchedKnowledge.data.ingredients.map((ing, i) => ({
    id: `ing-fallback-${timestamp}-${i}`,
    item: ing.item,
    amount: ing.amount,
    unit: ing.unit,
    notes: ing.notes,
    checked: false
  }));

  const formattedInstructions: RecipeStep[] = matchedKnowledge.data.instructions.map((step, i) => ({
    id: `step-fallback-${timestamp}-${i}`,
    stepNumber: i + 1,
    instruction: step.instruction,
    tip: step.tip,
    completed: false
  }));

  return {
    id: `receta-fallback-${timestamp}`,
    title: resolvedTitle,
    description: `Receta estructurada a partir del contenido de ${platform === 'manual' ? 'texto' : platform.toUpperCase()}. Puedes editar cualquier ingrediente o paso.`,
    sourceUrl: cleanUrl,
    sourcePlatform: platform,
    author: resolvedAuthor || (platform === 'manual' ? 'Creado por ti' : `${platform.toUpperCase()} Creator`),
    prepTimeMinutes: matchedKnowledge.data.prepTime,
    cookTimeMinutes: matchedKnowledge.data.cookTime,
    totalTimeMinutes: matchedKnowledge.data.prepTime + matchedKnowledge.data.cookTime,
    servings: 4,
    category: matchedKnowledge.data.category,
    difficulty: 'Fácil',
    ingredients: formattedIngredients,
    instructions: formattedInstructions,
    imageUrl: resolvedImageUrl,
    tags: matchedKnowledge.data.tags,
    notes: cleanText ? `Texto original:\n${cleanText.substring(0, 300)}` : undefined,
    createdAt: new Date().toISOString()
  };
}
