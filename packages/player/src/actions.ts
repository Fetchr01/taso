import type { AssetDef, AssetSize, MentionHandle, ResolvedItem } from './types.js';

/**
 * Copy exactly `text`. Never trims, never rewrites. Returns false if the clipboard is unavailable.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

const MENTION_HOSTS: Record<MentionHandle['platform'], (h: MentionHandle) => string> = {
  x: (h) => `https://x.com/${enc(h.id)}`,
  github: (h) => `https://github.com/${enc(h.id)}`,
  youtube: (h) => `https://www.youtube.com/@${enc(h.id)}`,
  bluesky: (h) => `https://bsky.app/profile/${enc(h.id)}`,
  instagram: (h) => `https://www.instagram.com/${enc(h.id)}/`,
  tiktok: (h) => `https://www.tiktok.com/@${enc(h.id)}`,
  linkedin: (h) => `https://www.linkedin.com/in/${enc(h.id)}/`,
  mastodon: (h) => (h.instance ? `https://${h.instance}/@${enc(h.id)}` : ''),
};

/** Mentions resolve from (platform, id), never from a free-form URL. */
export function resolveMention(handle: MentionHandle): string | null {
  const build = MENTION_HOSTS[handle.platform];
  if (!build) return null;
  const url = build(handle);
  return url || null;
}

/** Destination for an "open" action, or null if the item has none. */
export function openTarget(item: ResolvedItem): string | null {
  if (item.href && /^(https?:|mailto:)/i.test(item.href)) return item.href;
  if (item.handle) return resolveMention(item.handle);
  return null;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Pick the smallest asset size that is at least `targetW` CSS px * DPR wide; largest if none. */
export function pickSize(asset: AssetDef, targetW: number): AssetSize | null {
  if (!asset.sizes?.length) return asset.src ? { w: 0, h: 0, src: asset.src } : null;
  const want = targetW * Math.min(window.devicePixelRatio || 1, 3);
  const supportsAvif = avifSupported();
  const candidates = asset.sizes
    .filter((s) => supportsAvif || s.type !== 'image/avif')
    .sort((a, b) => a.w - b.w);
  if (!candidates.length) return asset.sizes[asset.sizes.length - 1] ?? null;
  return candidates.find((s) => s.w >= want) ?? candidates[candidates.length - 1] ?? null;
}

let avifCache: boolean | null = null;
function avifSupported(): boolean {
  if (avifCache !== null) return avifCache;
  try {
    const c = document.createElement('canvas');
    avifCache = c.toDataURL('image/avif').startsWith('data:image/avif');
  } catch {
    avifCache = false;
  }
  return avifCache;
}

function enc(s: string): string {
  return encodeURIComponent(s.replace(/^@/, ''));
}
