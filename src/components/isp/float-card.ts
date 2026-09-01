import { ElementBase } from '../../core/element-base.js';
import { adoptCss, defineElement } from '../../core/element.js';

/**
 * <is-float-card> — port de FloatingComponent.svelte (ClientesIS).
 *
 * Ancla contenido (slot default) y un panel absoluto (slot="float").
 * El panel se oculta con opacity/visibility: los hijos se quedan montados
 * para no re-upgradear is-button/is-icon en cada hover (FOUC).
 *
 * Attrs: open, horizontal, vertical
 * Props: linearTransform { tx, ty, e }
 * Methods: lock() / unlock() — keep-alive si un is-dropdown interno está abierto
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="wrap" class="wrap">
    <slot></slot>
    <div part="panel" class="panel">
      <slot name="float"></slot>
    </div>
  </div>
`;

function parseAxis(value) {
  const raw = String(value ?? '');
  const [side, off] = raw.split('+');
  const offset = off ? Number(off) : NaN;
  return { side: side || '', offset: Number.isFinite(offset) ? offset : 0 };
}

function cssLen(v: string) {
  if (v === undefined || v === null || v === '') return '0';
  if (typeof v === 'number') return Number.isFinite(v) ? `${v}px` : '0';
  return String(v);
}

class IsFloatCard extends ElementBase {
  static TEMPLATE = TEMPLATE;
  static get observedAttributes(): string[] { return ['open', 'horizontal', 'vertical', 'locked']; }

  #panel!: HTMLElement;
  #keep = 0;
  #lt = null;

  constructor() {
    super();
    this.initShadow();
    adoptCss(this.shadowRoot!, import.meta.url);
    this.#panel = this.shadowRoot!.querySelector<HTMLElement>('.panel')!;
  }

  onConnected() {
    this.addEventListener('is-show', this.#onChildShow);
    this.addEventListener('is-hide', this.#onChildHide);
    this.#place();
  }

  onDisconnected() {
    this.removeEventListener('is-show', this.#onChildShow);
    this.removeEventListener('is-hide', this.#onChildHide);
  }

  onAttributeChanged(name) {
    if (name === 'horizontal' || name === 'vertical') this.#place();
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { this.setBooleanAttr('open', v); }

  get locked() { return this.hasAttribute('locked'); }

  get horizontal() { return this.getAttribute('horizontal') || 'right'; }
  set horizontal(v) { v ? this.setAttribute('horizontal', v) : this.removeAttribute('horizontal'); }

  get vertical() { return this.getAttribute('vertical') || 'center'; }
  set vertical(v) { v ? this.setAttribute('vertical', v) : this.removeAttribute('vertical'); }

  get linearTransform() { return this.#lt; }
  set linearTransform(v) {
    const next = v && typeof v === 'object' ? v : null;
    if (JSON.stringify(this.#lt) === JSON.stringify(next)) return;
    this.#lt = next;
    this.#place();
  }

  lock() {
    this.#keep += 1;
    this.setBooleanAttr('locked', this.#keep > 0);
  }
  unlock() {
    this.#keep = Math.max(0, this.#keep - 1);
    this.setBooleanAttr('locked', this.#keep > 0);
  }

  #onChildShow = (e: Event) => {
    if (e.target === this) return;
    this.lock();
  };
  #onChildHide = (e: Event) => {
    if (e.target === this) return;
    this.unlock();
  };

  #place() {
    if (!this.#panel) return;
    const h = parseAxis(this.horizontal);
    const v = parseAxis(this.vertical);
    let left = 'auto';
    let right = 'auto';
    let top = 'auto';
    let bottom = 'auto';
    let tx = '0';
    let ty = '0';
    if (h.side === 'left' && h.offset > 0) { left = '0'; tx = `-${h.offset}%`; }
    else if (h.side === 'right' && h.offset > 0) { right = '0'; tx = `${h.offset}%`; }
    else if (h.side === 'left') left = '0.25em';
    else if (h.side === 'right') right = '0.25em';
    else if (h.side === 'center') { left = '50%'; tx = '-50%'; }
    if (v.side === 'top' && v.offset > 0) { top = '0'; ty = `-${v.offset}%`; }
    else if (v.side === 'bottom' && v.offset > 0) { bottom = '0'; ty = `${v.offset}%`; }
    else if (v.side === 'top') top = '0';
    else if (v.side === 'bottom') bottom = '-15px';
    else if (v.side === 'center') { top = '50%'; ty = '-50%'; }
    const extra = [];
    const lt = this.#lt;
    if (lt) {
      const ltx = cssLen(lt.tx);
      const lty = cssLen(lt.ty);
      if (ltx !== '0' || lty !== '0') extra.push(`translate(${ltx}, ${lty})`);
      if (typeof lt.e === 'number' && Number.isFinite(lt.e) && lt.e !== 1 && lt.e) extra.push(`scale(${lt.e})`);
    }
    const transform = [`translate(${tx}, ${ty})`, ...extra].filter((p) => p && p !== 'translate(0, 0)').join(' ');
    this.#panel.style.cssText = `left:${left};right:${right};top:${top};bottom:${bottom};transform:${transform || 'none'};`;
  }
}

defineElement('is-float-card', IsFloatCard, 'IsFloatCard');
