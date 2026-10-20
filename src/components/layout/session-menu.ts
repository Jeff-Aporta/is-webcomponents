import { adoptCss, defineElement, emit, upgradeProperties } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setCustomState } from '../../core/form-associated.js';
import '../actions/dropdown.js';
import '../actions/dropdown-item.js';
import '../actions/button.js';
import '../media/avatar.js';
import '../media/icon.js';
import '../layout/divider.js';
import './login-dropdown.js';
import type { LoginChoice } from './schemas/login-dropdown.schemas.js';

/**
 * <iswc-session-menu> — Sesión del usuario en la barra.
 *
 * Sin `logged`: muestra <iswc-login-dropdown>; su `iswc-login-submit` sale del host tal cual.
 * Con `logged`: avatar + primer nombre; el menú trae nombre completo, subtítulo (rol),
 * los items propios (slot) y "Cerrar sesión" → `iswc-logout`.
 * No conoce ningún backend: no hace fetch ni guarda tokens.
 *
 * Atributos
 *   logged          hay sesión
 *   name            nombre completo del usuario
 *   subtitle        línea secundaria (rol, empresa, correo…)
 *   avatar          URL de la imagen del avatar (sin ella, iniciales)
 *   placement       colocación del menú (default bottom-end)
 *   logout-label    texto del item de salida (default "Cerrar sesión")
 *   label, heading, modes, remember → se pasan al <iswc-login-dropdown>
 *
 * Propiedades: error, loading, choices → al <iswc-login-dropdown>
 * Métodos: reset() (del login), show() / hide() (menú de sesión)
 *
 * Slots
 *   (default)  <iswc-dropdown-item> propios, entre el perfil y "Cerrar sesión"
 *
 * Eventos
 *   iswc-logout        {}            — clic en "Cerrar sesión"
 *   iswc-select        { item }      — clic en un item propio (de <iswc-dropdown>)
 *   iswc-login-submit  (de <iswc-login-dropdown>)
 *
 * Parts: trigger, avatar, name, profile, profile-name, profile-subtitle, logout, login
 * Custom states: logged
 */

const LOGIN_ATTRS = ['label', 'heading', 'modes', 'remember'];

const HTML_TEMPLATE = `
<iswc-login-dropdown class="login" part="login"></iswc-login-dropdown>
<iswc-dropdown class="menu" placement="bottom-end" hidden>
  <iswc-button slot="trigger" class="trigger" part="trigger" variant="plain" color="neutral">
    <iswc-avatar slot="start" class="avatar" part="avatar"></iswc-avatar>
    <span class="name" part="name"></span>
  </iswc-button>
  <div class="profile" part="profile">
    <span class="profile-name" part="profile-name"></span>
    <span class="profile-subtitle" part="profile-subtitle" hidden></span>
  </div>
  <iswc-divider></iswc-divider>
  <slot></slot>
  <iswc-dropdown-item class="logout" part="logout" value="logout" color="danger">
    <iswc-icon slot="icon" icon="mdi:logout" aria-hidden="true"></iswc-icon>
    <span class="logout-label"></span>
  </iswc-dropdown-item>
</iswc-dropdown>`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = HTML_TEMPLATE;

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const a = partes[0]![0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1]![0] ?? '' : partes[0]![1] ?? '';
  return (a + b).toUpperCase();
}

class IswcSessionMenu extends ElementBase {
  static override get observedAttributes(): string[] {
    return ['logged', 'name', 'subtitle', 'avatar', 'placement', 'logout-label', ...LOGIN_ATTRS];
  }

