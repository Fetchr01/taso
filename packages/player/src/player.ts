import { copyText, hostOf, openTarget, pickSize } from './actions.js';
import { boxAt, boxStyle, contentRect } from './geometry.js';
import { ICONS, type IconName } from './icons.js';
import { loadManifest, normalizeManifest, resolveItems } from './manifest.js';
import { stringsFor, type Strings } from './strings.js';
import { STYLES } from './styles.js';
import { compareForList, Timeline } from './timeline.js';
import type { Manifest, Ms, ResolvedItem, StyleDef } from './types.js';

const PRELOAD_HORIZON: Ms = 10_000;
const COPIED_FLASH: Ms = 1_500;
const SEEK_STEP: Ms = 5_000;

interface Row {
  el: HTMLElement;
  item: ResolvedItem;
  exitedAt: Ms | null;
}

declare global {
  interface Window {
    Hls?: {
      isSupported(): boolean;
      new (): { loadSource(url: string): void; attachMedia(v: HTMLVideoElement): void; destroy(): void };
    };
  }
}

/**
 * <taso-player src="video.taso.json"></taso-player>
 *
 * Attributes: src (manifest URL), lang (overrides manifest language for UI strings),
 * list="off" (hide the "now on screen" panel), theme="dark|light", hls-js (URL of hls.js to lazy-load).
 * Events: taso-ready, taso-action { item, action }, taso-error.
 */
