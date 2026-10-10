/**
 * boot.ts — tema y paleta ANTES del primer pintado. Script plano (IIFE), síncrono en <head>.
 *
 * Orden: `?s=` (base64url JSON con `theme`/`palette`) > localStorage del kit (`iswc-theme`,
 * `iswc-palette`) > `dark` / `contapyme`. Sin esto, cada carga parpadea en claro.
 */
(function () {
  const raiz = document.documentElement;
  let estado: { theme?: string; palette?: string } = {};
  try {
    const s = new URLSearchParams(location.search).get('s');
    if (s) {
      let b = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      estado = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)))) || {};
    }
  } catch {
    /* ?s= corrupto: se ignora */
  }
  const leer = (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const tema = estado.theme === 'light' || estado.theme === 'dark' ? estado.theme : leer('iswc-theme') === 'light' ? 'light' : 'dark';
  raiz.dataset.theme = tema;
  raiz.classList.toggle('theme-dark', tema === 'dark');
  raiz.classList.toggle('theme-light', tema === 'light');
  raiz.dataset.palette = estado.palette || leer('iswc-palette') || 'contapyme';
})();
