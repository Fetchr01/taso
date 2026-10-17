import type { Box, Keyframe, Ms } from './types.js';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The video's content box inside the stage (object-fit: contain). */
export function contentRect(stageW: number, stageH: number, aspectW: number, aspectH: number): Rect {
  const stageAspect = stageW / stageH;
  const videoAspect = aspectW / aspectH;
  if (stageAspect > videoAspect) {
    const width = stageH * videoAspect;
    return { left: (stageW - width) / 2, top: 0, width, height: stageH };
  }
  const height = stageW / videoAspect;
  return { left: 0, top: (stageH - height) / 2, width: stageW, height };
}

/** Box at time t, interpolating keyframes when present. */
export function boxAt(base: Box, keyframes: Keyframe[] | undefined, t: Ms): Box {
  if (!keyframes || keyframes.length === 0) return base;
  const first = keyframes[0]!;
  const last = keyframes[keyframes.length - 1]!;
  if (t <= first.t) return { ...base, ...first.box };
  if (t >= last.t) return { ...base, ...last.box };
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i]!;
    const b = keyframes[i + 1]!;
    if (t >= a.t && t <= b.t) {
      if (a.ease === 'step') return { ...base, ...a.box };
      let p = (t - a.t) / (b.t - a.t);
      if (a.ease === 'ease-in-out') p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      return {
        ...base,
        x: lerp(a.box.x, b.box.x, p),
        y: lerp(a.box.y, b.box.y, p),
        w: lerp(a.box.w, b.box.w, p),
        h: a.box.h !== undefined && b.box.h !== undefined ? lerp(a.box.h, b.box.h, p) : a.box.h ?? b.box.h,
      };
    }
  }
  return base;
}

/**
 * CSS for positioning an item inside the layer. x,y is the anchor point; we use
 * left/top plus a transform so content-sized items (no h) still anchor correctly.
 */
export function boxStyle(box: Box): string {
  const anchor = box.anchor ?? 'top-left';
  const tx = anchor === 'top-right' || anchor === 'bottom-right' ? '-100%' : anchor === 'center' ? '-50%' : '0';
  const ty = anchor === 'bottom-left' || anchor === 'bottom-right' ? '-100%' : anchor === 'center' ? '-50%' : '0';
  const parts = [
    `left:${pct(box.x)}`,
    `top:${pct(box.y)}`,
    `max-width:${pct(box.w)}`,
    `transform:translate(${tx},${ty})`,
  ];
  if (box.h !== undefined) parts.push(`height:${pct(box.h)}`, `width:${pct(box.w)}`);
  if (box.z !== undefined) parts.push(`z-index:${box.z}`);
  return parts.join(';');
}

function pct(v: number): string {
  return `${(v * 100).toFixed(3)}%`;
}

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}
