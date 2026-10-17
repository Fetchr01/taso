import { TasoPlayer } from './player.js';

export { TasoPlayer };
export { loadManifest, normalizeManifest, resolveItems, ManifestError } from './manifest.js';
export { Timeline } from './timeline.js';
export type * from './types.js';

if (typeof customElements !== 'undefined' && !customElements.get('taso-player')) {
  customElements.define('taso-player', TasoPlayer);
}

declare global {
  interface HTMLElementTagNameMap {
    'taso-player': TasoPlayer;
  }
}
