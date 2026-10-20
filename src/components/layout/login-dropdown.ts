import { adoptCss, defineElement, emit, upgradeProperties } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setCustomState } from '../../core/form-associated.js';
import '../actions/dropdown.js';
import '../actions/button.js';
import '../media/icon.js';
import '../layout/callout.js';
import './login.js';
import type { LoginChoice, LoginDropdownSubmit, LoginMode as Mode } from './schemas/login-dropdown.schemas.js';

/**
 * <iswc-login-dropdown> — Acceso compacto en un desplegable de la barra.
 *
 * Reusa <iswc-dropdown> (anclaje) y <iswc-login compact> (usuario/contraseña). NO
 * autentica, NO hace fetch y NO guarda credenciales ni tokens: emite
 * `iswc-login-submit` y la app resuelve, devolviendo `loading`, `error`, `choices`
 * o llamando a `reset()`.
 *
 * Atributos
 *   label            texto del disparador (default "Entrar"; se oculta < 52rem)
 *   heading          título opcional del panel
 *   placement        colocación del panel (default bottom-end)
 *   modes            "password" (default), "token" o "password token" (muestra selector)
 *   remember         estado inicial de "Recordar"
 *   open             abre el panel (reflejado)
 *   password-label   rótulo del modo usuario/contraseña (default "Usuario")
 *   token-label      rótulo del modo token (default "Token")
 *   token-placeholder
 *   choices-heading  texto sobre la lista de opciones (default "Elige con cuál entrar")
 *   back-label       botón para volver de la lista (default "Volver")
 *
 * Propiedades: error (string), loading (boolean), choices ({ id, label, icon? }[])
 * Métodos: show(), hide(), reset()
 *
 * Eventos
 *   iswc-login-submit { mode, username, password, remember, provider?, token?, choice? }
 *
 * Parts: trigger, panel, heading, modes, mode, login, token, token-input, error, choices, choice, back
 * Custom states: loading, choosing, open
 */

const HTML_TEMPLATE = `
<iswc-dropdown class="dropdown" placement="bottom-end">
  <iswc-button slot="trigger" class="trigger" part="trigger" variant="filled" color="brand">
    <iswc-icon slot="start" icon="mdi:login" aria-hidden="true"></iswc-icon>
    <span class="trigger-text"></span>
  </iswc-button>
  <div class="panel" part="panel">
    <div class="heading" part="heading" hidden></div>
    <div class="modes" part="modes" role="tablist" aria-label="Forma de ingreso" hidden>
      <button type="button" class="mode" part="mode" role="tab" data-mode="password"></button>
      <button type="button" class="mode" part="mode" role="tab" data-mode="token"></button>
    </div>
    <iswc-login class="login" part="login" compact password-toggle></iswc-login>
    <div class="token" part="token" hidden>
      <label class="token-label" for="token"></label>
      <textarea id="token" class="token-input" part="token-input" rows="3" spellcheck="false" autocomplete="off"></textarea>
      <iswc-callout class="error" part="error" color="danger" role="alert" hidden></iswc-callout>
      <div class="actions">
        <iswc-button class="token-submit" variant="filled" color="brand">Entrar</iswc-button>
      </div>
    </div>
    <div class="choices" part="choices" hidden>
      <p class="choices-heading"></p>
      <iswc-callout class="choices-error" color="danger" role="alert" hidden></iswc-callout>
      <div class="choices-list" role="list"></div>
      <iswc-button class="back" part="back" variant="plain" color="neutral"></iswc-button>
    </div>
  </div>
</iswc-dropdown>`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = HTML_TEMPLATE;

class IswcLoginDropdown extends ElementBase {
  static override get observedAttributes(): string[] {
    return [
      'label', 'heading', 'placement', 'modes', 'remember', 'open',
      'password-label', 'token-label', 'token-placeholder', 'choices-heading', 'back-label',
    ];
  }

