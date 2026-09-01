import { adoptCss, defineElement, emit, upgradeProperties } from '../../core/element.js';
import { setStringAttr } from '../_shared/reflect.js';
import { withStyleAttrs } from '../../core/attrs.js';


/**
 * <is-button-group> — Web Component (vanilla, zero dependencies).
 *
 * Agrupa botones relacionados en una unidad visual y, opcionalmente, gestiona
 * qué botón está seleccionado (control segmentado / toggle group).
 *
 * Atributos
 *   label         string   a11y, anunciado por AT; no se muestra
 *   orientation   horizontal | vertical            (default horizontal, reflected)
 *   variant    joined | segmented | separated   (default joined, reflected)
 *   select        none | single | multiple         (default none)
 *   value         valor(es) seleccionados; en `multiple` separados por coma
 *   pill          boolean  extremos redondeados en todo el grupo
 *   stretch       boolean  los botones reparten el ancho disponible
 *   allow-empty   boolean  en `single`, permite deseleccionar el activo
 *   disabled      boolean  bloquea el grupo completo
 *
 * Slots
 *   (default)  uno o más <is-button> (o <button> nativos)
 *
 * CSS Parts:  ::part(base)
 * Eventos:    is-change { value, values }
 *
 * El valor de cada botón es su atributo `value`; si no lo tiene, se usa su
 * texto y, en último caso, su índice. El botón activo recibe el atributo
 * `selected` y `aria-pressed`, que el CSS del grupo usa para pintarlo.
 *
 * Las variables --_button-*-radius y --_button-*-indent se inyectan en los
 * hijos slotted; <is-button> las consume para fusionar bordes.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <slot part="base" class="button-group" role="group"></slot>
  `;

  /** Personalización por atributo (ver `core/attrs.ts`). */
  const STYLE_ATTRS = {
    radius: '--is-button-group-radius',
    gap: '--is-button-group-gap',
    padding: '--is-button-group-pad',
    accent: { prop: '--is-button-group-accent', onlyColorValues: true },
    'border-width': '--is-button-border-width',
  };

  const OBSERVED = [
    'label', 'orientation', 'variant', 'select', 'value',
    'pill', 'stretch', 'allow-empty', 'disabled',
    ...Object.keys(STYLE_ATTRS),
  ];

  /** ¿El valor está en la lista? Acota `string | null` al literal de la lista. */
  const esUno = <L extends readonly string[]>(lista: L, v: string | null | undefined): v is L[number] =>
    v != null && (lista as readonly string[]).includes(v);

  const APPEARANCES = ['joined', 'segmented', 'separated'] as const;
  const MODES = ['none', 'single', 'multiple'] as const;
  type Appearance = (typeof APPEARANCES)[number];
  type Mode = (typeof MODES)[number];
  /** Selección: uno en `single`, varios en `multiple`. */
  type Seleccion = string[];

  class IsButtonGroup extends withStyleAttrs(HTMLElement) {
    static styleAttrs = STYLE_ATTRS;

    static get observedAttributes(): string[] { return OBSERVED; }

    #slot!: HTMLSlotElement;
    #mounted = false;
    #selected: Seleccion = [];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#slot = shadow.querySelector<HTMLSlotElement>('slot')!;

      this.#slot.addEventListener('slotchange', this.#onSlotChange);
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKeyDown);
    }

    connectedCallback(): void {
      // El mixin vuelca STYLE_ATTRS antes de esto.
      super.connectedCallback();
      this.#mounted = true;
      upgradeProperties(this, OBSERVED);
      if (Object.prototype.hasOwnProperty.call(this, 'values')) {
        const v = this.values;
        delete (this as unknown as Record<string, unknown>)['values'];
        if (v != null) this.values = v;
      }
      if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'horizontal');
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'joined');
      this.#selected = this.#readSelection();
      this.#syncA11y();
      this.#syncSelection();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value' || name === 'select') {
        this.#selected = this.#readSelection();
        this.#syncSelection();
      }
      this.#syncA11y();
    }

    // ---- propiedades ------------------------------------------------------

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    get orientation() {
      return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
    }
    set orientation(v) {
      this.setAttribute('orientation', v === 'vertical' ? 'vertical' : 'horizontal');
    }

    get variant(): Appearance {
      const v = this.getAttribute('variant');
      return esUno(APPEARANCES, v) ? v : 'joined';
    }
    set variant(v: string) {
      this.setAttribute('variant', esUno(APPEARANCES, v) ? v : 'joined');
    }

    get select(): Mode {
      const v = this.getAttribute('select');
      return esUno(MODES, v) ? v : 'none';
    }
    set select(v: string) { this.setAttribute('select', esUno(MODES, v) ? v : 'none'); }

    /** string en `single`, string[] en `multiple`. */
    get value() {
      return this.select === 'multiple' ? this.#selected.slice() : (this.#selected[0] ?? '');
    }
    set value(v) {
      const list = Array.isArray(v) ? v.map(String) : String(v ?? '').split(',').map((s: string) => s.trim());
      this.#applySelection(list.filter(Boolean), false);
    }

    get values(): Seleccion { return this.#selected.slice(); }
    set values(v: string | Seleccion) { this.value = v; }

    get pill() { return this.hasAttribute('pill'); }
    set pill(v) { this.toggleAttribute('pill', !!v); }

    get stretch() { return this.hasAttribute('stretch'); }
    set stretch(v) { this.toggleAttribute('stretch', !!v); }

    get allowEmpty() { return this.hasAttribute('allow-empty'); }
    set allowEmpty(v) { this.toggleAttribute('allow-empty', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    // ---- API pública ------------------------------------------------------

    /** Botones del grupo en orden de documento. */
    get items() { return this.#items(); }

    /** Botón(es) seleccionado(s) como elementos. */
    get selectedItems() {
      return this.#items().filter((el, i) => this.#selected.includes(this.#valueOf(el, i)));
    }

    // ---- privados ---------------------------------------------------------

    #items(): HTMLElement[] {
      // `children` es `Element[]`, pero un `is-button-group` solo agrupa HTML:
      // acotar aqui evita repetir el cast en los seis sitios que lo consumen.
      return [...this.children].filter(
        (el: HTMLElement): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute('slot'));
    }

    #valueOf(el: HTMLElement, index: number): string {
      const attr = el.getAttribute('value');
      if (attr != null && attr !== '') return attr;
      const text = (el.textContent ?? '').trim();
      return text || String(index);
    }

    #isDisabled(el: HTMLElement): boolean {
      return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    }

    /** Selección efectiva: gana el atributo `value`; si no, los `selected` del DOM. */
    #readSelection() {
      const mode = this.select;
      if (mode === 'none') return [];

      const raw = this.getAttribute('value');
      if (raw != null) {
        const list = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
        return mode === 'single' ? list.slice(0, 1) : list;
      }

      const marked = this.#items()
        .map((el: HTMLElement, i) => (el.hasAttribute('selected') ? this.#valueOf(el, i) : null))
        .filter((v) => v !== null);
      return mode === 'single' ? marked.slice(0, 1) : marked;
    }

    #syncA11y() {
      const label = this.label;
      if (label) this.#slot.setAttribute('aria-label', label);
      else this.#slot.removeAttribute('aria-label');
      this.#slot.setAttribute('aria-orientation', this.orientation);
      this.setAttribute('aria-orientation', this.orientation);
      this.#slot.setAttribute('aria-disabled', String(this.disabled));
    }

    /** Refleja `#selected` en los hijos (atributo `selected` + aria-pressed). */
    #syncSelection() {
      const mode = this.select;
      this.#items().forEach((el: HTMLElement, i) => {
        if (mode === 'none') {
          el.removeAttribute('aria-pressed');
          return;
        }
        const on = this.#selected.includes(this.#valueOf(el, i));
        el.toggleAttribute('selected', on);
        el.setAttribute('aria-pressed', String(on));
      });
    }

    #applySelection(next: Seleccion, shouldEmit: boolean): void {
      const before = this.#selected.join(',');
      this.#selected = next;
      if (this.select === 'none') this.removeAttribute('value');
      else this.setAttribute('value', next.join(','));
      this.#syncSelection();
      if (shouldEmit && next.join(',') !== before) {
        emit(this, 'is-change', { value: this.value, values: this.values });
      }
    }

    #onSlotChange = () => {
      if (!this.#mounted) return;
      this.#selected = this.#readSelection();
      this.#syncSelection();
    };

    #onClick = (e: PointerEvent) => {
      const mode = this.select;
      if (mode === 'none' || this.disabled) return;
      const items = this.#items();
      const item = items.find((el) => el === e.target || el.contains(e.target as Node | null));
      if (!item || this.#isDisabled(item)) return;

      const value = this.#valueOf(item, items.indexOf(item));
      const isOn = this.#selected.includes(value);

      if (mode === 'single') {
        if (isOn && this.allowEmpty) this.#applySelection([], true);
        else if (!isOn) this.#applySelection([value], true);
        return;
      }
      this.#applySelection(
        isOn ? this.#selected.filter((v) => v !== value) : [...this.#selected, value],
        true
      );
    };

    /** Flechas mueven el foco entre botones (patrón ARIA toolbar), con envoltura. */
    #onKeyDown = (e: KeyboardEvent) => {
      const items = this.#items().filter((el) => !this.#isDisabled(el));
      if (items.length < 2) return;
      const current = items.findIndex((el) => el === e.target || el.contains(e.target as Node | null));
      if (current === -1) return;

      const vertical = this.orientation === 'vertical';
      const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
      const next = vertical ? 'ArrowDown' : 'ArrowRight';
      let target = null;

      if (e.key === next) target = items[(current + 1) % items.length];
      else if (e.key === prev) target = items[(current - 1 + items.length) % items.length];
      else if (e.key === 'Home') target = items[0];
      else if (e.key === 'End') target = items[items.length - 1];
      else return;

      e.preventDefault();
      target.focus?.();
    };
  }

  defineElement('is-button-group', IsButtonGroup, 'IsButtonGroup');
})();
