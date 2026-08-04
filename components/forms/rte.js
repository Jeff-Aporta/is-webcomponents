import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-rte> — Editor de texto enriquecido basado en contentEditable.
 *
 * Atributos
 *   value       HTML inicial y actual
 *   placeholder texto cuando está vacío
 *   toolbar     lista separada por comas de botones activos. Default:
 *               "bold,italic,underline,strike,h1,h2,h3,ul,ol,link,blockquote,code,undo,redo,clear"
 *               Admite además comandos registrados con registerRteCommand().
 *   autofocus   boolean — foco al cargar
 *   readonly    boolean — desactiva edición
 *   source-mode boolean — muestra el HTML crudo en un <textarea> en vez del WYSIWYG
 *
 * Formato de salida
 *   - bold/italic/underline/strike        via document.execCommand
 *   - h1, h2, h3                           formatBlock
 *   - listas (ul/ol)                       insertUnorderedList/insertOrderedList
 *   - link                                 prompt + anchor
 *   - blockquote, code, pre               formatBlock
 *
 * API
 *   rte.value       string HTML
 *   rte.text        string texto plano (textContent)
 *   rte.sourceMode  boolean — alterna WYSIWYG / código fuente HTML
 *   rte.exec(cmd, value?)
 *   rte.format(tag)
 *   rte.insertHtml(html)  inserta HTML en el cursor (respeta el modo fuente)
 *   rte.link()
 *   rte.clear()
 *   rte.undo() / rte.redo()
 *
 * Eventos
 *   is-input, is-change, is-blur, is-source-change
 *
 * Tokens CSS
 *   --is-rte-toolbar-bg
 *   --is-rte-content-min-h
 *   --is-rte-button-radius
 *   --is-rte-token-bg / --is-rte-token-color / --is-rte-token-radius
 */

/** Registro de comandos de toolbar aportados por OTROS componentes.
 *  Así <is-function-editor> añade sus botones sin que este módulo lo conozca. */
const CUSTOM_COMMANDS = new Map();

/**
 * Registra un botón extra para la toolbar de <is-rte>.
 * @param {string} name  identificador usado en el atributo `toolbar`
 * @param {{ icon?: string, title?: string, run: (rte: HTMLElement) => void }} def
 */
export function registerRteCommand(name, def) {
  if (!name || !def || typeof def.run !== 'function') return;
  CUSTOM_COMMANDS.set(name, def);
}

