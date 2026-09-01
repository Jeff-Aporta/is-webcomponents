import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../forms/input.js';
import '../forms/textarea.js';
import '../forms/select.js';
import '../forms/option.js';
import '../forms/checkbox.js';
import '../forms/switch.js';
import '../forms/radio.js';
import { ElementBase } from '../../core/element-base.js';
import {
  applyJsonBody,
  html2json,
  hostToJson,
  json2html,
} from '../_shared/json-html.js';
import { getValues, setValues } from './form-json.js';

/**
 * <is-form> — Ficha con header / content / footer (Aceptar · Cancelar).
 *
 * Definición del cuerpo: siempre JSON compacto (html2json / json2html).
 * Los valores de controles con `name` van aparte (`getValues` / `setValues`).
 *
 *   form.json2html(bodyJson)   // monta light DOM
 *   form.html2json()           // serializa light DOM
 *   form.toJSON()              // { mode, …, body, values }
 *   form.fromJSON(json)        // chrome + body + values
 *
 * Atributos: mode, submit-label, cancel-label, loading
 * Eventos: is-submit / is-cancel → detail { form, values, json }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <form part="form" class="form" novalidate>
      <header part="header" class="header"><slot name="header"></slot></header>
      <article part="content" class="content"><slot name="content"></slot></article>
      <footer part="footer" class="footer">
        <slot name="pre-buttons"></slot>
        <div part="buttons" class="buttons">
          <is-button class="submit" type="submit" color="brand">Aceptar</is-button>
          <is-button class="cancel" type="button" color="neutral" variant="outlined">Cancelar</is-button>
        </div>
        <slot name="post-buttons"></slot>
      </footer>
    </form>
  `;

  const VALID_MODE = ['edit', 'view'];
  const OBSERVED = ['mode', 'submit-label', 'cancel-label', 'loading'];

  class IsForm extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    static json2html = json2html;
    static html2json = html2json;

    static toJSON(host) { return host?.toJSON?.() ?? null; }
    static fromJSON(host, json, opts) { return host?.fromJSON?.(json, opts) ?? host; }

    #form!: HTMLElement;
    #submitBtn!: HTMLElement;
    #cancelBtn!: HTMLElement;
    #inlineApplied = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#form = shadow.querySelector<HTMLElement>('.form')!;
      this.#submitBtn = shadow.querySelector<HTMLElement>('.submit')!;
      this.#cancelBtn = shadow.querySelector<HTMLElement>('.cancel')!;
    }

    onConnected() {
      if (!this.hasAttribute('mode')) this.setAttribute('mode', 'edit');
      this.#form.addEventListener('submit', this.#onSubmit);
      this.#submitBtn.addEventListener('click', this.#onSubmitClick);
      this.#cancelBtn.addEventListener('click', this.#onCancel);
      this.#syncMode();
      this.#syncLabels();
      this.#syncLoading();
      this.#applyInlineJson();
    }

    onDisconnected() {
      this.#form.removeEventListener('submit', this.#onSubmit);
      this.#submitBtn.removeEventListener('click', this.#onSubmitClick);
      this.#cancelBtn.removeEventListener('click', this.#onCancel);
    }

    onAttributeChanged(name, _oldVal, newVal) {
      if (name === 'mode') {
        if (newVal && !VALID_MODE.includes(newVal)) { this.setAttribute('mode', 'edit'); return; }
        this.#syncMode();
      } else if (name === 'loading') {
        this.#syncLoading();
      } else {
        this.#syncLabels();
      }
    }

    get mode() {
      const v = this.getAttribute('mode');
      return VALID_MODE.includes(v) ? v : 'edit';
    }
    set mode(v) {
      if (v == null || v === '') this.removeAttribute('mode');
      else if (VALID_MODE.includes(String(v))) this.setAttribute('mode', String(v));
    }

    get submitLabel() { return this.getAttribute('submit-label') || 'Aceptar'; }
    set submitLabel(v) {
      if (v == null || v === '') this.removeAttribute('submit-label');
      else this.setAttribute('submit-label', String(v));
    }

    get cancelLabel() { return this.getAttribute('cancel-label') || 'Cancelar'; }
    set cancelLabel(v) {
      if (v == null || v === '') this.removeAttribute('cancel-label');
      else this.setAttribute('cancel-label', String(v));
    }

    get loading() { return this.hasAttribute('loading'); }
    set loading(v) { this.toggleAttribute('loading', !!v); }

    get form() { return this.#form; }

    // ---- JSON / HTML ------------------------------------------------------

    /** Monta el light DOM desde JSON compacto. */
    json2html(body, opts) {
      applyJsonBody(this, body, opts);
      return this;
    }

    /** Serializa el light DOM a JSON compacto. */
    html2json(opts) {
      return hostToJson(this, opts);
    }

    getValues() { return getValues(this); }
    setValues(values) { setValues(this, values); return this; }

    /**
     * Snapshot persistible: chrome + body (HTML↔JSON) + values.
     * @returns {{ mode: string, submitLabel?: string, cancelLabel?: string, loading: boolean, body: unknown, values: object }}
     */
    toJSON() {
      return {
        mode: this.mode,
        submitLabel: this.submitLabel,
        cancelLabel: this.cancelLabel,
        loading: this.loading,
        body: hostToJson(this),
        values: getValues(this),
      };
    }

    /**
     * @param {object} json
     * @param {{ replace?: boolean }} [opts]
     */
    fromJSON(json, opts) {
      if (!json || typeof json !== 'object') return this;
      if (json.mode != null) this.mode = json.mode;
      if (json.submitLabel != null) this.submitLabel = json.submitLabel;
      if (json.cancelLabel != null) this.cancelLabel = json.cancelLabel;
      if (json.loading != null) this.loading = !!json.loading;

      const body = json.body ?? json.html ?? (Array.isArray(json) ? json : null);
      if (body != null) applyJsonBody(this, body, opts);

      if (json.values && typeof json.values === 'object') {
        requestAnimationFrame(() => setValues(this, json.values));
      }
      return this;
    }

    submit() { this.#form.requestSubmit(); }
    reset() { this.#form.reset(); }

    // ---- privados ---------------------------------------------------------

    #applyInlineJson() {
      if (this.#inlineApplied) return;
      const script = this.querySelector<HTMLElement>(':scope > script[type="application/json"]');
      if (!script) return;
      this.#inlineApplied = true;
      try {
        const json = JSON.parse(script.textContent || 'null');
        if (json && typeof json === 'object') this.fromJSON(json);
      } catch {
        console.warn('<is-form> script JSON inválido');
      }
    }

    #detail() {
      const values = getValues(this);
      return { form: this.#form, values, json: this.toJSON() };
    }

    #emit(name) {
      return emit(this, name, this.#detail(), { cancelable: true });
    }

    #onSubmit = (e: Event) => {
      e.preventDefault();
      if (this.mode === 'view' || this.loading) return;
      this.#emit('is-submit');
    };

    #onSubmitClick = () => {
      if (this.mode === 'view' || this.loading) return;
      this.#form.requestSubmit();
    };

    #onCancel = () => { this.#emit('is-cancel'); };

    #syncMode() { this.#submitBtn.hidden = this.mode === 'view'; }

    #syncLabels() {
      this.#submitBtn.textContent = this.submitLabel;
      this.#cancelBtn.textContent = this.cancelLabel;
    }

    #syncLoading() { this.#submitBtn.toggleAttribute('loading', this.loading); }
  }

  defineElement('is-form', IsForm, 'IsForm');
})();
