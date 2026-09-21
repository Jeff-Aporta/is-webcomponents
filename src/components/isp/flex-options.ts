import { ElementBase } from '../../core/element-base.js';
import { adoptCss, defineElement } from '../../core/element.js';
import '../actions/button.js';
import '../actions/button-group.js';
import '../actions/check-icon-button.js';
import '../actions/dropdown.js';
import '../actions/dropdown-item.js';
import '../layout/divider.js';
import '../media/icon.js';
import { paintFlexOptions, type FlexActionEntry } from './_shared/tree-view/flex-options.js';

/**
 * g11 — UX/UI proposals sobre la toolbar:
 *   - role="toolbar" (existente), aria-orientation="horizontal".
 *   - Atributo `label` → aria-label (landmark con etiqueta accesible).
 *   - Roving tabindex entre los botones pintados: el primero focuseable recibe
 *     tabindex="0", los demás tabindex="-1"; ArrowLeft/Right mueven el foco y
 *     reasignan la pestaña activa. Home/End saltan al primero/último.
 *   - prefers-reduced-motion: anula transiciones heredadas (en CSS).
 */

export { paintFlexOptions };
export type { FlexActionEntry };

/**
 * <is-flex-options> — port de FlexOptions.svelte (ClientesIS).
 *
 * Toolbar de acciones (grupos + separador + menú "más") pintada con
 * is-button / is-check-icon-button / is-dropdown. No recrea el DOM si la
 * firma de acciones no cambió.
 *
 * Props: actions, more
 * Attrs: compact, more-disabled
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="toolbar" class="toolbar" role="toolbar"></div>
`;

class IsFlexOptions extends ElementBase {
  static TEMPLATE = TEMPLATE;
  static get observedAttributes(): string[] { return ['compact', 'more-disabled', 'label', 'labelledby']; }

  #root!: HTMLElement;
  #actions: FlexActionEntry[] = [];
  #more: FlexActionEntry[] = [];

  constructor() {
    super();
    this.initShadow();
    adoptCss(this.shadowRoot!, import.meta.url);
    this.#root = this.shadowRoot!.querySelector<HTMLElement>('.toolbar')!;
  }

  #batch = false;

  onConnected() {
    this.#paint();
    this.#syncAria();
    this.addEventListener('keydown', this.#onKeydown);
  }

  onDisconnected() {
    this.removeEventListener('keydown', this.#onKeydown);
  }

  onAttributeChanged(name: string) {
    if (!this.#batch) this.#paint();
    if (name === 'label' || name === 'labelledby') this.#syncAria();
  }

  get compact() { return this.hasAttribute('compact'); }
  set compact(v) { this.setBooleanAttr('compact', v); }

  get moreDisabled() { return this.hasAttribute('more-disabled'); }
  set moreDisabled(v) { this.setBooleanAttr('more-disabled', v); }

  /** g11 — Etiqueta accesible del toolbar; se refleja a `aria-label`. */
  get label() { return this.getAttribute('label') ?? ''; }
  set label(v) { v == null || v === '' ? this.removeAttribute('label') : this.setAttribute('label', String(v)); }

  /** g11 — ID del elemento que etiqueta al toolbar; se refleja a `aria-labelledby`. */
  get labelledby() { return this.getAttribute('labelledby') ?? ''; }
  set labelledby(v) { v == null || v === '' ? this.removeAttribute('labelledby') : this.setAttribute('labelledby', String(v)); }

  get actions(): FlexActionEntry[] { return this.#actions; }
  set actions(v: FlexActionEntry[]) { this.setConfig({ actions: v }); }

  get more(): FlexActionEntry[] { return this.#more; }
  set more(v: FlexActionEntry[]) { this.setConfig({ more: v }); }

  setConfig(config: {
    actions?: FlexActionEntry[];
    more?: FlexActionEntry[];
    moreDisabled?: boolean;
    compact?: boolean;
  } = {}): void {
    const { actions, more, moreDisabled, compact } = config;
    this.#batch = true;
    if (actions !== undefined) this.#actions = Array.isArray(actions) ? actions : [];
    if (more !== undefined) this.#more = Array.isArray(more) ? more : [];
    if (moreDisabled !== undefined) this.setBooleanAttr('more-disabled', moreDisabled);
    if (compact !== undefined) this.setBooleanAttr('compact', compact);
    this.#batch = false;
    this.#paint();
    this.#syncAria();
  }

  #paint() {
    if (!this.#root) return;
    paintFlexOptions(this.#root, this.#actions, {
      more: this.#more,
      moreDisabled: this.moreDisabled,
      compact: this.compact,
    });
    // Tras pintar, asignar tabindex a los botones focuseables.
    queueMicrotask(() => this.#syncTabindex());
  }

  #syncAria(): void {
    // g11 — el .toolbar dentro del shadow ya tiene role="toolbar" en el
    // template; añadimos aria-orientation y etiqueta accesible al host si
    // también nos piden landmark (label/labelledby).
    const label = (this.getAttribute('label') ?? '').trim();
    const labelledby = (this.getAttribute('labelledby') ?? '').trim();
    if (label) this.setAttribute('aria-label', label);
    else this.removeAttribute('aria-label');
    if (labelledby) this.setAttribute('aria-labelledby', labelledby);
    else this.removeAttribute('aria-labelledby');
    // g11 — orientacion horizontal por defecto (toolbar típico). La toolbar
    // nunca se reorienta: el contenido se pinta horizontal.
    this.setAttribute('aria-orientation', 'horizontal');
    // Propagar aria-orientation al .toolbar interno para AT que no sube al host.
    if (this.#root) {
      this.#root.setAttribute('aria-orientation', 'horizontal');
    }
  }

  /**
   * g11 — Roving tabindex: enumera los botones focuseables pintados en el
   * toolbar y asigna tabindex=0 al activo (por defecto el primero), -1 al resto.
   * Esto evita que el tab entre cada botón y obliga a usar flechas.
   */
  #syncTabindex(): void {
    if (!this.#root) return;
    const focusables = this.#focusables();
    if (focusables.length === 0) return;
    const current = focusables.find((b) => b.getAttribute('tabindex') === '0');
    const target = current && focusables.includes(current) ? current : focusables[0];
    focusables.forEach((b) => {
      if (b === target) b.setAttribute('tabindex', '0');
      else b.setAttribute('tabindex', '-1');
    });
  }

  /** Botones pintados (is-button, is-check-icon-button, trigger del dropdown) no deshabilitados. */
  #focusables(): HTMLElement[] {
    if (!this.#root) return [];
    const out: HTMLElement[] = [];
    const visit = (root: ParentNode): void => {
      const all = root.querySelectorAll('is-button, is-check-icon-button');
      for (const el of Array.from(all)) {
        const node = el as HTMLElement;
        // Excluir items del dropdown (viven dentro de is-dropdown y se navegan aparte).
        if (node.closest('is-dropdown') && node.getAttribute('slot') !== 'trigger') continue;
        if (node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true') continue;
        out.push(node);
      }
    };
    visit(this.#root);
    return out;
  }

  /**
   * g11 — Roving tabindex con teclado: ArrowLeft/Right mueven el foco entre
   * los botones; Home/End saltan al primero/último. Si el foco está en el
   * trigger del "more" dropdown, ArrowLeft/Right sigue moviéndose dentro del
   * toolbar (incluyendo el trigger).
   */
  #onKeydown = (e: KeyboardEvent): void => {
    const target = e.composedPath()[0] as HTMLElement | undefined;
    if (!target) return;
    // Solo reaccionar cuando el foco está en uno de los botones pintados.
    const focusables = this.#focusables();
    if (focusables.length === 0) return;
    const idx = focusables.indexOf(target as HTMLElement);
    if (idx === -1) return;
    let next = idx;
    switch (e.key) {
      case 'ArrowRight': next = (idx + 1) % focusables.length; break;
      case 'ArrowLeft': next = (idx - 1 + focusables.length) % focusables.length; break;
      case 'Home': next = 0; break;
      case 'End': next = focusables.length - 1; break;
      default: return;
    }
    e.preventDefault();
    focusables.forEach((b, i) => {
      if (i === next) b.setAttribute('tabindex', '0');
      else b.setAttribute('tabindex', '-1');
    });
    focusables[next].focus();
  };
}

defineElement('is-flex-options', IsFlexOptions, 'IsFlexOptions');
