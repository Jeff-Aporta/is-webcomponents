import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import './input.js';
import css from 'iswc:css';
import { createPopupDismiss } from '@jeff-aporta/iswc-base/core/position.js';
import type { MentionEventos } from './schemas/mention.schemas.js';

/**
 * <iswc-mention> — Input con autocompletado al tipear @usuario o #etiqueta.
 *
 * Está construido SOBRE <iswc-input>: etiqueta, ayuda, error, variantes, foco y
 * densidad viven allí. Lo que añade es el popup de sugerencias.
 *
 * Atributos
 *   value, name, placeholder, disabled, readonly, required, label, hint,
 *   error, error-text, variant, label-placement, full-width
 *   trigger       caracteres que abren el popup (default "@#")
 *   max-items     tope del popup (default 8)
 *
 * Sugerencias
 *   <script type="application/json">
 *   { "@": ["Ana", "Pedro", "Sofía"], "#": ["urgente", "bug", "idea"] }
 *   </script>
 *
 * O vía propiedad: `suggestions = { "@": [...], "#": [...] }`.
 *
 * Tokens seleccionados
 *   Se renderizan como texto plano con el carácter trigger delante
 *   ("@Ana "). Para chips visuales en backend, el `value` siempre es texto.
 *
 * Eventos
 *   iswc-input, iswc-change
 *   iswc-select  detail: { trigger, item, range: [start, end] }
 */
