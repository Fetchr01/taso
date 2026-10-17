import type { Ms, ResolvedItem } from './types.js';

export interface TimelineDelta<T> {
  entered: T[];
  exited: T[];
}

/**
 * Keeps track of which items are active at the current time with an incremental sweep.
 * Advancing forward is O(k) in items that change; a seek rebuilds in O(n).
 */
export class Timeline<T extends { start: Ms; end: Ms; id: string }> {
  private readonly byStart: T[];
  private readonly byEnd: T[];
  private startCursor = 0;
  private endCursor = 0;
  private active = new Set<T>();
  private lastT: Ms = -1;

  constructor(items: Iterable<T>) {
    const arr = [...items];
    this.byStart = [...arr].sort((a, b) => a.start - b.start);
    this.byEnd = [...arr].sort((a, b) => a.end - b.end);
  }

  get size(): number {
    return this.byStart.length;
  }

  activeItems(): T[] {
    return [...this.active];
  }

  /** Items that start within (t, t + horizon]. Used for preloading. */
  upcoming(t: Ms, horizon: Ms): T[] {
    const out: T[] = [];
    let i = lowerBound(this.byStart, t, (x) => x.start);
    for (; i < this.byStart.length; i++) {
      const it = this.byStart[i]!;
      if (it.start > t + horizon) break;
      if (it.start > t) out.push(it);
    }
    return out;
  }

  /** Move to time t and return which items entered and exited since the last call. */
  update(t: Ms): TimelineDelta<T> {
    if (t < this.lastT) return this.seek(t);
    this.lastT = t;
    const entered: T[] = [];
    const exited: T[] = [];

    while (this.startCursor < this.byStart.length && this.byStart[this.startCursor]!.start <= t) {
      const it = this.byStart[this.startCursor++]!;
      if (it.end > t) {
        this.active.add(it);
        entered.push(it);
      }
    }
    while (this.endCursor < this.byEnd.length && this.byEnd[this.endCursor]!.end <= t) {
      const it = this.byEnd[this.endCursor++]!;
      if (this.active.delete(it)) exited.push(it);
    }
    return { entered, exited };
  }

  private seek(t: Ms): TimelineDelta<T> {
    const before = this.active;
    const after = new Set<T>();
    this.startCursor = lowerBound(this.byStart, t + 1, (x) => x.start);
    this.endCursor = lowerBound(this.byEnd, t + 1, (x) => x.end);
    for (let i = 0; i < this.startCursor; i++) {
      const it = this.byStart[i]!;
      if (it.end > t) after.add(it);
    }
    this.active = after;
    this.lastT = t;
    return {
      entered: [...after].filter((x) => !before.has(x)),
      exited: [...before].filter((x) => !after.has(x)),
    };
  }
}

/** First index whose key is >= value. */
export function lowerBound<T>(arr: readonly T[], value: number, key: (x: T) => number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (key(arr[mid]!) < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Sort for the "now on screen" list: most recently started first, ties by paint order. */
export function compareForList(a: ResolvedItem, b: ResolvedItem): number {
  return b.start - a.start || b.trackIndex - a.trackIndex;
}
