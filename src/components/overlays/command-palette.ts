import { adoptCss, defineElement, emit } from '../../core/element.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import '../media/icon.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-command-palette> — Paleta de comandos al estilo Cmd+K / Ctrl+K.
 *
 * Atributos
 *   hotkey           combinación que abre el menú. Default "mod+k" (Ctrl en
 *                    Windows/Linux, Cmd en macOS). Vacío para desactivar.
 *   placeholder      texto del input
 *   max-results      tope de resultados (default 12)
 *   empty-text       texto cuando no hay resultados
 *
 * Comandos
 *   <script type="application/json">
 *   [
 *     { "id": "new", "title": "Nuevo documento", "group": "Archivo",
 *       "icon": "mdi:file-plus", "hint": "Crear archivo en blanco",
 *       "keys": ["Ctrl", "N"] },
 *     ...
 *   ]
 *   </script>
 *
 * Cada comando también puede llevar `disabled`, `keywords` (string[]) y
 * `keys` / `shortcut` (string | string[]) para el atajo a la derecha.
 *
 * Slots
 *   footer — bloque extra bajo los resultados (los atajos ↑↓/↵/Esc ya van
 *            embebidos en el shadow; el slot se suma a la derecha)
 *
 * Eventos (vocabulario de ModalBase)
 *   is-show / is-after-show, is-hide / is-after-hide
 *   is-select   detail: { command, id }
 *
 * API
 *   palette.open() / .close() / .toggle()
 *   palette.commands  array cargado (read-only)
 *   palette.results  resultados actuales (read-only)
 */
