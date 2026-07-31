import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-copy-button> — Web Component (vanilla).
 *
 * Copia texto al portapapeles con feedback visual (éxito / error).
 * Requiere contexto seguro (HTTPS o localhost) para clipboard.writeText().
 *
 * Atributos
 *   value               string a copiar
 *   from                id | id[attr] | id.prop  (gana sobre value)
 *   copy-label          etiqueta / tooltip en reposo
 *   success-label       tooltip tras copiar
 *   error-label         tooltip si falla
 *   feedback-duration   ms de feedback (default 1000)
 *   tooltip             full | copy | none  (default full)
 *   tooltip-placement   top | right | bottom | left  (default top)
 *   disabled            boolean
 *
 * Slots
 *   (default)       trigger custom (opcional; si hay, oculta el botón interno)
 *   copy-icon       icono en reposo
 *   success-icon    icono de éxito
 *   error-icon      icono de error
 *
 * Events (bubbles + composed): is-copy { value }, is-error
 * Custom states: :state(success) :state(error)
 * CSS Parts: button, copy-icon, success-icon, error-icon, feedback
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `


    <div class="trigger">
      <slot></slot>
      <button part="button" class="button" type="button" id="copy-btn">
        <span part="copy-icon" class="icon" data-state="copy">
          <slot name="copy-icon"><is-icon icon="mdi:content-copy"></is-icon></slot>
        </span>
        <span part="success-icon" class="icon" data-state="success" hidden>
          <slot name="success-icon"><is-icon icon="mdi:check"></is-icon></slot>
        </span>
        <span part="error-icon" class="icon" data-state="error" hidden>
          <slot name="error-icon"><is-icon icon="mdi:close"></is-icon></slot>
        </span>
      </button>
      <div part="feedback" class="tip" role="tooltip" data-placement="top" hidden></div>
      <div class="sr-only" aria-live="polite"></div>
    </div>
  `;

  const LABELS = { copy: 'Copiar', success: 'Copiado', error: 'Error' };

  class IsCopyButton extends HTMLElement {
    static get observedAttributes() {
      return [
        'value', 'from', 'disabled',
        'copy-label', 'success-label', 'error-label',
        'feedback-duration', 'tooltip', 'tooltip-placement'
      ];
    }

    #btn;
    #tip;
    #live;
    #icons = {};
    #internals = null;
    #mounted = false;
    #status = 'rest';
    #copying = false;
    #hasCustom = false;
    #feedbackTimer = null;
    #hoverOpen = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector('.button');
      this.#tip = shadow.querySelector('.tip');
      this.#live = shadow.querySelector('.sr-only');
      this.#icons = {
        copy: shadow.querySelector('[data-state="copy"]'),
        success: shadow.querySelector('[data-state="success"]'),
        error: shadow.querySelector('[data-state="error"]')
      };
      if ('attachInternals' in this) {
        try { this.#internals = this.attachInternals(); } catch { /* noop */ }
      }
      shadow.querySelector('slot:not([name])').addEventListener('slotchange', () => this.#onSlotChange());
      this.#btn.addEventListener('click', (e) => { e.stopPropagation(); this.#handleCopy(); });
      shadow.querySelector('.trigger').addEventListener('click', (e) => {
        if (this.#hasCustom && !this.#btn.contains(e.target)) this.#handleCopy();
      });
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('tooltip')) this.setAttribute('tooltip', 'full');
      if (!this.hasAttribute('tooltip-placement')) this.setAttribute('tooltip-placement', 'top');
      this.#upgradeProps();
      this.#onSlotChange();
      this.#syncDisabled();
      this.#syncTipPlacement();
      this.#syncLabel();
      this.#wireHover();
    }

    disconnectedCallback() {
      if (this.#feedbackTimer) clearTimeout(this.#feedbackTimer);
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'disabled') this.#syncDisabled();
      if (name === 'tooltip-placement') this.#syncTipPlacement();
      if (name === 'tooltip') this.#syncTipMode();
      if (name === 'copy-label' || name === 'success-label' || name === 'error-label') this.#syncLabel();
    }

    // --- props ---
    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v == null ? this.removeAttribute('value') : this.setAttribute('value', v); }
    get from() { return this.getAttribute('from') ?? ''; }
    set from(v) { v == null || v === '' ? this.removeAttribute('from') : this.setAttribute('from', v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }
    get copyLabel() { return this.getAttribute('copy-label') ?? ''; }
    set copyLabel(v) { v ? this.setAttribute('copy-label', v) : this.removeAttribute('copy-label'); }
    get successLabel() { return this.getAttribute('success-label') ?? ''; }
    set successLabel(v) { v ? this.setAttribute('success-label', v) : this.removeAttribute('success-label'); }
    get errorLabel() { return this.getAttribute('error-label') ?? ''; }
    set errorLabel(v) { v ? this.setAttribute('error-label', v) : this.removeAttribute('error-label'); }
    get feedbackDuration() {
      const n = Number(this.getAttribute('feedback-duration'));
      return Number.isFinite(n) && n >= 0 ? n : 1000;
    }
    set feedbackDuration(v) { this.setAttribute('feedback-duration', String(v)); }
    get tooltip() {
      const v = this.getAttribute('tooltip');
      return v === 'copy' || v === 'none' ? v : 'full';
    }
    set tooltip(v) { this.setAttribute('tooltip', v === 'copy' || v === 'none' ? v : 'full'); }
    get tooltipPlacement() {
      const v = this.getAttribute('tooltip-placement');
      return ['top', 'right', 'bottom', 'left'].includes(v) ? v : 'top';
    }
    set tooltipPlacement(v) { this.setAttribute('tooltip-placement', v); }

    get #currentLabel() {
      if (this.#status === 'success') return this.successLabel || LABELS.success;
      if (this.#status === 'error') return this.errorLabel || LABELS.error;
      return this.copyLabel || LABELS.copy;
    }

    #upgradeProps() {
      for (const a of IsCopyButton.observedAttributes) {
        const camel = a.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (Object.prototype.hasOwnProperty.call(this, camel)) {
          const v = this[camel];
          delete this[camel];
          this[camel] = v;
        }
      }
    }

    #onSlotChange() {
      const slot = this.shadowRoot.querySelector('slot:not([name])');
      const els = slot.assignedElements({ flatten: true }).filter((el) => el instanceof HTMLElement);
      this.#hasCustom = els.length > 0;
      this.#btn.hidden = this.#hasCustom;
      this.#syncLabel();
    }

    /** CustomStateSet no tiene .toggle() — solo add/delete. */
    #toggleState(name, on) {
      const s = this.#internals?.states;
      if (!s) return;
      if (on) s.add(name);
      else s.delete(name);
    }

    #syncDisabled() {
      this.#btn.disabled = this.disabled;
      this.#toggleState('disabled', this.disabled);
    }

    #syncTipPlacement() {
      this.#tip.dataset.placement = this.tooltipPlacement;
    }

    #syncTipMode() {
      if (this.tooltip === 'none') this.#hideTip();
    }

    #syncLabel() {
      const label = this.#currentLabel;
      this.#btn.setAttribute('aria-label', label);
      this.#tip.textContent = label;
    }

    #setState(success, error) {
      this.#toggleState('success', success);
      this.#toggleState('error', error);
      this.toggleAttribute('data-state-success', success);
      this.toggleAttribute('data-state-error', error);
    }

    #wireHover() {
      const show = () => {
        if (this.disabled || this.tooltip !== 'full' || this.#status !== 'rest') return;
        this.#hoverOpen = true;
        this.#showTip();
      };
      const hide = () => {
        this.#hoverOpen = false;
        if (this.#status === 'rest') this.#hideTip();
      };
      this.#btn.addEventListener('mouseenter', show);
      this.#btn.addEventListener('mouseleave', hide);
      this.#btn.addEventListener('focus', show);
      this.#btn.addEventListener('blur', hide);
    }

    #showTip() {
      if (this.tooltip === 'none') return;
      this.#tip.hidden = false;
      requestAnimationFrame(() => this.#tip.toggleAttribute('data-open', true));
    }

    #hideTip() {
      this.#tip.removeAttribute('data-open');
      const done = () => { if (!this.#tip.hasAttribute('data-open')) this.#tip.hidden = true; };
      this.#tip.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 200);
    }

    async #handleCopy() {
      if (this.disabled || this.#copying) return;
      this.#copying = true;

      let valueToCopy = this.value;
      if (this.from) {
        const root = this.getRootNode();
        const isProperty = this.from.includes('.');
        const isAttribute = this.from.includes('[') && this.from.includes(']');
        let id = this.from;
        let field = '';
        if (isProperty) [id, field] = this.from.trim().split('.');
        else if (isAttribute) [id, field] = this.from.trim().replace(/\]$/, '').split('[');

        const target = 'getElementById' in root ? root.getElementById(id) : null;
        if (!target) {
          this.dispatchEvent(new CustomEvent('is-error', { bubbles: true, composed: true }));
          await this.#showStatus('error');
          return;
        }
        if (isAttribute) valueToCopy = target.getAttribute(field) || '';
        else if (isProperty) valueToCopy = target[field] ?? '';
        else valueToCopy = target.textContent || '';
      }

      if (!valueToCopy) {
        this.dispatchEvent(new CustomEvent('is-error', { bubbles: true, composed: true }));
        await this.#showStatus('error');
        return;
      }

      try {
        await navigator.clipboard.writeText(String(valueToCopy));
        this.dispatchEvent(new CustomEvent('is-copy', {
          detail: { value: String(valueToCopy) },
          bubbles: true,
          composed: true
        }));
        await this.#showStatus('success');
      } catch {
        this.dispatchEvent(new CustomEvent('is-error', { bubbles: true, composed: true }));
        await this.#showStatus('error');
      }
    }

    async #showStatus(status) {
      this.#status = status;
      this.#setState(status === 'success', status === 'error');
      this.#syncLabel();
      this.#live.textContent = this.#currentLabel;

      if (!this.#hasCustom) {
        const show = status === 'success' ? this.#icons.success : this.#icons.error;
        this.#icons.copy.classList.add('hide');
        await this.#wait(140);
        this.#icons.copy.hidden = true;
        this.#icons.copy.classList.remove('hide');
        show.hidden = false;
        show.classList.add('show');
        await this.#wait(140);
        show.classList.remove('show');
      }

      if (this.tooltip !== 'none') this.#showTip();

      if (this.#feedbackTimer) clearTimeout(this.#feedbackTimer);
      await new Promise((resolve) => {
        this.#feedbackTimer = setTimeout(resolve, this.feedbackDuration);
      });
      this.#feedbackTimer = null;

      if (!this.#hoverOpen) this.#hideTip();

      if (!this.#hasCustom) {
        const hide = status === 'success' ? this.#icons.success : this.#icons.error;
        hide.classList.add('hide');
        await this.#wait(140);
        hide.hidden = true;
        hide.classList.remove('hide');
        this.#icons.copy.hidden = false;
        this.#icons.copy.classList.add('show');
        await this.#wait(140);
        this.#icons.copy.classList.remove('show');
      }

      this.#status = 'rest';
      this.#setState(false, false);
      this.#syncLabel();
      this.#live.textContent = '';
      this.#copying = false;
      if (this.#hoverOpen && this.tooltip === 'full') this.#showTip();
      else if (!this.#hoverOpen) this.#hideTip();
    }

    #wait(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }
  }

  if (!customElements.get('is-copy-button')) {
    customElements.define('is-copy-button', IsCopyButton);
  }
  if (typeof window !== 'undefined') window.IsCopyButton = IsCopyButton;
})();
