export interface Strings {
  nowOnScreen: string;
  allItems: (n: number) => string;
  nothingYet: string;
  copy: string;
  copied: string;
  open: string;
  expand: string;
  jump: string;
  play: string;
  pause: string;
  fullscreen: string;
  close: string;
  hint: string;
  type: Record<string, string>;
  opensHost: (host: string) => string;
  loadError: string;
}

const fi: Strings = {
  nowOnScreen: 'NYT RUUDULLA',
  allItems: (n) => `Kaikki kohteet (${n})`,
  nothingYet: 'Kohteet ilmestyvät tähän, kun ne näkyvät videossa.',
  copy: 'Kopioi',
  copied: 'Kopioitu',
  open: 'Avaa',
  expand: 'Suurenna',
  jump: 'Siirry',
  play: 'Toista',
  pause: 'Tauko',
  fullscreen: 'Koko näyttö',
  close: 'Sulje',
  hint: 'Näppäimistö: <kbd>c</kbd> kopioi viimeisimmän komennon · <kbd>␣</kbd> toista/tauko',
  type: { command: 'Komento', code: 'Koodi', link: 'Linkki', image: 'Kuva', file: 'Tiedosto', text: 'Teksti', mention: 'Maininta', hotspot: 'Alue' },
  opensHost: (host) => `Avaa ${host}`,
  loadError: 'Videota ei voitu ladata.',
};

const en: Strings = {
  nowOnScreen: 'NOW ON SCREEN',
  allItems: (n) => `All items (${n})`,
  nothingYet: 'Items appear here as they show up in the video.',
  copy: 'Copy',
  copied: 'Copied',
  open: 'Open',
  expand: 'Expand',
  jump: 'Jump',
  play: 'Play',
  pause: 'Pause',
  fullscreen: 'Fullscreen',
  close: 'Close',
  hint: 'Keyboard: <kbd>c</kbd> copies the latest command · <kbd>␣</kbd> play/pause',
  type: { command: 'Command', code: 'Code', link: 'Link', image: 'Image', file: 'File', text: 'Text', mention: 'Mention', hotspot: 'Area' },
  opensHost: (host) => `Opens ${host}`,
  loadError: 'The video could not be loaded.',
};

export function stringsFor(lang: string | undefined): Strings {
  return (lang ?? '').toLowerCase().startsWith('fi') ? fi : en;
}
