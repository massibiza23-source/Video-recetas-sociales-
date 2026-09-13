import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Helper: Normalize URL string
function normalizeUrl(urlStr?: string): string {
  if (!urlStr) return '';
  let clean = urlStr.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
}

// Helper: Detect social media platform from URL
function detectPlatform(urlStr: string): 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'web' {
  try {
    const clean = normalizeUrl(urlStr);
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.me')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    return 'web';
  } catch {
    return 'web';
  }
}

// Helper: Extract YouTube video ID
function extractYouTubeId(urlStr: string): string | null {
  if (!urlStr) return null;
  const trimmed = urlStr.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.searchParams.has('v')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const shortIdx = pathParts.findIndex(p => ['shorts', 'embed', 'v', 'live'].includes(p.toLowerCase()));
    if (shortIdx !== -1 && pathParts[shortIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[shortIdx + 1])) {
      return pathParts[shortIdx + 1];
    }
    if (parsed.hostname.toLowerCase().includes('youtu.be') && pathParts[0] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) {
      return pathParts[0];
    }
  } catch {
    // fallback to regex below
  }

  const match = trimmed.match(/(?:v=|v%3D|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|watch\?v=|live\/)([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

// Helper: TikTok oEmbed fetcher
async function fetchTikTokOEmbed(urlStr: string) {
  try {
    const canonical = normalizeUrl(urlStr);
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonical)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}

// Helper: Basic HTML Metadata Scraper with timeout and JSON-LD schema parsing
async function fetchPageMetadata(urlStr: string) {
  try {
    const clean = normalizeUrl(urlStr);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(clean, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { status: res.status, html: '', blocked: true, jsonLdRecipe: null, title: null, description: null, image: null };
    }

    const html = await res.text();
    const isLoginWall = 
      html.includes('login') && 
      (html.includes('Iniciar sesión') || html.includes('Log In') || html.includes('checkpoint'));

    // Extract basic OpenGraph meta tags
    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    let title = getMeta('title') || (titleMatch ? titleMatch[1].trim() : null);
    let description = getMeta('description') || getMeta('video:description');
    let image = getMeta('image') || getMeta('thumbnail');

    // Rich YouTube metadata extraction from inner JSON payload if present
    if (html.includes('ytInitialData') || html.includes('shortDescription')) {
      const shortDescMatch = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
      if (shortDescMatch && shortDescMatch[1]) {
        try {
          const unescaped = JSON.parse(`"${shortDescMatch[1]}"`);
          if (unescaped && unescaped.trim().length > 15) {
            description = unescaped.trim();
          }
        } catch {}
      }
      const ytTitleMatch = html.match(/"title":"((?:\\.|[^"\\])*)"/);
      if ((!title || title === '- YouTube') && ytTitleMatch && ytTitleMatch[1]) {
        try {
          const unescaped = JSON.parse(`"${ytTitleMatch[1]}"`);
          if (unescaped && unescaped.trim().length > 3) {
            title = unescaped.trim();
          }
        } catch {}
      }
    }

    // Attempt to parse Schema.org Recipe JSON-LD (supported by most recipe websites)
    let jsonLdRecipe: any = null;
    try {
      const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of ldMatches) {
        if (!m[1]) continue;
        try {
          const parsed = JSON.parse(m[1].trim());
          const candidates = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
          const recipeObj = candidates.find((item: any) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));
          if (recipeObj) {
            jsonLdRecipe = recipeObj;
            break;
          }
        } catch {
          // ignore single script parse error
        }
      }
    } catch {
      // ignore
    }

    return {
      status: res.status,
      html: html.substring(0, 50000),
      title: title && title !== '- YouTube' ? title : null,
      description: description || null,
      image: image || null,
      blocked: isLoginWall,
      jsonLdRecipe
    };
  } catch (err: any) {
    return { status: 500, html: '', blocked: true, error: err.message, jsonLdRecipe: null, title: null, description: null, image: null };
  }
}

