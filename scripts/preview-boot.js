/**
 * preview-boot.js — sync, sin defer/module.
 * Aplica theme + palette desde ?s= (iniciales) o localStorage ANTES del primer paint.
 * No escribe la URL: s solo representa el estado inicial de esa carga.
 *
 * ?s= b64url({ theme, palette, embed? })
 * Legacy (solo lectura): ?theme= & ?palette=
 */
(() => {
  const THEMES = new Set(['light', 'dark']);
  const PALETTES = new Set(['insoft', 'contapyme', 'agrowin']);
  const params = new URLSearchParams(location.search);
  const root = document.documentElement;

  const b64urlDecode = (input) => {
    let pad = String(input).replace(/-/g, '+').replace(/_/g, '/');
    while (pad.length % 4) pad += '=';
    const bin = atob(pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };

  let fromS = null;
  const raw = params.get('s');
  if (raw) {
    try { fromS = JSON.parse(b64urlDecode(raw)); } catch { fromS = null; }
  }

  const themeParam = (fromS && fromS.theme) || params.get('theme') || params.get('mode');
  const paletteParam = (fromS && fromS.palette) || params.get('palette');
  const embed = !!(fromS && fromS.embed) || (params.has('embed') && params.get('embed') !== '0' && params.get('embed') !== 'false');

  let theme = THEMES.has(themeParam) ? themeParam : null;
  let palette = PALETTES.has(paletteParam) ? paletteParam : null;

  if (!theme) {
    const ls = localStorage.getItem('is-theme');
    theme = THEMES.has(ls) ? ls : (root.dataset.theme || 'dark');
  }
  if (!palette) {
    const ls = localStorage.getItem('is-palette');
    palette = PALETTES.has(ls) ? ls : (root.dataset.palette || 'insoft');
  }

  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme === 'dark');
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  if (embed) root.dataset.embed = '1';
})();
