/**
 * doc-demo-boot.ts — locale + theme/palette + CSS crítico (ESM).
 *
 * Side-effect al importar, o `applyDocDemoBoot(opts)`.
 * Carga vía module / `L.loadPageModules(['iswc-doc-demo-boot'])` (type module).
 *
 * Lee attrs del primer `<iswc-doc-demo>` si no vienen en opts
 * (`theme-storage-key`, `palette-storage-key`).
 */

import type { DocDemoBootOpts } from "./doc-demo-boot.schemas.js";
export function applyDocDemoBoot(opts: DocDemoBootOpts = {}): void {
  const host = document.querySelector('iswc-doc-demo');
  const themeKey = opts.themeKey
    || host?.getAttribute('theme-storage-key')
    || 'iswc-theme';
  const paletteKey = opts.paletteKey
    || host?.getAttribute('palette-storage-key')
    || 'iswc-palette';
  const defaultTheme = opts.defaultTheme || 'dark';
  const defaultPalette = opts.defaultPalette || 'contapyme';

  const sys = (navigator.language || (navigator.languages && navigator.languages[0]) || '').trim();
  document.documentElement.lang = sys || 'es';

  const THEMES: Record<string, 1> = { light: 1, dark: 1 };
  const PALETTES: Record<string, 1> = { insoft: 1, contapyme: 1, agrowin: 1 };
  const params = new URLSearchParams(location.search);
  const root = document.documentElement;

  let fromS: { theme?: string; palette?: string; embed?: boolean } | null = null;
  const raw = params.get('s');
  if (raw) {
    try {
      let pad = String(raw).replace(/-/g, '+').replace(/_/g, '/');
      while (pad.length % 4) pad += '=';
      const bin = atob(pad);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      fromS = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      fromS = null;
    }
  }

  const themeParam = (fromS && fromS.theme) || params.get('theme') || params.get('mode');
  const paletteParam = (fromS && fromS.palette) || params.get('palette');
  const embed = !!(fromS && fromS.embed)
    || (params.has('embed') && params.get('embed') !== '0' && params.get('embed') !== 'false');

  let theme = themeParam && THEMES[themeParam] ? themeParam : null;
  let palette = paletteParam && PALETTES[paletteParam] ? paletteParam : null;
  if (!theme) {
    const lsT = localStorage.getItem(themeKey);
    theme = lsT && THEMES[lsT] ? lsT : (root.dataset.theme || defaultTheme);
  }
  if (!palette) {
    const lsP = localStorage.getItem(paletteKey);
    palette = lsP && PALETTES[lsP] ? lsP : (root.dataset.palette || defaultPalette);
  }
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  if (embed) root.dataset.embed = '1';

  if (!document.getElementById('iswc-doc-demo-critical')) {
    const style = document.createElement('style');
    style.id = 'iswc-doc-demo-critical';
    style.textContent = [
      'html[data-theme="dark"],html[data-theme="dark"] body{background:#0f1520;color:#e7eef8}',
      'html[data-theme="light"],html[data-theme="light"] body{background:#f4f7fb;color:#142033}',
      '.shell-bar iswc-button:not(:defined),.shell-bar iswc-icon:not(:defined),',
      '.shell-bar iswc-theme-toggle:not(:defined),.shell-bar iswc-palette-selector:not(:defined){visibility:hidden}',
      'html,body{height:100%;margin:0}',
    ].join('');
    document.head.appendChild(style);
  }
}

applyDocDemoBoot();
