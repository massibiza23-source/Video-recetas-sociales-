import { PlatformType } from '../types';

export interface VideoEmbedInfo {
  type: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'direct' | 'unsupported';
  embedUrl?: string;
  isVertical?: boolean;
  directUrl?: string;
  originalUrl?: string;
  canEmbed: boolean;
  videoId?: string;
  platformName: string;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
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

/**
 * Checks if the YouTube URL is a Short (vertical video)
 */
export function isYouTubeShort(url: string): boolean {
  return !!url && url.includes('/shorts/');
}

/**
 * Extracts Instagram shortcode (e.g. from /reel/C3x918LpzKl/ or /p/C3x918LpzKl/)
 */
export function extractInstagramCode(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts TikTok video ID
 */
export function extractTikTokId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/video\/([0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Analyzes a URL and optional platform to determine embed parameters
 */
export function getVideoEmbedInfo(url?: string, platformHint?: PlatformType, directVideoUrl?: string): VideoEmbedInfo {
  // If direct video provided
  if (directVideoUrl && (directVideoUrl.endsWith('.mp4') || directVideoUrl.endsWith('.webm') || directVideoUrl.includes('blob:'))) {
    return {
      type: 'direct',
      directUrl: directVideoUrl,
      canEmbed: true,
      originalUrl: url || directVideoUrl,
      platformName: 'Video Directo'
    };
  }

  const targetUrl = url || directVideoUrl || '';
  if (!targetUrl) {
    return {
      type: 'unsupported',
      canEmbed: false,
      platformName: 'Sin video disponible'
    };
  }

  // 1. YouTube
  const ytId = extractYouTubeId(targetUrl);
  if (ytId || platformHint === 'youtube' || targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
    if (ytId) {
      const isShort = isYouTubeShort(targetUrl);
      return {
        type: 'youtube',
        videoId: ytId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`,
        isVertical: isShort,
        canEmbed: true,
        originalUrl: targetUrl,
        platformName: isShort ? 'YouTube Shorts' : 'YouTube'
      };
    }
  }

  // 2. Instagram
  const igCode = extractInstagramCode(targetUrl);
  if (igCode || platformHint === 'instagram' || targetUrl.includes('instagram.com')) {
    if (igCode) {
      return {
        type: 'instagram',
        videoId: igCode,
        embedUrl: `https://www.instagram.com/reel/${igCode}/embed/captioned/`,
        isVertical: true,
        canEmbed: true,
        originalUrl: targetUrl,
        platformName: 'Instagram Reel'
      };
    }
  }

  // 3. TikTok
  const ttId = extractTikTokId(targetUrl);
  if (ttId || platformHint === 'tiktok' || targetUrl.includes('tiktok.com')) {
    if (ttId) {
      return {
        type: 'tiktok',
        videoId: ttId,
        embedUrl: `https://www.tiktok.com/embed/v2/${ttId}`,
        isVertical: true,
        canEmbed: true,
        originalUrl: targetUrl,
        platformName: 'TikTok'
      };
    }
  }

  // 4. Facebook
  if (platformHint === 'facebook' || targetUrl.includes('facebook.com') || targetUrl.includes('fb.watch')) {
    return {
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(targetUrl)}&show_text=0&autoplay=1`,
      isVertical: targetUrl.includes('/reel/'),
      canEmbed: true,
      originalUrl: targetUrl,
      platformName: 'Facebook Video'
    };
  }

  // 5. Direct video extension in targetUrl
  if (targetUrl.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i)) {
    return {
      type: 'direct',
      directUrl: targetUrl,
      canEmbed: true,
      originalUrl: targetUrl,
      platformName: 'Archivo de Video'
    };
  }

  // Default web
  return {
    type: 'unsupported',
    originalUrl: targetUrl,
    canEmbed: false,
    platformName: platformHint === 'web' ? 'Sitio Web' : 'Fuente externa'
  };
}

/**
 * Returns available thumbnail candidates for a YouTube video ID
 */
export function getYouTubeThumbnailCandidates(ytId: string) {
  return [
    {
      id: 'maxres',
      label: 'Alta Definición (1280x720 - Sin barras)',
      url: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      recommended: true
    },
    {
      id: 'mq',
      label: 'Panorámica 16:9 limpia (320x180)',
      url: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      recommended: false
    },
    {
      id: 'hq',
      label: 'Miniatura Estándar YouTube (480x360)',
      url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      recommended: false
    },
    {
      id: 'sd',
      label: 'Definición Estándar (640x480)',
      url: `https://img.youtube.com/vi/${ytId}/sddefault.jpg`,
      recommended: false
    }
  ];
}
