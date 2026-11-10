// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/src/js/boot.ts
// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * boot.ts — tema y paleta ANTES del primer pintado. Script plano (IIFE), síncrono en <head>.
 *
 * Orden: `?s=` (base64url JSON con `theme`/`palette`) > lo que eligió el usuario en la config
 * persistente del kit (`iswc:app-cfg`, la que escriben `<iswc-theme-toggle>` y
 * `<iswc-palette-selector>`, ver core/app-init.ts) > los defaults de la app (`<html data-theme
 * data-palette>`, los mismos que van a `initApp`). Sin esto, cada carga parpadea con el default y
 * el tema elegido se pierde al recargar.
 *
 * Lee también las llaves viejas (`iswc-app-cfg`, `iswc-theme`, `iswc-palette`) por si el kit aún no
 * las migró en este navegador; no escribe nada (la migración es de `core/app-init.ts`).
 */
(function () {
  type Estado = { theme?: unknown; palette?: unknown };
  const raiz = document.documentElement;
  const leer = (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const json = (t: string | null): Estado => {
    try {
      const v: unknown = t ? JSON.parse(t) : null;
      return v && typeof v === 'object' ? (v as Estado) : {};
    } catch {
      return {};
    }
  };
  const url = (): Estado => {
    try {
      const s = new URLSearchParams(location.search).get('s');
      if (!s) return {};
      let b = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      return json(new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0))));
    } catch {
      return {};
    }
  };
  const esTema = (v: unknown): v is 'light' | 'dark' => v === 'light' || v === 'dark';
  const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
  const q = url();
  const cfg = json(leer('iswc:app-cfg') || leer('iswc-app-cfg'));
  const viejo = leer('iswc-theme');
  const tema = esTema(q.theme) ? q.theme : esTema(cfg.theme) ? cfg.theme : esTema(viejo) ? viejo : raiz.dataset.theme === 'dark' ? 'dark' : 'light';
  raiz.dataset.theme = tema;
  raiz.classList.toggle('theme-dark', tema === 'dark');
  raiz.classList.toggle('theme-light', tema === 'light');
  raiz.dataset.palette = texto(q.palette) || texto(cfg.palette) || leer('iswc-palette') || raiz.dataset.palette || 'delfin';
})();