  #internals: ElementInternals | null = null;
  #error = '';
  #loading = false;
  #choices: LoginChoice[] = [];
  #mode: Mode = 'password';
  /** Último envío, en memoria, para completar la elección de `choices`. Nunca se persiste. */
  #pending: LoginDropdownSubmit | null = null;

  #dropdown!: HTMLElement & { show(): void; hide(): void };
  #login!: HTMLElement & { reset?: () => void; remember?: boolean };
  #root!: ShadowRoot;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    adoptCss(this.#root, import.meta.url);
    this.#root.appendChild(TEMPLATE.content.cloneNode(true));
    try { this.#internals = this.attachInternals(); } catch { this.#internals = null; }
    this.#dropdown = this.#q<HTMLElement & { show(): void; hide(): void }>('.dropdown')!;
    this.#login = this.#q<HTMLElement & { reset?: () => void; remember?: boolean }>('.login')!;
    this.#wire();
  }

  override onConnected(): void {
    upgradeProperties(this, ['error', 'loading', 'choices']);
    this.#login.toggleAttribute('remember', this.hasAttribute('remember'));
    this.#render();
  }

  override onAttributeChanged(name: string): void {
    if (name === 'open') {
      if (this.hasAttribute('open')) this.#dropdown.show();
      else this.#dropdown.hide();
    }
    if (name === 'remember') this.#login.toggleAttribute('remember', this.hasAttribute('remember'));
    this.#render();
  }

  /* ── API pública ─────────────────────────────────────────── */

  get error(): string { return this.#error; }
  set error(v: string | null | undefined) { this.#error = String(v ?? ''); this.#render(); }

  get loading(): boolean { return this.#loading; }
  set loading(v: boolean) { this.#loading = !!v; this.#render(); }

  get choices(): LoginChoice[] { return this.#choices.map((c) => ({ ...c })); }
  set choices(v: LoginChoice[] | null | undefined) {
    this.#choices = (Array.isArray(v) ? v : [])
      .filter((c) => c && c.id != null)
      .map((c) => ({ id: String(c.id), label: String(c.label ?? c.id), icon: c.icon ? String(c.icon) : undefined }));
    this.#render();
  }

  get open(): boolean { return this.hasAttribute('open'); }
  set open(v: boolean) { this.toggleAttribute('open', !!v); }

  show(): void { this.open = true; }
  hide(): void { this.open = false; }

  /** Estado inicial: sin error, sin carga, sin opciones, contraseña y token vacíos, panel cerrado. */
  reset(): void {
    this.#error = '';
    this.#loading = false;
    this.#choices = [];
    this.#pending = null;
    this.#login.reset?.();
    const ta = this.#q<HTMLTextAreaElement>('.token-input');
    if (ta) ta.value = '';
    this.hide();
    this.#render();
  }

  /* ── Internos ────────────────────────────────────────────── */

  #q<T extends Element>(sel: string): T | null { return this.#root.querySelector(sel) as T | null; }

  #modes(): Mode[] {
    const raw = (this.getAttribute('modes') || 'password').toLowerCase().split(/[\s,|]+/);
    const out = raw.filter((m): m is Mode => m === 'password' || m === 'token');
    return out.length ? Array.from(new Set(out)) : ['password'];
  }

  #wire(): void {
    // El submit de <iswc-login> se intercepta aquí: el host emite UNO solo, ya completo.
    this.#login.addEventListener('iswc-login-submit', (ev) => {
      ev.stopPropagation();
      const d = (ev as CustomEvent<{ username: string; password: string; remember: boolean; provider?: string }>).detail;
      this.#submit({ mode: 'password', username: d.username, password: d.password, remember: !!d.remember, provider: d.provider });
    });
    this.#login.addEventListener('iswc-remember-change', (ev) => ev.stopPropagation());

    this.#q('.token-submit')?.addEventListener('click', () => this.#submitToken());
    this.#q('.token-input')?.addEventListener('keydown', (ev) => {
      const k = ev as KeyboardEvent;
      if (k.key === 'Enter' && (k.ctrlKey || k.metaKey)) {
        k.preventDefault();
        this.#submitToken();
      }
    });

