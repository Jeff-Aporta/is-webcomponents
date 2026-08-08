import './button.js';
import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';
import '../feedback/tooltip.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { setStringAttr, setOptionalAttr } from '../_shared/reflect.js';
import { setCustomState } from '../_shared/form-associated.js';
import { copyText } from '../_shared/dom-utils.js';
import { upgradeProperties } from '../_shared/upgrade-properties.js';

/**
 * <is-copy-button> — Web Component (vanilla).
 *
 * Copia texto al portapapeles con feedback visual (éxito / error).
 * Usa clipboard.writeText() y cae a execCommand fuera de contexto seguro.
 *
 * Compone <is-tooltip> (posicionamiento, flip, flecha) e <is-icon>. El tooltip
 * va en `trigger="none"`: quién lo abre y con qué texto lo decide el estado de
 * la copia (reposo / éxito / error), no el hover del propio tooltip.
 *
 * Atributos
 *   value               string a copiar
 *   from                id | id[attr] | id.prop  (gana sobre value)
 *   copy-label          etiqueta / tooltip en reposo
 *   success-label       tooltip tras copiar
 *   error-label         tooltip si falla
 *   feedback-duration   ms de feedback (default 1000)
 *   tooltip             full | copy | none  (default full)
 *   tooltip-placement   cualquier placement de is-popover: top | top-start |
 *                       top-end | bottom* | left* | right*  (default top)
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
 * CSS Parts: button, copy-icon, success-icon, error-icon,
 *            feedback (burbuja del tooltip), feedback-body
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="trigger" id="anchor">
      <slot></slot>
      <is-button
        class="button"
        id="copy-btn"
        variant="text"
        color="neutral"
        exportparts="button: button"
      >
        <span part="copy-icon" class="icon" data-state="copy">
          <slot name="copy-icon"><is-icon icon="mdi:content-copy"></is-icon></slot>
        </span>
        <span part="success-icon" class="icon" data-state="success" hidden>
          <slot name="success-icon"><is-icon icon="mdi:check"></is-icon></slot>
        </span>
        <span part="error-icon" class="icon" data-state="error" hidden>
          <slot name="error-icon"><is-icon icon="mdi:close"></is-icon></slot>
        </span>
      </is-button>
    </span>
    <is-tooltip
      class="tip"
      exportparts="tooltip: feedback, body: feedback-body"
      for="anchor"
      trigger="none"
      placement="top"
    ></is-tooltip>
    <span class="sr-only" aria-live="polite"></span>
  `;

  const LABELS = { copy: 'Copiar', success: 'Copiado', error: 'Error' };

  const PLACEMENTS = [
    'top', 'top-start', 'top-end',
    'bottom', 'bottom-start', 'bottom-end',
    'left', 'left-start', 'left-end',
    'right', 'right-start', 'right-end',
  ];

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
      this.#btn = shadow.querySelector('is-button');
      this.#tip = shadow.querySelector('is-tooltip');
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
      upgradeProperties(this, IsCopyButton.observedAttributes);
      this.#onSlotChange();
      this.#syncDisabled();
      this.#syncTipPlacement();
      this.#syncTipMode();
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
    set value(v) { setOptionalAttr(this, 'value', v); }
    get from() { return this.getAttribute('from') ?? ''; }
    set from(v) { setStringAttr(this, 'from', v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }
    get copyLabel() { return this.getAttribute('copy-label') ?? ''; }
    set copyLabel(v) { setStringAttr(this, 'copy-label', v); }
    get successLabel() { return this.getAttribute('success-label') ?? ''; }
    set successLabel(v) { setStringAttr(this, 'success-label', v); }
    get errorLabel() { return this.getAttribute('error-label') ?? ''; }
    set errorLabel(v) { setStringAttr(this, 'error-label', v); }
    get feedbackDuration() {
      // Ojo: Number(null) es 0, así que hay que descartar el atributo ausente
      // antes de convertir o el feedback dura 0 ms.
      const raw = this.getAttribute('feedback-duration');
      if (raw == null || raw.trim() === '') return 1000;
      const n = Number(raw);
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
      return PLACEMENTS.includes(v) ? v : 'top';
    }
    set tooltipPlacement(v) { this.setAttribute('tooltip-placement', v); }

    get #currentLabel() {
      if (this.#status === 'success') return this.successLabel || LABELS.success;
      if (this.#status === 'error') return this.errorLabel || LABELS.error;
      return this.copyLabel || LABELS.copy;
    }

    #onSlotChange() {
      const slot = this.shadowRoot.querySelector('slot:not([name])');
      const els = slot.assignedElements({ flatten: true }).filter((el) => el instanceof HTMLElement);
      this.#hasCustom = els.length > 0;
      this.#btn.hidden = this.#hasCustom;
      this.#syncLabel();
    }

    #syncDisabled() {
      // is-button expone `disabled` como atributo, no como propiedad del
      // elemento (no es un <button> nativo).
      this.#btn.toggleAttribute('disabled', this.disabled);
      setCustomState(this.#internals, 'disabled', this.disabled);
    }

    #syncTipPlacement() {
      this.#tip.placement = this.tooltipPlacement;
    }

    #syncTipMode() {
      const off = this.tooltip === 'none';
      this.#tip.disabled = off;
      if (off) this.#hideTip();
    }

    #syncLabel() {
      const label = this.#currentLabel;
      this.#btn.setAttribute('aria-label', label);
      this.#tip.textContent = label;
    }

    #setState(success, error) {
      setCustomState(this.#internals, 'success', success);
      setCustomState(this.#internals, 'error', error);
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
      // En el wrapper, no en el botón: así el tooltip también sale con un
      // trigger custom slotted. focus/blur no burbujean → captura.
      const anchor = this.shadowRoot.querySelector('.trigger');
      anchor.addEventListener('mouseenter', show);
      anchor.addEventListener('mouseleave', hide);
      anchor.addEventListener('focus', show, true);
      anchor.addEventListener('blur', hide, true);
    }

    #showTip() {
      if (this.tooltip === 'none') return;
      this.#tip.show();
    }

    #hideTip() {
      this.#tip.hide();
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
          emit(this, 'is-error');
          await this.#showStatus('error');
          return;
        }
        if (isAttribute) valueToCopy = target.getAttribute(field) || '';
        else if (isProperty) valueToCopy = target[field] ?? '';
        else valueToCopy = target.textContent || '';
      }

      if (!valueToCopy) {
        emit(this, 'is-error');
        await this.#showStatus('error');
        return;
      }

      // copyText ya trae el fallback a execCommand para contextos sin
      // Clipboard API (http, iframes sin permiso).
      if (await copyText(valueToCopy)) {
        emit(this, 'is-copy', { value: String(valueToCopy) });
        await this.#showStatus('success');
      } else {
        emit(this, 'is-error');
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

  defineElement('is-copy-button', IsCopyButton, 'IsCopyButton');
})();
