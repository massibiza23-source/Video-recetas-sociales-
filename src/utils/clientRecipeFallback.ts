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
        instruction: 'Preparar y mezclar los ingredientes.',
        completed: false
      });
    }

    if (directIngredients.length === 0) {
      directIngredients.push({
        id: `ing-direct-${Date.now()}-1`,
        item: `Ingredientes para ${resolvedTitle}`,
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
      description: `Receta estructurada a partir del texto proporcionado.`,
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
      tags: [platform.toUpperCase(), 'Importada'],
      notes: cleanText ? `Texto original:\n${cleanText.substring(0, 300)}` : undefined,
      createdAt: new Date().toISOString()
    };
  }

  // If no direct text was provided and AI extraction failed/was bypassed,
  // DO NOT invent ingredients. Return an empty template for manual editing.
  if (!resolvedImageUrl) {
    resolvedImageUrl = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80'; // Default recipe book image
  }

  const timestamp = Date.now();
  const emptyIngredients: Ingredient[] = [
    {
      id: `ing-fallback-${timestamp}-1`,
      item: 'Añade tus ingredientes aquí',
      amount: null,
      unit: '',
      checked: false
    }
  ];

  const emptyInstructions: RecipeStep[] = [
    {
      id: `step-fallback-${timestamp}-1`,
      stepNumber: 1,
      instruction: 'Añade los pasos de preparación aquí',
      completed: false
    }
  ];

  return {
    id: `receta-fallback-${timestamp}`,
    title: resolvedTitle || 'Nueva Receta',
    description: `No se pudieron extraer los ingredientes automáticamente. Añádelos manualmente.`,
    sourceUrl: cleanUrl,
    sourcePlatform: platform,
    author: resolvedAuthor || (platform === 'manual' ? 'Creado por ti' : `${platform.toUpperCase()} Creator`),
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    totalTimeMinutes: 20,
    servings: 2,
    category: 'Almuerzo/Cena',
    difficulty: 'Fácil',
    ingredients: emptyIngredients,
    instructions: emptyInstructions,
    imageUrl: resolvedImageUrl,
    tags: ['Para completar'],
    notes: cleanText ? `Texto original:\n${cleanText.substring(0, 300)}` : undefined,
    createdAt: new Date().toISOString()
  };
}