    const modes = this.#q<HTMLElement>('.modes')!;
    modes.addEventListener('click', (ev) => {
      const btn = (ev.target as Element | null)?.closest?.('[data-mode]') as HTMLElement | null;
      const m = btn?.dataset.mode;
      if (m === 'password' || m === 'token') this.#setMode(m, true);
    });
    modes.addEventListener('keydown', (ev) => {
      const k = ev as KeyboardEvent;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k.key)) return;
      const visibles = Array.from(modes.querySelectorAll<HTMLElement>('.mode')).filter((b) => !b.hidden);
      const i = visibles.indexOf(k.target as HTMLElement);
      if (i < 0) return;
      k.preventDefault();
      let next = i;
      if (k.key === 'ArrowRight') next = (i + 1) % visibles.length;
      else if (k.key === 'ArrowLeft') next = (i - 1 + visibles.length) % visibles.length;
      else if (k.key === 'Home') next = 0;
      else next = visibles.length - 1;
      visibles[next]!.focus();
      const m = visibles[next]!.dataset.mode as Mode;
      this.#setMode(m, false);
    });

    // Las flechas dentro del panel son de sus controles, no de la lista del menú.
    this.#q('.panel')?.addEventListener('keydown', (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === 'ArrowUp' || k === 'ArrowDown') ev.stopPropagation();
    });

    this.#q('.back')?.addEventListener('click', () => {
      this.#choices = [];
      this.#render();
    });

    this.#q('.choices-list')?.addEventListener('click', (ev) => {
      const btn = (ev.target as Element | null)?.closest?.('[data-choice]') as HTMLElement | null;
      const id = btn?.dataset.choice;
      if (!id || !this.#pending || this.#loading) return;
      this.#submit({ ...this.#pending, choice: id });
    });

    this.#dropdown.addEventListener('iswc-after-show', () => {
      this.toggleAttribute('open', true);
      setCustomState(this.#internals, 'open', true);
      requestAnimationFrame(() => {
        if (this.#choices.length) this.#q<HTMLElement>('.choices-list iswc-button')?.focus();
        else if (this.#mode === 'token') this.#q<HTMLElement>('.token-input')?.focus();
        else this.#login.focus();
      });
    });
    this.#dropdown.addEventListener('iswc-after-hide', () => {
      this.toggleAttribute('open', false);
      setCustomState(this.#internals, 'open', false);
    });
  }

  #setMode(m: Mode, focus: boolean): void {
    if (!this.#modes().includes(m)) return;
    this.#mode = m;
    this.#error = '';
    this.#render();
    if (focus) this.#q<HTMLElement>(`.mode[data-mode="${m}"]`)?.focus();
  }

  #submitToken(): void {
    const ta = this.#q<HTMLTextAreaElement>('.token-input');
    const token = String(ta?.value ?? '').replace(/\s+/g, '');
    if (!token) {
      this.#error = 'Pega el token';
      this.#render();
      return;
    }
    this.#submit({ mode: 'token', username: '', password: '', remember: !!this.#login.remember, token });
  }

  #submit(detail: LoginDropdownSubmit): void {
    if (this.#loading) return;
    this.#error = '';
    this.#pending = { ...detail, choice: undefined };
    const out: LoginDropdownSubmit = { ...detail };
    if (out.choice === undefined) delete out.choice;
    if (out.token === undefined) delete out.token;
    if (out.provider === undefined) delete out.provider;
    this.#render();
    emit(this, 'iswc-login-submit', out);
  }

  #render(): void {
    if (!this.#root) return;
    const label = this.getAttribute('label') || 'Entrar';
    const trigger = this.#q<HTMLElement>('.trigger')!;
    this.#q<HTMLElement>('.trigger-text')!.textContent = label;
    trigger.setAttribute('aria-label', label);
    trigger.setAttribute('title', label);
    this.#dropdown.setAttribute('placement', this.getAttribute('placement') || 'bottom-end');

    const heading = this.getAttribute('heading');
    const h = this.#q<HTMLElement>('.heading')!;
    h.textContent = heading ?? '';
    h.hidden = !heading;

    const modes = this.#modes();
    if (!modes.includes(this.#mode)) this.#mode = modes[0]!;
    const choosing = this.#choices.length > 0;

    const modesEl = this.#q<HTMLElement>('.modes')!;
    modesEl.hidden = modes.length < 2 || choosing;
    for (const b of modesEl.querySelectorAll<HTMLElement>('.mode')) {
      const m = b.dataset.mode as Mode;
      b.hidden = !modes.includes(m);
      b.textContent = m === 'token'
        ? (this.getAttribute('token-label') || 'Token')
        : (this.getAttribute('password-label') || 'Usuario');
      const on = m === this.#mode;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    }

    this.#login.hidden = choosing || this.#mode !== 'password';
    this.#login.toggleAttribute('busy', this.#loading);
    if (this.#error && this.#mode === 'password' && !choosing) this.#login.setAttribute('error', this.#error);
    else this.#login.removeAttribute('error');

    const token = this.#q<HTMLElement>('.token')!;
    token.hidden = choosing || this.#mode !== 'token';
    this.#q<HTMLElement>('.token-label')!.textContent = this.getAttribute('token-label') || 'Token';
    const ta = this.#q<HTMLTextAreaElement>('.token-input')!;
    ta.placeholder = this.getAttribute('token-placeholder') || 'Pega el token';
    ta.disabled = this.#loading;
    const tokenError = this.#q<HTMLElement>('.token .error')!;
    tokenError.hidden = !(this.#error && this.#mode === 'token' && !choosing);
    tokenError.textContent = this.#error;
    const tokenSubmit = this.#q<HTMLElement>('.token-submit')!;
    tokenSubmit.toggleAttribute('loading', this.#loading);
    tokenSubmit.toggleAttribute('disabled', this.#loading);

    const choices = this.#q<HTMLElement>('.choices')!;
    choices.hidden = !choosing;
    this.#q<HTMLElement>('.choices-heading')!.textContent = this.getAttribute('choices-heading') || 'Elige con cuál entrar';
    this.#q<HTMLElement>('.back')!.textContent = this.getAttribute('back-label') || 'Volver';
    const choicesError = this.#q<HTMLElement>('.choices-error')!;
    choicesError.hidden = !(this.#error && choosing);
    choicesError.textContent = this.#error;
    this.#renderChoices();

    setCustomState(this.#internals, 'loading', this.#loading);
    setCustomState(this.#internals, 'choosing', choosing);
    if (this.#loading) this.setAttribute('aria-busy', 'true');
    else this.removeAttribute('aria-busy');
  }

  #renderChoices(): void {
    const list = this.#q<HTMLElement>('.choices-list')!;
    const firma = this.#choices.map((c) => `${c.id}|${c.label}|${c.icon ?? ''}`).join(';');
    if (list.dataset.firma !== firma) {
      list.dataset.firma = firma;
      list.replaceChildren(...this.#choices.map((c) => {
        const b = document.createElement('iswc-button');
        b.className = 'choice';
        b.setAttribute('part', 'choice');
        b.setAttribute('variant', 'soft');
        b.setAttribute('role', 'listitem');
        b.dataset.choice = c.id;
        const icon = document.createElement('iswc-icon');
        icon.setAttribute('slot', 'start');
        icon.setAttribute('icon', c.icon || 'mdi:domain');
        icon.setAttribute('aria-hidden', 'true');
        b.append(icon, document.createTextNode(c.label));
        return b;
      }));
    }
    for (const b of list.querySelectorAll<HTMLElement>('.choice')) {
      b.toggleAttribute('loading', this.#loading);
      b.toggleAttribute('disabled', this.#loading);
    }
  }
}

defineElement('iswc-login-dropdown', IswcLoginDropdown as unknown as CustomElementConstructor);

declare global {
  interface HTMLElementTagNameMap {
    'iswc-login-dropdown': IswcLoginDropdown;
  }
}
