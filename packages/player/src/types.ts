/** Taso distribution manifest v0.1 — see spec/schema/distribution.schema.json */

export type Ms = number;

export type ItemType =
  | 'text'
  | 'command'
  | 'code'
  | 'link'
  | 'image'
  | 'file'
  | 'mention'
  | 'hotspot';

export type ActionKind = 'copy' | 'open' | 'expand' | 'seek' | 'none';

export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface Box {
  x: number;
  y: number;
  w: number;
  h?: number;
  anchor?: Anchor;
  z?: number;
}

export interface Keyframe {
  t: Ms;
  box: Box;
  ease?: 'linear' | 'ease-in-out' | 'step';
}

export interface Action {
  kind: ActionKind;
  to?: Ms;
}

export interface MentionHandle {
  platform: 'x' | 'github' | 'youtube' | 'mastodon' | 'bluesky' | 'instagram' | 'tiktok' | 'linkedin';
  id: string;
  instance?: string;
}

export interface Item {
  id: string;
  type: ItemType;
  start: Ms;
  end: Ms;
  content: string;
  label?: string;
  style?: string;
  box: Box;
  keyframes?: Keyframe[];
  render?: boolean;
  action?: Action;
  list?: boolean;
  // type-specific
  href?: string;
  asset?: string;
  handle?: MentionHandle;
  language?: string;
  shell?: string;
}

export interface Track {
  id: string;
  kind: 'overlay' | 'subtitles' | 'terminal';
  items: Item[];
}

export interface FontDef {
  family: string;
  src: string;
  weight?: string;
  fallback?: string;
}

export interface StyleDef {
  font?: string;
  size?: number;
  weight?: number;
  color?: string;
  background?: string;
  padding?: number[];
  radius?: number;
}

export interface AssetSize {
  w: number;
  h: number;
  type?: string;
  src: string;
}

export interface AssetDef {
  kind: 'image' | 'file';
  alt?: string;
  sizes?: AssetSize[];
  src?: string;
  bytes?: number;
  filename?: string;
}

export interface Chapter {
  start: Ms;
  title: string;
}

export interface Manifest {
  taso: string;
  kind: 'distribution';
  id: string;
  title: string;
  lang?: string;
  creator?: { name?: string; url?: string };
  duration: Ms;
  video: {
    aspect: [number, number];
    hls?: string;
    mp4?: string;
    poster?: string;
  };
  fonts?: FontDef[];
  styles?: Record<string, StyleDef>;
  assets?: Record<string, AssetDef>;
  tracks: Track[];
  chapters?: Chapter[];
  player?: {
    list?: boolean;
    listLinger?: Ms;
    shortcuts?: boolean;
  };
}

/** Item after normalization: defaults filled, track order known. */
export interface ResolvedItem extends Item {
  render: boolean;
  list: boolean;
  action: Action;
  trackIndex: number;
}
