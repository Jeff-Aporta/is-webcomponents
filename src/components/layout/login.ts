import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

import '../forms/input.js';
import '../forms/select.js';
import '../forms/checkbox.js';
import '../forms/option.js';
import '../actions/button.js';
import '../media/avatar.js';
import '../layout/dialog.js';
import '../layout/callout.js';
import '../feedback/toast.js';
import '../feedback/tooltip.js';

/**
 * <iswc-login> — Puerta de acceso reutilizable: single y multi-cuenta.
 *
 * Atributos
 *   mode              single (default) | multi
 *   provider          nombre del proveedor por defecto (default "Cuenta")
 *   providers         JSON [{ id, name }] -> selector visible si hay >1
 *   heading           título (default "Iniciar sesión")
 *   subtitle          texto bajo el título
 *   selected          id de la cuenta activa (reflected)
 *   remember          boolean — recordar sesión
 *   busy              boolean — bloquea el submit y muestra "Entrando…"
 *   disabled          boolean
 *   error / notice    mensaje mostrado en <iswc-callout>
 *   allow-add-account boolean
 *   allow-logout-all  boolean
 *   show-sessions     boolean
 *   show-password     boolean
 *
 * Propiedades
 *   accounts   LoginAccount[]  { id, name?, email?, avatar?, provider?, lastUsed? }
 *   sessions   LoginSession[]  { id, ip?, device?, os?, browser?, lastAccess?, current? }
 *   selected   string
 *   remember   boolean
 *   busy       boolean
 *
 * Métodos
 *   openSessions() / closeSessions()
 *   openPassword() / closePassword()
 *   toast(msg, color?)
 *   focus()
 *
 * Eventos (bubbles, composed)
 *   iswc-login-submit      { username, password, remember, provider }
 *   iswc-account-select    { account }
 *   iswc-add-account       { }
 *   iswc-remove-account    { account }
 *   iswc-logout            { account }
 *   iswc-logout-all        { }
 *   iswc-password-change   { current, next }
 *   iswc-sessions-refresh  { }
 *   iswc-session-revoke    { sessionId }
 *   iswc-remember-change   { remember }
 *   iswc-forgot            { username }
 *
 * Slots: footer
 * Parts: panel, header, avatar, heading, subtitle, accounts, form, footer, toast
 */

export interface LoginAccount {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  provider?: string;
  lastUsed?: string;
}

export interface LoginSession {
  id: string;
  ip?: string;
  device?: string;
  os?: string;
  browser?: string;
  lastAccess?: string;
  current?: boolean;
}