  #internals: ElementInternals | null = null;
  #login!: HTMLElement & { error: string; loading: boolean; choices: LoginChoice[]; reset(): void };
  #menu!: HTMLElement & { show(): void; hide(): void };
  #logout!: HTMLElement;
  #root!: ShadowRoot;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    adoptCss(this.#root, import.meta.url);
    this.#root.appendChild(TEMPLATE.content.cloneNode(true));
    try { this.#internals = this.attachInternals(); } catch { this.#internals = null; }
    this.#login = this.#root.querySelector('.login') as HTMLElement & { error: string; loading: boolean; choices: LoginChoice[]; reset(): void };
    this.#menu = this.#root.querySelector('.menu') as HTMLElement & { show(): void; hide(): void };
    this.#logout = this.#root.querySelector('.logout') as HTMLElement;

    this.#menu.addEventListener('iswc-select', (ev) => {
      const item = (ev as CustomEvent<{ item?: HTMLElement }>).detail?.item;
      if (item !== this.#logout) return;
      // El item de salida es interno: no se filtra como iswc-select, se traduce a iswc-logout.
      ev.stopPropagation();
      emit(this, 'iswc-logout', {});
    });
  }

  override onConnected(): void {
    upgradeProperties(this, ['logged', 'error', 'loading', 'choices']);
    this.#render();
  }
  override onAttributeChanged(): void { this.#render(); }

  get logged(): boolean { return this.hasAttribute('logged'); }
  set logged(v: boolean) { this.toggleAttribute('logged', !!v); }

  get error(): string { return this.#login.error; }
  set error(v: string) { this.#login.error = v; }

  get loading(): boolean { return this.#login.loading; }
  set loading(v: boolean) { this.#login.loading = v; }

  get choices(): LoginChoice[] { return this.#login.choices; }
  set choices(v: LoginChoice[]) { this.#login.choices = v; }

  /** Restablece el login (error, carga, opciones, contraseña) y lo cierra. */
  reset(): void { this.#login.reset(); }

  show(): void { if (this.logged) this.#menu.show(); }
  hide(): void { this.#menu.hide(); }

  #render(): void {
    if (!this.#root) return;
    const logged = this.logged;
    // Los dos árboles viven siempre: solo se conmuta su visibilidad (no se recrean iconos).
    this.#login.hidden = logged;
    this.#menu.hidden = !logged;
    if (logged) this.#login.reset?.();
    else this.#menu.hide?.();

    for (const a of LOGIN_ATTRS) {
      const v = this.getAttribute(a);
      if (v === null) this.#login.removeAttribute(a);
      else this.#login.setAttribute(a, v);
    }
    this.#menu.setAttribute('placement', this.getAttribute('placement') || 'bottom-end');

    const nombre = (this.getAttribute('name') || '').trim();
    const visible = nombre.split(/\s+/)[0] || '';
    const subtitle = (this.getAttribute('subtitle') || '').trim();
    const avatar = this.#root.querySelector('.avatar') as HTMLElement;
    const imagen = this.getAttribute('avatar');
    if (imagen) avatar.setAttribute('image', imagen);
    else avatar.removeAttribute('image');
    avatar.setAttribute('initials', iniciales(nombre));
    avatar.setAttribute('label', nombre || 'Usuario');

    (this.#root.querySelector('.name') as HTMLElement).textContent = visible;
    const trigger = this.#root.querySelector('.trigger') as HTMLElement;
    trigger.setAttribute('aria-label', nombre ? `Sesión de ${nombre}` : 'Sesión');
    trigger.setAttribute('title', nombre);
    (this.#root.querySelector('.profile-name') as HTMLElement).textContent = nombre;
    const sub = this.#root.querySelector('.profile-subtitle') as HTMLElement;
    sub.textContent = subtitle;
    sub.hidden = !subtitle;
    (this.#root.querySelector('.logout-label') as HTMLElement).textContent =
      this.getAttribute('logout-label') || 'Cerrar sesión';

    setCustomState(this.#internals, 'logged', logged);
  }
}

defineElement('iswc-session-menu', IswcSessionMenu as unknown as CustomElementConstructor);

declare global {
  interface HTMLElementTagNameMap {
    'iswc-session-menu': IswcSessionMenu;
  }
}
