import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-stepper> + <is-stepper-step> — Web Components (vanilla, zero dependencies).
 *
 * Indicador de flujo por pasos. Ideal para wizards y formularios multipaso.
 *
 *   <is-stepper active="1">
 *     <is-stepper-step label="Cuenta">…</is-stepper-step>
 *     <is-stepper-step label="Perfil">…</is-stepper-step>
 *     <is-stepper-step label="Confirmar">…</is-stepper-step>
 *   </is-stepper>
 *
 * Atributos <is-stepper>
 *   active       number  — paso activo (0-indexed).
 *   orientation  horizontal | vertical    (default horizontal)
 *   without-line boolean  — oculta la línea conectora.
 *   color      default | simple | numbered | glass (default 'default')
 *
 * Atributos <is-stepper-step>
 *   label       string
 *   description string
 *   icon        string (iconify id)
 *   disabled    boolean
 *   error       boolean
 *
 * Slots
 *   <is-stepper>
 *     (default)  steps.
 *   <is-stepper-step>
 *     (default)  contenido del paso (si el padre lo pinta dentro de un wizard).
 *     icon       override del icono del step.
 *     label      override del label.
 *     description override del description.
 *
 * Eventos
 *   is-stepper-change  detail: { from, to, step }
 *   is-stepper-complete detail: { step } — cuando active >= total.
 *
 * CSS Parts
 *   is-stepper: ::part(base) ::part(steps)
 *   is-stepper-step: ::part(base) ::part(indicator) ::part(label) ::part(line)
 */
(() => {
  const TG_TEMPLATE = document.createElement('template');
  TG_TEMPLATE.innerHTML = /* html */ `
    <div class="stepper" part="base" role="list">
      <slot></slot>
    </div>
  `;

  const TG_OBSERVED = ['active', 'orientation', 'without-line', 'color'];

  class IsStepper extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    accent: { prop: '--is-stepper-accent', onlyColorValues: true },
    'text-color': { prop: '--is-stepper-text', onlyColorValues: true },
    'muted-color': { prop: '--is-stepper-muted', onlyColorValues: true },
    'border-color': { prop: '--is-stepper-border', onlyColorValues: true },
    };

    static get observedAttributes() { return [...TG_OBSERVED, ...IsStepper.styleAttrNames]; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TG_TEMPLATE.content.cloneNode(true));
    }

    onConnected() {
      this.#sync();
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#sync();
    }

    get active() {
      const v = parseInt(this.getAttribute('active') || '0', 10);
      return Number.isFinite(v) ? v : 0;
    }
    set active(v) {
      if (v == null) this.removeAttribute('active');
      else this.setAttribute('active', String(v));
    }

    next() {
      const steps = this.#steps();
      const a = this.active;
      const nextIdx = a + 1;
      if (nextIdx < steps.length) this.#goTo(nextIdx);
      else {
        emit(this, 'is-stepper-complete');
      }
    }
    prev() {
      const a = this.active;
      if (a > 0) this.#goTo(a - 1);
    }
    goTo(idx) { this.#goTo(idx); }

    #steps() {
      return [...this.querySelectorAll(':scope > is-stepper-step')];
    }

    #sync() {
      const steps = this.#steps();
      const orientation = this.getAttribute('orientation') || 'horizontal';
      const variant = this.getAttribute('color') || 'default';
      const base = this.shadowRoot.querySelector('.stepper');
      base.dataset.orientation = orientation;
      base.dataset.color = variant;
      const active = this.active;
      steps.forEach((s, i) => {
        const st = i < active ? 'done' : i === active ? 'active' : 'pending';
        s.dataset.state = st;
        if (s.hasAttribute('disabled') && i !== active) s.dataset.state = 'disabled';
        if (s.hasAttribute('error')) s.dataset.state = 'error';
        const num = s.shadowRoot?.querySelector('.num');
        if (num) num.textContent = String(i + 1);
      });
    }

    #goTo(idx) {
      const steps = this.#steps();
      if (idx < 0 || idx >= steps.length) return;
      const from = this.active;
      this.setAttribute('active', String(idx));
      emit(this, 'is-stepper-change', { from, to: idx, step: steps[idx] });
    }
  }

  defineElement('is-stepper', IsStepper, 'IsStepper');

  // ============ <is-stepper-step> ============
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

  class IsStepperStep extends ElementBase {
    static get observedAttributes() { return STEP_OBSERVED; }


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

    onAttributeChanged(name, oldVal, newVal) {
      this.#sync();
    }

    #sync() {
      const label = this.getAttribute('label');
      if (label) {
        const labelEl = this.shadowRoot.querySelector('.label');
        if (!labelEl.querySelector('slot[name="label"]')) return;
        // Si no hay slotted content, mostrar el attribute.
        const slot = labelEl.querySelector('slot[name="label"]');
        if (slot && !slot.assignedNodes().length) {
          labelEl.querySelector('slot[name="label"]').replaceWith(document.createTextNode(label));
        }
      }
      const desc = this.getAttribute('description');
      if (desc) {
        const descEl = this.shadowRoot.querySelector('.description');
        const slot = descEl.querySelector('slot[name="description"]');
        if (slot && !slot.assignedNodes().length) {
          descEl.querySelector('slot[name="description"]').replaceWith(document.createTextNode(desc));
        }
      }
      const icon = this.getAttribute('icon');
      if (icon) {
        const dot = this.shadowRoot.querySelector('.dot');
        const slot = dot.querySelector('slot[name="icon"]');
        if (slot && !slot.assignedNodes().length) {
          const ic = document.createElement('is-icon');
          ic.setAttribute('icon', icon);
          ic.setAttribute('aria-hidden', 'true');
          slot.replaceWith(ic);
        }
      }
    }
  }

  defineElement('is-stepper-step', IsStepperStep, 'IsStepperStep');
})();
