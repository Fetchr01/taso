import type { Action, ActionKind, Item, ItemType, Manifest, ResolvedItem } from './types.js';

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

const DEFAULT_ACTION: Record<ItemType, ActionKind> = {
  text: 'copy',
  command: 'copy',
  code: 'copy',
  link: 'open',
  mention: 'open',
  hotspot: 'open',
  image: 'expand',
  file: 'expand',
};

const KNOWN_TYPES = new Set<string>(Object.keys(DEFAULT_ACTION));

/**
 * Fetch and normalize a manifest. The player must survive partial data, so this
 * fills defaults and drops only items that cannot be shown at all.
 */
export async function loadManifest(url: string): Promise<Manifest> {
  // Relative src attributes are resolved against the page, so relative references inside the
  // manifest can in turn be resolved against the manifest's own absolute URL.
  const absolute = new URL(url, typeof document !== 'undefined' ? document.baseURI : undefined).toString();
  const res = await fetch(absolute, { credentials: 'omit' });
  if (!res.ok) throw new ManifestError(`Manifest ${url}: HTTP ${res.status}`);
  const json: unknown = await res.json();
  return normalizeManifest(json, absolute);
}

export function normalizeManifest(raw: unknown, baseUrl?: string): Manifest {
  if (!raw || typeof raw !== 'object') throw new ManifestError('Manifest is not an object');
  const m = raw as Partial<Manifest>;
  if (m.kind !== 'distribution') throw new ManifestError(`Expected kind "distribution", got ${String(m.kind)}`);
  if (typeof m.taso !== 'string' || !m.taso.startsWith('0.')) throw new ManifestError(`Unsupported taso version ${String(m.taso)}`);
  if (!m.video || (!m.video.hls && !m.video.mp4)) throw new ManifestError('Manifest has no video source');
  if (!Array.isArray(m.tracks)) throw new ManifestError('Manifest has no tracks');

  const resolve = (u: string | undefined): string | undefined => {
    if (!u || !baseUrl) return u;
    try {
      return new URL(u, baseUrl).toString();
    } catch {
      return u;
    }
  };

  const video = {
    aspect: Array.isArray(m.video.aspect) && m.video.aspect.length === 2 ? m.video.aspect : ([16, 9] as [number, number]),
    hls: resolve(m.video.hls),
    mp4: resolve(m.video.mp4),
    poster: resolve(m.video.poster),
  };

  const fonts = (m.fonts ?? []).map((f) => ({ ...f, src: resolve(f.src) ?? f.src }));
  const assets: Manifest['assets'] = {};
  for (const [key, a] of Object.entries(m.assets ?? {})) {
    assets[key] = {
      ...a,
      src: resolve(a.src),
      sizes: a.sizes?.map((s) => ({ ...s, src: resolve(s.src) ?? s.src })),
    };
  }

  return {
    taso: m.taso,
    kind: 'distribution',
    id: m.id ?? 'untitled',
    title: m.title ?? '',
    lang: m.lang,
    creator: m.creator,
    duration: typeof m.duration === 'number' ? m.duration : 0,
    video,
    fonts,
    styles: m.styles ?? {},
    assets,
    tracks: m.tracks,
    chapters: m.chapters ?? [],
    player: { list: true, listLinger: 8000, shortcuts: true, ...(m.player ?? {}) },
  };
}

/** Flatten tracks into normalized items. Track order = paint order (first = bottom). */
export function resolveItems(m: Manifest): ResolvedItem[] {
  const out: ResolvedItem[] = [];
  m.tracks.forEach((track, trackIndex) => {
    if (track.kind !== 'overlay') return; // subtitles/terminal tracks are not rendered by v0.1 player
    for (const raw of track.items ?? []) {
      const item = normalizeItem(raw);
      if (item) out.push({ ...item, trackIndex });
    }
  });
  return out;
}

function normalizeItem(raw: Item): Omit<ResolvedItem, 'trackIndex'> | null {
  if (!raw || typeof raw.id !== 'string') return null;
  if (typeof raw.start !== 'number' || typeof raw.end !== 'number' || raw.end <= raw.start) return null;
  if (!raw.box || typeof raw.box.x !== 'number' || typeof raw.box.y !== 'number' || typeof raw.box.w !== 'number') return null;

  // Unknown type → shown as text, so new types degrade gracefully.
  const type: ItemType = KNOWN_TYPES.has(raw.type) ? raw.type : 'text';
  const action: Action = raw.action && typeof raw.action.kind === 'string' ? raw.action : { kind: DEFAULT_ACTION[type] };
  const content = typeof raw.content === 'string' ? raw.content : '';

  // A link/hotspot/mention without a destination cannot "open": fall back to no action.
  if (action.kind === 'open' && !raw.href && !raw.handle) action.kind = 'none';
  if (action.kind === 'expand' && !raw.asset) action.kind = 'none';

  return {
    ...raw,
    type,
    content,
    action,
    render: raw.render !== false,
    list: raw.list !== false,
    box: { anchor: 'top-left', ...raw.box },
  };
}