const HTML_TEMPLATE: string[] = [
  '<div part="panel" class="panel">',
  '  <header part="header" class="header">',
  '    <iswc-avatar part="avatar" class="avatar" id="headAvatar" hidden></iswc-avatar>',
  '    <div class="titles">',
  '      <h2 part="heading" id="heading">Iniciar sesión</h2>',
  '      <p part="subtitle" id="subtitle" hidden></p>',
  '    </div>',
  '  </header>',
  '  <div id="noticeBox" hidden><iswc-callout id="notice" color="brand" variant="plain"></iswc-callout></div>',
  '  <div id="errorBox" hidden><iswc-callout id="error" color="danger" variant="outlined"></iswc-callout></div>',
  '  <section id="accountsPanel" part="accounts" class="accounts" hidden>',
  '    <div class="accounts-head">',
  '      <span class="accounts-title">Cuentas</span>',
  '      <iswc-button id="btnAdd" size="sm" variant="plain" color="neutral">Añadir cuenta</iswc-button>',
  '    </div>',
  '    <ul id="accountsList" class="accounts-list" role="list"></ul>',
  '  </section>',
  '  <form id="loginForm" part="form" class="form" novalidate>',
  '    <iswc-select id="provider" label="Proveedor" hidden></iswc-select>',
  '    <iswc-input id="username" label="Usuario" autocomplete="username" required></iswc-input>',
  '    <iswc-input id="password" type="password" label="Contraseña" autocomplete="current-password" required></iswc-input>',
  '    <div class="row-between">',
  '      <iswc-checkbox id="remember">Recordar</iswc-checkbox>',
  '      <iswc-button id="btnForgot" type="button" variant="plain" color="neutral" size="sm">¿Olvidaste tu contraseña?</iswc-button>',
  '    </div>',
  '    <iswc-button id="btnSubmit" type="submit" full-width>Entrar</iswc-button>',
  '  </form>',
  '  <footer part="footer" class="footer">',
  '    <iswc-button id="btnPassword" type="button" variant="plain" color="neutral" size="sm">Cambiar contraseña</iswc-button>',
  '    <iswc-button id="btnLogoutAll" type="button" variant="plain" color="danger" size="sm">Cerrar en todos los dispositivos</iswc-button>',
  '    <iswc-tooltip id="tipLogoutAll" for="btnLogoutAll">Revoca todas tus sesiones, incluidas las de otros equipos.</iswc-tooltip>',
  '    <slot name="footer"></slot>',
  '  </footer>',
  '</div>',
  '<iswc-dialog id="pwDialog" label="Cambiar contraseña">',
  '  <div class="dialog-body">',
  '    <iswc-input id="pwCurrent" type="password" label="Contraseña actual" autocomplete="current-password"></iswc-input>',
  '    <iswc-input id="pwNext" type="password" label="Nueva contraseña" autocomplete="new-password"></iswc-input>',
  '    <iswc-input id="pwRepeat" type="password" label="Repetir nueva contraseña" autocomplete="new-password"></iswc-input>',
  '    <iswc-callout id="pwError" color="danger" variant="outlined" hidden></iswc-callout>',
  '    <p class="hint">Mínimo 8 caracteres. Se cerrarán las demás sesiones al guardar.</p>',
  '    <div class="dialog-actions">',
  '      <iswc-button id="pwCancel" type="button" variant="plain" color="neutral">Cancelar</iswc-button>',
  '      <iswc-button id="pwSave" type="button">Guardar</iswc-button>',
  '    </div>',
  '  </div>',
  '</iswc-dialog>',
  '<iswc-dialog id="sessionsDialog" label="Sesiones activas">',
  '  <div class="dialog-body">',
  '    <div class="sessions-head">',
  '      <span class="muted">Dispositivos con acceso a tu cuenta</span>',
  '      <iswc-button id="btnRefresh" type="button" variant="plain" color="neutral" size="sm">Actualizar</iswc-button>',
  '    </div>',
  '    <div id="sessionsList" class="sessions-list"></div>',
  '    <div class="dialog-actions">',
  '      <iswc-button id="sesLogoutAll" type="button" variant="outlined" color="danger">Cerrar todas</iswc-button>',
  '      <iswc-button id="sesClose" type="button" variant="plain" color="neutral">Cerrar</iswc-button>',
  '    </div>',
  '  </div>',
  '</iswc-dialog>',
  '<iswc-toast part="toast" id="toast" placement="bottom-end"></iswc-toast>',
].join('\n');

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = HTML_TEMPLATE;

class IswcLogin extends ElementBase {
  static get observedAttributes(): string[] {
    return [
      'mode', 'provider', 'providers', 'heading', 'subtitle', 'selected',
      'remember', 'busy', 'disabled', 'error', 'notice',
      'allow-add-account', 'allow-logout-all', 'show-sessions', 'show-password',
    ];
  }

  #accounts: LoginAccount[] = [];
  #sessions: LoginSession[] = [];