export class TasoPlayer extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['src', 'lang', 'list', 'theme'];
  }

  private readonly shadow: ShadowRoot;
  private manifest: Manifest | null = null;
  private items: ResolvedItem[] = [];
  private timeline: Timeline<ResolvedItem> | null = null;
  private strings: Strings = stringsFor(undefined);

  private stage!: HTMLElement;
  private video!: HTMLVideoElement;
  private layer!: HTMLElement;
  private progressFill!: HTMLElement;
  private markers!: HTMLElement;
  private timeEl!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private lightbox!: HTMLElement;
  private listEl!: HTMLElement;
  private rowsEl!: HTMLElement;
  private countEl!: HTMLElement;
  private emptyEl!: HTMLElement;

  private mounted = new Map<string, HTMLElement>();
  private rows = new Map<string, Row>();
  private preloaded = new Set<string>();
  private layerRect = { left: 0, top: 0, width: 0, height: 0 };
  private resizeObs: ResizeObserver | null = null;
  private rafId = 0;
  private usingVideoFrameCallback = false;
  private hlsInstance: { destroy(): void } | null = null;
  private lastTick: Ms = -1;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.detectTheme();
    this.renderShell();
    const src = this.getAttribute('src');
    if (src) void this.load(src);
  }

  disconnectedCallback(): void {
    this.stopLoop();
    this.resizeObs?.disconnect();
    this.hlsInstance?.destroy();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isConnected) return;
    if (name === 'src' && newValue) void this.load(newValue);
    if (name === 'lang') this.applyStrings();
    if (name === 'list') this.listEl.hidden = newValue === 'off';
  }

  /** Load a manifest from a URL or an already-parsed object. */
  async load(source: string | object): Promise<void> {
    try {
      const manifest = typeof source === 'string' ? await loadManifest(source) : normalizeManifest(source);
      this.setManifest(manifest);
    } catch (err) {
      this.showError(err);
    }
  }

  get currentTime(): Ms {
    return Math.round(this.video.currentTime * 1000);
  }
  set currentTime(ms: Ms) {
    this.video.currentTime = ms / 1000;
  }

  /** Items visible right now (plus lingering ones), newest first. */
  get visibleItems(): ResolvedItem[] {
    return [...this.rows.values()].map((r) => r.item).sort(compareForList);
  }

  // ---------------------------------------------------------------- shell

  private renderShell(): void {
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="stage paused" part="stage">
        <video playsinline preload="metadata"></video>
        <div class="layer" part="layer"></div>
        <div class="lightbox" role="dialog" aria-modal="true">
          <img alt="">
          <div class="caption"></div>
          <button class="icon-btn close" type="button">${ICONS.close}</button>
        </div>
        <div class="controls" part="controls">
          <div class="progress" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="-1">
            <div class="track"></div>
            <div class="fill"></div>
            <div class="markers"></div>
          </div>
          <div class="bar">
            <div class="group">
              <button class="icon-btn play" type="button">${ICONS.play}</button>
              <span class="time">0:00 / 0:00</span>
            </div>
            <div class="group">
              <button class="icon-btn fullscreen" type="button">${ICONS.fullscreen}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="list" part="list">
        <div class="list-head"><span class="title"></span><span class="count"></span></div>
        <div class="rows"></div>
        <div class="empty"></div>
        <div class="hint"></div>
      </div>
    `;
    const q = <T extends Element>(sel: string): T => this.shadow.querySelector(sel) as T;
    this.stage = q('.stage');
    this.video = q('video');
    this.layer = q('.layer');
    this.progressFill = q('.fill');
    this.markers = q('.markers');
    this.timeEl = q('.time');
    this.playBtn = q('.play');
    this.lightbox = q('.lightbox');
    this.listEl = q('.list');
    this.rowsEl = q('.rows');
    this.countEl = q('.count');
    this.emptyEl = q('.empty');
    this.listEl.hidden = this.getAttribute('list') === 'off';

    this.playBtn.addEventListener('click', () => this.togglePlay());
    q<HTMLButtonElement>('.fullscreen').addEventListener('click', () => this.toggleFullscreen());
    q<HTMLButtonElement>('.lightbox .close').addEventListener('click', () => this.closeLightbox());
    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) this.closeLightbox();
    });
    const progress = q<HTMLElement>('.progress');
    progress.addEventListener('click', (e) => {
      const r = progress.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      this.currentTime = Math.round(p * (this.manifest?.duration ?? this.video.duration * 1000));
    });

    this.video.addEventListener('play', () => {
      this.stage.classList.remove('paused');
      this.playBtn.innerHTML = ICONS.pause;
      this.playBtn.setAttribute('aria-label', this.strings.pause);
      this.startLoop();
    });
    this.video.addEventListener('pause', () => {
      this.stage.classList.add('paused');
      this.playBtn.innerHTML = ICONS.play;
      this.playBtn.setAttribute('aria-label', this.strings.play);
      this.stopLoop();
      this.tick();
    });
    this.video.addEventListener('seeked', () => this.tick());
    this.video.addEventListener('loadedmetadata', () => {
      this.layout();
      this.tick();
    });
    this.video.addEventListener('error', () => this.showNotice(this.strings.loadError));
    // Clicking the video toggles playback, like every player; items sit above it and stop propagation.
    this.video.addEventListener('click', () => this.togglePlay());

    this.addEventListener('keydown', (e) => this.onKey(e));
    this.resizeObs = new ResizeObserver(() => this.layout());
    this.resizeObs.observe(this.stage);
    this.applyStrings();
  }

  /** Dark by default (the stage is dark anyway); light only if the host page declares color-scheme: light. */
  private detectTheme(): void {
    if (this.hasAttribute('theme')) return;
    try {
      const scheme = getComputedStyle(document.documentElement).colorScheme || '';
      if (/\blight\b/.test(scheme) && !/\bdark\b/.test(scheme)) this.dataset.theme = 'light';
    } catch {
      /* keep dark */
    }
  }

  private applyStrings(): void {
    this.strings = stringsFor(this.getAttribute('lang') ?? this.manifest?.lang);
    (this.shadow.querySelector('.list-head .title') as HTMLElement).textContent = this.strings.nowOnScreen;
    (this.shadow.querySelector('.hint') as HTMLElement).innerHTML = this.strings.hint;
    this.emptyEl.textContent = this.strings.nothingYet;
    this.playBtn.setAttribute('aria-label', this.video.paused ? this.strings.play : this.strings.pause);
    (this.shadow.querySelector('.fullscreen') as HTMLElement).setAttribute('aria-label', this.strings.fullscreen);
    (this.shadow.querySelector('.lightbox .close') as HTMLElement).setAttribute('aria-label', this.strings.close);
    this.updateCount();
  }

  /** Non-fatal notice inside the stage (e.g. video failed to load); the UI stays intact. */
  private showNotice(text: string): void {
    let n = this.stage.querySelector('.notice') as HTMLElement | null;
    if (!n) {
      n = document.createElement('div');
      n.className = 'notice';
      this.stage.appendChild(n);
    }
    n.textContent = text;
    this.dispatchEvent(new CustomEvent('taso-error', { detail: { error: new Error(text) }, bubbles: true, composed: true }));
  }

  private showError(err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    const el = document.createElement('div');
    el.className = 'error';
    el.textContent = `${this.strings.loadError} ${msg}`;
    this.stage.replaceChildren(el);
    this.dispatchEvent(new CustomEvent('taso-error', { detail: { error: err }, bubbles: true, composed: true }));
  }

  // ------------------------------------------------------------- manifest

  private setManifest(m: Manifest): void {
    this.manifest = m;
    this.items = resolveItems(m);
    this.timeline = new Timeline(this.items);
    this.mounted.forEach((el) => el.remove());
    this.mounted.clear();
    this.rows.clear();
    this.rowsEl.replaceChildren();
    this.preloaded.clear();
    this.lastTick = -1;

    this.applyStrings();
    this.stage.style.setProperty('--taso-aspect', `${m.video.aspect[0]} / ${m.video.aspect[1]}`);
    if (m.video.poster) this.video.poster = m.video.poster;
    this.loadFonts(m);
    this.attachVideo(m);
    this.renderMarkers(m);
    this.layout();
    this.updateTime(0);
    this.tick();
    this.dispatchEvent(new CustomEvent('taso-ready', { detail: { manifest: m }, bubbles: true, composed: true }));
  }

  private loadFonts(m: Manifest): void {
    if (!('FontFace' in window) || !m.fonts) return;
    for (const f of m.fonts) {
      try {
        const face = new FontFace(f.family, `url(${f.src})`, { weight: f.weight ?? '400', display: 'swap' });
        document.fonts.add(face);
        void face.load().catch(() => undefined);
      } catch {
        /* fallback stack takes over */
      }
    }
  }

  private attachVideo(m: Manifest): void {
    this.hlsInstance?.destroy();
    this.hlsInstance = null;
    const { hls, mp4 } = m.video;
    const nativeHls = this.video.canPlayType('application/vnd.apple.mpegurl') !== '';
    if (hls && nativeHls) {
      this.video.src = hls;
      return;
    }
    if (hls && !mp4) {
      void this.attachHlsJs(hls);
      return;
    }
    if (mp4) {
      this.video.src = mp4;
      return;
    }
  }

  /** hls.js is loaded only when the browser cannot play HLS natively and no MP4 fallback exists. */
  private async attachHlsJs(url: string): Promise<void> {
    if (!window.Hls) {
      const scriptUrl = this.getAttribute('hls-js') ?? 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.light.min.js';
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = scriptUrl;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('hls.js failed to load'));
        document.head.appendChild(s);
      }).catch((e) => this.showError(e));
    }
    if (window.Hls?.isSupported()) {
      const h = new window.Hls();
      h.loadSource(url);
      h.attachMedia(this.video);
      this.hlsInstance = h;
    } else {
      this.showError(new Error('HLS is not supported in this browser'));
    }
  }

  private renderMarkers(m: Manifest): void {
    this.markers.replaceChildren();
    if (!m.duration) return;
    for (const it of this.items) {
      if (!it.list) continue;
      const mk = document.createElement('span');
      mk.className = 'marker';
      mk.style.left = `${(it.start / m.duration) * 100}%`;
      mk.title = it.label ?? it.content;
      this.markers.appendChild(mk);
    }
  }

  // --------------------------------------------------------------- layout

  private layout(): void {
    if (!this.manifest) return;
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (!w || !h) return;
    const [aw, ah] = this.manifest.video.aspect;
    const r = contentRect(w, h, this.video.videoWidth || aw, this.video.videoHeight || ah);
    this.layerRect = r;
    this.layer.style.left = `${r.left}px`;
    this.layer.style.top = `${r.top}px`;
    this.layer.style.width = `${r.width}px`;
    this.layer.style.height = `${r.height}px`;
    this.layer.style.setProperty('--taso-vh', `${r.height}px`);
  }

  // ----------------------------------------------------------------- loop

  private startLoop(): void {
    this.stopLoop();
    const v = this.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (typeof v.requestVideoFrameCallback === 'function') {
      this.usingVideoFrameCallback = true;
      const step = (): void => {
        this.tick();
        this.rafId = v.requestVideoFrameCallback!(step);
      };
      this.rafId = v.requestVideoFrameCallback(step);
    } else {
      this.usingVideoFrameCallback = false;
      const step = (): void => {
        this.tick();
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    }
  }

  private stopLoop(): void {
    if (!this.rafId) return;
    const v = this.video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void };
    if (this.usingVideoFrameCallback && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(this.rafId);
    else cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private tick(): void {
    if (!this.timeline || !this.manifest) return;
    const t = this.currentTime;
    const jumped = this.lastTick >= 0 && Math.abs(t - this.lastTick) > 1000;
    const { entered, exited } = this.timeline.update(t);
    for (const it of exited) this.unmountItem(it, t);
    for (const it of entered) this.mountItem(it, t);
    if (jumped) this.backfillLingering(t);
    if (entered.length || exited.length || jumped) this.sortRows();

    // Keyframed items move every frame.
    for (const it of this.timeline.activeItems()) {
      if (!it.keyframes) continue;
      const el = this.mounted.get(it.id);
      if (el) el.style.cssText = `${el.dataset.base ?? ''};${boxStyle(boxAt(it.box, it.keyframes, t))}`;
    }

    // Lingering rows fade out after listLinger, or immediately if we seeked before their start.
    const linger = this.manifest.player?.listLinger ?? 8000;
    for (const [id, row] of this.rows) {
      if (row.exitedAt === null) continue;
      if (t - row.exitedAt > linger || t < row.item.start) {
        row.el.remove();
        this.rows.delete(id);
      }
    }
    if (exited.length) this.updateCount();

    if (t !== this.lastTick) {
      this.updateTime(t);
      this.preload(t);
      this.lastTick = t;
    }
  }

  /**
   * After a seek or a large jump, items that ended within the linger window never produced an
   * exit event, so add them to the list as lingering rows. Keeps "c" and the list truthful.
   */
  private backfillLingering(t: Ms): void {
    const linger = this.manifest?.player?.listLinger ?? 8000;
    for (const it of this.items) {
      if (!it.list || this.rows.has(it.id)) continue;
      if (it.end <= t && it.end > t - linger && it.start <= t) {
        this.addRow(it);
        const row = this.rows.get(it.id);
        if (row) {
          row.exitedAt = it.end;
          row.el.classList.add('lingering');
          row.el.classList.remove('active');
        }
      }
    }
  }

  private updateTime(t: Ms): void {
    const d = this.manifest?.duration || Math.round((this.video.duration || 0) * 1000);
    this.timeEl.textContent = `${fmt(t)} / ${fmt(d)}`;
    const p = d ? Math.min(100, (t / d) * 100) : 0;
    this.progressFill.style.width = `${p}%`;
    (this.shadow.querySelector('.progress') as HTMLElement).setAttribute('aria-valuenow', p.toFixed(0));
  }

  private preload(t: Ms): void {
    if (!this.timeline || !this.manifest?.assets) return;
    for (const it of this.timeline.upcoming(t, PRELOAD_HORIZON)) {
      if (it.type !== 'image' || !it.asset || this.preloaded.has(it.id)) continue;
      const asset = this.manifest.assets[it.asset];
      if (!asset) continue;
      const size = pickSize(asset, this.layerRect.width * it.box.w);
      if (size) {
        const img = new Image();
        img.src = size.src;
        this.preloaded.add(it.id);
      }
    }
  }

  // -------------------------------------------------------------- items

  private mountItem(item: ResolvedItem, t: Ms): void {
    if (item.render) {
      const el = this.buildItemElement(item);
      el.dataset.base = this.styleFor(item);
      el.style.cssText = `${el.dataset.base};${boxStyle(boxAt(item.box, item.keyframes, t))}`;
      this.layer.appendChild(el);
      this.mounted.set(item.id, el);
    } else {
      const el = this.buildHotspot(item);
      el.dataset.base = '';
      el.style.cssText = boxStyle(boxAt(item.box, item.keyframes, t));
      this.layer.appendChild(el);
      this.mounted.set(item.id, el);
    }
    if (item.list) this.addRow(item);
  }

  private unmountItem(item: ResolvedItem, t: Ms): void {
    this.mounted.get(item.id)?.remove();
    this.mounted.delete(item.id);
    const row = this.rows.get(item.id);
    if (row) {
      row.exitedAt = t;
      row.el.classList.add('lingering');
      row.el.classList.remove('active');
    }
  }

  private styleFor(item: ResolvedItem): string {
    const s: StyleDef | undefined = item.style ? this.manifest?.styles?.[item.style] : undefined;
    if (!s) return '';
    const parts: string[] = [];
    if (s.font) {
      const def = this.manifest?.fonts?.find((f) => f.family === s.font);
      parts.push(`font-family:"${s.font}",${def?.fallback ?? 'system-ui, sans-serif'}`);
    }
    if (s.size) parts.push(`font-size:calc(var(--taso-vh) * ${s.size})`);
    if (s.weight) parts.push(`font-weight:${s.weight}`);
    if (s.color) parts.push(`color:${s.color}`);
    if (s.background) parts.push(`background:${s.background}`);
    if (s.padding?.length) parts.push(`padding:${s.padding.map((p) => `calc(var(--taso-vh) * ${p})`).join(' ')}`);
    if (s.radius !== undefined) parts.push(`border-radius:calc(var(--taso-vh) * ${s.radius})`);
    return parts.join(';');
  }

  private buildItemElement(item: ResolvedItem): HTMLElement {
    const kind = item.action.kind;
    let el: HTMLElement;
    if (kind === 'open') {
      const a = document.createElement('a');
      const target = openTarget(item);
      if (target) {
        a.href = target;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = this.strings.opensHost(hostOf(target));
      }
      el = a;
    } else if (kind === 'none') {
      el = document.createElement('div');
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      el = b;
    }
    el.className = 'item';
    el.dataset.type = item.type;
    el.dataset.id = item.id;

    if (item.type === 'image') {
      const asset = item.asset ? this.manifest?.assets?.[item.asset] : undefined;
      const img = document.createElement('img');
      const size = asset ? pickSize(asset, this.layerRect.width * item.box.w) : null;
      if (size) img.src = size.src;
      img.alt = asset?.alt ?? item.content;
      img.loading = 'eager';
      img.decoding = 'async';
      el.appendChild(img);
      if (kind === 'expand') el.appendChild(this.affordance('expand', this.strings.expand));
      el.setAttribute('aria-label', `${item.content} – ${this.strings.expand}`);
    } else {
      if (item.type === 'command') {
        const p = document.createElement('span');
        p.className = 'prompt';
        p.textContent = '$';
        el.appendChild(p);
      }
      const c = document.createElement('span');
      c.className = 'content';
      c.textContent = item.content;
      el.appendChild(c);
      if (kind === 'copy') el.appendChild(this.affordance('copy', this.strings.copy));
      else if (kind === 'open') el.appendChild(this.affordance('open', ''));
      else if (kind === 'seek') el.appendChild(this.affordance('seek', this.strings.jump));
    }

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (kind !== 'open') e.preventDefault();
      void this.perform(item, el);
    });
    return el;
  }

  private buildHotspot(item: ResolvedItem): HTMLElement {
    const target = item.action.kind === 'open' ? openTarget(item) : null;
    let el: HTMLElement;
    if (target) {
      const a = document.createElement('a');
      a.href = target;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = `${item.content} · ${this.strings.opensHost(hostOf(target))}`;
      el = a;
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = item.content;
      el = b;
    }
    el.className = 'item hotspot';
    el.dataset.type = 'hotspot';
    el.dataset.id = item.id;
    el.setAttribute('aria-label', item.content);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!target) e.preventDefault();
      void this.perform(item, el);
    });
    return el;
  }

  private affordance(icon: IconName, word: string): HTMLElement {
    const s = document.createElement('span');
    s.className = 'affordance';
    s.innerHTML = `${ICONS[icon]}${word ? `<span class="word">${escapeHtml(word)}</span>` : ''}`;
    return s;
  }

  // -------------------------------------------------------------- actions

  private async perform(item: ResolvedItem, source: HTMLElement): Promise<void> {
    const kind = item.action.kind;
    this.dispatchEvent(new CustomEvent('taso-action', { detail: { item, action: kind }, bubbles: true, composed: true }));
    switch (kind) {
      case 'copy': {
        const ok = await copyText(item.content);
        if (ok) this.flashCopied(item.id, source);
        break;
      }
      case 'expand':
        this.openLightbox(item);
        break;
      case 'seek':
        this.currentTime = item.action.to ?? item.start;
        break;
      case 'open':
      case 'none':
        break;
    }
  }

  private flashCopied(id: string, source: HTMLElement): void {
    const targets = [this.mounted.get(id), this.rows.get(id)?.el, source].filter(Boolean) as HTMLElement[];
    for (const el of new Set(targets)) {
      el.classList.add('copied');
      for (const w of el.querySelectorAll('.affordance .word, .action .word')) w.textContent = this.strings.copied;
      for (const a of el.querySelectorAll('.affordance, .action')) {
        const svg = a.querySelector('svg');
        if (svg) svg.outerHTML = ICONS.check;
      }
      setTimeout(() => {
        el.classList.remove('copied');
        for (const w of el.querySelectorAll('.affordance .word, .action .word')) w.textContent = this.strings.copy;
        for (const a of el.querySelectorAll('.affordance, .action')) {
          const svg = a.querySelector('svg');
          if (svg) svg.outerHTML = ICONS.copy;
        }
      }, COPIED_FLASH);
    }
  }

  private openLightbox(item: ResolvedItem): void {
    const asset = item.asset ? this.manifest?.assets?.[item.asset] : undefined;
    if (!asset) return;
    const size = pickSize(asset, this.stage.clientWidth);
    if (!size) return;
    const img = this.lightbox.querySelector('img') as HTMLImageElement;
    img.src = size.src;
    img.alt = asset.alt ?? item.content;
    (this.lightbox.querySelector('.caption') as HTMLElement).textContent = item.content;
    this.lightbox.classList.add('open');
    this.video.pause();
    (this.lightbox.querySelector('.close') as HTMLElement).focus();
  }

  private closeLightbox(): void {
    this.lightbox.classList.remove('open');
    this.focus();
  }

  private togglePlay(): void {
    if (this.video.paused) void this.video.play().catch(() => undefined);
    else this.video.pause();
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void this.stage.requestFullscreen?.();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.manifest || this.manifest.player?.shortcuts === false) return;
    const tag = (e.composedPath()[0] as HTMLElement | undefined)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.currentTime = Math.max(0, this.currentTime - SEEK_STEP);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.currentTime = Math.min(this.manifest.duration, this.currentTime + SEEK_STEP);
        break;
      case 'f':
        this.toggleFullscreen();
        break;
      case 'Escape':
        this.closeLightbox();
        break;
      case 'c': {
        if (e.metaKey || e.ctrlKey) return; // leave native copy alone
        const latest = this.visibleItems.find((it) => it.action.kind === 'copy');
        if (latest) {
          e.preventDefault();
          void this.perform(latest, this.rows.get(latest.id)?.el ?? this);
        }
        break;
      }
    }
  }

  // ----------------------------------------------------------------- list

  private addRow(item: ResolvedItem): void {
    const existing = this.rows.get(item.id);
    if (existing) {
      existing.exitedAt = null;
      existing.el.classList.remove('lingering');
      existing.el.classList.add('active');
      return;
    }
    const el = document.createElement('div');
    el.className = `row active${item.type === 'command' || item.type === 'code' ? ' mono' : ''}`;
    el.dataset.id = item.id;

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'main';
    main.title = this.strings.jump;
    main.innerHTML = `
      <span class="type">${ICONS[item.type as IconName] ?? ICONS.text}</span>
      <span class="text">
        <span class="label">${escapeHtml(item.label ?? item.content)}</span>
        <span class="meta">${escapeHtml(this.strings.type[item.type] ?? item.type)} · ${fmt(item.start)}</span>
      </span>`;
    main.addEventListener('click', () => {
      this.currentTime = item.start;
    });
    el.appendChild(main);

    const kind = item.action.kind;
    if (kind !== 'none') {
      let action: HTMLElement;
      if (kind === 'open') {
        const a = document.createElement('a');
        const target = openTarget(item);
        if (target) {
          a.href = target;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.title = this.strings.opensHost(hostOf(target));
        }
        a.innerHTML = `<span class="word">${escapeHtml(this.strings.open)}</span>${ICONS.open}`;
        action = a;
      } else {
        const b = document.createElement('button');
        b.type = 'button';
        const word = kind === 'copy' ? this.strings.copy : kind === 'expand' ? this.strings.expand : this.strings.jump;
        const icon: IconName = kind === 'copy' ? 'copy' : kind === 'expand' ? 'expand' : 'seek';
        b.innerHTML = kind === 'copy' ? `${ICONS[icon]}<span class="word">${escapeHtml(word)}</span>` : `<span class="word">${escapeHtml(word)}</span>${ICONS[icon]}`;
        action = b;
      }
      action.className = 'action';
      action.addEventListener('click', () => void this.perform(item, el));
      el.appendChild(action);
    }

    this.rows.set(item.id, { el, item, exitedAt: null });
    this.rowsEl.appendChild(el);
    this.updateCount();
  }

  private sortRows(): void {
    const sorted = [...this.rows.values()].sort((a, b) => compareForList(a.item, b.item));
    for (const r of sorted) this.rowsEl.appendChild(r.el);
    this.updateCount();
  }

  private updateCount(): void {
    const total = this.items.filter((i) => i.list).length;
    this.countEl.textContent = this.strings.allItems(total);
    this.emptyEl.hidden = this.rows.size > 0;
  }
}

function fmt(ms: Ms): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
