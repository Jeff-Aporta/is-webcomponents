import { adoptCss, defineElement, emit } from '../../core/element.js';

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
  const OBSERVED: string[] = ['value', 'placeholder'];

  type BlockType = 'paragraph' | 'heading-1' | 'heading-2' | 'heading-3' | 'bullet-list' | 'todo' | 'numbered-list' | 'quote' | 'code' | 'divider';
  interface Block { id: string; type: BlockType; text: string; checked: boolean }
  interface BlockDef { tag: string; item?: string; placeholder?: string }

  const TYPES: Record<BlockType, BlockDef> = {
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
    static get observedAttributes(): string[] { return OBSERVED; }
    #mounted = false;
    #blocks: Block[] = [];

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="blocks" class="blocks"></div>
          <div part="menu" class="menu" hidden></div>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#blocksEl = this.shadowRoot!.querySelector<HTMLElement>('.blocks')!;
      this.#menu = this.shadowRoot!.querySelector<HTMLElement>('.menu')!;

      this.#onDocPointerDown = (e: PointerEvent): void => {
        if (!e.composedPath().includes(this)) this.#hideMenu();
      };
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#readInitial();
      this.#renderAll();
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    attributeChangedCallback(): void {
      if (this.#mounted) {
        this.#readInitial();
        this.#renderAll();
      }
    }

    get value(): string {
      this.#syncDirty();
      return JSON.stringify(this.#blocks);
    }
    set value(v: string | Block[] | null | undefined) {
      this.setAttribute('value', typeof v === 'string' ? v : JSON.stringify(v || []));
    }

    get blocks(): Block[] { return this.#blocks; }

    #readInitial(): void {
      const v = this.getAttribute('value') ?? this.#inlineJson();
      if (!v) { this.#blocks = [{ id: 'b0', type: 'paragraph', text: '', checked: false }]; return; }
      try {
        const data = typeof v === 'string' ? JSON.parse(v) : v;
        if (Array.isArray(data)) {
          this.#blocks = (data as Block[])
            .filter((b): b is Block => !!b && !!TYPES[(b as Block).type as BlockType])
            .map((b, i: number) => ({
              id: b.id || (crypto.randomUUID?.() ?? `b${Date.now()}_${i}`),
              text: b.text || '',
              checked: !!b.checked,
              type: b.type,
            }));
        } else this.#blocks = [];
      } catch { this.#blocks = []; }
      if (!this.#blocks.length) this.#blocks = [{ id: 'b0', type: 'paragraph', text: '', checked: false }];
    }

    /** Semilla declarativa: mismo convenio que el resto del kit. */
    #inlineJson(): string | null {
      const script = this.querySelector<HTMLElement>('script[type="application/json"]');
      const texto = script?.textContent?.trim();
      return texto || null;
    }

    #renderAll(): void {
      this.#blocksEl.innerHTML = '';
      this.#blocks.forEach((b: Block) => this.#appendBlockEl(b));
    }

    #appendBlockEl(block: Block): void {
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
        ed.dataset.placeholder = def.placeholder ?? '';
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
        li.dataset.placeholder = def.placeholder ?? '';
        li.textContent = block.text;
        const list = document.createElement(def.tag);
        list.appendChild(li);
        root.appendChild(list);
        this.#bindEditable(li, block);
      } else {
        ed.contentEditable = 'true';
        ed.dataset.placeholder = def.placeholder ?? '';
        ed.textContent = block.text;
        root.appendChild(ed);
        this.#bindEditable(ed, block);
      }
      this.#blocksEl.appendChild(root);
    }

    #bindEditable(el: HTMLElement, block: Block): void {
      const onInput = (): void => { block.text = el.textContent ?? ''; this.#emit(); };
      el.addEventListener('input', onInput);
      el.addEventListener('focus', () => emit(this, 'is-focus', { id: block.id }));
      el.addEventListener('keydown', (e: KeyboardEvent) => this.#onKey(e, el, block));
    }

    #onKey(e: KeyboardEvent, el: HTMLElement, block: Block): void {
      const idx = this.#blocks.findIndex((b) => b.id === block.id);
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const newBlock: Block = { id: 'b' + Date.now() + Math.random().toString(36).slice(2, 6), type: block.type === 'divider' ? 'paragraph' : block.type, text: '', checked: false };
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
        const selectionStart = (el as HTMLElement & { selectionStart?: number }).selectionStart ?? 0;
        const isStart = ((el.textContent ?? '').slice(0, selectionStart)).trim() === '';
        if (isStart) {
          e.preventDefault();
          this.#showMenu(el, block);
        }
      } else if (e.key === 'Escape') {
        this.#hideMenu();
      }
    }

    #showMenu(el: HTMLElement, block: Block): void {
      const rect = el.getBoundingClientRect();
      const root = this.getBoundingClientRect();
      this.#menu.style.left = `${rect.left - root.left}px`;
      this.#menu.style.top = `${rect.bottom - root.top + 4}px`;
      this.#menu.innerHTML = '';
      for (const type of Object.keys(TYPES) as BlockType[]) {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'opt';
        opt.textContent = type;
        opt.addEventListener('mousedown', (e: Event) => e.preventDefault());
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

    #hideMenu(): void { this.#menu.hidden = true; this.#menu.innerHTML = ''; }

    #focusById(id: string): void {
      requestAnimationFrame(() => {
        const ed = this.shadowRoot!.querySelector<HTMLElement>(`[data-id="${id}"] [contenteditable="true"]`);
        if (ed) ed.focus();
      });
    }

    #syncDirty(): void { /* placeholder for any deferred sync */ }

    #emit(): void {
      emit(this, 'is-change', { blocks: structuredClone(this.#blocks) });
    }

    #blocksEl!: HTMLElement;
    #menu!: HTMLElement;
    #onDocPointerDown!: (e: PointerEvent) => void;
  }

  defineElement('is-doc-editor', IsDocEditor);
})();