  #headAvatar!: any;
  #heading!: HTMLElement;
  #subtitle!: HTMLElement;
  #noticeBox!: HTMLElement;
  #notice!: any;
  #errorBox!: HTMLElement;
  #errorEl!: any;
  #accountsPanel!: HTMLElement;
  #accountsList!: HTMLElement;
  #btnAdd!: any;
  #form!: HTMLFormElement;
  #providerSel!: any;
  #username!: any;
  #password!: any;
  #rememberCk!: any;
  #btnSubmit!: any;
  #btnForgot!: any;
  #btnPassword!: any;
  #btnLogoutAll!: any;
  #pwDialog!: any;
  #pwCurrent!: any;
  #pwNext!: any;
  #pwRepeat!: any;
  #pwError!: any;
  #pwSave!: any;
  #sessionsDialog!: any;
  #sessionsList!: HTMLElement;
  #toast!: any;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
  }

  connectedCallback(): void {
    super.connectedCallback?.();
    const $ = (id: string) => this.shadowRoot!.getElementById(id) as any;

    this.#headAvatar = $('headAvatar');
    this.#heading = $('heading');
    this.#subtitle = $('subtitle');
    this.#noticeBox = $('noticeBox');
    this.#notice = $('notice');
    this.#errorBox = $('errorBox');
    this.#errorEl = $('error');
    this.#accountsPanel = $('accountsPanel');
    this.#accountsList = $('accountsList');
    this.#btnAdd = $('btnAdd');
    this.#form = $('loginForm');
    this.#providerSel = $('provider');
    this.#username = $('username');
    this.#password = $('password');
    this.#rememberCk = $('remember');
    this.#btnSubmit = $('btnSubmit');
    this.#btnForgot = $('btnForgot');
    this.#btnPassword = $('btnPassword');
    this.#btnLogoutAll = $('btnLogoutAll');
    this.#pwDialog = $('pwDialog');
    this.#pwCurrent = $('pwCurrent');
    this.#pwNext = $('pwNext');
    this.#pwRepeat = $('pwRepeat');
    this.#pwError = $('pwError');
    this.#pwSave = $('pwSave');
    this.#sessionsDialog = $('sessionsDialog');
    this.#sessionsList = $('sessionsList');
    this.#toast = $('toast');

    this.#wire();
    this.#render();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (!this.isConnected) return;
    this.#render();
    if (name === 'remember') this.#emit('iswc-remember-change', { remember: this.remember });
  }

  get accounts(): LoginAccount[] { return this.#accounts; }
  set accounts(value: LoginAccount[]) {
    this.#accounts = Array.isArray(value) ? value.slice() : [];
    this.#render();
  }

  get sessions(): LoginSession[] { return this.#sessions; }
  set sessions(value: LoginSession[]) {
    this.#sessions = Array.isArray(value) ? value.slice() : [];
    this.#renderSessions();
  }

  get selected(): string { return this.getAttribute('selected') ?? ''; }
  set selected(value: string) {
    if (value) this.setAttribute('selected', value);
    else this.removeAttribute('selected');
  }

  get remember(): boolean { return this.hasAttribute('remember'); }
  set remember(value: boolean) { this.toggleAttribute('remember', !!value); }

  get busy(): boolean { return this.hasAttribute('busy'); }
  set busy(value: boolean) { this.toggleAttribute('busy', !!value); }

  get mode(): string { return this.getAttribute('mode') === 'multi' ? 'multi' : 'single'; }
  set mode(value: string) { this.setAttribute('mode', value === 'multi' ? 'multi' : 'single'); }

  openSessions(): void {
    this.#sessionsDialog?.setAttribute('open', '');
    this.#renderSessions();
    this.#emit('iswc-sessions-refresh', {});
  }

  closeSessions(): void { this.#sessionsDialog?.removeAttribute('open'); }

  openPassword(): void {
    this.#pwError?.setAttribute('hidden', '');
    this.#pwDialog?.setAttribute('open', '');
    this.#pwCurrent?.focus?.();
  }

  closePassword(): void { this.#pwDialog?.removeAttribute('open'); }

  toast(message: string, color = 'brand'): void {
    this.#toast?.create?.(message, { color });
  }

  focus(): void { this.#username?.focus?.(); }

  #wire(): void {
    this.#form?.addEventListener('submit', (event: Event) => {
      event.preventDefault();
      this.#submit();
    });

    this.#rememberCk?.addEventListener('iswc-change', () => {
      this.remember = !!this.#rememberCk.checked;
    });

    this.#btnForgot?.addEventListener('click', () => {
      this.#emit('iswc-forgot', { username: this.#username?.value ?? '' });
    });

    this.#btnPassword?.addEventListener('click', () => this.openPassword());
    this.#btnLogoutAll?.addEventListener('click', () => this.#emit('iswc-logout-all', {}));
    this.#btnAdd?.addEventListener('click', () => this.#emit('iswc-add-account', {}));
    this.#providerSel?.addEventListener('iswc-change', () => this.#render());

    const $ = (id: string) => this.shadowRoot!.getElementById(id) as any;
    $('pwCancel')?.addEventListener('click', () => this.closePassword());
    $('pwSave')?.addEventListener('click', () => this.#savePassword());
    $('sesClose')?.addEventListener('click', () => this.closeSessions());
    $('btnRefresh')?.addEventListener('click', () => this.#emit('iswc-sessions-refresh', {}));
    $('sesLogoutAll')?.addEventListener('click', () => this.#emit('iswc-logout-all', {}));
  }

  #submit(): void {
    if (this.busy || this.hasAttribute('disabled')) return;
    const username = this.#username?.value ?? '';
    const password = this.#password?.value ?? '';

    this.#username?.removeAttribute('error');
    this.#password?.removeAttribute('error');
    let invalid = false;
    if (!username.trim()) {
      this.#username?.setAttribute('error', '');
      this.#username?.setAttribute('error-text', 'Escribe tu usuario');
      invalid = true;
    }
    if (!password) {
      this.#password?.setAttribute('error', '');
      this.#password?.setAttribute('error-text', 'Escribe tu contraseña');
      invalid = true;
    }
    if (invalid) return;

    const provider = this.#providerSel?.value || this.getAttribute('provider') || 'Cuenta';
    this.#emit('iswc-login-submit', {
      username,
      password,
      remember: this.remember,
      provider,
    });
  }

  #savePassword(): void {
    const current = this.#pwCurrent?.value ?? '';
    const next = this.#pwNext?.value ?? '';
    const repeat = this.#pwRepeat?.value ?? '';
    const fail = (msg: string) => {
      this.#pwError?.removeAttribute('hidden');
      if (this.#pwError) this.#pwError.textContent = msg;
    };
    this.#pwError?.setAttribute('hidden', '');
    if (!current) return fail('Escribe tu contraseña actual');
    if (next.length < 8) return fail('La nueva contraseña debe tener al menos 8 caracteres');
    if (next !== repeat) return fail('Las contraseñas no coinciden');
    this.#emit('iswc-password-change', { current, next });
  }

  #emit(name: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  #render(): void {
    if (!this.shadowRoot) return;
    const multi = this.mode === 'multi';
    const busy = this.busy;
    const disabled = this.hasAttribute('disabled');

    this.#heading.textContent = this.getAttribute('heading') || 'Iniciar sesión';
    const subtitle = this.getAttribute('subtitle');
    this.#subtitle.textContent = subtitle ?? '';
    this.#subtitle.hidden = !subtitle;

    const error = this.getAttribute('error');
    this.#errorBox.hidden = !error;
    if (error) this.#errorEl.textContent = error;
    const notice = this.getAttribute('notice');
    this.#noticeBox.hidden = !notice;
    if (notice) this.#notice.textContent = notice;

    const providers = this.#providers();
    this.#providerSel.hidden = providers.length < 2;
    if (providers.length >= 2) {
      const current = this.#providerSel.value || providers[0].id;
      this.#providerSel.innerHTML = providers
        .map((p) => '<iswc-option value="' + this.#esc(p.id) + '">' + this.#esc(p.name) + '</iswc-option>')
        .join('');
      this.#providerSel.value = current;
    }

    const account = this.#accounts.find((a) => a.id === this.selected) ?? null;
    this.#headAvatar.hidden = !(multi && account);
    if (multi && account) this.#applyAvatar(this.#headAvatar, account);

    this.#accountsPanel.hidden = !multi;
    this.#btnAdd.hidden = !multi;
    if (multi) this.#renderAccounts(account);

    if (multi && account) {
      this.#username.value = account.name || account.email || '';
      this.#username.setAttribute('readonly', '');
    } else {
      this.#username.removeAttribute('readonly');
    }
    this.#rememberCk.checked = this.remember;
    this.#password.toggleAttribute('disabled', disabled || busy);
    this.#username.toggleAttribute('disabled', disabled || busy || (multi && !!account));
    this.#btnSubmit.toggleAttribute('disabled', disabled || busy);
    this.#btnSubmit.textContent = busy ? 'Entrando…' : 'Entrar';

    this.#btnPassword.hidden = !this.hasAttribute('show-password');
    this.#btnLogoutAll.hidden = !this.hasAttribute('allow-logout-all');
    this.setAttribute('data-mode', multi ? 'multi' : 'single');
    this.setAttribute('data-busy', busy ? 'true' : 'false');
  }

  #renderAccounts(account: LoginAccount | null): void {
    if (!this.#accounts.length) {
      this.#accountsList.innerHTML = '<li class="accounts-empty">Sin cuentas guardadas. Inicia sesión para añadir una.</li>';
      return;
    }
    this.#accountsList.innerHTML = this.#accounts.map((a) => {
      const active = account?.id === a.id;
      const initials = this.#initials(a.name || a.email || a.id);
      const label = a.name || a.email || a.id;
      const sub = a.email && a.name ? a.email : (a.provider ?? '');
      return (
        '<li class="account' + (active ? ' is-active' : '') + '" data-id="' + this.#esc(a.id) + '">' +
          '<span class="account-select" role="button" tabindex="0" data-action="select">' +
            '<iswc-avatar initials="' + this.#esc(initials) + '"' +
              (a.avatar ? ' image="' + this.#esc(a.avatar) + '"' : '') + '></iswc-avatar>' +
            '<span class="account-text">' +
              '<span class="account-name">' + this.#esc(label) + '</span>' +
              (sub ? '<span class="account-sub">' + this.#esc(sub) + '</span>' : '') +
            '</span>' +
            (active ? '<span class="account-active">Activa</span>' : '') +
          '</span>' +
          '<iswc-button size="sm" variant="plain" color="danger" data-action="remove">Quitar</iswc-button>' +
        '</li>'
      );
    }).join('');

    this.#accountsList.querySelectorAll('.account').forEach((row) => {
      const id = (row as HTMLElement).dataset.id!;
      const account2 = this.#accounts.find((a) => a.id === id)!;
      row.querySelector('[data-action="select"]')?.addEventListener('click', () => {
        this.selected = id;
        this.#emit('iswc-account-select', { account: account2 });
        this.#render();
        this.#password?.focus?.();
      });
      row.querySelector('[data-action="remove"]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        this.#emit('iswc-remove-account', { account: account2 });
      });
    });
  }

  #renderSessions(): void {
    if (!this.#sessionsList) return;
    if (!this.#sessions.length) {
      this.#sessionsList.innerHTML =
        '<iswc-callout color="neutral" variant="plain">No hay sesiones activas.</iswc-callout>';
      return;
    }
    this.#sessionsList.innerHTML = this.#sessions.map((s) => {
      const initials = this.#initials(s.device || s.os || s.browser || '?');
      const meta = [
        s.ip ? 'IP ' + s.ip : '',
        s.os ?? '',
        s.browser ?? '',
        s.lastAccess ? 'Último acceso ' + s.lastAccess : '',
      ].filter(Boolean).map((x) => '<span>' + this.#esc(x) + '</span>').join('<span class="dot">·</span>');
      return (
        '<div class="session' + (s.current ? ' is-current' : '') + '" data-id="' + this.#esc(s.id) + '">' +
          '<iswc-avatar initials="' + this.#esc(initials) + '" shape="rounded"></iswc-avatar>' +
          '<div class="session-text">' +
            '<div class="session-title">' + this.#esc(s.device || 'Dispositivo') +
              (s.current ? '<span class="pill">Esta sesión</span>' : '') + '</div>' +
            '<div class="session-meta">' + meta + '</div>' +
          '</div>' +
          (!s.current ? '<iswc-button size="sm" variant="plain" color="danger" data-action="revoke">Cerrar</iswc-button>' : '') +
        '</div>'
      );
    }).join('');

    this.#sessionsList.querySelectorAll('.session').forEach((row) => {
      const id = (row as HTMLElement).dataset.id!;
      row.querySelector('[data-action="revoke"]')?.addEventListener('click', () => {
        this.#emit('iswc-session-revoke', { sessionId: id });
      });
    });
  }

  #providers(): { id: string; name: string }[] {
    const raw = this.getAttribute('providers');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed
            .map((p: any) => ({ id: String(p.id ?? p.name ?? ''), name: String(p.name ?? p.id ?? '') }))
            .filter((p) => p.id);
        }
      } catch { /* ignora JSON inválido */ }
    }
    return [{ id: this.getAttribute('provider') || 'cuenta', name: this.getAttribute('provider') || 'Cuenta' }];
  }

  #applyAvatar(el: any, a: LoginAccount): void {
    if (a.avatar) el.setAttribute('image', a.avatar);
    else el.removeAttribute('image');
    el.setAttribute('initials', this.#initials(a.name || a.email || a.id));
  }

  #initials(text: string): string {
    const parts = String(text).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? '');
    return (first + second).toUpperCase();
  }

  #esc(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

defineElement('iswc-login', IswcLogin as unknown as CustomElementConstructor);

declare global {
  interface HTMLElementTagNameMap {
    'iswc-login': IswcLogin;
  }
}