(() => {
  const OBSERVED = ['value', 'placeholder', 'toolbar', 'autofocus', 'readonly', 'source-mode'];

  const DEFAULT_TOOLBAR = ['bold', 'italic', 'underline', 'strike', '|', 'h1', 'h2', 'h3', '|', 'ul', 'ol', '|', 'link', 'blockquote', 'code', '|', 'undo', 'redo', 'clear'];

  const ICONS = {
    bold: '<b>B</b>',
    italic: '<i>I</i>',
    underline: '<u>U</u>',
    strike: '<s>S</s>',
    h1: '<b style="font-size:.95rem">H1</b>',
    h2: '<b style="font-size:.85rem">H2</b>',
    h3: '<b style="font-size:.78rem">H3</b>',
    ul: '• List',
    ol: '1. List',
    link: '🔗 Link',
    blockquote: '" Quote',
    code: '</> Code',
    undo: '↶ Undo',
    redo: '↷ Redo',
    clear: '✕ Clear',
    // Botón de código fuente: mismo glifo que el `htmlEditorButton` de ISP.
    html: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
  };

  class IsRte extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="toolbar" class="toolbar" role="toolbar"></div>
          <div part="content" class="content" contenteditable="true"></div>
          <textarea part="source" class="source" spellcheck="false" hidden></textarea>
          <div part="placeholder" class="placeholder"></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#toolbar = this.shadowRoot.querySelector('.toolbar');
      this.#content = this.shadowRoot.querySelector('.content');
      this.#source = this.shadowRoot.querySelector('.source');
      this.#placeholder = this.shadowRoot.querySelector('.placeholder');

      this.#content.addEventListener('input', () => this.#onInput());
      this.#content.addEventListener('blur', () => this.dispatchEvent(new CustomEvent('is-blur', { bubbles: true, composed: true })));
      this.#source.addEventListener('input', () => this.#onSourceInput());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#buildToolbar();
      this.#sync();
      this.#syncReadonly();
      this.#syncSourceMode();
      if (this.hasAttribute('autofocus')) this.focus();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'toolbar') this.#buildToolbar();
      if (name === 'value') this.#sync();
      if (name === 'readonly') this.#syncReadonly();
      if (name === 'source-mode') this.#syncSourceMode();
    }

    get value() { return this.sourceMode ? this.#source.value : this.#content.innerHTML; }
    set value(v) { this.setAttribute('value', v || ''); }

    get text() { return this.#content.textContent || ''; }

    get sourceMode() { return this.hasAttribute('source-mode'); }
    set sourceMode(v) { this.toggleAttribute('source-mode', !!v); }

    focus() { (this.sourceMode ? this.#source : this.#content).focus(); }
    blur() { (this.sourceMode ? this.#source : this.#content).blur(); }

    exec(cmd, value = null) {
      if (this.sourceMode) return;
      this.focus();
      try { document.execCommand(cmd, false, value); } catch { /* noop */ }
      this.#onInput();
    }

    format(tag) { this.exec('formatBlock', tag); }

    /** Inserta HTML en la posición del cursor.
     *  En modo fuente escribe el texto crudo en el caret del <textarea>;
     *  en WYSIWYG usa execCommand('insertHTML'), que es la única vía que
     *  funciona con Selection y Shadow DOM sin APIs propietarias. */
    insertHtml(html) {
      if (!html) return;
      if (this.sourceMode) {
        const ta = this.#source;
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? start;
        ta.value = ta.value.slice(0, start) + html + ta.value.slice(end);
        const pos = start + html.length;
        this.#onSourceInput();
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
        return;
      }
      this.exec('insertHTML', html);
    }

    link() {
      const url = prompt('URL del enlace', 'https://');
      if (url) this.exec('createLink', url);
    }
    clear() {
      this.focus();
      try { document.execCommand('selectAll'); document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'p'); } catch { /* noop */ }
      this.#onInput();
    }
    undo() { this.exec('undo'); }
    redo() { this.exec('redo'); }

    #buildToolbar() {
      const list = (this.getAttribute('toolbar') || DEFAULT_TOOLBAR.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
      this.#toolbar.innerHTML = '';
      for (const item of list) {
        if (item === '|') {
          const sep = document.createElement('span');
          sep.className = 'sep';
          this.#toolbar.appendChild(sep);
          continue;
        }
        const custom = CUSTOM_COMMANDS.get(item);
        const label = custom?.icon || ICONS[item] || item;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.dataset.cmd = item;
        b.title = custom?.title || item;
        b.setAttribute('aria-label', custom?.title || item);
        b.innerHTML = label;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => this.#onToolbar(item));
        this.#toolbar.appendChild(b);
      }
      this.#syncToolbarState();
    }

    #onToolbar(cmd) {
      const custom = CUSTOM_COMMANDS.get(cmd);
      if (custom) return custom.run(this);
      if (cmd === 'html') { this.sourceMode = !this.sourceMode; return; }
      if (cmd === 'link') return this.link();
      if (cmd === 'clear') return this.clear();
      if (cmd === 'undo') return this.undo();
      if (cmd === 'redo') return this.redo();
      if (/^h[1-6]$/.test(cmd)) return this.format(cmd);
      this.exec(cmd);
    }

    #sync() {
      const v = this.getAttribute('value') ?? '';
      // En modo fuente el <textarea> manda: no se pisa lo que el usuario escribe.
      if (this.sourceMode) {
        if (document.activeElement !== this) this.#source.value = v;
      } else if (document.activeElement !== this.#content) {
        this.#content.innerHTML = v;
      }
      this.#placeholder.textContent = this.getAttribute('placeholder') || '';
      this.#syncPlaceholder();
    }

    #syncReadonly() {
      const ro = this.hasAttribute('readonly');
      this.#content.contentEditable = ro ? 'false' : 'true';
      this.#source.readOnly = ro;
    }

    /** Alterna WYSIWYG ⇄ código fuente trasvasando el HTML en ambos sentidos. */
    #syncSourceMode() {
      const on = this.sourceMode;
      if (on) {
        this.#source.value = this.#content.innerHTML;
      } else {
        this.#content.innerHTML = this.#source.value;
        this.setAttribute('value', this.#content.innerHTML);
      }
      this.#content.hidden = on;
      this.#source.hidden = !on;
      this.#syncPlaceholder();
      this.#syncToolbarState();
      this.dispatchEvent(new CustomEvent('is-source-change', { bubbles: true, composed: true, detail: { source: on } }));
      if (!on) this.#emitChange(this.#content.innerHTML);
    }

    #syncToolbarState() {
      const btn = this.#toolbar.querySelector('.btn[data-cmd="html"]');
      if (btn) btn.classList.toggle('active', this.sourceMode);
    }

    #onInput() {
      const html = this.#content.innerHTML;
      this.setAttribute('value', html);
      this.#emitChange(html);
      this.#syncPlaceholder();
    }

    #onSourceInput() {
      const html = this.#source.value;
      this.setAttribute('value', html);
      this.#emitChange(html);
    }

    #emitChange(html) {
      this.dispatchEvent(new CustomEvent('is-input', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { value: html, text: this.text } }));
    }

    #syncPlaceholder() {
      this.#placeholder.hidden = !!this.text || this.sourceMode;
    }

    #content;
    #source;
    #toolbar;
    #placeholder;
  }

  if (!customElements.get('is-rte')) customElements.define('is-rte', IsRte);
})();