(() => {
  /** Atributos que <iswc-input> ya sabe resolver: se le pasan tal cual. */
  const REENVIADOS: string[] = [
    'placeholder', 'disabled', 'readonly', 'required', 'label', 'hint',
    'error', 'error-text', 'variant', 'label-placement', 'full-width',
  ];
  const OBSERVED: string[] = [...REENVIADOS, 'value', 'name', 'trigger', 'max-items'];

  type SuggestionsMap = Record<string, string[]>;

  class IswcMention extends IswcFormControl {
    static tag = 'iswc-mention';
    declare static events: MentionEventos;
    static css = css;
    static shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
    static observed = OBSERVED;

    #field: HTMLElement & { value: string };
    #input: HTMLInputElement;
    #onDocPointerDown!: (e: PointerEvent) => void;
    #suggestions: SuggestionsMap = {};
    /** Capa en la pila de core/position.ts mientras las sugerencias están abiertas: un modal de abajo no se lleva su Escape. */
    #capa = createPopupDismiss(this, {});
    #popup!: HTMLElement;
    #activeIndex = 0;
    #lastTriggerRange: [number, number] | null = null;
    #lastTriggerChar = '';
    #mounted = false;
    #defaultValue = '';

    constructor() {
      super();
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="popup" class="popup" role="listbox" hidden></div>
        </div>
      `;
      this.#field = document.createElement('iswc-input') as HTMLElement & { value: string };
      this.#field.setAttribute('part', 'field');
      this.#field.setAttribute('exportparts', 'form-control, label, base, input, hint, error-text');
      this.#popup = this.shadowRoot!.querySelector<HTMLElement>('.popup')!;
      this.#popup.before(this.#field);
      this.#input = this.#field.shadowRoot!.getElementById('input') as HTMLInputElement;
      this.#input.setAttribute('aria-autocomplete', 'list');
      this.#input.setAttribute('aria-expanded', 'false');
      // Los eventos del campo interno se reemiten aquí con el contrato de la mención.
      this.#field.addEventListener('iswc-input', (e: Event) => { e.stopPropagation(); this.#onInput(); });
      this.#field.addEventListener('iswc-change', (e: Event) => {
        e.stopPropagation();
        this.interactuado = true;
        emit(this, 'iswc-change', { value: this.value });
      });
      this.#input.addEventListener('keydown', (e: KeyboardEvent) => this.#onKey(e));
      this.#input.addEventListener('blur', () => this.#hidePopup());
      this.#onDocPointerDown = (e: PointerEvent): void => {
        if (!this.isOpen) return;
        if (e.composedPath().includes(this)) return;
        this.#hidePopup();
      };
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#sync();
      this.#readSlot();
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    override disconnectedCallback(): void {
      this.#mounted = false;
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
      this.#capa.detach();
      // La base suelta el observador de idioma que registra `t()` (mensaje de `required`).
      super.disconnectedCallback();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') {
        if (this.#field.value !== newVal) this.#field.value = newVal ?? '';
        this.sincronizarFormulario();
      }
      if (REENVIADOS.includes(name)) this.#forward(name);
    }

    get value(): string { return this.#field.value; }
    set value(v: string | null | undefined) {
      const next = v ?? '';
      this.#field.value = next;
      this.setAttribute('value', next);
    }

    /** El texto con las menciones es lo que entra en FormData. */
    override valorFormulario(): string { return this.value; }

    override restablecer(): void {
      this.value = this.defaultValue;
    }

    /** Valor inicial del marcado: el que restaura el reset del formulario. */
    override get defaultValue(): string { return this.#defaultValue; }
    get suggestions(): SuggestionsMap { return this.#suggestions; }
    set suggestions(obj: SuggestionsMap | null | undefined) { this.#suggestions = obj || {}; }

    get isOpen(): boolean { return !this.#popup.hidden; }

    #sync(): void {
      this.#defaultValue = this.getAttribute('value') ?? '';
      if (this.hasAttribute('value')) this.#field.value = this.#defaultValue;
      for (const name of REENVIADOS) this.#forward(name);
      this.sincronizarFormulario();
    }

    #forward(name: string): void {
      const v = this.getAttribute(name);
      if (v == null) this.#field.removeAttribute(name);
      else this.#field.setAttribute(name, v);
    }

    #readSlot(): void {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''));
      if (!script) return;
      try {
        const data = JSON.parse(script.textContent ?? '');
        if (data && typeof data === 'object') this.#suggestions = data as SuggestionsMap;
      } catch { /* noop */ }
    }

    #onInput(): void {
      this.setAttribute('value', this.#input.value);
      emit(this, 'iswc-input');
      const triggers = (this.getAttribute('trigger') || '@#').split('');
      const caret = this.#input.selectionStart ?? this.#input.value.length;
      const before = this.#input.value.slice(0, caret);
      const triggerChar = [...before].reverse().find((c: string) => triggers.includes(c));
      if (!triggerChar) { this.#hidePopup(); return; }
      // encontrar el trigger actual más cercano (último)
      const idx = before.lastIndexOf(triggerChar);
      if (idx < 0) { this.#hidePopup(); return; }
      const start = idx;
      // la query es el texto desde el trigger hasta el caret, sin espacios
      const query = before.slice(start + 1);
      if (/\s/.test(query)) { this.#hidePopup(); return; }
      // guardar referencia para reemplazo
      this.#lastTriggerChar = triggerChar;
      this.#lastTriggerRange = [start, caret];
      // buscar candidatos
      const list = this.#suggestions[triggerChar] || [];
      const maxItems = Number(this.getAttribute('max-items')) || 8;
      const filtered = query
        ? list.filter((s: string) => String(s).toLowerCase().includes(query.toLowerCase())).slice(0, maxItems)
        : list.slice(0, maxItems);
      if (!filtered.length) { this.#hidePopup(); return; }
      // La lista filtrada cambió de tamaño: un índice viejo puede quedar fuera
      // de rango y Enter seleccionaría undefined.
      if (this.#activeIndex >= filtered.length) this.#activeIndex = 0;
      this.#renderPopup(filtered, triggerChar);
      this.#positionPopup();
    }

    #renderPopup(items: string[], triggerChar: string): void {
      this.#popup.innerHTML = '';
      items.forEach((it: string, i: number) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'opt' + (i === this.#activeIndex ? ' iswc-active' : '');
        opt.setAttribute('role', 'option');
        opt.dataset.value = it;
        opt.innerHTML = `<span class="t">${triggerChar}</span><span>${String(it).replace(/</g, '&lt;')}</span>`;
        opt.addEventListener('pointerdown', (e: Event) => e.preventDefault());
        opt.addEventListener('click', () => this.#select(it));
        this.#popup.appendChild(opt);
      });
      this.#popup.hidden = false;
      this.#capa.attach();
      this.#input.setAttribute('aria-expanded', 'true');
      this.#popup.querySelector('.iswc-active')?.scrollIntoView({ block: 'nearest' });
    }

    #positionPopup(): void {
      // Debajo de la caja del campo, no del host: la etiqueta y la ayuda también miden.
      const box = this.#input.parentElement!.getBoundingClientRect();
      const root = this.#popup.parentElement!.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(this).fontSize) || 16;
      this.#popup.style.left = '0px';
      this.#popup.style.top = `${box.bottom - root.top + 0.25 * em}px`;
    }

    #hidePopup(): void {
      this.#popup.hidden = true;
      this.#capa.detach();
      this.#popup.innerHTML = '';
      this.#input.setAttribute('aria-expanded', 'false');
    }

    #onKey(e: KeyboardEvent): void {
      if (!this.isOpen) return;
      const items = [...this.#popup.querySelectorAll<HTMLElement>('.opt')];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.#activeIndex = (this.#activeIndex + 1) % items.length;
        this.#renderPopup(items.map((b: HTMLElement) => b.dataset.value ?? ''), this.#lastTriggerChar);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.#activeIndex = (this.#activeIndex - 1 + items.length) % items.length;
        this.#renderPopup(items.map((b: HTMLElement) => b.dataset.value ?? ''), this.#lastTriggerChar);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (items.length) {
          e.preventDefault();
          this.#select(items[this.#activeIndex].dataset.value ?? '');
        }
      } else if (e.key === 'Escape') {
        this.#hidePopup();
      }
    }

    #select(item: string): void {
      if (!this.#lastTriggerRange) return;
      const [start, end] = this.#lastTriggerRange;
      const cur = this.#input.value;
      const replacement = `${this.#lastTriggerChar}${item} `;
      const next = cur.slice(0, start) + replacement + cur.slice(end);
      this.#field.value = next;
      const caret = (start + replacement.length);
      try { this.#input.setSelectionRange(caret, caret); } catch { /* noop */ }
      this.setAttribute('value', next);
      this.#hidePopup();
      emit(this, 'iswc-select', { trigger: this.#lastTriggerChar, item, range: [start, caret] });
      this.interactuado = true;
      emit(this, 'iswc-change', { value: next });
    }
  }

  define(IswcMention);
})();
