import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <iswc-stepper> + <iswc-stepper-step> — Web Components (vanilla, zero dependencies).
 *
 * Indicador de flujo por pasos. Ideal para wizards y formularios multipaso.
 *
 *   <iswc-stepper active="1">
 *     <iswc-stepper-step label="Cuenta">…</iswc-stepper-step>
 *     <iswc-stepper-step label="Perfil">…</iswc-stepper-step>
 *     <iswc-stepper-step label="Confirmar">…</iswc-stepper-step>
 *   </iswc-stepper>
 *
 * Atributos <iswc-stepper>
 *   active       number  — paso activo (0-indexed).
 *   orientation  horizontal | vertical    (default horizontal)
 *   without-line boolean  — oculta la línea conectora.
 *   color      default | simple | numbered | glass (default 'default')
 *
 * Atributos <iswc-stepper-step>
 *   label       string
 *   description string
 *   icon        string (iconify id)
 *   disabled    boolean
 *   error       boolean
 *
 * Slots
 *   <iswc-stepper>
 *     (default)  steps.
 *   <iswc-stepper-step>
 *     (default)  contenido del paso (si el padre lo pinta dentro de un wizard).
 *     icon       override del icono del step.
 *     label      override del label.
 *     description override del description.
 *
 * Eventos
 *   iswc-stepper-change  detail: { from, to, step }
 *   iswc-stepper-complete detail: { step } — cuando active >= total.
 *
 * CSS Parts
 *   iswc-stepper: ::part(base) ::part(steps)
 *   iswc-stepper-step: ::part(base) ::part(indicator) ::part(label) ::part(line)
 */
(() => {
  const TG_TEMPLATE = document.createElement('template');
  TG_TEMPLATE.innerHTML = /* html */ `
    <div class="stepper" part="base" role="list">
      <slot></slot>
    </div>
  `;

  const TG_OBSERVED = ['active', 'orientation', 'without-line', 'color'];

  class IswcStepper extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    accent: { prop: '--iswc-stepper-accent', onlyColorValues: true },
    'text-color': { prop: '--iswc-stepper-text', onlyColorValues: true },
    'muted-color': { prop: '--iswc-stepper-muted', onlyColorValues: true },
    'border-color': { prop: '--iswc-stepper-border', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...TG_OBSERVED, ...IswcStepper.styleAttrNames]; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TG_TEMPLATE.content.cloneNode(true));
    }

    onConnected() {
      this.#sync();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
    }

    get active(): number {
      const v = parseInt(this.getAttribute('active') || '0', 10);
      return Number.isFinite(v) ? v : 0;
    }
    set active(v: number | null | undefined) {
      if (v == null) this.removeAttribute('active');
      else this.setAttribute('active', String(v));
    }

    next() {
      const steps = this.#steps();
      const a = this.active;
      const nextIdx = a + 1;
      if (nextIdx < steps.length) this.#goTo(nextIdx);
      else {
        emit(this, 'iswc-stepper-complete');
      }
    }
    prev() {
      const a = this.active;
      if (a > 0) this.#goTo(a - 1);
    }
    goTo(idx: number) { this.#goTo(idx); }

    #steps() {
      return [...this.querySelectorAll<HTMLElement>(':scope > iswc-stepper-step')];
    }

    #sync() {
      const steps = this.#steps();
      const orientation = this.getAttribute('orientation') || 'horizontal';
      const variant = this.getAttribute('color') || 'default';
      const base = this.shadowRoot!.querySelector<HTMLElement>('.stepper');
      if (!base) return;
      base.dataset.orientation = orientation;
      base.dataset.color = variant;
      const active = this.active;
      steps.forEach((s: HTMLElement, i: number) => {
        const st = i < active ? 'done' : i === active ? 'active' : 'pending';
        s.dataset.state = st;
        if (s.hasAttribute('disabled') && i !== active) s.dataset.state = 'disabled';
        if (s.hasAttribute('error')) s.dataset.state = 'error';
        const num = s.shadowRoot?.querySelector<HTMLElement>('.num');
        if (num) num.textContent = String(i + 1);
        // aria-current="step" en el paso activo (propuesta g13 stepper).
        if (i === active) {
          s.setAttribute('aria-current', 'step');
        } else {
          s.removeAttribute('aria-current');
        }
        // Cada paso conoce su índice y el total para anunciado más rico.
        if (!s.hasAttribute('aria-posinset')) s.setAttribute('aria-posinset', String(i + 1));
        if (!s.hasAttribute('aria-setsize')) s.setAttribute('aria-setsize', String(steps.length));
      });
    }

    #goTo(idx: number) {
      const steps = this.#steps();
      if (idx < 0 || idx >= steps.length) return;
      const from = this.active;
      this.setAttribute('active', String(idx));
      emit(this, 'iswc-stepper-change', { from, to: idx, step: steps[idx] });
    }
  }

  defineElement('iswc-stepper', IswcStepper, 'IswcStepper');

  // ============ <iswc-stepper-step> ============
  const STEP_TEMPLATE = document.createElement('template');
  STEP_TEMPLATE.innerHTML = /* html */ `
    <div class="step" part="base">
      <div class="indicator" part="indicator">
        <span class="dot"><slot name="icon"><span class="num"></span></slot></span>
        <span class="line" part="line"></span>
      </div>
      <div class="meta">
        <div class="label" part="label"><slot name="label">Step</slot></div>
        <div class="description" part="description"><slot name="description"></slot></div>
      </div>
    </div>
  `;

  const STEP_OBSERVED = ['label', 'description', 'icon', 'disabled', 'error'];

  class IswcStepperStep extends ElementBase {
    static get observedAttributes(): string[] { return STEP_OBSERVED; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(STEP_TEMPLATE.content.cloneNode(true));
    }

    onConnected() {
      this.setAttribute('role', 'listitem');
      this.#sync();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
    }

    #sync() {
      const label = this.getAttribute('label');
      if (label) {
        const labelEl = this.shadowRoot!.querySelector<HTMLElement>('.label');
        if (!labelEl || !labelEl.querySelector<HTMLSlotElement>('slot[name="label"]')) return;
        // Si no hay slotted content, mostrar el attribute.
        const slot = labelEl.querySelector<HTMLSlotElement>('slot[name="label"]');
        if (slot && !slot.assignedNodes().length) {
          labelEl.querySelector<HTMLSlotElement>('slot[name="label"]')!.replaceWith(document.createTextNode(label));
        }
      }
      const desc = this.getAttribute('description');
      if (desc) {
        const descEl = this.shadowRoot!.querySelector<HTMLElement>('.description');
        if (!descEl) return;
        const slot = descEl.querySelector<HTMLSlotElement>('slot[name="description"]');
        if (slot && !slot.assignedNodes().length) {
          descEl.querySelector<HTMLSlotElement>('slot[name="description"]')!.replaceWith(document.createTextNode(desc));
        }
      }
      const icon = this.getAttribute('icon');
      if (icon) {
        const dot = this.shadowRoot!.querySelector<HTMLElement>('.dot');
        if (!dot) return;
        const slot = dot.querySelector<HTMLSlotElement>('slot[name="icon"]');
        if (slot && !slot.assignedNodes().length) {
          const ic = document.createElement('iswc-icon');
          ic.setAttribute('icon', icon);
          ic.setAttribute('aria-hidden', 'true');
          slot.replaceWith(ic);
        }
      }
    }
  }

  defineElement('iswc-stepper-step', IswcStepperStep, 'IswcStepperStep');
})();
