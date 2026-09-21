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

  interface Command {
    id: string;
    title?: string;
    group?: string;
    icon?: string;
    hint?: string;
    keys?: string | string[];
    shortcut?: string | string[];
    hotkey?: string | string[];
    keywords?: string[];
    disabled?: boolean;
    run?: () => void;
  }

  /** Letras/numeros previos a la query (LIFO). Solo memoria de la sesion. */
  type History = string[];

  class IsCommandPalette extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    radius: '--is-popover-radius',
    shadow: '--is-popover-shadow',
    'bar-gap': '--is-surface-bar-gap',
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'radius', 'shadow', 'bar-gap']; }
    #commands: Command[] = [];
    #results: Command[] = [];
    #active = 0;
    #query = '';
    /** ids estables ("cmd-opt-i") por comando renderizado, re-asignados en cada render. */
    #optionIds: string[] = [];
    /** Lista LIFO de queries previas (sesion). ↑ cuando input vacio las cicla. */
    #history: History = [];
    #historyPos = -1; // -1 = presente, 0 = ultima query, etc.
    /** Snapshot del input "antes de empezar ↑" para volver con ↓. */
    #draftSnapshot = '';
    /** Anuncios debounced (aria-live polite) — max 1 por ~120ms. */
    #announceTimer = 0;
    /** id para aria-activedescendant; null si no hay opcion activa. */
    #activeId(): string | null {
      const id = this.#optionIds[this.#active];
      return id ?? null;
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      // IDs estables para combobox <-> listbox <-> options (necesario para
      // aria-controls y aria-activedescendant segun WAI-ARIA 1.2).
      const rootId = `cmd-palette-${Math.random().toString(36).slice(2, 8)}`;
      this.shadowRoot!.innerHTML = /* html */ `
        <dialog part="dialog" class="dialog" aria-label="Paleta de comandos">
          <div class="panel is-popover-panel" part="panel">
            <header class="bar is-surface-bar">
              <span class="ico"><is-icon icon="mdi:magnify"></is-icon></span>
              <input part="input" class="input" id="input" type="text" autocomplete="off"
                role="combobox" aria-controls="${rootId}-listbox"
                aria-expanded="false" aria-autocomplete="list"
                aria-haspopup="listbox" />
            </header>
            <ol part="results" class="results" id="${rootId}-listbox" role="listbox"
              aria-label="Resultados"></ol>
            <div part="empty" class="empty" id="empty" role="status" hidden></div>
            <span part="sr-status" class="sr-status" role="status" aria-live="polite"
              aria-atomic="true"></span>
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
      this.#dialog = this.shadowRoot!.querySelector<HTMLDialogElement>('.dialog')!;
      this.#input = this.shadowRoot!.getElementById('input') as HTMLInputElement;
      this.#resultsEl = this.shadowRoot!.getElementById(`${rootId}-listbox`) as HTMLElement;
      this.#empty = this.shadowRoot!.getElementById('empty') as HTMLElement;
      this.#srStatus = this.shadowRoot!.querySelector<HTMLElement>('.sr-status')!;

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
        const target = e.target as Element | null;
        const item = target?.closest('[role="option"]') as HTMLElement | null;
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

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'hotkey') this.#bindHotkey();
      if (name === 'placeholder') this.#input.placeholder = newVal || '';
      if (name === 'empty-text') this.#empty.textContent = newVal || '';
    }

    get commands(): Command[] { return this.#commands; }
    get results(): Command[] { return this.#results; }

    open() {
      if (this.hasAttribute('disabled')) return;
      emit(this, 'is-show');
      this.#input.value = '';
      this.#query = '';
      this.#historyPos = -1;
      this.#draftSnapshot = '';
      this.#search();
      if (!this.#dialog.open) this.#dialog.showModal();
      // sync atributo open para CSS hooks
      this.setAttribute('open', '');
      this.setAttribute('aria-expanded', 'true');
      this.#input.setAttribute('aria-expanded', 'true');
      this.#input.focus();
      emit(this, 'is-after-show');
    }

    close() {
      if (!this.hasAttribute('open')) return;
      // Persistir la query ejecutada (LIFO, dedupe, max 16).
      const q = this.#query.trim();
      if (q && this.#history[0] !== q) {
        this.#history = [q, ...this.#history.filter((x) => x !== q)].slice(0, 16);
      }
      this.#historyPos = -1;
      emit(this, 'is-hide');
      if (this.#dialog.open) this.#dialog.close();
      this.removeAttribute('open');
      this.setAttribute('aria-expanded', 'false');
      this.#input.setAttribute('aria-expanded', 'false');
      this.#input.removeAttribute('aria-activedescendant');
      emit(this, 'is-after-hide');
    }

    toggle() { this.#dialog.open ? this.close() : this.open(); }

    #readCommands() {
      const script = [...this.children].find(
        (c): c is HTMLScriptElement => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''),
      );
      if (!script) { this.#commands = []; return; }
      try { this.#commands = JSON.parse(script.textContent || '[]') as Command[]; }
      catch { this.#commands = []; }
    }

    #bindHotkey() {
      document.removeEventListener('keydown', this.#hotkeyHandler);
      // Soporta varios atajos separados por coma/espacio, p.ej. "mod+k,mod+/".
      const raw = this.getAttribute('hotkey') ?? 'mod+k';
      if (!raw) return;
      const combos = raw.split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!combos.length) return;
      this.#hotkeyCombos = combos;
      this.#hotkeyHandler = (e: KeyboardEvent): void => {
        if (this.#isEditableTarget(e.target)) return; // no capturar dentro de inputs/textareas/selects
        for (const combo of this.#hotkeyCombos) {
          if (this.#matchesCombo(e, combo)) {
            e.preventDefault();
            this.toggle();
            return;
          }
        }
      };
      document.addEventListener('keydown', this.#hotkeyHandler);
    }

    #isEditableTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (t.isContentEditable) return true;
      return false;
    }

    #matchesCombo(e: KeyboardEvent, combo: string): boolean {
      const parts = combo.toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
      const wantKey = parts.filter((p) => !['mod', 'cmd', 'ctrl'].includes(p)).pop();
      if (!wantKey) return false;
      const okMod = (parts.includes('mod') ? (e.metaKey || e.ctrlKey) : (parts.includes('cmd') ? e.metaKey : parts.includes('ctrl') ? e.ctrlKey : true));
      return okMod && e.key.toLowerCase() === wantKey.toLowerCase();
    }

    /** Teclado sobre el input. ↑/↓ navega; cuando el input esta vacio, ↑
     *  cicla por el historial (LIFO) y rellena el input (tipo terminal).
     *  ↓ desde una query historica vuelve al presente (input vacio).
     *  Enter ejecuta la opcion activa. Escape lo maneja el <dialog>. */
    #onKey(e: KeyboardEvent): void {
      const raw = this.#input.value;
      const q = raw.trim();
      if (e.key === 'ArrowDown' && this.#results.length > 0) {
        e.preventDefault();
        this.#historyPos = -1; // cualquier flecha sale del historial
        this.#active = (this.#active + 1) % this.#results.length;
        this.#renderResults();
        return;
      }
      if (e.key === 'ArrowUp' && this.#results.length > 0) {
        e.preventDefault();
        this.#historyPos = -1;
        this.#active = (this.#active - 1 + this.#results.length) % this.#results.length;
        this.#renderResults();
        return;
      }
      // Historial: solo cuando el input esta vacio y hay al menos 1 entrada.
      if (q === '' && this.#history.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (this.#historyPos === -1) {
            this.#draftSnapshot = ''; // ya estaba vacio
            this.#historyPos = 0;
          } else {
            this.#historyPos = Math.min(this.#historyPos + 1, this.#history.length - 1);
          }
          this.#input.value = this.#history[this.#historyPos]!;
          this.#query = this.#input.value;
          this.#search();
          return;
        }
        if (e.key === 'ArrowDown') {
          // No hay nada que ciclar hacia "abajo" cuando el input esta vacio
          // y nunca entro al historial: no-op.
          return;
        }
      }
      // ↓ cuando el input viene del historial: vuelve al presente (vacío).
      if (e.key === 'ArrowDown' && this.#historyPos !== -1) {
        e.preventDefault();
        this.#historyPos = -1;
        this.#input.value = this.#draftSnapshot;
        this.#query = this.#input.value;
        this.#search();
        return;
      }
      if (e.key === 'Enter') {
        if (this.#results.length === 0) return;
        e.preventDefault();
        this.#selectByIndex(this.#active);
        return;
      }
    }

    /** Score fuzzy simple: premia coincidencia exacta y empieza-con, acepta
     *  typos cortos (subsecuencia) y case-insensitive. */
    #score(item: Command, query: string): number {
      const q = query.toLowerCase();
      if (!q) return 0;
      const t = String(item.title || '').toLowerCase();
      let s = 0;
      if (t === q) s += 12;
      if (t.includes(q)) s += 5;
      if (t.startsWith(q)) s += 3;
      const kws = (item.keywords || []).map((k) => String(k).toLowerCase());
      if (kws.some((k) => k.includes(q))) s += 2;
      if (String(item.group || '').toLowerCase().includes(q)) s += 1;
      // Bonus por subsecuencia (tolera typos a costa de ranking).
      if (this.#isSubsequence(q, t)) s += 1;
      return s;
    }

    #isSubsequence(q: string, t: string): boolean {
      let i = 0;
      for (const ch of t) {
        if (ch === q[i]) i++;
        if (i === q.length) return true;
      }
      return i === q.length;
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
        if (!this.#results.length) this.#results = items.slice(0, 4).filter((c) => /^[a-z]/i.test((c.title?.[0] || '')) && c.id);
      }
      this.#active = 0;
      this.#empty.hidden = this.#results.length !== 0;
      this.#empty.textContent = this.getAttribute('empty-text') || this.#empty.textContent;
      this.#renderResults();
      this.#announce(q);
    }

    /** Anuncia el resultado del filtro con debounce (max 1 cada ~120ms) para
     *  no inundar al lector de pantalla en cada keystroke. */
    #announce(q: string): void {
      clearTimeout(this.#announceTimer);
      this.#announceTimer = setTimeout(() => {
        const total = this.#results.length;
        if (!q) {
          this.#srStatus.textContent = total > 0
            ? `${total} comandos disponibles.`
            : 'Sin comandos para mostrar.';
          return;
        }
        if (total === 0) {
          this.#srStatus.textContent = `Ningún comando coincide con "${q}".`;
          return;
        }
        const top = this.#results[0];
        const label = top?.title || top?.id || '';
        this.#srStatus.textContent = `${total} resultados. Sugerencia: ${label}.`;
      }, 120) as unknown as number;
    }

    #renderResults() {
      this.#resultsEl.innerHTML = '';
      this.#optionIds = [];
      const groups = new Map<string, Array<{ c: Command; i: number }>>();
      this.#results.forEach((c, i) => {
        const g = c.group || '—';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push({ c, i });
      });
      const optId = (k: number): string => `${this.id || 'cmd'}-opt-${k}`;
      let flatIdx = 0;
      for (const [groupName, items] of groups) {
        const gh = document.createElement('li');
        gh.className = 'group-head';
        gh.setAttribute('role', 'presentation');
        gh.textContent = groupName;
        this.#resultsEl.appendChild(gh);
        for (const { c, i } of items) {
          const opt = document.createElement('li');
          const oid = optId(flatIdx);
          this.#optionIds.push(oid);
          opt.id = oid;
          opt.setAttribute('role', 'option');
          opt.setAttribute('aria-selected', String(flatIdx === this.#active));
          opt.dataset.idx = String(i);
          opt.className = 'opt' + (flatIdx === this.#active ? ' is-active' : '');
          const keysHtml = this.#keysHtml(c);
          const iconHtml = c.icon ? `<is-icon icon="${escapeHtml(c.icon)}"></is-icon>` : '';
          opt.innerHTML = `<span class="ico">${iconHtml}</span><span class="label"><span class="t">${escapeHtml(c.title || c.id)}</span>${c.hint ? `<span class="hint">${escapeHtml(c.hint)}</span>` : ''}</span>${keysHtml ? `<span class="keys" part="keys">${keysHtml}</span>` : '<span class="keys" aria-hidden="true"></span>'}`;
          this.#resultsEl.appendChild(opt);
          flatIdx++;
        }
      }
      // aria-activedescendant en el input → siempre apunta al id activo.
      const activeId = this.#activeId();
      if (activeId) this.#input.setAttribute('aria-activedescendant', activeId);
      else this.#input.removeAttribute('aria-activedescendant');
      if (!this.#results.length) return;
      const active = this.#resultsEl.querySelector<HTMLElement>(`.opt.is-active`);
      active?.scrollIntoView({ block: 'nearest' });
    }

    /** Normaliza `keys` / `shortcut` → chips `<kbd>` a la derecha. */
    #keysHtml(c: Command): string {
      const raw = c.keys ?? c.shortcut ?? c.hotkey;
      if (raw == null || raw === '') return '';
      const parts = Array.isArray(raw)
        ? raw.map((k) => String(k).trim()).filter(Boolean)
        : String(raw).split(/[+ ]+/).map((k) => k.trim()).filter(Boolean);
      if (!parts.length) return '';
      return parts.map((k) => `<kbd>${escapeHtml(k)}</kbd>`).join('');
    }

    #selectByIndex(idx: number) {
      const c = this.#results[idx];
      if (!c) return;
      emit(this, 'is-select', { command: c, id: c.id });
      try { if (typeof c.run === 'function') c.run(); } catch { /* noop */ }
      this.close();
    }

    #dialog!: HTMLDialogElement;
    #input!: HTMLInputElement;
    #resultsEl!: HTMLElement;
    #empty!: HTMLElement;
    #srStatus!: HTMLElement;
    #hotkeyHandler!: (e: KeyboardEvent) => void;
    #hotkeyCombos: string[] = [];
  }

  defineElement('is-command-palette', IsCommandPalette);
})();
