import { adoptCss } from '../_shared/adopt-css.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import '../media/icon.js';

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
 *     { "id": "new", "title": "Nuevo documento", "group": "Archivo", "icon": "mdi:file-plus", "hint": "Crear archivo en blanco" },
 *     ...
 *   ]
 *   </script>
 *
 * Cada comando también puede llevar `disabled` y `keywords` (string[]) para
 * búsqueda.
 *
 * Slots
 *   footer — bloque bajo los resultados (atajos de teclado, por ejemplo)
 *
 * Eventos
 *   is-open, is-close
 *   is-select   detail: { command, id }
 *
 * API
 *   palette.open() / .close() / .toggle()
 *   palette.commands  array cargado (read-only)
 *   palette.results  resultados actuales (read-only)
 */
(() => {
  const OBSERVED = ['hotkey', 'placeholder', 'max-results', 'empty-text'];

  class IsCommandPalette extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;
    #commands = [];
    #results = [];
    #active = 0;
    #query = '';

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <dialog part="dialog" class="dialog">
          <div class="panel" part="panel">
            <header class="bar">
              <span class="ico"><is-icon icon="mdi:magnify"></is-icon></span>
              <input part="input" class="input" id="input" type="text" autocomplete="off" />
            </header>
            <ol part="results" class="results" id="results" role="listbox"></ol>
            <div part="empty" class="empty" id="empty" hidden></div>
            <footer part="footer" class="footer">
              <slot name="footer"></slot>
            </footer>
          </div>
        </dialog>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#dialog = this.shadowRoot.querySelector('.dialog');
      this.#input = this.shadowRoot.getElementById('input');
      this.#resultsEl = this.shadowRoot.getElementById('results');
      this.#empty = this.shadowRoot.getElementById('empty');

      this.#input.addEventListener('input', () => this.#query = this.#input.value, this.#search());
      this.#input.addEventListener('keydown', (e) => this.#onKey(e));
      this.#dialog.addEventListener('click', (e) => {
        if (e.target === this.#dialog) this.close();
        const item = e.target.closest('[role="option"]');
        if (item) this.#selectByIndex(Number(item.dataset.idx));
      });
    }

    connectedCallback() {
      this.#mounted = true;
      this.#readCommands();
      this.#bindHotkey();
    }

    disconnectedCallback() {
      this.#mounted = false;
      document.removeEventListener('keydown', this.#hotkeyHandler);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'hotkey') this.#bindHotkey();
      if (name === 'placeholder') this.#input.placeholder = newVal || '';
      if (name === 'empty-text') this.#empty.textContent = newVal || '';
    }

    get commands() { return this.#commands; }
    get results() { return this.#results; }

    open() {
      if (this.hasAttribute('disabled')) return;
      this.#input.value = '';
      this.#query = '';
      this.#search();
      if (!this.#dialog.open) this.#dialog.showModal();
      // sync atributo open para CSS hooks
      this.setAttribute('open', '');
      this.#input.focus();
      this.dispatchEvent(new CustomEvent('is-open', { bubbles: true, composed: true }));
    }

    close() {
      if (this.#dialog.open) this.#dialog.close();
      this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('is-close', { bubbles: true, composed: true }));
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

    #matchesCombo(e, combo) {
      const parts = combo.toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
      const needMod = parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl');
      const wantKey = parts.filter((p) => !['mod', 'cmd', 'ctrl'].includes(p)).pop();
      if (!wantKey) return false;
      const okMod = (parts.includes('mod') ? (e.metaKey || e.ctrlKey) : (parts.includes('cmd') ? e.metaKey : parts.includes('ctrl') ? e.ctrlKey : true));
      return okMod && e.key.toLowerCase() === wantKey.toLowerCase();
    }

    #onKey(e) {
      if (this.#results.length === 0) {
        if (e.key === 'Escape') this.close();
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.#active = (this.#active + 1) % this.#results.length; this.#renderResults(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.#active = (this.#active - 1 + this.#results.length) % this.#results.length; this.#renderResults(); }
      else if (e.key === 'Enter') { e.preventDefault(); this.#selectByIndex(this.#active); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    }

    #score(item, query) {
      const q = query.toLowerCase();
      if (!q) return 0;
      const t = String(item.title || '').toLowerCase();
      let s = 0;
      if (t.includes(q)) s += 5;
      if (t.startsWith(q)) s += 2;
      const kws = (item.keywords || []).map((k) => String(k).toLowerCase());
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
          opt.innerHTML = `<span class="ico">${c.icon ? `<is-icon icon="${c.icon}"></is-icon>` : ''}</span><span class="label"><span class="t">${escapeHtml(c.title || c.id)}</span>${c.hint ? `<span class="hint">${escapeHtml(c.hint)}</span>` : ''}</span>`;
          this.#resultsEl.appendChild(opt);
          idx++;
        }
      }
      if (!this.#results.length) return;
      const active = this.#resultsEl.querySelector('.opt.is-active');
      active?.scrollIntoView({ block: 'nearest' });
    }

    #selectByIndex(idx) {
      const c = this.#results[idx];
      if (!c) return;
      this.dispatchEvent(new CustomEvent('is-select', { bubbles: true, composed: true, detail: { command: c, id: c.id } }));
      try { if (typeof c.run === 'function') c.run(); } catch { /* noop */ }
      this.close();
    }

    #dialog;
    #input;
    #resultsEl;
    #empty;
    #hotkeyHandler;
  }

  if (!customElements.get('is-command-palette')) customElements.define('is-command-palette', IsCommandPalette);
})();
