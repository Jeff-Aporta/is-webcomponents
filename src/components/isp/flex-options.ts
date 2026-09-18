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
  static get observedAttributes(): string[] { return ['compact', 'more-disabled']; }

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

  onConnected() { this.#paint(); }
  onAttributeChanged() { if (!this.#batch) this.#paint(); }

  get compact() { return this.hasAttribute('compact'); }
  set compact(v) { this.setBooleanAttr('compact', v); }

  get moreDisabled() { return this.hasAttribute('more-disabled'); }
  set moreDisabled(v) { this.setBooleanAttr('more-disabled', v); }

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
  }

  #paint() {
    if (!this.#root) return;
    paintFlexOptions(this.#root, this.#actions, {
      more: this.#more,
      moreDisabled: this.moreDisabled,
      compact: this.compact,
    });
  }
}

defineElement('is-flex-options', IsFlexOptions, 'IsFlexOptions');
