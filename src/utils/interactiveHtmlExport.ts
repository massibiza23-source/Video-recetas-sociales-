import { Recipe, Ingredient } from '../types';
import { getVideoEmbedInfo } from './videoUtils';

/**
 * Escapes special HTML characters to prevent XSS in generated HTML documents.
 */
function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes a title for use in filenames
 */
export function sanitizeFilename(title: string): string {
  return (title || 'receta')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Generates a completely self-contained, responsive, interactive HTML file for a recipe
 * including embedded video player, interactive portions scaler, checklist for ingredients,
 * step-by-step cooking progress, and print-ready styles.
 */
export function generateInteractiveRecipeHtml(recipe: Recipe): string {
  const embedInfo = getVideoEmbedInfo(recipe.sourceUrl, recipe.sourcePlatform, recipe.videoUrl);
  const baseServings = recipe.servings || 2;
  const safeTitle = escapeHtml(recipe.title);
  const safeAuthor = escapeHtml(recipe.author || '');
  const safeCategory = escapeHtml(recipe.category || 'Receta');
  const safeDifficulty = escapeHtml(recipe.difficulty || '');
  const safeDescription = escapeHtml(recipe.description || '');
  const safeNotes = escapeHtml(recipe.notes || '');

  // Prepare Video Section HTML
  let videoSectionHtml = '';
  const isVertical = !!embedInfo.isVertical;

  if (embedInfo.canEmbed && embedInfo.type === 'youtube' && embedInfo.embedUrl) {
    videoSectionHtml = `
      <div class="video-container ${isVertical ? 'vertical-video' : 'standard-video'}">
        <iframe 
          src="${embedInfo.embedUrl}" 
          title="${safeTitle} - Video" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen>
        </iframe>
      </div>
    `;
  } else if (embedInfo.canEmbed && embedInfo.type === 'direct' && embedInfo.directUrl) {
    videoSectionHtml = `
      <div class="video-container standard-video">
        <video controls playsinline poster="${escapeHtml(recipe.imageUrl || '')}" preload="metadata">
          <source src="${escapeHtml(embedInfo.directUrl)}" type="video/mp4">
          Tu navegador no soporta la reproducción de video HTML5.
        </video>
      </div>
    `;
  } else if (embedInfo.canEmbed && embedInfo.embedUrl) {
    videoSectionHtml = `
      <div class="video-container ${isVertical ? 'vertical-video' : 'standard-video'}">
        <iframe 
          src="${embedInfo.embedUrl}" 
          title="${safeTitle} - Video" 
          frameborder="0" 
          allow="autoplay; encrypted-media" 
          allowfullscreen>
        </iframe>
      </div>
      ${recipe.sourceUrl ? `
        <div class="video-native-bar">
          <span>Video disponible en ${embedInfo.platformName}</span>
          <a href="${escapeHtml(recipe.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="btn-external">
            Ver video original ↗
          </a>
        </div>
      ` : ''}
    `;
  } else if (recipe.imageUrl) {
    videoSectionHtml = `
      <div class="image-hero-container">
        <img src="${escapeHtml(recipe.imageUrl)}" alt="${safeTitle}" class="hero-image" />
        ${recipe.sourceUrl ? `
          <a href="${escapeHtml(recipe.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="hero-video-link">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Ver video en ${embedInfo.platformName || recipe.sourcePlatform}
          </a>
        ` : ''}
      </div>
    `;
  }

  // Pre-render Ingredients List with data-amount attributes for dynamic scaling
  const ingredientsHtml = (recipe.ingredients || []).map((ing, idx) => {
    const safeItem = escapeHtml(ing.item);
    const safeUnit = escapeHtml(ing.unit || '');
    const safeNotes = escapeHtml(ing.notes || '');
    const amountVal = (typeof ing.amount === 'number' && !isNaN(ing.amount)) ? ing.amount : null;
    const dataAmount = amountVal !== null ? `data-base-amount="${amountVal}"` : '';
    const initialFormatted = amountVal !== null ? formatAmountJs(amountVal) : '';

    return `
      <li class="ingredient-card" data-id="ing-${idx}" ${dataAmount} data-unit="${safeUnit}" onclick="toggleIngredient(this)">
        <span class="custom-checkbox">
          <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <div class="ingredient-info">
          <span class="ingredient-name">
            <span class="ingredient-amount">${initialFormatted}${safeUnit ? ' ' + safeUnit : ''}</span>
            <span class="ingredient-text">${safeItem}</span>
          </span>
          ${safeNotes ? `<span class="ingredient-notes">${safeNotes}</span>` : ''}
        </div>
      </li>
    `;
  }).join('\n');

  // Pre-render Cooking Instructions
  const stepsHtml = (recipe.instructions || []).map((step, idx) => {
    const stepNum = step.stepNumber || (idx + 1);
    const safeText = escapeHtml(step.instruction);
    const safeTip = escapeHtml(step.tip || '');

    return `
      <li class="step-card" data-id="step-${idx}" onclick="toggleStep(this)">
        <div class="step-header">
          <span class="step-badge">Paso ${stepNum}</span>
          <span class="step-checkbox">
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </div>
        <p class="step-text">${safeText}</p>
        ${safeTip ? `<div class="step-tip">💡 <strong>Consejo:</strong> ${safeTip}</div>` : ''}
      </li>
    `;
  }).join('\n');

  // Tags HTML
  const tagsHtml = (recipe.tags || []).map(tag => `
    <span class="tag-pill">#${escapeHtml(tag)}</span>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Receta interactiva con video</title>
  <meta name="description" content="Receta interactiva de ${safeTitle} con video embebido, cálculo dinámico de porciones y lista de compras.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23d97706%22><path d=%22M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z%22/></svg>">
  <style>
    /* ----------------------------------------------------
       RESET & THEME VARIABLES
       ---------------------------------------------------- */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg-body: #f8fafc;
      --bg-card: #ffffff;
      --bg-subtle: #f1f5f9;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-light: #94a3b8;
      --border: #e2e8f0;
      --border-focus: #f59e0b;
      --amber-600: #d97706;
      --amber-700: #b45309;
      --amber-50: #fffbeb;
      --amber-100: #fef3c7;
      --emerald-600: #059669;
      --emerald-50: #ecfdf5;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-full: 9999px;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-serif: "Georgia", "Cambria", "Times New Roman", serif;
    }

    [data-theme="dark"] {
      --bg-body: #090d16;
      --bg-card: #131b2e;
      --bg-subtle: #1c263f;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-light: #64748b;
      --border: #263352;
      --border-focus: #fbbf24;
      --amber-600: #f59e0b;
      --amber-700: #d97706;
      --amber-50: #291d09;
      --amber-100: #3b280b;
      --emerald-600: #10b981;
      --emerald-50: #064e3b;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg-body);
      color: var(--text-main);
      line-height: 1.6;
      padding: 16px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    .recipe-wrapper {
      width: 100%;
      max-width: 860px;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      margin-bottom: 30px;
    }

    /* ----------------------------------------------------
       TOP UTILITY BAR
       ---------------------------------------------------- */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 10px;
    }

    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--amber-600);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .bar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-action {
      background: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .btn-action:hover {
      background: var(--bg-subtle);
      border-color: var(--amber-600);
    }

    /* ----------------------------------------------------
       VIDEO SECTION
       ---------------------------------------------------- */
    .video-section {
      background: #000000;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .video-container {
      width: 100%;
      position: relative;
      background: #000000;
    }

    .video-container.standard-video {
      aspect-ratio: 16 / 9;
      max-height: 520px;
    }

    .video-container.vertical-video {
      aspect-ratio: 9 / 16;
      max-width: 360px;
      margin: 0 auto;
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .video-container iframe,
    .video-container video {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      object-fit: cover;
    }

    .video-native-bar {
      width: 100%;
      background: rgba(0, 0, 0, 0.85);
      color: #ffffff;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-external {
      color: #fbbf24;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-external:hover {
      text-decoration: underline;
    }

    .image-hero-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      max-height: 400px;
      background: #000;
      overflow: hidden;
    }

    .hero-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.9;
    }

    .hero-video-link {
      position: absolute;
      bottom: 16px;
      right: 16px;
      background: var(--amber-600);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }

    /* ----------------------------------------------------
       RECIPE HEADER & METADATA
       ---------------------------------------------------- */
    .recipe-header {
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--border);
    }

    .meta-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .badge-category {
      background: var(--amber-100);
      color: var(--amber-700);
    }

    .badge-difficulty {
      background: var(--bg-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .recipe-title {
      font-family: var(--font-serif);
      font-size: clamp(22px, 4vw, 32px);
      line-height: 1.25;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .author-line {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    .author-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .recipe-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 10px;
      background: var(--bg-subtle);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-top: 14px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .stat-val {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .recipe-desc {
      margin-top: 14px;
      font-size: 14px;
      color: var(--text-muted);
      font-style: italic;
      line-height: 1.5;
    }

    /* ----------------------------------------------------
       INTERACTIVE SECTIONS (INGREDIENTS & INSTRUCTIONS)
       ---------------------------------------------------- */
    .content-grid {
      padding: 24px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
    }

    @media (min-width: 768px) {
      .content-grid {
        grid-template-columns: 5fr 6fr;
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 18px;
      font-weight: 700;
      font-family: var(--font-serif);
      color: var(--text-main);
    }

    /* SERVINGS SCALER */
    .servings-widget {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-subtle);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .servings-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-main);
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
    }

    .servings-btn:hover {
      background: var(--amber-50);
      border-color: var(--amber-600);
      color: var(--amber-700);
    }

    .servings-display {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
      min-width: 70px;
      text-align: center;
    }

    /* INGREDIENTS LIST */
    .ingredients-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ingredient-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }

    .ingredient-card:hover {
      border-color: var(--amber-600);
      background: var(--bg-subtle);
    }

    .ingredient-card.checked {
      background: var(--emerald-50);
      border-color: rgba(5, 150, 105, 0.4);
      opacity: 0.75;
    }

    .ingredient-card.checked .ingredient-name {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .custom-checkbox {
      width: 20px;
      height: 20px;
      border-radius: 5px;
      border: 2px solid var(--border);
      background: var(--bg-card);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.15s ease;
    }

    .ingredient-card.checked .custom-checkbox {
      background: var(--emerald-600);
      border-color: var(--emerald-600);
    }

    .check-icon {
      width: 13px;
      height: 13px;
      stroke: #ffffff;
      display: none;
    }

    .ingredient-card.checked .check-icon,
    .step-card.completed .check-icon {
      display: block;
    }

    .ingredient-info {
      display: flex;
      flex-direction: column;
      font-size: 13px;
      line-height: 1.4;
    }

    .ingredient-amount {
      font-weight: 700;
      color: var(--amber-600);
    }

    .ingredient-text {
      font-weight: 500;
      color: var(--text-main);
    }

    .ingredient-notes {
      font-size: 11px;
      color: var(--text-muted);
    }

    .ing-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .btn-copy-ingredients {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-copy-ingredients:hover {
      background: var(--amber-50);
      border-color: var(--amber-600);
    }

    /* INSTRUCTIONS / STEPS */
    .steps-progress-container {
      margin-bottom: 14px;
    }

    .progress-bar-bg {
      width: 100%;
      height: 6px;
      background: var(--bg-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 6px;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--emerald-600);
      width: 0%;
      transition: width 0.25s ease;
    }

    .progress-text {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    .steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-card {
      padding: 14px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .step-card:hover {
      border-color: var(--amber-600);
      background: var(--bg-subtle);
    }

    .step-card.completed {
      background: var(--emerald-50);
      border-color: rgba(5, 150, 105, 0.4);
    }

    .step-card.completed .step-text {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .step-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .step-badge {
      font-size: 11px;
      font-weight: 700;
      background: var(--bg-subtle);
      color: var(--text-main);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .step-card.completed .step-badge {
      background: var(--emerald-600);
      color: #ffffff;
    }

    .step-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-card.completed .step-checkbox {
      background: var(--emerald-600);
      border-color: var(--emerald-600);
    }

    .step-text {
      font-size: 14px;
      color: var(--text-main);
      line-height: 1.5;
    }

    .step-tip {
      margin-top: 8px;
      padding: 8px 10px;
      background: var(--amber-50);
      border-left: 3px solid var(--amber-600);
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: var(--amber-700);
    }

    /* NOTES & TAGS */
    .footer-notes {
      padding: 20px 24px;
      background: var(--bg-subtle);
      border-top: 1px solid var(--border);
    }

    .notes-box {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag-pill {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .site-watermark {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: var(--text-light);
    }

    /* TOAST NOTIFICATION POPUP */
    #toast-notice {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s ease, opacity 0.25s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #toast-notice.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    /* ----------------------------------------------------
       PRINT STYLES
       ---------------------------------------------------- */
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .recipe-wrapper {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .top-bar, .video-section, .servings-btn, .btn-copy-ingredients, .site-watermark, #toast-notice {
        display: none !important;
      }
      .content-grid {
        grid-template-columns: 1fr 1fr !important;
        padding: 10px 0 !important;
      }
      .ingredient-card, .step-card {
        border: 1px solid #ddd !important;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <div class="recipe-wrapper" id="recipe-container">
    <!-- Top Utility Bar -->
    <header class="top-bar">
      <div class="brand-tag">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
        </svg>
        <span>Receta Interactiva con Video</span>
      </div>

      <div class="bar-actions">
        <button class="btn-action" onclick="toggleTheme()" title="Cambiar modo claro / oscuro">
          <span id="theme-btn-icon">🌓</span>
          <span id="theme-btn-text">Tema</span>
        </button>
        <button class="btn-action" onclick="window.print()" title="Imprimir receta o guardar como PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>Imprimir / PDF</span>
        </button>
      </div>
    </header>

    <!-- Embedded Video Player -->
    <section class="video-section">
      ${videoSectionHtml}
    </section>

    <!-- Header & Metadata -->
    <section class="recipe-header">
      <div class="meta-badges">
        <span class="badge badge-category">${safeCategory}</span>
        ${safeDifficulty ? `<span class="badge badge-difficulty">${safeDifficulty}</span>` : ''}
        ${embedInfo.platformName ? `<span class="badge badge-difficulty">${embedInfo.platformName}</span>` : ''}
      </div>

      <h1 class="recipe-title">${safeTitle}</h1>

      ${safeAuthor ? `
        <div class="author-line">
          Creador: <span class="author-name">${safeAuthor}</span>
        </div>
      ` : ''}

      <div class="recipe-stats-grid">
        ${recipe.prepTimeMinutes ? `
          <div class="stat-item">
            <span class="stat-label">Preparación</span>
            <span class="stat-val">${recipe.prepTimeMinutes} min</span>
          </div>
        ` : ''}
        ${recipe.cookTimeMinutes ? `
          <div class="stat-item">
            <span class="stat-label">Cocción</span>
            <span class="stat-val">${recipe.cookTimeMinutes} min</span>
          </div>
        ` : ''}
        ${recipe.totalTimeMinutes ? `
          <div class="stat-item">
            <span class="stat-label">Tiempo Total</span>
            <span class="stat-val">${recipe.totalTimeMinutes} min</span>
          </div>
        ` : ''}
        <div class="stat-item">
          <span class="stat-label">Porciones Base</span>
          <span class="stat-val" id="stat-base-servings">${baseServings}</span>
        </div>
      </div>

      ${safeDescription ? `<p class="recipe-desc">"${safeDescription}"</p>` : ''}
    </section>

    <!-- Content Columns: Ingredients & Step-by-Step Instructions -->
    <div class="content-grid">
      
      <!-- INGREDIENTS COLUMN -->
      <section class="ingredients-column">
        <div class="section-title">
          <span>Ingredientes</span>
          <!-- Dynamic Servings Scaler -->
          <div class="servings-widget" title="Ajustar porciones">
            <button class="servings-btn" onclick="changeServings(-1)">-</button>
            <span class="servings-display" id="servings-count">${baseServings} porciones</span>
            <button class="servings-btn" onclick="changeServings(1)">+</button>
          </div>
        </div>

        <ul class="ingredients-list" id="ingredients-list">
          ${ingredientsHtml}
        </ul>

        <div class="ing-footer">
          <span id="ing-counter">0 de ${recipe.ingredients.length} listos</span>
          <button class="btn-copy-ingredients" onclick="copyIngredientsList()">
            📋 Copiar lista
          </button>
        </div>
      </section>

      <!-- INSTRUCTIONS COLUMN -->
      <section class="instructions-column">
        <div class="section-title">
          <span>Pasos de Preparación</span>
          <button class="btn-action" onclick="resetSteps()" style="font-size: 11px; padding: 4px 8px;">
            Reiniciar
          </button>
        </div>

        <!-- Cooking Progress Bar -->
        <div class="steps-progress-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="step-progress-fill"></div>
          </div>
          <div class="progress-text">
            <span id="step-progress-text">0% completado</span>
            <span id="step-count-text">0 de ${recipe.instructions.length} pasos</span>
          </div>
        </div>

        <ol class="steps-list" id="steps-list">
          ${stepsHtml}
        </ol>
      </section>
    </div>

    <!-- Notes & Tags Footer -->
    ${(safeNotes || tagsHtml) ? `
      <footer class="footer-notes">
        ${safeNotes ? `
          <div class="notes-box">
            <strong>Notas del Chef:</strong> ${safeNotes}
          </div>
        ` : ''}
        ${tagsHtml ? `
          <div class="tags-container">
            ${tagsHtml}
          </div>
        ` : ''}
      </footer>
    ` : ''}

    <div class="site-watermark">
      Receta guardada con video interactivo • Abre este archivo en cualquier momento en tu móvil o computadora
    </div>
  </div>

  <div id="toast-notice">¡Copiado al portapapeles!</div>

  <!-- Interactive JavaScript Engine -->
  <script>
    const baseServings = ${baseServings};
    let currentServings = baseServings;
    const totalIngredients = ${recipe.ingredients.length};
    const totalSteps = ${recipe.instructions.length};

    // Scaler logic
    function changeServings(delta) {
      const next = Math.max(1, Math.min(30, currentServings + delta));
      if (next === currentServings) return;
      currentServings = next;
      document.getElementById('servings-count').textContent = currentServings + (currentServings === 1 ? ' porción' : ' porciones');

      const ratio = currentServings / baseServings;
      const cards = document.querySelectorAll('.ingredient-card');

      cards.forEach(card => {
        const baseAmount = card.getAttribute('data-base-amount');
        const unit = card.getAttribute('data-unit') || '';
        if (baseAmount) {
          const num = parseFloat(baseAmount);
          if (!isNaN(num)) {
            const scaled = num * ratio;
            const formatted = formatNumber(scaled);
            const amountEl = card.querySelector('.ingredient-amount');
            if (amountEl) {
              amountEl.textContent = formatted + (unit ? ' ' + unit : '');
            }
          }
        }
      });
      showToast('Porciones ajustadas a ' + currentServings);
    }

    function formatNumber(val) {
      if (Number.isInteger(val)) return val.toString();
      const fixed = val.toFixed(1);
      return fixed.endsWith('.0') ? val.toFixed(0) : fixed;
    }

    // Toggle Ingredient Checklist
    function toggleIngredient(card) {
      card.classList.toggle('checked');
      updateIngredientsCounter();
    }

    function updateIngredientsCounter() {
      const checkedCount = document.querySelectorAll('.ingredient-card.checked').length;
      document.getElementById('ing-counter').textContent = checkedCount + ' de ' + totalIngredients + ' listos';
    }

    // Toggle Cooking Step Checklist
    function toggleStep(card) {
      card.classList.toggle('completed');
      updateStepsProgress();
    }

    function updateStepsProgress() {
      const completedCount = document.querySelectorAll('.step-card.completed').length;
      const percent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
      document.getElementById('step-progress-fill').style.width = percent + '%';
      document.getElementById('step-progress-text').textContent = percent + '% completado';
      document.getElementById('step-count-text').textContent = completedCount + ' de ' + totalSteps + ' pasos';
    }

    function resetSteps() {
      document.querySelectorAll('.step-card.completed').forEach(c => c.classList.remove('completed'));
      updateStepsProgress();
      showToast('Pasos reiniciados');
    }

    // Copy ingredients
    function copyIngredientsList() {
      const cards = document.querySelectorAll('.ingredient-card');
      const lines = ['🛒 Ingredientes para ' + document.querySelector('.recipe-title').textContent + ' (' + currentServings + ' porciones):', ''];
      cards.forEach(c => {
        const amt = c.querySelector('.ingredient-amount') ? c.querySelector('.ingredient-amount').textContent.trim() : '';
        const txt = c.querySelector('.ingredient-text') ? c.querySelector('.ingredient-text').textContent.trim() : '';
        lines.push('• ' + (amt ? amt + ' ' : '') + txt);
      });
      const fullText = lines.join('\\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText).then(() => {
          showToast('Lista de compras copiada');
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = fullText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Lista de compras copiada');
      }
    }

    // Theme toggle
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      try {
        localStorage.setItem('recipe_theme', next);
      } catch (e) {}
    }

    // Restore saved theme
    try {
      const savedTheme = localStorage.getItem('recipe_theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (e) {}

    // Toast Notice
    let toastTimeout = null;
    function showToast(msg) {
      const el = document.getElementById('toast-notice');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        el.classList.remove('show');
      }, 2400);
    }
  </script>
</body>
</html>`;
}

function formatAmountJs(amount: number): string {
  if (Number.isInteger(amount)) return amount.toString();
  return amount.toFixed(1).replace('.0', '');
}

/**
 * Initiates the download of the interactive HTML file
 */
export function downloadRecipeHtml(recipe: Recipe): string {
  const htmlContent = generateInteractiveRecipeHtml(recipe);
  const filename = `Receta-${sanitizeFilename(recipe.title)}-con-Video.html`;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return filename;
}

/**
 * Previews the interactive HTML file in a new browser tab
 */
export function previewRecipeHtmlInNewTab(recipe: Recipe): void {
  const htmlContent = generateInteractiveRecipeHtml(recipe);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Shares the HTML file using the Web Share API (native file sharing),
 * or falls back to downloading if files sharing isn't supported.
 */
export async function shareRecipeHtml(
  recipe: Recipe
): Promise<{ success: boolean; method: 'share' | 'download' | 'clipboard' }> {
  const htmlContent = generateInteractiveRecipeHtml(recipe);
  const filename = `Receta-${sanitizeFilename(recipe.title)}-con-Video.html`;
  const file = new File([htmlContent], filename, { type: 'text/html' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${recipe.title} (Receta con Video)`,
        text: `Te comparto la receta de "${recipe.title}" en formato HTML interactivo con video, lista de compras y porciones escalables.`,
        files: [file]
      });
      return { success: true, method: 'share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'share' };
      }
      // Fallback to download
      downloadRecipeHtml(recipe);
      return { success: true, method: 'download' };
    }
  }

  // Fallback if file sharing not supported: download file
  downloadRecipeHtml(recipe);
  return { success: true, method: 'download' };
}