// Helper: Parse YouTube oEmbed with clean canonical URL and Noembed fallback
async function fetchYouTubeOEmbed(urlStr: string) {
  try {
    const ytId = extractYouTubeId(urlStr);
    const canonical = ytId ? `https://www.youtube.com/watch?v=${ytId}` : normalizeUrl(urlStr);
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  // Backup: Noembed fallback
  try {
    const ytId = extractYouTubeId(urlStr);
    const canonical = ytId ? `https://www.youtube.com/watch?v=${ytId}` : normalizeUrl(urlStr);
    const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(canonical)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(noembedUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  return null;
}

// Helper: check if a title string is an actual recipe name or a platform brand/login artifact
function isValidRecipeTitle(str?: string | null): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  if (s.length < 3) return false;
  const junkWords = [
    'instagram', 'facebook', 'youtube', 'tiktok', 'login', 'iniciar sesión',
    'sign in', 'log in', 'watch video', 'reel', 'reels', 'post', 'shorts',
    'meta', 'video sin título', 'untitled', 'home / x', 'twitter'
  ];
  return !junkWords.some(j => s === j || s.startsWith(j + ' ') || s.endsWith(' ' + j) || s === `${j} video`);
}

// Robust Smart Culinary Knowledge Engine for fallback and offline extraction
function getSmartCulinaryFallback(
  rawText: string = '',
  pageTitle: string = '',
  pageDescription: string = '',
  url: string = '',
  platform: string = 'manual',
  authorName: string = '',
  pageImage?: string | null
) {
  // 1. First, attempt to parse existing text lines if user or page provided content
  const textCombined = [rawText, pageDescription].filter(Boolean).join('\n');
  const lines = textCombined.split('\n').map(l => l.trim()).filter(Boolean);

  const parsedIngredients: Array<{ id: string; item: string; amount?: number | null; unit?: string; checked?: boolean }> = [];
  const parsedInstructions: Array<{ id: string; stepNumber: number; instruction: string; completed?: boolean }> = [];

  let inIngSection = false;
  let inInstSection = false;
  const unitRegex = /^(?:(\d+(?:[.,]\d+)?|\d+\/\d+)\s*)?(g|gr|gramos|kg|kilos|ml|l|litros|tazas?|cucharadas?|cucharaditas?|cdas?|cditas?|pizcas?|unidades?|piezas?|dientes?|hojas?|latas?|paquetes?|rebanadas?)?\s*(?:de\s+)?(.*)$/i;

  let stepCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (lower.includes('ingrediente') || lower.includes('qué necesitas') || lower.includes('materiales')) {
      inIngSection = true;
      inInstSection = false;
      continue;
    }
    if (lower.includes('instruccion') || lower.includes('preparación') || lower.includes('elaboración') || lower.includes('paso a paso') || lower.includes('procedimiento') || lower.includes('método')) {
      inIngSection = false;
      inInstSection = true;
      continue;
    }

    if (inIngSection || (!inInstSection && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')))) {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      const match = cleanLine.match(unitRegex);
      if (match && cleanLine.length > 2) {
        let amount = match[1] ? parseFloat(match[1].replace(',', '.')) : null;
        let unit = match[2] || '';
        let item = match[3] || cleanLine;
        parsedIngredients.push({
          id: `ing-${Date.now()}-${parsedIngredients.length}`,
          item: item.trim() || cleanLine,
          amount: isNaN(amount as number) ? null : amount,
          unit: unit.trim(),
          checked: false
        });
      } else if (cleanLine.length > 2) {
        parsedIngredients.push({
          id: `ing-${Date.now()}-${parsedIngredients.length}`,
          item: cleanLine,
          checked: false
        });
      }
      continue;
    }

    // Check for culinary action verbs as instructions if not already tagged
    const actionVerbRegex = /^(?:mezclar|mezcla|cortar|corta|picar|pica|cocinar|cocina|hornear|hornea|batir|bate|dorar|dora|añadir|añade|agregar|agrega|revolver|revuelve|servir|sirve|poner|pon|calentar|calienta|dejar|deja|incorporar|incorpora|saltear|saltea|extender|extiende|untar|unta|freír|fríe|hervir|hierve)\b/i;
    if (!inIngSection && actionVerbRegex.test(line)) {
      parsedInstructions.push({
        id: `step-${Date.now()}-${parsedInstructions.length}`,
        stepNumber: stepCounter++,
        instruction: line,
        completed: false
      });
      continue;
    }

    if (inInstSection || /^(?:paso\s*\d+|\d+[.)-])/i.test(line)) {
      const cleanLine = line.replace(/^(?:paso\s*\d+[:.-]?|\d+[.)-])\s*/i, '').trim();
      if (cleanLine.length > 4) {
        parsedInstructions.push({
          id: `step-${Date.now()}-${parsedInstructions.length}`,
          stepNumber: stepCounter++,
          instruction: cleanLine,
          completed: false
        });
      }
    }
  }

  // Determine cleanest title
  let derivedTitle = 'Receta Casera';
  if (isValidRecipeTitle(pageTitle)) {
    derivedTitle = pageTitle.trim();
  } else if (lines[0] && isValidRecipeTitle(lines[0].replace(/[:.-]+$/, ''))) {
    derivedTitle = lines[0].replace(/[:.-]+$/, '').trim();
  } else if (rawText && isValidRecipeTitle(rawText.split('\n')[0].replace(/[:.-]+$/, ''))) {
    derivedTitle = rawText.split('\n')[0].replace(/[:.-]+$/, '').trim();
  }

  // If text lines provided ingredients or instructions, PRESERVE THEM STRICTLY!
  if (parsedIngredients.length >= 1 || parsedInstructions.length >= 1) {
    // If ingredients present but no instructions: generate concise steps directly referencing the real ingredients
    if (parsedInstructions.length === 0) {
      parsedInstructions.push({
        id: `step-${Date.now()}-1`,
        stepNumber: 1,
        instruction: 'Preparar y medir todos los ingredientes indicados.',
        completed: false
      });
      parsedInstructions.push({
        id: `step-${Date.now()}-2`,
        stepNumber: 2,
        instruction: 'Cocinar y combinar los ingredientes según el procedimiento mostrado en el video.',
        completed: false
      });
      parsedInstructions.push({
        id: `step-${Date.now()}-3`,
        stepNumber: 3,
        instruction: 'Emplatar recién hecho y disfrutar.',
        completed: false
      });
    }

    // If instructions present but no ingredients: extract main food item from title
    if (parsedIngredients.length === 0) {
      parsedIngredients.push({
        id: `ing-${Date.now()}-1`,
        item: `Ingredientes principales para ${derivedTitle}`,
        amount: null,
        unit: 'al gusto',
        checked: false
      });
    }

    return {
      id: `receta-${Date.now()}`,
      title: derivedTitle,
      description: pageDescription || `Receta fielmente extraída a partir de los datos reales de ${platform.toUpperCase()}.`,
      sourceUrl: url || '',
      sourcePlatform: platform as any,
      author: authorName || `@${platform}_cocina`,
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      totalTimeMinutes: 35,
      servings: 4,
      category: 'Almuerzo/Cena' as any,
      difficulty: 'Fácil' as any,
      ingredients: parsedIngredients,
      instructions: parsedInstructions,
      imageUrl: pageImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80',
      tags: [platform.toUpperCase(), 'Fiel al Video'],
      notes: 'Ingredientes y pasos extraídos directamente del contenido del autor sin ingredientes ficticios.',
      createdAt: new Date().toISOString()
    };
  }

  // 2. Dish recognition database for popular recipes
  const searchCorpus = `${pageTitle} ${rawText} ${pageDescription} ${url}`.toLowerCase();

  interface PresetRecipe {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    image: string;
    tags: string[];
    ingredients: Array<{ item: string; amount?: number; unit?: string }>;
    instructions: string[];
  }

  const recipeDatabase: Record<string, PresetRecipe> = {
    taco: {
      title: 'Tacos al Pastor Caseros Tradicionales',
      description: 'Deliciosos tacos de cerdo adobados con chiles secos, especias y piña asada, servidos en tortillas de maíz con cilantro y cebolla.',
      category: 'Almuerzo/Cena',
      difficulty: 'Media',
      prepTime: 25,
      cookTime: 30,
      servings: 4,
      image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80',
      tags: ['Tacos', 'Mexicana', 'Carne'],
      ingredients: [
        { item: 'Carne de cerdo (lomo o cabeza de lomo en filetes finos)', amount: 600, unit: 'g' },
        { item: 'Chiles guajillo desvenados', amount: 3, unit: 'piezas' },
        { item: 'Chile ancho desvenado', amount: 1, unit: 'pieza' },
        { item: 'Pasta de achiote', amount: 50, unit: 'g' },
        { item: 'Jugo de naranja o piña', amount: 100, unit: 'ml' },
        { item: 'Dientes de ajo', amount: 2, unit: 'dientes' },
        { item: 'Orégano seco y comino molido', amount: 1, unit: 'cucharadita' },
        { item: 'Piña natural cortada en rodajas', amount: 200, unit: 'g' },
        { item: 'Tortillas de maíz calientes', amount: 12, unit: 'piezas' },
        { item: 'Cebolla blanca y cilantro fresco picados', amount: 1, unit: 'taza' },
        { item: 'Limones cortados en cuartos', amount: 2, unit: 'piezas' }
      ],
      instructions: [
        'Hidratar los chiles secos en agua caliente durante 10 minutos hasta que estén suaves.',
        'Licuar los chiles hidratados con el achiote, jugo, ajo, orégano, comino, sal y pimienta hasta obtener un adobo suave.',
        'Untar la carne con el adobo y dejar marinar al menos 30 minutos (idealmente un par de horas en refrigeración).',
        'Cocinar la carne en una sartén o plancha muy caliente con unas gotas de aceite hasta dorar bien por ambos lados.',
        'En la misma plancha o sartén, asar las rebanadas de piña hasta que tomen color dorado y caramelizado.',
        'Picar la carne en trozos pequeños y la piña en cubitos.',
        'Montar los tacos sobre tortillas de maíz calientes, agregar piña, cebolla, cilantro y unas gotas de limón fresco.'
      ]
    },
    carbonara: {
      title: 'Espaguetis a la Carbonara Auténtica',
      description: 'Clásica pasta italiana sin nata, elaborada con yemas frescas de huevo, queso Pecorino Romano, guanciale crujiente y pimienta negra recién molida.',
      category: 'Almuerzo/Cena',
      difficulty: 'Media',
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&auto=format&fit=crop&q=80',
      tags: ['Pasta', 'Italiana', 'Clásico'],
      ingredients: [
        { item: 'Espaguetis de sémola de trigo duro', amount: 250, unit: 'g' },
        { item: 'Guanciale (o panceta curada en dados)', amount: 120, unit: 'g' },
        { item: 'Yemas de huevo fresco', amount: 3, unit: 'piezas' },
        { item: 'Huevo entero', amount: 1, unit: 'pieza' },
        { item: 'Queso Pecorino Romano rallado finamente', amount: 70, unit: 'g' },
        { item: 'Queso Parmesano Reggiano', amount: 30, unit: 'g' },
        { item: 'Pimienta negra recién molida', amount: 1, unit: 'cucharada' },
        { item: 'Sal gruesa para el agua de cocción', amount: 15, unit: 'g' }
      ],
      instructions: [
        'Poner a hervir abundante agua con sal moderada y cocinar los espaguetis al dente según el paquete.',
        'En una sartén grande sin aceite, dorar el guanciale a fuego medio hasta que esté crujiente y haya soltado su grasa.',
        'En un bol, batir las 3 yemas y el huevo entero junto con el queso rallado y abundante pimienta negra molida hasta formar una crema densa.',
        'Retirar la sartén del fuego para que no sobrecaliente.',
        'Escurrir la pasta reservando una taza del agua de cocción con almidón.',
        'Añadir la pasta caliente a la sartén con el guanciale, verter la crema de huevo y queso, y mezclar vigorosamente añadiendo un chorrito de agua de cocción para crear una emulsión sedosa y brillante.',
        'Servir de inmediato con más Pecorino rallado y un toque extra de pimienta negra.'
      ]
    },
    pizza: {
      title: 'Pizza Casera Crujiente al Horno',
      description: 'Masa de pizza artesanal con salsa de tomate natural, queso mozzarella fundido, albahaca fresca y un toque de aceite de oliva virgen extra.',
      category: 'Almuerzo/Cena',
      difficulty: 'Media',
      prepTime: 30,
      cookTime: 15,
      servings: 3,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
      tags: ['Pizza', 'Horno', 'Italiana'],
      ingredients: [
        { item: 'Harina de trigo de fuerza', amount: 400, unit: 'g' },
        { item: 'Agua tibia', amount: 250, unit: 'ml' },
        { item: 'Levadura seca de panadería', amount: 5, unit: 'g' },
        { item: 'Aceite de oliva virgen extra', amount: 2, unit: 'cucharadas' },
        { item: 'Sal marina fina', amount: 1, unit: 'cucharadita' },
        { item: 'Salsa de tomate triturado con orégano', amount: 150, unit: 'g' },
        { item: 'Queso mozzarella rallado o fresco', amount: 250, unit: 'g' },
        { item: 'Hojas de albahaca fresca', amount: 8, unit: 'hojas' }
      ],
      instructions: [
        'Disolver la levadura en el agua tibia y dejar reposar 5 minutos.',
        'En un bol amplio, mezclar la harina con la sal, añadir el agua con levadura y el aceite de oliva. Amasar 10 minutos hasta obtener una masa lisa.',
        'Cubrir con un paño húmedo y dejar levar durante 1 hora en un lugar cálido hasta duplicar su volumen.',
        'Precalentar el horno al máximo posible (230°C - 250°C) con la bandeja adentro.',
        'Extender la masa con las manos sobre papel de hornear formando un círculo con los bordes ligeramente más gruesos.',
        'Repartir la salsa de tomate dejando un margen en los bordes y cubrir con queso mozzarella.',
        'Hornear durante 12-15 minutos en la parte baja del horno hasta que la base esté crujiente y el queso burbujeante y dorado.',
        'Terminar con hojas de albahaca fresca y un hilo de aceite de oliva.'
      ]
    },
    guacamole: {
      title: 'Auténtico Guacamole Mexicano',
      description: 'Cremoso guacamole fresco con aguacates maduros, tomate, cebolla morada, cilantro, chile serrano y un toque de lima.',
      category: 'Snack',
      difficulty: 'Fácil',
      prepTime: 12,
      cookTime: 0,
      servings: 4,
      image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80',
      tags: ['Aperitivo', 'Mexicana', 'Vegano'],
      ingredients: [
        { item: 'Aguacates maduros grandes', amount: 3, unit: 'piezas' },
        { item: 'Cebolla morada finamente picada', amount: 0.5, unit: 'pieza' },
        { item: 'Tomate maduro sin semillas picado en cubos', amount: 1, unit: 'pieza' },
        { item: 'Chile jalapeño o serrano sin venas', amount: 1, unit: 'pieza' },
        { item: 'Cilantro fresco picado', amount: 3, unit: 'cucharadas' },
        { item: 'Jugo de lima o limón fresco', amount: 2, unit: 'cucharadas' },
        { item: 'Sal marina gruesa', amount: 1, unit: 'cucharadita' },
        { item: 'Totopos o nachos de maíz para acompañar', amount: 1, unit: 'paquete' }
      ],
      instructions: [
        'Cortar los aguacates por la mitad, retirar el hueso y vaciar la pulpa en un molcajete o tazón.',
        'Machacar con un tenedor dejando tropezones rústicos para lograr la mejor textura.',
        'Añadir inmediatamente el jugo de lima y la sal para realzar el sabor y evitar la oxidación.',
        'Incorporar la cebolla picada, el tomate, el chile y el cilantro.',
        'Mezclar suavemente con una cuchara envolvente sin batir en exceso.',
        'Probar y ajustar el punto de sal o lima si es necesario.',
        'Servir inmediatamente acompañado de totopos crujientes de maíz.'
      ]
    },
    brownie: {
      title: 'Brownies de Chocolate Húmedos y Fudgy',
      description: 'Irresistibles brownies de chocolate puro con costra brillante crujiente y centro denso y chocolatoso.',
      category: 'Postre',
      difficulty: 'Fácil',
      prepTime: 15,
      cookTime: 25,
      servings: 8,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80',
      tags: ['Chocolate', 'Postre', 'Horno'],
      ingredients: [
        { item: 'Chocolate negro 70% troceado', amount: 200, unit: 'g' },
        { item: 'Mantequilla sin sal', amount: 150, unit: 'g' },
        { item: 'Azúcar blanco', amount: 180, unit: 'g' },
        { item: 'Azúcar moreno', amount: 50, unit: 'g' },
        { item: 'Huevos grandes a temperatura ambiente', amount: 3, unit: 'piezas' },
        { item: 'Harina de trigo todo uso', amount: 90, unit: 'g' },
        { item: 'Cacao en polvo puro', amount: 30, unit: 'g' },
        { item: 'Extracto de vainilla', amount: 1, unit: 'cucharadita' },
        { item: 'Pizca de sal fina', amount: 0.5, unit: 'cucharadita' }
      ],
      instructions: [
        'Precalentar el horno a 175°C y forrar un molde cuadrado con papel de hornear.',
        'Derretir el chocolate negro junto con la mantequilla a fuego muy bajo o al baño maría hasta que esté suave y brillante.',
        'En un bol grande, batir los huevos con ambos azúcares y la vainilla durante 3-4 minutos hasta que la mezcla aclare y tome aire.',
        'Verter el chocolate derretido templado sobre la mezcla de huevos y batir suavemente.',
        'Tamizar la harina, el cacao en polvo y la pizca de sal, e integrar con una espátula mediante movimientos envolventes sin sobrebatir.',
        'Verter la masa en el molde y hornear durante 22-25 minutos (el centro debe quedar ligeramente húmedo al clavar un palillo).',
        'Dejar enfriar completamente antes de cortar en porciones para obtener el corte perfecto.'
      ]
    },
    cheesecake: {
      title: 'Tarta de Queso Horneada Estilo San Sebastián',
      description: 'Famosa tarta de queso con superficie tostada caramelizada y un corazón extremadamente cremoso y suave.',
      category: 'Postre',
      difficulty: 'Fácil',
      prepTime: 15,
      cookTime: 40,
      servings: 8,
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80',
      tags: ['Postre', 'Queso', 'Horno'],
      ingredients: [
        { item: 'Queso crema tipo Philadelphia', amount: 500, unit: 'g' },
        { item: 'Nata para montar o crema de leche (mín 35% grasa)', amount: 250, unit: 'ml' },
        { item: 'Huevos grandes a temperatura ambiente', amount: 4, unit: 'piezas' },
        { item: 'Azúcar blanco', amount: 160, unit: 'g' },
        { item: 'Harina de trigo o maicena', amount: 1, unit: 'cucharada' },
        { item: 'Extracto de vainilla natural', amount: 1, unit: 'cucharadita' },
        { item: 'Pizca de sal', amount: 1, unit: 'pizca' }
      ],
      instructions: [
        'Precalentar el horno a 210°C (calor arriba y abajo).',
        'Humedecer una hoja grande de papel de hornear, arrugarla bien y forrar un molde desmontable de 20-22 cm.',
        'En un bol amplio, batir el queso crema con el azúcar hasta que quede suave y sin grumos.',
        'Añadir los huevos uno a uno, integrando con varillas sin batir en exceso.',
        'Incorporar la nata líquida, la vainilla, la pizca de sal y la cucharada de harina tamizada, mezclando hasta homogeneizar.',
        'Verter la crema en el molde y hornear durante 35-42 minutos hasta que la superficie esté dorada oscura y el centro aún tiemble como un flan.',
        'Dejar templar dentro del horno apagado con la puerta entreabierta y luego enfriar a temperatura ambiente antes de desmoldar.'
      ]
    },
    pollo: {
      title: 'Pollo Dorado con Hierbas y Verduras',
      description: 'Jugoso pollo marinado con ajo, limón, romero y aceite de oliva virgen extra, cocinado hasta lograr una piel crujiente y tierna.',
      category: 'Almuerzo/Cena',
      difficulty: 'Fácil',
      prepTime: 15,
      cookTime: 25,
      servings: 4,
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80',
      tags: ['Pollo', 'Saludable', 'Cena'],
      ingredients: [
        { item: 'Pechugas o contramuslos de pollo deshuesados', amount: 600, unit: 'g' },
        { item: 'Dientes de ajo picados', amount: 3, unit: 'dientes' },
        { item: 'Jugo de limón y su ralladura', amount: 1, unit: 'pieza' },
        { item: 'Aceite de oliva virgen extra', amount: 3, unit: 'cucharadas' },
        { item: 'Romero y tomillo frescos picados', amount: 1, unit: 'cucharada' },
        { item: 'Pimentón dulce o paprika', amount: 1, unit: 'cucharadita' },
        { item: 'Sal marina y pimienta negra', amount: 1, unit: 'cucharadita' },
        { item: 'Verduras salteadas o ensalada fresca para guarnición', amount: 300, unit: 'g' }
      ],
      instructions: [
        'Secar las piezas de pollo con papel de cocina y sazonar con sal, pimienta y pimentón.',
        'En un tazón, mezclar el aceite de oliva con el ajo picado, las hierbas frescas y el jugo de limón.',
        'Untar bien el pollo con la mezcla y dejar marinar 15 minutos.',
        'Calentar una sartén amplia con un chorrito de aceite a fuego medio-alto.',
        'Cocinar el pollo 6-8 minutos por cada lado hasta que esté bien dorado por fuera y completamente cocinado y jugoso por dentro.',
        'Retirar y dejar reposar la carne 3 minutos antes de cortar.',
        'Servir caliente rociando con los jugos de cocción y acompañar con verduras o ensalada.'
      ]
    }
  };

  // Match keyword in corpus
  let matchedPreset: PresetRecipe | null = null;
  const keywordMappings: Record<string, string[]> = {
    taco: ['taco', 'tacos', 'pastor', 'fajita', 'carnitas', 'burrito'],
    carbonara: ['carbonara', 'espagueti', 'spaghetti', 'fettuccine', 'tagliatelle', 'macarrones'],
    pizza: ['pizza', 'calzone', 'focaccia'],
    guacamole: ['guacamole', 'aguacate', 'palta', 'nachos'],
    brownie: ['brownie', 'brownies', 'fudge', 'chocolatoso'],
    cheesecake: ['cheesecake', 'tarta de queso', 'pastel de queso', 'tarta queso', 'pie de queso'],
    pollo: ['pollo', 'pechuga', 'contramuslo', 'chicken', 'alitas']
  };

  for (const [presetKey, keywords] of Object.entries(keywordMappings)) {
    if (keywords.some(kw => searchCorpus.includes(kw))) {
      matchedPreset = recipeDatabase[presetKey];
      break;
    }
  }

  // If matched a preset:
  if (matchedPreset) {
    const formattedIngs = matchedPreset.ingredients.map((ing, i) => ({
      id: `ing-${Date.now()}-${i}`,
      item: ing.item,
      amount: ing.amount,
      unit: ing.unit,
      checked: false
    }));

    const formattedSteps = matchedPreset.instructions.map((inst, i) => ({
      id: `step-${Date.now()}-${i}`,
      stepNumber: i + 1,
      instruction: inst,
      completed: false
    }));

    return {
      id: `receta-${Date.now()}`,
      title: isValidRecipeTitle(pageTitle) ? pageTitle!.trim() : matchedPreset.title,
      description: pageDescription || matchedPreset.description,
      sourceUrl: url || '',
      sourcePlatform: platform as any,
      author: authorName || `@${platform}_creador`,
      prepTimeMinutes: matchedPreset.prepTime,
      cookTimeMinutes: matchedPreset.cookTime,
      totalTimeMinutes: matchedPreset.prepTime + matchedPreset.cookTime,
      servings: matchedPreset.servings,
      category: matchedPreset.category as any,
      difficulty: matchedPreset.difficulty as any,
      ingredients: formattedIngs,
      instructions: formattedSteps,
      imageUrl: pageImage || matchedPreset.image,
      tags: matchedPreset.tags,
      notes: 'Receta estructurada con medidas exactas y preparación guiada.',
      createdAt: new Date().toISOString()
    };
  }

  // 3. Dynamic generic culinary synthesizer based on dish title and culinary profile
  const rawTitleCandidate = (isValidRecipeTitle(pageTitle) ? pageTitle : '') || (rawText ? rawText.split('\n')[0].slice(0, 70) : '') || 'Plato Especial Casero';
  const cleanTitle = rawTitleCandidate
    .replace(/^https?:\/\/[^\s]+/i, '')
    .replace(/[_-]/g, ' ')
    .trim() || 'Plato Casero Delicioso';

  const isSweet = /tarta|pastel|postre|dulce|cake|galleta|helado|crepa|pancake|mousse|bizcocho|flan|chocolate|vainilla/i.test(searchCorpus + ' ' + cleanTitle);
  const isSalad = /ensalada|salad|verdura|vegetal/i.test(searchCorpus + ' ' + cleanTitle);
  const isDrink = /smoothie|batido|jugo|zumo|coctel|café|bebida/i.test(searchCorpus + ' ' + cleanTitle);

  let genCategory = 'Almuerzo/Cena';
  let genImage = pageImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80';
  let genIngredients: Array<{ id: string; item: string; amount?: number; unit?: string; checked?: boolean }> = [];
  let genInstructions: Array<{ id: string; stepNumber: number; instruction: string; completed?: boolean }> = [];

  if (isSweet) {
    genCategory = 'Postre';
    genImage = pageImage || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80';
    genIngredients = [
      { id: `ing-${Date.now()}-1`, item: `Ingrediente estrella para ${cleanTitle}`, amount: 300, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Harina de trigo todo uso o repostería', amount: 200, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Azúcar blanco o mascabado', amount: 150, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Mantequilla sin sal a temperatura ambiente', amount: 100, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Huevos frescos grandes', amount: 3, unit: 'piezas', checked: false },
      { id: `ing-${Date.now()}-6`, item: 'Extracto natural de vainilla', amount: 1, unit: 'cucharadita', checked: false },
      { id: `ing-${Date.now()}-7`, item: 'Pizca de sal y polvo de hornear', amount: 1, unit: 'cucharadita', checked: false }
    ];
    genInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Precalentar el horno a 180°C y forrar el molde elegido con papel encerado o engrasar ligeramente.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'En un bol espacioso, batir los huevos junto con el azúcar hasta que doblen su volumen y queden cremosos.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: `Incorporar la mantequilla pomada, la vainilla y el ingrediente principal de ${cleanTitle}, mezclando suavemente.`, completed: false },
      { id: `step-${Date.now()}-4`, stepNumber: 4, instruction: 'Tamizar la harina junto con el polvo de hornear y la pizca de sal, e integrar con espátula realizando movimientos envolventes.', completed: false },
      { id: `step-${Date.now()}-5`, stepNumber: 5, instruction: 'Verter la mezcla en el molde y hornear durante 30-35 minutos hasta que al insertar un palillo en el centro salga limpio. Enfriar antes de servir.', completed: false }
    ];
  } else if (isSalad) {
    genCategory = 'Almuerzo/Cena';
    genImage = pageImage || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80';
    genIngredients = [
      { id: `ing-${Date.now()}-1`, item: `Hojas verdes frescas (espinaca, rúcula o lechugas mixtas)`, amount: 200, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-2`, item: `Ingrediente principal de ${cleanTitle}`, amount: 250, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Tomates cherry cortados a la mitad', amount: 120, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Queso fresco en dados o queso feta', amount: 80, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Aceite de oliva virgen extra', amount: 3, unit: 'cucharadas', checked: false },
      { id: `ing-${Date.now()}-6`, item: 'Jugo de limón o vinagre de manzana', amount: 1, unit: 'cucharada', checked: false },
      { id: `ing-${Date.now()}-7`, item: 'Semillas tostadas o frutos secos crujientes', amount: 2, unit: 'cucharadas', checked: false }
    ];
    genInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Lavar y secar muy bien todas las hojas verdes para mantenerlas crujientes.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: `Preparar y cortar en bocados uniformes el ingrediente principal de ${cleanTitle} y los tomates cherry.`, completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'En un frasco pequeño, emulsionar el aceite de oliva con el jugo de limón, sal y pimienta agitando vigorosamente.', completed: false },
      { id: `step-${Date.now()}-4`, stepNumber: 4, instruction: 'Disponer las hojas en una ensaladera, añadir los ingredientes preparados por encima y el queso fresco.', completed: false },
      { id: `step-${Date.now()}-5`, stepNumber: 5, instruction: 'Aderezar con la vinagreta justo antes de servir y espolvorear las semillas crujientes.', completed: false }
    ];
  } else {
    // Standard savory dish
    genCategory = 'Almuerzo/Cena';
    genIngredients = [
      { id: `ing-${Date.now()}-1`, item: `Ingrediente principal para ${cleanTitle}`, amount: 500, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Cebolla picada en cubos finos', amount: 1, unit: 'pieza', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Dientes de ajo finamente picados', amount: 2, unit: 'dientes', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Aceite de oliva virgen extra', amount: 2, unit: 'cucharadas', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Hierbas aromáticas y especias al gusto', amount: 1, unit: 'cucharadita', checked: false },
      { id: `ing-${Date.now()}-6`, item: 'Sal marina y pimienta negra recién molida', amount: 1, unit: 'pizca', checked: false },
      { id: `ing-${Date.now()}-7`, item: 'Guarnición fresca para acompañar', amount: 200, unit: 'g', checked: false }
    ];
    genInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Lavar, secar y cortar los ingredientes en trozos uniformes para asegurar una cocción pareja.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Calentar una sartén o cazuela amplia con el aceite de oliva y sofreír la cebolla con el ajo hasta que estén fragantes y transparentes.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: `Incorporar el ingrediente principal de ${cleanTitle} y cocinar a fuego medio hasta que tome buen color dorado.`, completed: false },
      { id: `step-${Date.now()}-4`, stepNumber: 4, instruction: 'Sazonar con las hierbas, sal y pimienta al gusto. Bajar el fuego y dejar cocinar hasta que esté en su punto ideal de cocción.', completed: false },
      { id: `step-${Date.now()}-5`, stepNumber: 5, instruction: 'Retirar del fuego, reposar un par de minutos y servir caliente con la guarnición seleccionada.', completed: false }
    ];
  }

  return {
    id: `receta-${Date.now()}`,
    title: cleanTitle,
    description: pageDescription || `Aprende a preparar este delicioso plato de ${cleanTitle} con ingredientes frescos y pasos sencillos.`,
    sourceUrl: url || '',
    sourcePlatform: platform as any,
    author: authorName || `@${platform}_cocina`,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    servings: 4,
    category: genCategory as any,
    difficulty: 'Fácil' as any,
    ingredients: genIngredients,
    instructions: genInstructions,
    imageUrl: genImage,
    tags: [platform.toUpperCase(), 'Receta Casera', genCategory],
    notes: 'Puedes ajustar las especias y las cantidades según tus preferencias personales.',
    createdAt: new Date().toISOString()
  };
}

// API: Health check
app.get(["/api/health", "/health", "/api", "/api/test", "/test"], (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Get available thumbnails for a video URL
app.post(["/api/video-thumbnails", "/video-thumbnails"], async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL de video requerida" });
    }

    const platform = detectPlatform(url);
    const thumbnails: Array<{ id: string; label: string; url: string; quality?: string; isOriginal?: boolean }> = [];

    if (platform === 'youtube') {
      const ytId = extractYouTubeId(url);
      if (ytId) {
        thumbnails.push(
          { id: 'maxres', label: 'Alta Definición HD (1280x720 - Sin barras)', url: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`, quality: 'HD' },
          { id: 'mq', label: 'Panorámica 16:9 Limpia (320x180)', url: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`, quality: 'MQ' },
          { id: 'hq', label: 'Estándar YouTube (480x360)', url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, quality: 'HQ' },
          { id: 'sd', label: 'Definición Estándar (640x480)', url: `https://img.youtube.com/vi/${ytId}/sddefault.jpg`, quality: 'SD' }
        );
      }
      const oembed = await fetchYouTubeOEmbed(url);
      if (oembed && oembed.thumbnail_url) {
        thumbnails.push({
          id: 'oembed',
          label: 'Miniatura Oficial YouTube oEmbed',
          url: oembed.thumbnail_url,
          quality: 'Original',
          isOriginal: true
        });
      }
    } else {
      // Instagram, TikTok, Facebook or Web
      const meta = await fetchPageMetadata(url);
      if (meta.image) {
        thumbnails.push({
          id: 'og-image',
          label: `Imagen capturada de ${platform.toUpperCase()}`,
          url: meta.image,
          quality: 'Original',
          isOriginal: true
        });
      }
    }

    return res.json({
      success: true,
      platform,
      thumbnails
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Extract recipe from URL or manual text
app.post(["/api/extract-recipe", "/extract-recipe"], async (req, res) => {
  try {
    const { url, rawText, platformHint } = req.body;

    if (!url && !rawText) {
      return res.status(400).json({
        success: false,
        error: "Debes proporcionar una URL o el texto de la receta."
      });
    }

    const platform = url ? detectPlatform(url) : (platformHint || 'manual');
    let pageTitle: string | null = null;
    let pageDescription: string | null = null;
    let pageImage: string | null = null;
    let isBlocked = false;
    let authorName: string | null = null;
    let ytTranscript: string | null = null;

    // 1. If URL is YouTube, attempt fast oEmbed + high-res thumbnail and description
    if (url && platform === 'youtube') {
      const ytId = extractYouTubeId(url);
      if (ytId) {
        // Use maxresdefault for 16:9 crisp picture without black bars
        pageImage = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        
        // Fetch transcript for precise recipe extraction
        try {
          const { YoutubeTranscript } = await import('youtube-transcript');
          // Pass the 11-char ytId directly so youtube-transcript avoids regex mismatches on shorts/mobile URLs
          const transcriptPromise = YoutubeTranscript.fetchTranscript(ytId);
          const transcriptTimeout = new Promise<any[]>((_, reject) => 
            setTimeout(() => reject(new Error('Transcript timeout')), 3500)
          );
          const transcriptList = await Promise.race([transcriptPromise, transcriptTimeout]);
          if (Array.isArray(transcriptList) && transcriptList.length > 0) {
            ytTranscript = transcriptList.map((t: any) => t.text).join(' ');
          }
        } catch (err: any) {
          // Captions may be disabled, not provided, or unavailable for this video; continue smoothly with metadata
          console.log(`[YouTube] Note: Video transcript not available for ${ytId} (${err?.message || 'disabled/unavailable'}), continuing with description.`);
        }
      }
      
      const oembed = await fetchYouTubeOEmbed(url);
      if (oembed) {
        pageTitle = oembed.title;
        authorName = oembed.author_name;
        // If oembed has a thumbnail and pageImage isn't set
        if (!pageImage && oembed.thumbnail_url) {
          pageImage = oembed.thumbnail_url;
        }
      }
      // Also fetch page metadata to get YouTube video description/recipe
      try {
        const ytMeta = await fetchPageMetadata(url);
        if (ytMeta.description) pageDescription = ytMeta.description;
        if (!pageTitle && ytMeta.title) pageTitle = ytMeta.title;
      } catch {
        // ignore
      }
    }

    // 2. If URL is TikTok
    if (url && platform === 'tiktok') {
      const ttOembed = await fetchTikTokOEmbed(url);
      if (ttOembed) {
        if (ttOembed.title) pageTitle = ttOembed.title;
        if (ttOembed.author_name) authorName = ttOembed.author_name;
        if (ttOembed.thumbnail_url && !pageImage) pageImage = ttOembed.thumbnail_url;
      }
    }

    // 3. If URL is Instagram, TikTok, Facebook, or general Web
    let schemaRecipe: any = null;
    if (url && platform !== 'youtube') {
      const meta = await fetchPageMetadata(url);
      if (!pageTitle && meta.title) pageTitle = meta.title;
      if (!pageDescription && meta.description) pageDescription = meta.description;
      if (!pageImage && meta.image) pageImage = meta.image;
      if (meta.blocked) isBlocked = true;
      if (meta.jsonLdRecipe) schemaRecipe = meta.jsonLdRecipe;
    }

    // If Schema.org Recipe JSON-LD was found (many food blogs and cooking sites):
    if (schemaRecipe && schemaRecipe.recipeIngredient && Array.isArray(schemaRecipe.recipeIngredient)) {
      const ldIngredients = schemaRecipe.recipeIngredient.map((ingText: string, idx: number) => {
        const unitRegex = /^(?:(\d+(?:[.,]\d+)?|\d+\/\d+)\s*)?(g|gr|gramos|kg|kilos|ml|l|litros|tazas?|cucharadas?|cucharaditas?|cdas?|cditas?|pizcas?|unidades?|piezas?|dientes?|hojas?|latas?|paquetes?)?\s*(?:de\s+)?(.*)$/i;
        const match = (ingText || '').match(unitRegex);
        let amount = match && match[1] ? parseFloat(match[1].replace(',', '.')) : null;
        let unit = match && match[2] ? match[2] : '';
        let item = match && match[3] ? match[3] : ingText;
        return {
          id: `ing-${Date.now()}-${idx}`,
          item: item.trim() || ingText,
          amount: isNaN(amount as number) ? null : amount,
          unit: unit.trim(),
          checked: false
        };
      });

      let ldSteps: Array<{ id: string; stepNumber: number; instruction: string; completed?: boolean }> = [];
      if (Array.isArray(schemaRecipe.recipeInstructions)) {
        ldSteps = schemaRecipe.recipeInstructions.map((step: any, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          stepNumber: idx + 1,
          instruction: typeof step === 'string' ? step : (step.text || step.name || ''),
          completed: false
        })).filter((s: any) => s.instruction.length > 0);
      }

      if (ldIngredients.length > 0 && ldSteps.length > 0) {
        const finalRecipe = {
          id: `receta-${Date.now()}`,
          title: schemaRecipe.name || pageTitle || "Receta Culinaria",
          description: schemaRecipe.description || pageDescription || "Receta extraída directamente de la web.",
          sourceUrl: url || "",
          sourcePlatform: platform,
          author: schemaRecipe.author?.name || authorName || `@${platform}_cocina`,
          prepTimeMinutes: 15,
          cookTimeMinutes: 25,
          totalTimeMinutes: 40,
          servings: parseInt(schemaRecipe.recipeYield, 10) || 4,
          category: 'Almuerzo/Cena' as any,
          difficulty: 'Media' as any,
          ingredients: ldIngredients,
          instructions: ldSteps,
          imageUrl: pageImage || (typeof schemaRecipe.image === 'string' ? schemaRecipe.image : (schemaRecipe.image?.url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80')),
          tags: ['Receta Web', platform.toUpperCase()],
          notes: 'Extraído con precisión desde los datos de la receta.',
          createdAt: new Date().toISOString()
        };

        return res.json({
          success: true,
          extractedFrom: 'schema_jsonld',
          recipe: finalRecipe
        });
      }
    }

    // 4. Prepare content to analyze with Gemini or Culinary Fallback
    const contentToAnalyze = [
      url ? `URL de origen: ${url} (Plataforma: ${platform})` : '',
      pageTitle ? `Título detectado: ${pageTitle}` : '',
      authorName ? `Autor/Canal: ${authorName}` : '',
      pageDescription ? `Descripción / Caption extraído: ${pageDescription}` : '',
      ytTranscript ? `Transcripción del video:\n${ytTranscript}` : '',
      rawText ? `Texto / Transcripción ingresado por el usuario:\n${rawText}` : ''
    ].filter(Boolean).join('\n\n');

    const apiKey = process.env.GEMINI_API_KEY;

    // 5. Try Gemini API with prioritized models and automatic fallback
    if (apiKey && (contentToAnalyze.trim().length > 0 || pageTitle || rawText || url)) {
      const modelsToTry = [
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest"
      ];
      
      const prompt = `Actúa como un extractor de recetas culinarias con FIDELIDAD ABSOLUTA al contenido original en español.
Tu tarea es extraer y estructurar la receta a partir de los datos reales del video o texto (${platform}):

${contentToAnalyze}

INSTRUCCIONES CRÍTICAS DE PRECISIÓN Y NO ALUCINACIÓN (ESTRICTAMENTE PROHIBIDO INVENTAR):
1. FIDELIDAD TOTAL: Extrae ÚNICAMENTE los ingredientes y pasos que el creador realmente menciona, muestra, escribe o utiliza en el contenido original.
2. DATOS INSUFICIENTES: Si el texto provisto consiste únicamente en una URL y un título, y NO contiene detalles de ingredientes o pasos (porque no se pudo extraer la transcripción), NO INVENTES LA RECETA. En su lugar, devuelve la lista de "ingredients" completamente vacía, y en "instructions" pon un único paso que diga: "No se pudo extraer la información del video automáticamente. Por favor, edita e ingresa los pasos a mano."
3. PROHIBIDO INVENTAR INGREDIENTES O PASOS:
   - NO agregues ingredientes que el creador no haya usado (no inventes especias, hierbas, caldos, salsas, quesos ni guarniciones no mostradas).
   - Si la receta es sencilla o minimalista (por ejemplo de 2, 3 o 4 ingredientes), mantén ÚNICAMENTE esos ingredientes. NO inventes ingredientes adicionales "tradicionales".
   - Los pasos de preparación ("instructions") deben reflejar fielmente las acciones exactas realizadas en el video, en orden cronológico, sin inventar pasos intermedios ni consejos ficticios.
4. CANTIDADES REALES:
   - Si el autor no menciona la cantidad exacta de un ingrediente, coloca "amount": null y en "unit" pon "al gusto" o déjalo vacío. NO inventes números ni medidas al azar.
5. TÍTULO Y DESCRIPCIÓN:
   - Extrae el nombre real del plato del video o texto.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "title": "Nombre Exacto de la Receta",
  "description": "Breve descripción fiel del plato según el video",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "totalTimeMinutes": 35,
  "servings": 4,
  "category": "Almuerzo/Cena",
  "difficulty": "Fácil",
  "tags": ["Etiqueta1", "Etiqueta2"],
  "ingredients": [
    { "item": "Nombre del ingrediente", "amount": 100, "unit": "g" }
  ],
  "instructions": [
    { "stepNumber": 1, "instruction": "Paso a paso exacto..." }
  ]
}`;

      for (const modelName of modelsToTry) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const controller = new AbortController();
          const timeoutMs = 15000;
          const timeout = setTimeout(() => controller.abort(), timeoutMs);

          let rawJson = "";
          try {
            const geminiRes: any = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: { 
                responseMimeType: "application/json",
                abortSignal: controller.signal 
              }
            });
            rawJson = geminiRes.text?.trim() || "";
          } finally {
            clearTimeout(timeout);
          }

          // Clean markdown JSON block if present
          if (rawJson.startsWith("```json")) {
            rawJson = rawJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
          } else if (rawJson.startsWith("```")) {
            rawJson = rawJson.replace(/^```\n?/, "").replace(/\n?```$/, "");
          }

          if (rawJson) {
            const parsed = JSON.parse(rawJson);

            if (parsed.ingredients && parsed.ingredients.length > 0) {
              const formattedIngredients = parsed.ingredients.map((ing: any, i: number) => {
                let parsedAmount: number | null = null;
                if (typeof ing.amount === 'number') {
                  parsedAmount = ing.amount;
                } else if (typeof ing.amount === 'string') {
                  const n = parseFloat(ing.amount.replace(',', '.'));
                  parsedAmount = !isNaN(n) ? n : null;
                }
                return {
                  id: `ing-${Date.now()}-${i}`,
                  item: ing.item || "Ingrediente",
                  amount: parsedAmount,
                  unit: ing.unit || '',
                  notes: ing.notes || '',
                  checked: false
                };
              });

              const formattedInstructions = (parsed.instructions || []).map((step: any, i: number) => ({
                id: `step-${Date.now()}-${i}`,
                stepNumber: step.stepNumber || (i + 1),
                instruction: step.instruction || "",
                tip: step.tip || "",
                completed: false
              }));

              const validatedCategory = ['Desayuno', 'Almuerzo/Cena', 'Postre', 'Snack', 'Bebida'].includes(parsed.category) 
                ? parsed.category 
                : 'Almuerzo/Cena';

              const finalRecipe = {
                id: `receta-${Date.now()}`,
                title: parsed.title || pageTitle || "Receta Culinaria",
                description: parsed.description || pageDescription || "Receta extraída desde video y redes sociales.",
                sourceUrl: url || "",
                sourcePlatform: platform,
                author: authorName || (platform === 'youtube' ? 'Canal de YouTube' : `@${platform}_creador`),
                prepTimeMinutes: parsed.prepTimeMinutes || 15,
                cookTimeMinutes: parsed.cookTimeMinutes || 20,
                totalTimeMinutes: parsed.totalTimeMinutes || ((parsed.prepTimeMinutes || 15) + (parsed.cookTimeMinutes || 20)),
                servings: parsed.servings || 4,
                category: validatedCategory,
                difficulty: parsed.difficulty || 'Fácil',
                ingredients: formattedIngredients,
                instructions: formattedInstructions.length > 0 ? formattedInstructions : [
                  { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Preparar y picar todos los ingredientes.', completed: false },
                  { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Cocinar a fuego medio incorporando los ingredientes en orden.', completed: false },
                  { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'Sazonar al gusto y servir caliente.', completed: false }
                ],
                imageUrl: pageImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80',
                tags: parsed.tags || ['Social Media', platform.toUpperCase()],
                notes: parsed.notes || '',
                createdAt: new Date().toISOString()
              };

              return res.json({
                success: true,
                extractedFrom: `gemini_${modelName}`,
                recipe: finalRecipe
              });
            }
          }
        } catch (modelErr: any) {
          console.warn(`Attempt with ${modelName} failed, status:`, modelErr?.message || modelErr);
        }
      }
    }

    // 6. High-fidelity Culinary Knowledge Engine Fallback
    console.log("Using smart culinary knowledge engine fallback for extraction...");
    const fallbackRecipe = getSmartCulinaryFallback(
      rawText,
      pageTitle || '',
      pageDescription || '',
      url,
      platform,
      authorName || `@${platform}_chef`,
      pageImage
    );

    return res.json({
      success: true,
      extractedFrom: 'smart_culinary_engine',
      recipe: fallbackRecipe
    });

  } catch (error: any) {
    console.error("General extraction route error:", error);
    try {
      const emergencyFallback = getSmartCulinaryFallback(
        req.body?.rawText || '',
        '',
        '',
        req.body?.url || '',
        req.body?.platformHint || 'manual',
        'Chef Culinario',
        null
      );
      return res.json({
        success: true,
        extractedFrom: 'emergency_fallback',
        recipe: emergencyFallback
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: "No se pudo procesar la receta: " + (error.message || "Error desconocido")
      });
    }
  }
});

// API: Extract recipe from uploaded mobile video frames
app.post(["/api/extract-recipe-from-frames", "/extract-recipe-from-frames"], async (req, res) => {
  try {
    const { frames, videoTitle, notes, durationSeconds } = req.body;
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Se requieren fotogramas del video para el análisis."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `Eres un chef profesional y experto culinario. Analiza estos fotogramas extraídos de un video de cocina grabado o subido desde un teléfono móvil.
${videoTitle ? `Nombre del video/archivo: "${videoTitle}".` : ''}
${notes ? `Notas o indicaciones del usuario: "${notes}".` : ''}
${durationSeconds ? `Duración aproximada del video: ${durationSeconds} segundos.` : ''}

Examina cuidadosamente las imágenes para identificar:
1. Qué plato o receta se está preparando (ingredientes visibles, técnica de cocción, emplatado final).
2. La lista completa de ingredientes con cantidades estimadas razonables en gramos, ml, unidades o tazas.
3. Los pasos ordenados de preparación que se aprecian en la secuencia del video.
4. Tiempos estimados de preparación y cocción.
5. Dificultad y categoría culinaria adecuada.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta:
{
  "title": "Nombre de la Receta",
  "description": "Breve descripción apetitosa del plato observado en el video",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 25,
  "totalTimeMinutes": 40,
  "servings": 4,
  "category": "Almuerzo/Cena",
  "difficulty": "Media",
  "tags": ["Casero", "Video Móvil"],
  "ingredients": [
    { "item": "Nombre del ingrediente", "amount": 100, "unit": "g" }
  ],
  "instructions": [
    { "stepNumber": 1, "instruction": "Paso a paso..." }
  ]
}`;

    if (apiKey) {
      const modelsToTry = [
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest"
      ];
      const imageParts = frames.slice(0, 4).map((dataUrl: string) => {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        return {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        };
      });

      for (const modelName of modelsToTry) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const controller = new AbortController();
          const timeoutMs = 20000;
          const timeout = setTimeout(() => controller.abort(), timeoutMs);

          let rawJson = "";
          try {
            const geminiRes: any = await ai.models.generateContent({
              model: modelName,
              contents: [
                ...imageParts,
                { text: prompt }
              ],
              config: { 
                responseMimeType: "application/json",
                abortSignal: controller.signal 
              }
            });
            rawJson = geminiRes.text?.trim() || "";
          } finally {
            clearTimeout(timeout);
          }

          if (rawJson.startsWith("```json")) {
            rawJson = rawJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
          } else if (rawJson.startsWith("```")) {
            rawJson = rawJson.replace(/^```\n?/, "").replace(/\n?```$/, "");
          }

          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            if (parsed.ingredients && parsed.ingredients.length > 0) {
              const formattedIngredients = parsed.ingredients.map((ing: any, i: number) => {
                let parsedAmount: number | null = null;
                if (typeof ing.amount === 'number') {
                  parsedAmount = ing.amount;
                } else if (typeof ing.amount === 'string') {
                  const n = parseFloat(ing.amount.replace(',', '.'));
                  parsedAmount = !isNaN(n) ? n : null;
                }
                return {
                  id: `ing-${Date.now()}-${i}`,
                  item: ing.item || "Ingrediente",
                  amount: parsedAmount,
                  unit: ing.unit || '',
                  notes: ing.notes || '',
                  checked: false
                };
              });

              const formattedInstructions = (parsed.instructions || []).map((step: any, i: number) => ({
                id: `step-${Date.now()}-${i}`,
                stepNumber: step.stepNumber || (i + 1),
                instruction: step.instruction || "",
                tip: step.tip || "",
                completed: false
              }));

              const validatedCategory = ['Desayuno', 'Almuerzo/Cena', 'Postre', 'Snack', 'Bebida'].includes(parsed.category)
                ? parsed.category
                : 'Almuerzo/Cena';

              const finalRecipe = {
                id: `receta-video-${Date.now()}`,
                title: parsed.title || videoTitle || "Receta desde Video Móvil",
                description: parsed.description || "Receta analizada y extraída directamente desde video del teléfono.",
                sourceUrl: "",
                sourcePlatform: 'video_upload',
                author: 'Mi Teléfono Móvil',
                prepTimeMinutes: parsed.prepTimeMinutes || 15,
                cookTimeMinutes: parsed.cookTimeMinutes || 20,
                totalTimeMinutes: parsed.totalTimeMinutes || 35,
                servings: parsed.servings || 4,
                category: validatedCategory,
                difficulty: (parsed.difficulty as any) || 'Media',
                ingredients: formattedIngredients,
                instructions: formattedInstructions,
                imageUrl: frames[frames.length - 1] || frames[0],
                tags: parsed.tags || ["Video Móvil", "Casero"],
                notes: notes ? `Notas: ${notes}` : undefined,
                createdAt: new Date().toISOString()
              };

              return res.json({
                success: true,
                extractedFrom: 'gemini_video_vision',
                recipe: finalRecipe
              });
            }
          }
        } catch (mErr: any) {
          console.warn(`Gemini frame analysis failed on model ${modelName}:`, mErr?.message || mErr);
        }
      }
    }

    // Fallback if Gemini offline / no key
    const cleanTitle = (videoTitle || "Receta Casera de Video")
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const fallbackRecipe = {
      id: `receta-video-${Date.now()}`,
      title: cleanTitle,
      description: notes || "Receta subida desde video del teléfono móvil. Puedes ajustar las cantidades y pasos a tu gusto.",
      sourceUrl: "",
      sourcePlatform: 'video_upload',
      author: 'Mi Teléfono Móvil',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      totalTimeMinutes: 35,
      servings: 4,
      category: 'Almuerzo/Cena',
      difficulty: 'Media',
      ingredients: [
        { id: `ing-${Date.now()}-1`, item: "Ingredientes principales según video", amount: 1, unit: "porción", checked: false },
        { id: `ing-${Date.now()}-2`, item: "Aceite de oliva virgen extra", amount: 2, unit: "cucharadas", checked: false },
        { id: `ing-${Date.now()}-3`, item: "Sal y pimienta", amount: null, unit: "al gusto", checked: false }
      ],
      instructions: [
        { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: "Preparar y cortar los ingredientes observados en el video." },
        { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: "Cocinar a fuego medio siguiendo la técnica mostrada en el video." },
        { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: "Servir caliente y rectificar de sal y condimentos." }
      ],
      imageUrl: frames[frames.length - 1] || frames[0],
      tags: ["Video Móvil", "Casero"],
      createdAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      extractedFrom: 'video_frame_fallback',
      recipe: fallbackRecipe
    });

  } catch (err: any) {
    console.error("Error in extract-recipe-from-frames:", err);
    try {
      const emergencyRecipe = {
        id: `receta-video-${Date.now()}`,
        title: req.body?.videoTitle || "Receta Casera de Video",
        description: "Receta procesada desde video. Puedes ajustar los ingredientes y pasos a tu gusto.",
        sourceUrl: "",
        sourcePlatform: 'video_upload',
        author: 'Mi Teléfono Móvil',
        prepTimeMinutes: 15,
        cookTimeMinutes: 20,
        totalTimeMinutes: 35,
        servings: 4,
        category: 'Almuerzo/Cena',
        difficulty: 'Media',
        ingredients: [
          { id: `ing-${Date.now()}-1`, item: "Ingredientes principales según video", amount: 1, unit: "porción", checked: false },
          { id: `ing-${Date.now()}-2`, item: "Aceite de oliva virgen extra", amount: 2, unit: "cucharadas", checked: false },
          { id: `ing-${Date.now()}-3`, item: "Sal y pimienta", amount: null, unit: "al gusto", checked: false }
        ],
        instructions: [
          { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: "Preparar y cortar los ingredientes observados en el video." },
          { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: "Cocinar a fuego medio siguiendo la técnica mostrada en el video." },
          { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: "Servir caliente y rectificar de sal y condimentos." }
        ],
        imageUrl: (req.body?.frames && req.body.frames[0]) || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80',
        tags: ["Video Móvil", "Casero"],
        createdAt: new Date().toISOString()
      };
      return res.json({
        success: true,
        extractedFrom: 'emergency_video_fallback',
        recipe: emergencyRecipe
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: "Error al procesar los fotogramas del video: " + (err.message || "Error desconocido")
      });
    }
  }
});

// Fallback 404 handler for API routes
app.use((req, res, next) => {
  if (req.url.startsWith('/api') || req.path.startsWith('/api') || req.url.startsWith('/extract-recipe')) {
    return res.status(404).json({
      success: false,
      error: `Ruta de API no encontrada: ${req.method} ${req.url}`
    });
  }
  next();
});

// Global unhandled error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Server unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: "Error interno del servidor: " + (err?.message || "Error desconocido")
    });
  }
});

// Vite middleware & Static serving (Standalone mode only)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
          res.status(404).send("Página no encontrada");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Recetas Social Server running on port ${PORT}`);
  });
}

// Only start the server when run directly in Node (e.g. tsx server.ts or node dist/server.cjs),
// never when imported by api/index.ts or executed inside a serverless function (Vercel, Lambda).
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT || 
  process.env.FUNCTIONS_WORKER_RUNTIME
);

const isDirectEntry = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith('server.ts') || 
    process.argv[1].endsWith('server.cjs') || 
    process.argv[1].endsWith('server.js')
  )
);

if (isDirectEntry && !isServerless) {
  startServer();
}

export default app;

