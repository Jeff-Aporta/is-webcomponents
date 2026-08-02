import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-rte> — Editor de texto enriquecido basado en contentEditable.
 *
 * Atributos
 *   value       HTML inicial y actual
 *   placeholder texto cuando está vacío
 *   toolbar     lista separada por comas de botones activos. Default:
 *               "bold,italic,underline,strike,h1,h2,h3,ul,ol,link,blockquote,code,undo,redo,clear"
 *   autofocus   boolean — foco al cargar
 *   readonly    boolean — desactiva edición
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
 *   rte.exec(cmd, value?)
 *   rte.format(tag)
 *   rte.link()
 *   rte.clear()
 *   rte.undo() / rte.redo()
 *
 * Eventos
 *   is-input, is-change, is-blur
 *
 * Tokens CSS
 *   --is-rte-toolbar-bg
 *   --is-rte-content-min-h
 *   --is-rte-button-radius
 */
(() => {
  const OBSERVED = ['value', 'placeholder', 'toolbar', 'autofocus', 'readonly'];

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
          <div part="placeholder" class="placeholder"></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#toolbar = this.shadowRoot.querySelector('.toolbar');
      this.#content = this.shadowRoot.querySelector('.content');
      this.#placeholder = this.shadowRoot.querySelector('.placeholder');

      this.#content.addEventListener('input', () => this.#onInput());
      this.#content.addEventListener('blur', () => this.dispatchEvent(new CustomEvent('is-blur', { bubbles: true, composed: true })));
    }

    connectedCallback() {
      this.#mounted = true;
      this.#buildToolbar();
      this.#sync();
      this.#syncReadonly();
      if (this.hasAttribute('autofocus')) this.focus();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'toolbar') this.#buildToolbar();
      if (name === 'value') this.#sync();
      if (name === 'readonly') this.#syncReadonly();
    }

    get value() { return this.#content.innerHTML; }
    set value(v) { this.setAttribute('value', v || ''); }

    get text() { return this.#content.textContent || ''; }

    focus() { this.#content.focus(); }
    blur() { this.#content.blur(); }

    exec(cmd, value = null) {
      this.focus();
      try { document.execCommand(cmd, false, value); } catch { /* noop */ }
      this.#onInput();
    }

    format(tag) { this.exec('formatBlock', tag); }
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
        const label = ICONS[item] || item;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.dataset.cmd = item;
        b.title = item;
        b.setAttribute('aria-label', item);
        b.innerHTML = label;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => this.#onToolbar(item));
        this.#toolbar.appendChild(b);
      }
    }

    #onToolbar(cmd) {
      if (cmd === 'link') return this.link();
      if (cmd === 'clear') return this.clear();
      if (cmd === 'undo') return this.undo();
      if (cmd === 'redo') return this.redo();
      if (/^h[1-6]$/.test(cmd)) return this.format(cmd);
      this.exec(cmd);
    }

    #sync() {
      const v = this.getAttribute('value') ?? '';
      if (document.activeElement !== this.#content) this.#content.innerHTML = v;
      this.#placeholder.textContent = this.getAttribute('placeholder') || '';
      this.#syncPlaceholder();
    }

    #syncReadonly() {
      this.#content.contentEditable = this.hasAttribute('readonly') ? 'false' : 'true';
    }

    #onInput() {
      const html = this.#content.innerHTML;
      this.setAttribute('value', html);
      this.dispatchEvent(new CustomEvent('is-input', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { value: html, text: this.text } }));
      this.#syncPlaceholder();
    }

    #syncPlaceholder() {
      this.#placeholder.hidden = !!this.text;
    }

    #content;
    #toolbar;
    #placeholder;
  }

  if (!customElements.get('is-rte')) customElements.define('is-rte', IsRte);
})();
