export const STYLES = /* css */ `
:host {
  --taso-bg: #0E0E10;
  --taso-surface: #141416;
  --taso-row: #111113;
  --taso-row-hover: #17171A;
  --taso-chip: #202024;
  --taso-chip-hover: #2A2A2F;
  --taso-text: #F4F4F5;
  --taso-text-2: rgba(244,244,245,0.7);
  --taso-text-3: rgba(244,244,245,0.5);
  --taso-accent: #3D6EF5;
  --taso-accent-soft: rgba(61,110,245,0.14);
  --taso-gradient: linear-gradient(90deg, #3D6EF5 0%, #FF7A3D 100%);
  --taso-gradient-text: linear-gradient(90deg, #6B91FF 0%, #FF9A5C 100%);
  --taso-radius: 14px;
  --taso-font: Manrope, system-ui, -apple-system, "Segoe UI", sans-serif;
  --taso-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  display: block;
  color: var(--taso-text);
  font-family: var(--taso-font);
  font-size: 14px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  outline: none;
}
:host(:focus-visible) .stage { box-shadow: 0 0 0 2px var(--taso-accent); }

/* Light variant: only when the host page asks for it (theme="light") or declares color-scheme: light. */
:host([theme="light"]), :host([data-theme="light"]:not([theme="dark"])) {
  --taso-surface: #F3F3F5;
  --taso-row: #FFFFFF;
  --taso-row-hover: #FAFAFB;
  --taso-chip: #E8E8EC;
  --taso-chip-hover: #DEDEE3;
  --taso-text: #141416;
  --taso-text-2: rgba(20,20,22,0.7);
  --taso-text-3: rgba(20,20,22,0.5);
}

*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; color: inherit; cursor: pointer; }
a { color: inherit; }

.stage {
  position: relative;
  width: 100%;
  aspect-ratio: var(--taso-aspect, 16 / 9);
  background: #09090B;
  border-radius: var(--taso-radius);
  overflow: hidden;
}
.stage:fullscreen { border-radius: 0; aspect-ratio: auto; height: 100%; }

video {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: contain;
  background: #09090B;
}

/* The layer is sized to the video's content box; items are placed in % of it. */
.layer {
  position: absolute;
  pointer-events: none;
  font-size: calc(var(--taso-vh, 540px) * 0.026);
}
.layer > * { pointer-events: auto; }

.item {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.5em 0.75em;
  border: 0;
  border-radius: 0.55em;
  background: rgba(20,20,22,0.88);
  color: #F4F4F5;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 6px 20px rgba(0,0,0,0.35);
  transition: background 150ms ease, box-shadow 150ms ease;
}
.item:hover, .item:focus-visible { background: rgba(26,26,29,0.98); outline: none; }
.item:focus-visible { box-shadow: 0 0 0 2px var(--taso-accent), 0 6px 20px rgba(0,0,0,0.35); }
.item[data-type="command"], .item[data-type="code"] { font-family: var(--taso-mono); }
.item[data-type="command"] .prompt { color: rgba(244,244,245,0.45); user-select: none; }
.item .content { overflow: hidden; text-overflow: ellipsis; }
.item .affordance {
  display: inline-flex; align-items: center; gap: 0.35em;
  font-family: var(--taso-font); font-size: 0.8em; font-weight: 700;
  color: rgba(244,244,245,0.6); flex: 0 0 auto;
}
.item:hover .content, .item:focus-visible .content,
.item:hover .affordance .word, .item:focus-visible .affordance .word {
  background: var(--taso-gradient-text);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.item.copied .content, .item.copied .affordance .word { background: none; color: var(--taso-accent); -webkit-text-fill-color: initial; }
.item svg { width: 1em; height: 1em; flex: 0 0 auto; }

.item[data-type="image"] { padding: 0; background: transparent; box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 6px 20px rgba(0,0,0,0.35); }
.item[data-type="image"] img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 0.55em; }
.item[data-type="image"] .affordance {
  position: absolute; right: 0.5em; bottom: 0.5em;
  padding: 0.3em 0.6em; border-radius: 0.4em;
  background: rgba(20,20,22,0.85); color: #F4F4F5;
}

.item.hotspot {
  background: transparent; box-shadow: none; border-radius: 0.3em;
  cursor: pointer;
}
.item.hotspot:hover, .item.hotspot:focus-visible { box-shadow: inset 0 0 0 2px rgba(61,110,245,0.7); background: rgba(61,110,245,0.08); }

/* Controls */
.controls {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; gap: 8px;
  padding: 36px 14px 10px;
  background: linear-gradient(to top, rgba(9,9,11,0.9), rgba(9,9,11,0));
  color: #F4F4F5;
  opacity: 0; transition: opacity 180ms ease;
}
.stage:hover .controls, .stage:focus-within .controls, .stage.paused .controls { opacity: 1; }
.progress {
  position: relative; height: 14px; display: flex; align-items: center; cursor: pointer;
}
.progress .track { position: absolute; left: 0; right: 0; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.16); }
.progress .fill { position: absolute; left: 0; height: 3px; border-radius: 2px; background: var(--taso-gradient); width: 0; }
.progress .marker {
  position: absolute; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px;
  border-radius: 50%; background: rgba(255,255,255,0.75);
}
.progress:hover .track, .progress:hover .fill { height: 5px; }
.bar { display: flex; align-items: center; justify-content: space-between; }
.bar .group { display: flex; align-items: center; gap: 10px; }
.icon-btn {
  width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 8px; background: transparent; color: #F4F4F5;
}
.icon-btn:hover { background: rgba(255,255,255,0.1); }
.icon-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--taso-accent); }
.icon-btn svg { width: 16px; height: 16px; }
.time { font-size: 12.5px; color: rgba(244,244,245,0.85); font-variant-numeric: tabular-nums; }

/* Lightbox */
.lightbox {
  position: absolute; inset: 0; display: none;
  align-items: center; justify-content: center;
  background: rgba(9,9,11,0.92); padding: 24px;
}
.lightbox.open { display: flex; }
.lightbox img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
.lightbox .close { position: absolute; top: 12px; right: 12px; }
.lightbox .caption {
  position: absolute; left: 16px; bottom: 14px; right: 60px;
  font-size: 13px; color: rgba(244,244,245,0.75);
}

/* Now on screen */
.list {
  margin-top: 14px;
  padding: 16px 16px 10px;
  background: var(--taso-surface);
  border-radius: var(--taso-radius);
  display: flex; flex-direction: column; gap: 8px;
}
.list[hidden] { display: none; }
.list-head { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 4px; }
.list-head .title { font-size: 11.5px; letter-spacing: 0.04em; color: var(--taso-text-3); font-weight: 600; }
.list-head .count { font-size: 12px; color: var(--taso-text-3); }
.row {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 10px 12px; border-radius: 10px; background: var(--taso-row);
  transition: background 150ms ease, opacity 300ms ease;
}
.row:hover { background: var(--taso-row-hover); }
.row.lingering { opacity: 0.55; }
.row .main {
  display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 auto;
  background: transparent; border: 0; padding: 0; text-align: left; border-radius: 8px;
}
.row .main:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--taso-accent); }
.row .type {
  width: 30px; height: 30px; flex: 0 0 30px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--taso-chip); color: var(--taso-text-2);
}
.row .type svg { width: 14px; height: 14px; }
.row.active .type { background: var(--taso-accent-soft); color: var(--taso-accent); }
.row .text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.row .text .label { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row.mono .text .label { font-family: var(--taso-mono); }
.row .text .meta { font-size: 11.5px; color: var(--taso-text-3); font-variant-numeric: tabular-nums; }
.row .action {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px;
  border: 0; border-radius: 8px; background: var(--taso-chip); color: var(--taso-text);
  font-size: 12.5px; font-weight: 600; text-decoration: none; flex: 0 0 auto;
  transition: background 150ms ease;
}
.row .action:hover { background: var(--taso-chip-hover); }
.row .action:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--taso-accent); }
.row .action svg { width: 13px; height: 13px; }
.row .action:hover ~ .main .label, .row:has(.action:hover) .label, .row:has(.action:hover) .action .word {
  background: var(--taso-gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.row.copied .label, .row.copied .action .word { background: none; -webkit-text-fill-color: initial; color: var(--taso-accent); }
.list .hint { font-size: 11.5px; color: var(--taso-text-3); padding: 4px 2px 0; }
.list .hint kbd { font-family: var(--taso-mono); font-size: 11px; padding: 1px 5px; border-radius: 4px; background: var(--taso-chip); }
.empty { font-size: 12.5px; color: var(--taso-text-3); padding: 6px 2px; }

.notice {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  padding: 10px 14px; border-radius: 10px; background: rgba(20,20,22,0.9);
  color: var(--taso-text-2); font-size: 13px; pointer-events: none;
}
.error {
  padding: 16px; border-radius: var(--taso-radius); background: var(--taso-surface);
  color: var(--taso-text-2); font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  .item, .row, .controls, .row .action { transition: none; }
}
`;
