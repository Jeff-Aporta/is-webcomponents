import { adoptCss, defineElement, emit } from '../../core/element.js';

/**
 * <is-observer type="…"> — Web Component genérico para envolver
 * IntersectionObserver / MutationObserver / ResizeObserver.
 *
 * Sustituye a los 3 wrappers individuales que existían antes
 * (is-intersection-observer, is-mutation-observer, is-resize-observer)
 * con un único elemento cuya rama cambia por `type`. Los 3 nombres
 * históricos quedan registrados como alias que resuelven a la misma
 * clase con `type` prefijado en el constructor.
 *
 *   <is-observer type="intersection" intersect-class="visible">
 *     <div>…</div>
 *   </is-observer>
 *
 *   <is-observer type="mutation" attr="class open" child-list>
 *     <div>…</div>
 *   </is-observer>
 *
 *   <is-observer type="resize">
 *     <div>…</div>
 *   </is-observer>
 *
 * Atributos comunes
 *   type      intersection | mutation | resize     (obligatorio en <is-observer>)
 *   disabled  boolean — desconecta el observer sin destruir el elemento.
 *
 * Atributos por tipo
 *   intersection  intersect-class  string — clase a togglear en cada hijo
 *                  once             boolean — deja de observar tras la primera
 *                  root             string — selector del root (default viewport)
 *                  root-margin      string — ej. "10px 20px"
 *                  threshold        number 0–1
 *
 *   mutation       attr             string — filtro de atributos
 *                  child-list       boolean (default true)
 *                  character-data   boolean
 *
 *   resize         (sin parámetros extra)
 *
 * Eventos
 *   type="intersection"  is-intersect  detail: { entry }
 *   type="mutation"      is-mutate     detail: { records }
 *   type="resize"        is-resize     detail: { entries }
 *
 * Slots: default — los elementos a observar (en intersection/resize) o el
 *        subárbol a vigilar (en mutation).
 * Parts: ninguno. display:contents en el host.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = '<slot></slot>';

const OBSERVED = [
  'type', 'disabled',
  // intersection
  'intersect-class', 'once', 'root', 'root-margin', 'threshold',
  // mutation
  'attr', 'child-list', 'character-data',
];

class ObserverElement extends HTMLElement {
  static get observedAttributes(): string[] { return OBSERVED; }

  #observer = null;
  #mounted = false;
  #slot = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#slot = shadow.querySelector<HTMLSlotElement>('slot')!;
  }

  connectedCallback(): void {
    this.#mounted = true;
    this.#slot.addEventListener('slotchange', this.#onSlotChange);
    this.#setup();
  }

  disconnectedCallback(): void {
    this.#slot.removeEventListener('slotchange', this.#onSlotChange);
    this.#teardown();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (!this.#mounted || oldVal === newVal) return;
    this.#setup();
  }

  // ---- type ----
  get type() {
    const v = this.getAttribute('type');
    return ['intersection', 'mutation', 'resize'].includes(v) ? v : 'intersection';
  }
  set type(v) {
    if (v == null || v === '') this.removeAttribute('type');
    else this.setAttribute('type', v);
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  // ---- privados ----
  #onSlotChange = () => {
    // El observer de mutación vigila el host, no los hijos: reconectarlo en
    // cada slotchange sólo perdería registros pendientes.
    if (this.#mounted && this.type !== 'mutation') this.#setup();
  };

  #teardown() {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  /** Root del IO: closest (ancestro) → getRootNode (shadow) → document. */
  #resolveIntersectionRoot() {
    const rootSel = (this.getAttribute('root') || '').trim();
    if (!rootSel) return null;
    try {
      const viaClosest = this.closest(rootSel);
      if (viaClosest) return viaClosest;
    } catch {
      /* selector inválido para closest */
    }
    const scope = this.getRootNode();
    if (scope instanceof Document || scope instanceof ShadowRoot) {
      const viaScope = scope.querySelector<HTMLElement>(rootSel);
      if (viaScope) return viaScope;
    }
    return document.querySelector<HTMLElement>(rootSel);
  }

  #setupIntersection() {
    const root = this.#resolveIntersectionRoot();
    const margin = this.getAttribute('root-margin') || '0px';
    const threshRaw = this.getAttribute('threshold');
    const threshold = threshRaw != null && threshRaw !== '' ? parseFloat(threshRaw) : 0;
    const once = this.hasAttribute('once');
    const cls = this.getAttribute('intersect-class') || '';

    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (cls && entry.target instanceof Element) {
          entry.target.classList.toggle(cls, entry.isIntersecting);
        }
        emit(this, 'is-intersect', { entry });
        if (once && entry.isIntersecting) {
          this.#observer?.unobserve(entry.target);
        }
      }
    }, { root, rootMargin: margin, threshold });

    for (const child of this.children) this.#observer.observe(child);
  }

  #setupMutation() {
    const attrRaw = this.getAttribute('attr');
    const attrFilter = attrRaw && attrRaw.trim() ? attrRaw.trim() : null;
    const childList = this.hasAttribute('child-list')
      || (!this.hasAttribute('character-data') && !this.hasAttribute('attr'));
    const charData = this.hasAttribute('character-data');

    const opts = {
      childList,
      characterData: charData,
      subtree: true,
      attributes: this.hasAttribute('attr') && !!attrFilter,
      attributeFilter: attrFilter ? attrFilter.split(/\s+/).filter(Boolean) : undefined,
    };

    this.#observer = new MutationObserver((records) => {
      emit(this, 'is-mutate', { records });
    });

    this.#observer.observe(this, opts);
  }

  #setupResize() {
    if (typeof ResizeObserver === 'undefined') return;
    this.#observer = new ResizeObserver((entries) => {
      emit(this, 'is-resize', { entries });
    });
    for (const child of this.children) this.#observer.observe(child);
  }

  #setup() {
    this.#teardown();
    if (this.disabled) return;
    switch (this.type) {
      case 'mutation': this.#setupMutation(); break;
      case 'resize': this.#setupResize(); break;
      case 'intersection':
      default: this.#setupIntersection();
    }
  }
}

defineElement('is-observer', ObserverElement, 'IsObserver');

/**
 * Colore con `type` prefijado al construir. Usada por los wrappers
 * históricos (intersection-observer, mutation-observer, resize-observer).
 */
export function createObserverElement(defaultType) {
  class PrefixedObserver extends ObserverElement {
    constructor() {
      super();
      this.setAttribute('type', defaultType);
    }
  }
  return PrefixedObserver;
}
