import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-doc-editor> — Editor de documento basado en bloques (Notion-like).
 *
 * Cada bloque es uno de:
 *   paragraph | heading-1 | heading-2 | heading-3 | bullet-list | todo |
 *   numbered-list | quote | code | divider
 *
 * Atributos
 *   value       array de bloques (JSON): [{ type, text, checked? }, ...]
 *               o string
 *   placeholder texto cuando un bloque está vacío
 *
 * Contenido inicial declarativo
 *   <script type="application/json">[{ "type": "heading-1", "text": "…" }]</script>
 *   Se usa cuando no hay atributo `value`.
 *
 * Slots
 *   default — opcional, contenido inicial (oculto tras parsearse a bloques)
 *
 * API
 *   doc.value        array JSON serializable
 *   doc.blocks       array vivo de bloques (read-only)
 *   doc.addBlock(type, after?)
 *   doc.removeBlock(id)
 *   doc.updateBlock(id, { text, checked })
 *
 * Eventos
 *   is-change   detail: { blocks }
 *   is-focus    detail: { id }
 *
 * Atajos
 *   Enter        crear nuevo bloque (mismo tipo)
 *   Backspace    en bloque vacío → elimina el bloque y enfoca el previo
 *   Slash "/"    abre menú de tipos
 *   Tab / Shift+Tab indenta nivel (todo)
 */