(() => {
  const OBSERVED = ['hotkey', 'placeholder', 'max-results', 'empty-text'];

  class IsCommandPalette extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    radius: '--is-popover-radius',
    shadow: '--is-popover-shadow',
    'bar-gap': '--is-surface-bar-gap',
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'radius', 'shadow', 'bar-gap']; }
    #commands = [];
    #results = [];
    #active = 0;
    #query = '';

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <dialog part="dialog" class="dialog">
          <div class="panel is-popover-panel" part="panel">
            <header class="bar is-surface-bar">
              <span class="ico"><is-icon icon="mdi:magnify"></is-icon></span>
              <input part="input" class="input" id="input" type="text" autocomplete="off" />
            </header>
            <ol part="results" class="results" id="results" role="listbox"></ol>
            <div part="empty" class="empty" id="empty" hidden></div>
            <footer part="footer" class="footer">
              <span class="hint-item"><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
              <span class="hint-item"><kbd>↵</kbd> ejecutar</span>
              <span class="hint-item"><kbd>Esc</kbd> cerrar</span>
              <span class="footer-extra"><slot name="footer"></slot></span>
            </footer>
          </div>
        </dialog>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#dialog = this.shadowRoot!.querySelector<HTMLElement>('.dialog')!;
      this.#input = this.shadowRoot!.getElementById('input')!;
      this.#resultsEl = this.shadowRoot!.getElementById('results')!;
      this.#empty = this.shadowRoot!.getElementById('empty')!;

      this.#input.addEventListener('input', () => {
        this.#query = this.#input.value;
        this.#search();
      });
      this.#input.addEventListener('keydown', (e) => this.#onKey(e));
      // <dialog> ya emite `cancel` con Escape (y el UA lo cierra solo):
      // basta sincronizar el estado en vez de interceptar la tecla.
      this.#dialog.addEventListener('cancel', () => this.close());
      this.#dialog.addEventListener('click', (e) => {
        if (e.target === this.#dialog) this.close();
        const item = e.target.closest('[role="option"]');
        if (item) this.#selectByIndex(Number(item.dataset.idx));
      });
    }

    onConnected() {
      this.#input.placeholder = this.getAttribute('placeholder') || 'Buscar comando…';
      this.#empty.textContent = this.getAttribute('empty-text') || 'Sin resultados';
      this.#readCommands();
      this.#bindHotkey();
    }

    onDisconnected() {
      document.removeEventListener('keydown', this.#hotkeyHandler);
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'hotkey') this.#bindHotkey();
      if (name === 'placeholder') this.#input.placeholder = newVal || '';
      if (name === 'empty-text') this.#empty.textContent = newVal || '';
    }

    get commands() { return this.#commands; }
    get results() { return this.#results; }

    open() {
      if (this.hasAttribute('disabled')) return;
      emit(this, 'is-show');
      this.#input.value = '';
      this.#query = '';
      this.#search();
      if (!this.#dialog.open) this.#dialog.showModal();
      // sync atributo open para CSS hooks
      this.setAttribute('open', '');
      this.#input.focus();
      emit(this, 'is-after-show');
    }

    close() {
      if (!this.hasAttribute('open')) return;
      emit(this, 'is-hide');
      if (this.#dialog.open) this.#dialog.close();
      this.removeAttribute('open');
      emit(this, 'is-after-hide');
    }

    toggle() { this.#dialog.open ? this.close() : this.open(); }

    #readCommands() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) { this.#commands = []; return; }
      try { this.#commands = JSON.parse(script.textContent); }
      catch { this.#commands = []; }
    }

    #bindHotkey() {
      document.removeEventListener('keydown', this.#hotkeyHandler);
      const combo = this.getAttribute('hotkey') ?? 'mod+k';
      if (!combo) return;
      this.#hotkeyHandler = (e) => {
        if (!this.#matchesCombo(e, combo)) return;
        e.preventDefault();
        this.toggle();
      };
      document.addEventListener('keydown', this.#hotkeyHandler);
    }

    #matchesCombo(e, combo: string) {
      const parts = combo.toLowerCase().split('+').map((s: string) => s.trim()).filter(Boolean);
      const needMod = parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl');
      const wantKey = parts.filter((p) => !['mod', 'cmd', 'ctrl'].includes(p)).pop();
      if (!wantKey) return false;
      const okMod = (parts.includes('mod') ? (e.metaKey || e.ctrlKey) : (parts.includes('cmd') ? e.metaKey : parts.includes('ctrl') ? e.ctrlKey : true));
      return okMod && e.key.toLowerCase() === wantKey.toLowerCase();
    }

    /** Escape NO se maneja aquí: lo cierra el propio <dialog> y llega por
     *  el evento `cancel`. */
    #onKey(e) {
      if (this.#results.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); this.#active = (this.#active + 1) % this.#results.length; this.#renderResults(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.#active = (this.#active - 1 + this.#results.length) % this.#results.length; this.#renderResults(); }
      else if (e.key === 'Enter') { e.preventDefault(); this.#selectByIndex(this.#active); }
    }

    #score(item, query: string) {
      const q = query.toLowerCase();
      if (!q) return 0;
      const t = String(item.title || '').toLowerCase();
      let s = 0;
      if (t.includes(q)) s += 5;
      if (t.startsWith(q)) s += 2;
      const kws = (item.keywords || []).map((k: string) => String(k).toLowerCase());
      if (kws.some((k) => k.includes(q))) s += 2;
      if (String(item.group || '').toLowerCase().includes(q)) s += 1;
      return s;
    }

    #search() {
      const q = this.#query.trim();
      const items = (this.#commands || []).filter((c) => !c.disabled);
      if (!q) {
        this.#results = items.slice(0, Number(this.getAttribute('max-results')) || 12);
      } else {
        this.#results = items
          .map((c) => ({ c, s: this.#score(c, q) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, Number(this.getAttribute('max-results')) || 12)
          .map((x) => x.c);
        if (!this.#results.length) this.#results = items.slice(0, 4).filter((c) => /^[a-z]/i.test(c.title?.[0] || '') && c.id);
      }
      this.#active = 0;
      this.#empty.hidden = this.#results.length !== 0;
      this.#empty.textContent = this.getAttribute('empty-text') || this.#empty.textContent;
      this.#renderResults();
    }

    #renderResults() {
      this.#resultsEl.innerHTML = '';
      const groups = new Map();
      this.#results.forEach((c, i) => {
        const g = c.group || '—';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push({ c, i });
      });
      let idx = 0;
      for (const [groupName, items] of groups) {
        const gh = document.createElement('li');
        gh.className = 'group-head';
        gh.textContent = groupName;
        this.#resultsEl.appendChild(gh);
        for (const { c, i } of items) {
          const opt = document.createElement('li');
          opt.role = 'option';
          opt.dataset.idx = String(i);
          opt.className = 'opt' + (idx === this.#active ? ' is-active' : '');
          const keysHtml = this.#keysHtml(c);
          opt.innerHTML = `<span class="ico">${c.icon ? `<is-icon icon="${c.icon}"></is-icon>` : ''}</span><span class="label"><span class="t">${escapeHtml(c.title || c.id)}</span>${c.hint ? `<span class="hint">${escapeHtml(c.hint)}</span>` : ''}</span>${keysHtml ? `<span class="keys" part="keys">${keysHtml}</span>` : '<span class="keys" aria-hidden="true"></span>'}`;
          this.#resultsEl.appendChild(opt);
          idx++;
        }
      }
      if (!this.#results.length) return;
      const active = this.#resultsEl.querySelector<HTMLElement>('.opt.is-active');
      active?.scrollIntoView({ block: 'nearest' });
    }

    /** Normaliza `keys` / `shortcut` → chips `<kbd>` a la derecha. */
    #keysHtml(c) {
      const raw = c.keys ?? c.shortcut ?? c.hotkey;
      if (raw == null || raw === '') return '';
      const parts = Array.isArray(raw)
        ? raw.map((k: string) => String(k).trim()).filter(Boolean)
        : String(raw).split(/[+ ]+/).map((k: string) => k.trim()).filter(Boolean);
      if (!parts.length) return '';
      return parts.map((k) => `<kbd>${escapeHtml(k)}</kbd>`).join('');
    }

    #selectByIndex(idx) {
      const c = this.#results[idx];
      if (!c) return;
      emit(this, 'is-select', { command: c, id: c.id });
      try { if (typeof c.run === 'function') c.run(); } catch { /* noop */ }
      this.close();
    }

    #dialog!: HTMLElement;
    #input!: HTMLElement;
    #resultsEl!: HTMLElement;
    #empty!: HTMLElement;
    #hotkeyHandler;
  }

  defineElement('is-command-palette', IsCommandPalette);
})();
