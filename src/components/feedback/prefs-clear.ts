import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../media/icon.js';
import { clearAllComponentPrefs, peekComponentPrefsRoot } from '../_shared/prefs.js';
import { borrarAppCfg, leerAppCfg } from '../../core/app-cfg.js';

/**
 * <iswc-prefs-clear> — borra la memoria persistente de los is-* (localStorage).
 *
 * Limpia la config de la app (`iswc-app-cfg`: tema, paleta y demás valores que
 * eligió el usuario; la app vuelve a su config inicial de `initApp`) y `iswc-root`
 * (y el legacy `is-components`): tamaños de iswc-split-panel, scroll remember,
 * snapshots de grid, etc. Sirve para auditar la carga inicial limpia.
 *
 * Attributes
 *   confirm   boolean — pide window.confirm antes (default true)
 *   reload    boolean — recarga la página tras limpiar (default true)
 *   scope     prefs (default) — config de la app y memoria de los is-* (`iswc-app-cfg` + `iswc-root`).
 *             cache — además Cache Storage (módulos del loader), las bases IndexedDB
 *                     (hojas del kit, cachés HTTP de la app) y sessionStorage.
 *             all   — además TODO el localStorage del origen (preferencias, sesión).
 *   variant / color / shape — se reenvían al iswc-button interno
 *   Sin hijos en el slot → solo icono (aria-label / title dan el nombre).
 *
 * Events
 *   iswc-prefs-clear  detail: { tags: string[], appCfg: string[], reloaded: boolean, scope, caches: string[], bases: string[] }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <iswc-button part="button" type="button" color="neutral" variant="plain" aria-label="Limpiar memoria UI">
      <iswc-icon slot="start" icon="mdi:broom" aria-hidden="true"></iswc-icon>
      <slot></slot>
    </iswc-button>
  `;

  /** Cache Storage, bases IndexedDB y sessionStorage del origen (y localStorage si `todo`). */
  async function limpiarCaches(todo: boolean): Promise<{ caches: string[]; bases: string[] }> {
    const borradas: string[] = [];
    const bases: string[] = [];
    try {
      for (const nombre of await caches.keys()) { await caches.delete(nombre); borradas.push(nombre); }
    } catch { /* sin Cache Storage */ }
    try {
      const lista = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
      for (const db of lista) {
        const nombre = db.name;
        if (!nombre) continue;
        await new Promise<void>((ok) => { const r = indexedDB.deleteDatabase(nombre); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
        bases.push(nombre);
      }
    } catch { /* sin IndexedDB */ }
    try { sessionStorage.clear(); } catch { /* sin storage */ }
    if (todo) { try { localStorage.clear(); } catch { /* sin storage */ } }
    return { caches: borradas, bases };
  }

  class IswcPrefsClear extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['confirm', 'reload', 'scope', 'variant', 'color', 'shape', 'disabled', 'title', 'aria-label'];
    }

    #btn!: HTMLElement;
    #busy = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector<HTMLElement>('iswc-button')!;
      this.#btn.addEventListener('iswc-click', this.#onClick as EventListener);
    }

    connectedCallback(): void {
      this.#syncAttrs();
      if (!this.hasAttribute('title')) {
        this.#btn.title = this.scope === 'prefs' ? 'Borra la configuración guardada (tema, paleta, paneles…) y recarga' : 'Borra la configuración guardada y la caché del navegador, y recarga';
      }
    }

    attributeChangedCallback() {
      this.#syncAttrs();
    }

    get confirm() {
      return this.getAttribute('confirm') !== 'false';
    }
    set confirm(v) {
      this.setAttribute('confirm', v ? 'true' : 'false');
    }

    get reload() {
      return this.getAttribute('reload') !== 'false';
    }
    set reload(v) {
      this.setAttribute('reload', v ? 'true' : 'false');
    }

    /** Alcance de la limpieza: `prefs` (default), `cache` o `all`. */
    get scope(): 'prefs' | 'cache' | 'all' {
      const v = this.getAttribute('scope');
      return v === 'cache' || v === 'all' ? v : 'prefs';
    }
    set scope(v: 'prefs' | 'cache' | 'all') {
      this.setAttribute('scope', v);
    }

    /** API: limpia sin UI (respeta confirm/reload del host). */
    clear() {
      return this.#run();
    }

    /** API: peeks sin borrar. */
    peek() {
      return peekComponentPrefsRoot();
    }

    #syncAttrs() {
      if (!this.#btn) return;
      for (const a of ['variant', 'color', 'shape', 'disabled', 'title', 'aria-label']) {
        const v = this.getAttribute(a);
        if (v != null) this.#btn.setAttribute(a, v);
        else if (a === 'disabled' || a === 'title') this.#btn.removeAttribute(a);
        else if (a === 'aria-label') {
          this.#btn.setAttribute('aria-label', 'Limpiar memoria UI');
        }
      }
    }

    #onClick = (e: PointerEvent) => {
      e.stopPropagation();
      void this.#run();
    };

    async #run() {
      if (this.#busy) return null;
      const tags = Object.keys(peekComponentPrefsRoot() || {});
      const cfg = Object.keys(leerAppCfg());
      if (this.confirm) {
        const partes = [
          cfg.length ? `• Configuración de la app: ${cfg.join(', ')}` : '',
          tags.length ? `• Memoria de componentes: ${tags.join(', ')}` : '',
          this.scope !== 'prefs' ? '• Caché del navegador (módulos, bases locales, sesión)' : '',
          this.scope === 'all' ? '• Todo el localStorage del sitio' : '',
        ].filter(Boolean);
        const accion = this.reload ? ' y recargar' : '';
        const ok = window.confirm(
          partes.length
            ? `¿Borrar lo guardado${accion}?\n\n${partes.join('\n')}`
            : `No hay nada guardado: la app ya está con su configuración inicial.${this.reload ? ' ¿Recargar igual?' : ''}`,
        );
        if (!ok) return null;
      }

      this.#busy = true;
      const appCfg = Object.keys(borrarAppCfg());
      const result = clearAllComponentPrefs();
      const extra = this.scope === 'prefs' ? { caches: [], bases: [] } : await limpiarCaches(this.scope === 'all');
      emit(this, 'iswc-prefs-clear', { tags: result.tags, appCfg, reloaded: this.reload, scope: this.scope, ...extra });

      if (this.reload) {
        location.reload();
        return result;
      }
      this.#busy = false;
      return result;
    }
  }

  defineElement('iswc-prefs-clear', IswcPrefsClear, 'IswcPrefsClear');
})();