(() => {
  const OBSERVED = ['value', 'placeholder'];

  const TYPES = {
    paragraph:     { tag: 'p',  placeholder: 'Escribe algo…' },
    'heading-1':   { tag: 'h1', placeholder: 'Título 1' },
    'heading-2':   { tag: 'h2', placeholder: 'Título 2' },
    'heading-3':   { tag: 'h3', placeholder: 'Título 3' },
    'bullet-list': { tag: 'ul', item: 'li', placeholder: 'Item' },
    'todo':        { tag: 'ul', item: 'li-todo', placeholder: 'Hacer…' },
    'numbered-list':{ tag: 'ol', item: 'li', placeholder: 'Item' },
    'quote':       { tag: 'blockquote', placeholder: 'Cita…' },
    'code':        { tag: 'pre', placeholder: 'Código…' },
    'divider':     { tag: 'hr' },
  };

  class IsDocEditor extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;
    #blocks = [];

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="blocks" class="blocks"></div>
          <div part="menu" class="menu" hidden></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#blocksEl = this.shadowRoot.querySelector('.blocks');
      this.#menu = this.shadowRoot.querySelector('.menu');

      this.#onDocPointerDown = (e) => {
        if (!e.composedPath().includes(this)) this.#hideMenu();
      };
    }

    connectedCallback() {
      this.#mounted = true;
      this.#readInitial();
      this.#renderAll();
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    attributeChangedCallback() {
      if (this.#mounted) {
        this.#readInitial();
        this.#renderAll();
      }
    }

    get value() {
      this.#syncDirty();
      return JSON.stringify(this.#blocks);
    }
    set value(v) {
      this.setAttribute('value', typeof v === 'string' ? v : JSON.stringify(v || []));
    }

    get blocks() { return this.#blocks; }

    #readInitial() {
      const v = this.getAttribute('value') ?? this.#inlineJson();
      if (!v) { this.#blocks = [{ id: 'b0', type: 'paragraph', text: '' }]; return; }
      try {
        const data = typeof v === 'string' ? JSON.parse(v) : v;
        if (Array.isArray(data)) this.#blocks = data.filter((b) => TYPES[b.type]).map((b, i) => ({ id: b.id || crypto.randomUUID?.() || `b${Date.now()}_${i}`, text: b.text || '', checked: !!b.checked, type: b.type }));
        else this.#blocks = [];
      } catch { this.#blocks = []; }
      if (!this.#blocks.length) this.#blocks = [{ id: 'b0', type: 'paragraph', text: '' }];
    }

    /** Semilla declarativa: mismo convenio que el resto del kit. */
    #inlineJson() {
      const script = this.querySelector('script[type="application/json"]');
      const texto = script?.textContent?.trim();
      return texto || null;
    }

    #renderAll() {
      this.#blocksEl.innerHTML = '';
      this.#blocks.forEach((b) => this.#appendBlockEl(b));
    }

    #appendBlockEl(block) {
      const def = TYPES[block.type] || TYPES.paragraph;
      const root = document.createElement('div');
      root.className = `block block-${block.type}`;
      root.dataset.id = block.id;
      const ed = document.createElement(def.tag);
      if (def.tag === 'hr') {
        root.appendChild(ed);
      } else if (block.type === 'todo') {
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'check';
        check.checked = !!block.checked;
        check.addEventListener('change', () => { block.checked = check.checked; ed.classList.toggle('is-checked', block.checked); this.#emit(); });
        ed.contentEditable = 'true';
        ed.dataset.placeholder = def.placeholder;
        ed.textContent = block.text;
        const wrap = document.createElement('div');
        wrap.className = 'row';
        wrap.appendChild(check);
        wrap.appendChild(ed);
        root.appendChild(wrap);
        this.#bindEditable(ed, block);
      } else if (def.item === 'li' || def.item === 'li-todo') {
        const li = document.createElement('li');
        li.contentEditable = 'true';
        li.dataset.placeholder = def.placeholder;
        li.textContent = block.text;
        const list = document.createElement(def.tag);
        list.appendChild(li);
        root.appendChild(list);
        this.#bindEditable(li, block);
      } else {
        ed.contentEditable = 'true';
        ed.dataset.placeholder = def.placeholder;
        ed.textContent = block.text;
        root.appendChild(ed);
        this.#bindEditable(ed, block);
      }
      this.#blocksEl.appendChild(root);
    }

    #bindEditable(el, block) {
      const onInput = () => { block.text = el.textContent; this.#emit(); };
      el.addEventListener('input', onInput);
      el.addEventListener('focus', () => this.dispatchEvent(new CustomEvent('is-focus', { bubbles: true, composed: true, detail: { id: block.id } })));
      el.addEventListener('keydown', (e) => this.#onKey(e, el, block));
    }

    #onKey(e, el, block) {
      const idx = this.#blocks.findIndex((b) => b.id === block.id);
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const newBlock = { id: 'b' + Date.now() + Math.random().toString(36).slice(2, 6), type: block.type === 'divider' ? 'paragraph' : block.type, text: '' };
        this.#blocks.splice(idx + 1, 0, newBlock);
        this.#renderAll();
        this.#focusById(newBlock.id);
      } else if (e.key === 'Backspace' && (el.textContent === '' || (el.tagName === 'LI' && idx > 0))) {
        e.preventDefault();
        if (this.#blocks.length === 1) return;
        this.#blocks.splice(idx, 1);
        this.#renderAll();
        const target = this.#blocks[Math.max(0, idx - 1)];
        if (target) this.#focusById(target.id);
      } else if (e.key === '/') {
        const isStart = (el.textContent || '').slice(0, el.selectionStart).trim() === '';
        if (isStart) {
          e.preventDefault();
          this.#showMenu(el, block);
        }
      } else if (e.key === 'Escape') {
        this.#hideMenu();
      }
    }

    #showMenu(el, block) {
      const rect = el.getBoundingClientRect();
      const root = this.getBoundingClientRect();
      this.#menu.style.left = `${rect.left - root.left}px`;
      this.#menu.style.top = `${rect.bottom - root.top + 4}px`;
      this.#menu.innerHTML = '';
      for (const type of Object.keys(TYPES)) {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'opt';
        opt.textContent = type;
        opt.addEventListener('mousedown', (e) => e.preventDefault());
        opt.addEventListener('click', () => {
          block.type = type;
          block.text = '';
          this.#renderAll();
          this.#focusById(block.id);
          this.#hideMenu();
        });
        this.#menu.appendChild(opt);
      }
      this.#menu.hidden = false;
    }

    #hideMenu() { this.#menu.hidden = true; this.#menu.innerHTML = ''; }

    #focusById(id) {
      requestAnimationFrame(() => {
        const ed = this.shadowRoot.querySelector(`[data-id="${id}"] [contenteditable="true"]`);
        if (ed) ed.focus();
      });
    }

    #syncDirty() { /* placeholder for any deferred sync */ }

    #emit() {
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { blocks: structuredClone(this.#blocks) } }));
    }

    #blocksEl;
    #menu;
    #onDocPointerDown;
  }

  if (!customElements.get('is-doc-editor')) customElements.define('is-doc-editor', IsDocEditor);
})();
