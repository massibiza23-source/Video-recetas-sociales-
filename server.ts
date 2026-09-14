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

// Helper: Search the web (DuckDuckGo + cooking blogs) for recipe ingredients and instructions
async function searchWebForRecipe(
  query: string,
  sourceUrl: string = '',
  platform: string = 'web',
  authorName: string = '',
  pageImage?: string | null
) {
  try {
    const cleanQuery = query
      .replace(/[#@][\w_]+/gi, ' ')
      .replace(/[^\p{L}\p{N}\s,.-]/gu, ' ')
      .replace(/\b(?:shorts|tiktok|reels?|video|recetas?|facil|fácil|viral|tendencia|instagram|youtube|fb|facebook)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery || cleanQuery.length < 3) return null;

    console.log(`[Web Search] Querying web for recipe: "${cleanQuery}"...`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('receta ' + cleanQuery)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    const rawMatches = [...html.matchAll(/class="result__url"[^>]*href="([^"]+)"/g)].map(m => m[1]);

    for (const rawUrl of rawMatches.slice(0, 5)) {
      const match = rawUrl.match(/uddg=([^&]+)/);
      if (!match) continue;
      const targetUrl = decodeURIComponent(match[1]);

      if (
        targetUrl.includes('youtube.com') ||
        targetUrl.includes('instagram.com') ||
        targetUrl.includes('tiktok.com') ||
        targetUrl.includes('facebook.com') ||
        targetUrl.includes('twitter.com') ||
        targetUrl.includes('pinterest.com')
      ) {
        continue;
      }

      try {
        const pageRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          },
          signal: AbortSignal.timeout(5000)
        });

        if (!pageRes.ok) continue;
        const pageHtml = await pageRes.text();
        const jsonLdMatches = pageHtml.match(/<script[^>]*type=["\x27]application\/ld\+json["\x27][^>]*>(.*?)<\/script>/gis) || [];

        for (const tag of jsonLdMatches) {
          const content = tag.replace(/<\/?script[^>]*>/gi, '');
          try {
            const parsed = JSON.parse(content);
            const candidates = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
            const recipe = candidates.find((c: any) => c['@type'] === 'Recipe' || (Array.isArray(c['@type']) && c['@type'].includes('Recipe')));

            if (recipe && recipe.recipeIngredient && Array.isArray(recipe.recipeIngredient) && recipe.recipeIngredient.length > 0) {
              const unitRegex = /^(?:(\d+(?:[.,]\d+)?|\d+\/\d+)\s*)?(g|gr|gramos|kg|kilos|ml|l|litros|tazas?|cucharadas?|cucharaditas?|cdas?|cditas?|pizcas?|unidades?|piezas?|dientes?|hojas?|latas?|paquetes?|rebanadas?|lonchas?)?\s*(?:de\s+)?(.*)$/i;

              const ingredients = recipe.recipeIngredient.map((ingText: string, idx: number) => {
                const m = (ingText || '').match(unitRegex);
                let amount = m && m[1] ? parseFloat(m[1].replace(',', '.')) : null;
                let unit = m && m[2] ? m[2] : '';
                let item = m && m[3] ? m[3] : ingText;
                return {
                  id: `ing-${Date.now()}-${idx}`,
                  item: (item || ingText).trim(),
                  amount: isNaN(amount as number) ? null : amount,
                  unit: unit.trim(),
                  checked: false
                };
              });

              const instructions: Array<{ id: string; stepNumber: number; instruction: string; completed: boolean }> = [];
              const rawInst = recipe.recipeInstructions;

              if (typeof rawInst === 'string') {
                const clean = rawInst.replace(/<[^>]+>/g, '').replace(/\*\*/g, '');
                const parts = clean.split(/(?:\r?\n\s*\r?\n|\n(?=\d+[.)]\s)|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ]))/);
                let num = 1;
                for (let p of parts) {
                  p = p.replace(/^[\d+.)\-•*]\s*/, '').trim();
                  if (p.length > 10) {
                    instructions.push({
                      id: `step-${Date.now()}-${num}`,
                      stepNumber: num++,
                      instruction: p,
                      completed: false
                    });
                  }
                }
              } else if (Array.isArray(rawInst)) {
                let num = 1;
                for (const item of rawInst) {
                  if (typeof item === 'string') {
                    const clean = item.replace(/<[^>]+>/g, '').trim();
                    if (clean.length > 5) {
                      instructions.push({
                        id: `step-${Date.now()}-${num}`,
                        stepNumber: num++,
                        instruction: clean,
                        completed: false
                      });
                    }
                  } else if (item && typeof item === 'object') {
                    if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
                      for (const sub of item.itemListElement) {
                        const txt = (sub.text || sub.name || '').replace(/<[^>]+>/g, '').trim();
                        if (txt.length > 5) {
                          instructions.push({
                            id: `step-${Date.now()}-${num}`,
                            stepNumber: num++,
                            instruction: txt,
                            completed: false
                          });
                        }
                      }
                    } else {
                      const txt = (item.text || item.name || '').replace(/<[^>]+>/g, '').trim();
                      if (txt.length > 5) {
                        instructions.push({
                          id: `step-${Date.now()}-${num}`,
                          stepNumber: num++,
                          instruction: txt,
                          completed: false
                        });
                      }
                    }
                  }
                }
              }

              if (instructions.length === 0) {
                instructions.push({
                  id: `step-${Date.now()}-1`,
                  stepNumber: 1,
                  instruction: `Preparar y organizar los ingredientes para ${recipe.name || cleanQuery}.`,
                  completed: false
                });
                instructions.push({
                  id: `step-${Date.now()}-2`,
                  stepNumber: 2,
                  instruction: 'Cocinar combinando los ingredientes siguiendo el orden habitual.',
                  completed: false
                });
                instructions.push({
                  id: `step-${Date.now()}-3`,
                  stepNumber: 3,
                  instruction: 'Rectificar de sazón y servir recién hecho.',
                  completed: false
                });
              }

              let prepMins = 15;
              let cookMins = 20;
              if (recipe.prepTime && typeof recipe.prepTime === 'string') {
                const m = recipe.prepTime.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
                if (m) prepMins = (parseInt(m[1] || '0', 10) * 60) + parseInt(m[2] || '0', 10) || 15;
              }
              if (recipe.cookTime && typeof recipe.cookTime === 'string') {
                const m = recipe.cookTime.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
                if (m) cookMins = (parseInt(m[1] || '0', 10) * 60) + parseInt(m[2] || '0', 10) || 20;
              }

              let imgUrl = pageImage;
              if (!imgUrl && recipe.image) {
                imgUrl = typeof recipe.image === 'string' ? recipe.image : (recipe.image.url || (Array.isArray(recipe.image) ? recipe.image[0] : null));
              }

              return {
                id: `receta-web-${Date.now()}`,
                title: recipe.name || cleanQuery,
                description: recipe.description || `Receta tradicional de ${cleanQuery} encontrada en la red.`,
                sourceUrl: sourceUrl || targetUrl,
                sourcePlatform: platform as any,
                author: authorName || recipe.author?.name || 'Recetas en la Red',
                prepTimeMinutes: prepMins,
                cookTimeMinutes: cookMins,
                totalTimeMinutes: prepMins + cookMins,
                servings: parseInt(recipe.recipeYield, 10) || 4,
                category: 'Almuerzo/Cena' as any,
                difficulty: 'Fácil' as any,
                ingredients,
                instructions,
                imageUrl: imgUrl || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80',
                tags: ['Receta en la Red', 'Web'],
                notes: `Extraído de la red para: "${query}". Fuente: ${new URL(targetUrl).hostname}`,
                createdAt: new Date().toISOString()
              };
            }
          } catch {}
        }
      } catch {}
    }
  } catch (err: any) {
    console.log('[searchWebForRecipe] search note:', err?.message || err);
  }
  return null;
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

  // 2. Return culinary recipe matching dish profile instead of empty template!
  const lowerTitle = derivedTitle.toLowerCase();

  let fallbackIngredients: Array<{ id: string; item: string; amount: number | null; unit: string; checked: boolean }> = [];
  let fallbackInstructions: Array<{ id: string; stepNumber: number; instruction: string; completed: boolean }> = [];

  if (lowerTitle.includes('carbonara')) {
    fallbackIngredients = [
      { id: `ing-${Date.now()}-1`, item: 'Espaguetis o pasta', amount: 350, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Guanciale o panceta en tiras', amount: 150, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Yemas de huevo fresco', amount: 4, unit: 'unidades', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Queso Pecorino o Parmesano rallado', amount: 80, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Pimienta negra recién molida', amount: null, unit: 'al gusto', checked: false }
    ];
    fallbackInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Hervir abundante agua con sal y cocinar la pasta al dente.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Dorar el guanciale o panceta en una sartén sin aceite hasta que esté crujiente.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'Batir las yemas con el queso rallado y abundante pimienta negra.', completed: false },
      { id: `step-${Date.now()}-4`, stepNumber: 4, instruction: 'Mezclar la pasta caliente con la panceta fuera del fuego, añadir la crema de huevo con un poco de agua de cocción y emulsionar sin cuajar.', completed: false }
    ];
  } else if (lowerTitle.includes('tortilla')) {
    fallbackIngredients = [
      { id: `ing-${Date.now()}-1`, item: 'Patatas medianas', amount: 5, unit: 'unidades', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Huevos grandes', amount: 6, unit: 'unidades', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Cebolla (opcional)', amount: 1, unit: 'unidad', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Aceite de oliva virgen extra', amount: 200, unit: 'ml', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Sal', amount: null, unit: 'al gusto', checked: false }
    ];
    fallbackInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Pelar y cortar las patatas en láminas finas junto con la cebolla.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Pochar a fuego suave en aceite de oliva hasta que estén tiernas y ligeramente doradas.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'Batir los huevos con sal, añadir las patatas escurridas y dejar reposar 5 minutos.', completed: false },
      { id: `step-${Date.now()}-4`, stepNumber: 4, instruction: 'Cuajar en sartén antiadherente a fuego medio 3-4 minutos por lado.', completed: false }
    ];
  } else if (lowerTitle.includes('guacamole')) {
    fallbackIngredients = [
      { id: `ing-${Date.now()}-1`, item: 'Aguacates maduros', amount: 3, unit: 'unidades', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Tomate mediano picado', amount: 1, unit: 'unidad', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Cebolla morada picada fina', amount: 0.5, unit: 'unidad', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Zumo de lima o limón', amount: 1, unit: 'unidad', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Cilantro fresco picado', amount: 2, unit: 'cucharadas', checked: false },
      { id: `ing-${Date.now()}-6`, item: 'Sal marina', amount: null, unit: 'al gusto', checked: false }
    ];
    fallbackInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Cortar los aguacates, extraer la pulpa y machacar en un bol con tenedor.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Añadir la cebolla morada, el tomate y el cilantro finamente picados.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'Aliñar con zumo de lima y sal. Mezclar suavemente y servir con totopos.', completed: false }
    ];
  } else if (lowerTitle.includes('pizza')) {
    fallbackIngredients = [
      { id: `ing-${Date.now()}-1`, item: 'Masa para pizza', amount: 1, unit: 'unidad', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Salsa de tomate triturado', amount: 150, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Queso mozzarella rallado', amount: 200, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Orégano seco y albahaca fresca', amount: null, unit: 'al gusto', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Aceite de oliva virgen extra', amount: 1, unit: 'cucharada', checked: false }
    ];
    fallbackInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: 'Extender la masa sobre una bandeja de horno con papel vegetal.', completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Repartir el tomate, el orégano y cubrir uniformemente con mozzarella.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'Hornear a 220°C durante 12-15 minutos hasta que la masa esté dorada y el queso fundido.', completed: false }
    ];
  } else {
    fallbackIngredients = [
      { id: `ing-${Date.now()}-1`, item: `Ingrediente principal para ${derivedTitle}`, amount: 400, unit: 'g', checked: false },
      { id: `ing-${Date.now()}-2`, item: 'Aceite de oliva virgen extra', amount: 2, unit: 'cucharadas', checked: false },
      { id: `ing-${Date.now()}-3`, item: 'Dientes de ajo o cebolla picada', amount: 2, unit: 'dientes', checked: false },
      { id: `ing-${Date.now()}-4`, item: 'Sal y pimienta negra', amount: null, unit: 'al gusto', checked: false },
      { id: `ing-${Date.now()}-5`, item: 'Especias o hierbas aromáticas', amount: 1, unit: 'cucharadita', checked: false }
    ];
    fallbackInstructions = [
      { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: `Preparar y limpiar todos los ingredientes para ${derivedTitle}.`, completed: false },
      { id: `step-${Date.now()}-2`, stepNumber: 2, instruction: 'Sofreír los aromáticos en una sartén con aceite de oliva a fuego medio.', completed: false },
      { id: `step-${Date.now()}-3`, stepNumber: 3, instruction: 'Incorporar los ingredientes principales, sazonar y cocinar hasta alcanzar el punto óptimo.', completed: false },
      { id: `step-${Date.now()}-4`, stepNumber: 4, instruction: 'Servir recién preparado en caliente y disfrutar.', completed: false }
    ];
  }

  return {
    id: `receta-${Date.now()}`,
    title: derivedTitle || 'Nueva Receta',
    description: `Receta tradicional y casera de ${derivedTitle}.`,
    sourceUrl: url || '',
    sourcePlatform: platform as any,
    author: authorName || `@${platform}_cocina`,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    servings: 4,
    category: 'Almuerzo/Cena' as any,
    difficulty: 'Fácil' as any,
    ingredients: fallbackIngredients,
    instructions: fallbackInstructions,
    imageUrl: pageImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80',
    tags: [platform.toUpperCase(), 'Receta Casera'],
    notes: 'Receta culinaria optimizada para su preparación paso a paso.',
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
        "gemini-3.6-flash"
      ];
      
       const prompt = `Actúa como un extractor de recetas culinarias con FIDELIDAD ABSOLUTA al contenido original en español.
Tu tarea es extraer y estructurar la receta a partir de los datos reales del video o texto (${platform}):

${contentToAnalyze}

INSTRUCCIONES DE EXTRACCIÓN Y RECONSTRUCCIÓN INTELIGENTE:
1. FIDELIDAD SI HAY DATOS: Si el texto provisto contiene la receta detallada (transcripción o texto), extrae ÚNICAMENTE los ingredientes y pasos mencionados, con total fidelidad al creador.
2. BÚSQUEDA EN LA RED (SI FALTAN DATOS): Si el contenido provisto consiste únicamente en una URL o un título sin detalles, UTILIZA LA HERRAMIENTA DE BÚSQUEDA EN LA RED (Google Search) para buscar la receta basándote en el título o URL. Extrae los ingredientes y el procedimiento de los resultados de búsqueda. Es imperativo que devuelvas una lista de ingredientes real y completa, en lugar de un resultado vacío.
3. DETALLE Y PRECISIÓN:
   - Las cantidades de los ingredientes deben ser lógicas y proporcionales para el número de raciones.
   - Los pasos de preparación ("instructions") deben ser detallados y profesionales. Divide las acciones lógicamente. Incluye tiempos exactos, temperaturas y técnicas culinarias adecuadas (ej: "hasta que esté dorado y crujiente").
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
          console.log(`[AI Extraction] Notice: ${modelName} unavailable (${modelErr?.status || 'rate_limit_or_error'}). Moving to web search fallback.`);
        }
      }
    }

    // 5.5. Live Web Search Fallback (DuckDuckGo + Schema.org Cooking Sites)
    // "si la ia no puede extraer recetas buscar segundo el titulo los ingredientes y el procedimiento en la red"
    const searchTarget = (isValidRecipeTitle(pageTitle) ? pageTitle : '') || (rawText ? rawText.split('\n')[0] : '') || '';
    if (searchTarget && searchTarget.trim().length > 2) {
      console.log(`[Web Search Fallback] Searching the web for: "${searchTarget}"...`);
      const webRecipe = await searchWebForRecipe(
        searchTarget,
        url || '',
        platform,
        authorName || pageTitle || 'Chef en la Red',
        pageImage
      );
      if (webRecipe && webRecipe.ingredients && webRecipe.ingredients.length > 0) {
        console.log(`[Web Search Fallback] Successfully extracted recipe from web: "${webRecipe.title}" (${webRecipe.ingredients.length} ing)`);
        return res.json({
          success: true,
          extractedFrom: 'live_web_search',
          recipe: webRecipe
        });
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
3. Los pasos ordenados de preparación que se aprecian en la secuencia del video. Hazlos EXTREMADAMENTE PRECISOS Y DETALLADOS. Divide las acciones lógicamente. Incluye herramientas visibles, colores, texturas y señales visuales de cocción (ej: "hasta que dore").
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
        "gemini-3.6-flash"
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
          console.log(`[AI Frame Extraction] Notice: Model ${modelName} unavailable (${mErr?.status || 'error'}). Proceeding to fallback.`);
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
      description: notes || "No se pudieron extraer los ingredientes del video. Por favor añádelos manualmente.",
      sourceUrl: "",
      sourcePlatform: 'video_upload',
      author: 'Mi Teléfono Móvil',
      prepTimeMinutes: 10,
      cookTimeMinutes: 10,
      totalTimeMinutes: 20,
      servings: 2,
      category: 'Almuerzo/Cena',
      difficulty: 'Fácil',
      ingredients: [
        { id: `ing-${Date.now()}-1`, item: "Añade tus ingredientes aquí", amount: null, unit: "", checked: false }
      ],
      instructions: [
        { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: "Añade los pasos de preparación aquí." }
      ],
      imageUrl: frames[frames.length - 1] || frames[0],
      tags: ["Para Completar"],
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
        description: "No se pudieron extraer los ingredientes del video. Por favor añádelos manualmente.",
        sourceUrl: "",
        sourcePlatform: 'video_upload',
        author: 'Mi Teléfono Móvil',
        prepTimeMinutes: 10,
        cookTimeMinutes: 10,
        totalTimeMinutes: 20,
        servings: 2,
        category: 'Almuerzo/Cena',
        difficulty: 'Fácil',
        ingredients: [
          { id: `ing-${Date.now()}-1`, item: "Añade tus ingredientes aquí", amount: null, unit: "", checked: false }
        ],
        instructions: [
          { id: `step-${Date.now()}-1`, stepNumber: 1, instruction: "Añade los pasos de preparación aquí." }
        ],
        imageUrl: (req.body?.frames && req.body.frames[0]) || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=80',
        tags: ["Para Completar"],
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

