import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import './login.js';

/**
 * <iswc-login-gate> — Cortina de acceso: muestra contenido público y pide login
 * antes de revelar la parte protegida. Reusa <iswc-login> (no lo reinventa).
 *
 * Atributos
 *   logged          boolean — si está presente, revela el slot protected
 *   heading/subtitle/provider/providers/mode/busy/error/notice  → se pasan a <iswc-login>
 *
 * Slots
 *   public          contenido público (o mockup) visible antes de entrar
 *   protected       contenido protegido, visible solo con logged
 *
 * Los eventos de <iswc-login> (iswc-login-submit, iswc-logout-all, …) burbujean
 * y están compuestos: el host los escucha en el documento, sin re-emitirlos.
 *
 * Parts: curtain, login, protected
 */

const HTML_TEMPLATE = `
<div id="curtain" part="curtain">
  <slot name="public"></slot>
  <iswc-login id="login" part="login"></iswc-login>
</div>
<div id="protected" part="protected">
  <slot name="protected"></slot>
</div>`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = HTML_TEMPLATE;

class IswcLoginGate extends ElementBase {
  static get observedAttributes(): string[] {
    return ['logged', 'busy', 'error', 'notice', 'heading', 'subtitle', 'provider', 'providers', 'mode'];
  }

  #curtain!: HTMLElement;
  #protected!: HTMLElement;
  #login: any = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
  }

  connectedCallback(): void {
    super.connectedCallback?.();
    this.#curtain = this.shadowRoot!.getElementById('curtain') as HTMLElement;
    this.#protected = this.shadowRoot!.getElementById('protected') as HTMLElement;
    this.#login = this.shadowRoot!.getElementById('login');
    this.#sync();
  }

  attributeChangedCallback(): void { this.#sync(); }

  get logged(): boolean { return this.hasAttribute('logged'); }
  set logged(v: boolean) { this.toggleAttribute('logged', v); }

  #sync(): void {
    if (!this.#curtain) return;
    const logged = this.logged;
    this.#curtain.hidden = logged;
    this.#protected.hidden = !logged;
    const l = this.#login;
    if (!l) return;
    for (const a of ['busy', 'error', 'notice', 'heading', 'subtitle', 'provider', 'providers', 'mode']) {
      const v = this.getAttribute(a);
      if (v === null) l.removeAttribute(a); else l.setAttribute(a, v);
    }
  }
}

defineElement('iswc-login-gate', IswcLoginGate as unknown as CustomElementConstructor);

declare global {
  interface HTMLElementTagNameMap {
    'iswc-login-gate': IswcLoginGate;
  }
}
