/**
 * index.js — locale + theme/palette antes del primer paint (sync, no module).
 * ?s= b64url({ theme, palette, embed? }) · legacy ?theme= / ?palette=
 */
(function () {
  var sys = (navigator.language || (navigator.languages && navigator.languages[0]) || '').trim();
  document.documentElement.lang = sys || 'es';
  var THEMES = { light: 1, dark: 1 };
  var PALETTES = { insoft: 1, contapyme: 1, agrowin: 1 };
  var params = new URLSearchParams(location.search);
  var root = document.documentElement;
  var fromS = null;
  var raw = params.get('s');
  if (raw) {
    try {
      var pad = String(raw).replace(/-/g, '+').replace(/_/g, '/');
      while (pad.length % 4) pad += '=';
      var bin = atob(pad);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      fromS = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      fromS = null;
    }
  }
  var themeParam = (fromS && fromS.theme) || params.get('theme') || params.get('mode');
  var paletteParam = (fromS && fromS.palette) || params.get('palette');
  var embed = !!(fromS && fromS.embed)
    || (params.has('embed') && params.get('embed') !== '0' && params.get('embed') !== 'false');
  var theme = THEMES[themeParam] ? themeParam : null;
  var palette = PALETTES[paletteParam] ? paletteParam : null;
  if (!theme) {
    var lsT = localStorage.getItem('iswc-theme');
    theme = THEMES[lsT] ? lsT : (root.dataset.theme || 'dark');
  }
  if (!palette) {
    var lsP = localStorage.getItem('iswc-palette');
    palette = PALETTES[lsP] ? lsP : (root.dataset.palette || 'contapyme');
  }
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  if (embed) root.dataset.embed = '1';
})();
