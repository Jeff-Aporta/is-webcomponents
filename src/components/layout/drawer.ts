// @contexto INDICE.md · src/components/layout/drawer.md
import { ModalBase } from './utils/modal-base.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import css from 'iswc:css';
import type { DrawerEventos } from './schemas/drawer.schemas.js';

registrarTerminos('es', { anchoPanel: 'Ancho del panel' });

/**
 * <iswc-drawer> — Web Component (vanilla, zero dependencies).
 *
 * Panel que se desliza desde un borde del viewport con su VELO (backdrop) que oscurece
 * la pagina y centra el foco en el panel. Ideal para menus, filtros y contenido
 * secundario. Equivalente accesible a wa-drawer (Web Awesome).
 *
 * Comparte con <iswc-dialog> TODO el ciclo de vida (focus-trap, Escape, backdrop
 * light-dismiss, restore de foco, data-drawer="close", eventos) via
 * utils/modal-base.ts. Aqui queda el chrome propio, el placement, el tamano
 * (con tirador opcional) y las animaciones de deslizamiento.
 *
 * Atributos
 *   open              boolean — si esta abierto (reflected).
 *   label             string  — titulo del header (a11y; el aria-labelledby apunta al titulo).
 *   placement         start | end | top | bottom  (default 'end').
 *   without-header    boolean — oculta el header y el boton de cerrar.
 *   light-dismiss     boolean — cierra al hacer click en el velo (por defecto SI; "false" lo desactiva).
 *   closable          boolean — false esconde la X (el header y su titulo siguen).
 *   size              string  — tamano preferido (ancho o alto segun placement). Si viene
 *                     en unidades de ventana (vw/vh/vmin/vmax), en pantallas angostas
 *                     (< 48rem) el panel ocupa el 100% y deja de redimensionarse.
 *   resize            boolean — tirador en el borde para cambiar el ancho arrastrando
 *                     (y con las flechas, Inicio y Fin cuando tiene el foco).
 *   storage-key       string  — clave de localStorage donde se recuerda el ancho elegido.
 *   header-height     string  — alto minimo del header compacto (default 3rem).
 *
 * Slots
 *   (default)        contenido principal (body, con scroll propio).
 *   label            header label propio.
 *   header-actions   acciones adicionales en el header.
 *   footer           pie del drawer.
 *
 * Metodos: show() / hide() / toggle()
 *
 * Eventos: iswc-show, iswc-after-show, iswc-hide (cancelable, detail.source), iswc-after-hide
 *
 * CSS Parts: backdrop, drawer, header, title, close-button, header-actions, body, footer,
 *            resize-handle
 *
 * CSS custom properties
 *   --iswc-drawer-size            tamano preferido (default 23.75em)
 *   --iswc-drawer-header-height   alto minimo del header (default 3rem)
 *   --iswc-drawer-spacing         padding interno (default var(--iswc-space-l, 1em))
 *   --iswc-drawer-radius          radio de las esquinas expuestas (default 0)
 *   --iswc-drawer-backdrop-color  color del velo
 *   --iswc-drawer-backdrop-blur   desenfoque del velo
 *   --iswc-drawer-show-duration   duracion de la entrada
 *   --iswc-drawer-hide-duration   duracion de la salida
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div class="backdrop" part="backdrop"></div>
  <div class="drawer" part="drawer" role="dialog" aria-modal="true" tabindex="-1">
    <header class="header" part="header">
      <h2 class="title" part="title">
        <slot name="label"></slot>
      </h2>
      <div class="header-actions" part="header-actions">
        <slot name="header-actions"></slot>
        <iswc-button
          type="button"
          class="close-btn"
          part="close-button"
          variant="text"
          color="text"
        >
          <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
        </iswc-button>
      </div>
    </header>
    <div class="body" part="body">
      <slot></slot>
    </div>
    <footer class="footer" part="footer">
      <slot name="footer"></slot>
    </footer>
    <div
      class="resize-handle"
      part="resize-handle"
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      hidden
    ></div>
  </div>
`;

const PLACEMENTS = ['start', 'end', 'top', 'bottom'];
const LATERALES = ['start', 'end'];
/** < 48rem: el panel que se mide con unidades de ventana pasa a ocupar todo el ancho. */
const MEDIO_ANGOSTO = '(max-width: 47.99rem)';
/** Topes del ancho cuando se arrastra: ni mas estrecho que un panel ni mas ancho que la ventana. */
const ANCHO_MIN = 280;
const ANCHO_MAX_PORCENTAJE = 0.98;

/** El scroll del documento se bloquea UNA vez, aunque haya varios paneles abiertos. */
let bloqueosScroll = 0;
let overflowPrevio = '';

function fijarScrollBloqueado(bloquear: boolean): void {
  if (typeof document === 'undefined') return;
  if (bloquear) {
    if (bloqueosScroll === 0) {
      overflowPrevio = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }
    bloqueosScroll++;
    return;
  }
  if (bloqueosScroll === 0) return;
  bloqueosScroll--;
  if (bloqueosScroll === 0) document.documentElement.style.overflow = overflowPrevio;
}

class IswcDrawer extends ModalBase {
  static override tag = 'iswc-drawer';
  declare static events: DrawerEventos;
  static override css = css;
  static override deps = ['iswc-icon', 'iswc-button'];

  static override template = TEMPLATE;

  static override observed = [
    ...super.observed,
    'placement',
    'size',
    'closable',
    'resize',
    'storage-key',
    'header-height',
  ];

  override get modalClass() { return '.drawer'; }
  override get closeAttr() { return 'data-drawer'; }

  /** El velo del drawer cierra al hacer click por defecto (a diferencia del dialog, que lo pide con light-dismiss).
   *  `light-dismiss="false"` lo desactiva en un drawer concreto. */
  override get lightDismissPorDefecto(): boolean { return true; }

  #medio = matchMedia(MEDIO_ANGOSTO);
  #tirador: HTMLElement | null = null;
  #tiradorConectado = false;
  /** Este panel tiene bloqueado el scroll del documento (para no descontar de mas). */
  #bloqueaScroll = false;
  #arrastrando = false;

  constructor() {
    super();
    this.#tomarTirador();
    // El nombre accesible lo manda SIEMPRE el titulo del header: modal-base lo sincroniza al cambiar el
    // contenido del slot, asi que se vuelve a fijar despues de el (mismo evento, listener posterior).
    this.shadowRoot?.querySelector('slot[name="label"]')?.addEventListener('slotchange', () => this.#syncAria());
  }

  /* Ciclo de vida */

  override onConnected(): void {
    if (!this.hasAttribute('placement')) this.setAttribute('placement', 'end');
    this.#tomarTirador();
    this.#medio.addEventListener('change', this.#alMedio);
    window.addEventListener('resize', this.#alRedimensionar);
    this.#aplicarTamano();
    this.#aplicarAltoCabecera();
    this.#syncCerrar();
    this.#syncAria();
    this.#bloquearScroll(this.open);
  }

  override onDisconnected(): void {
    this.#medio.removeEventListener('change', this.#alMedio);
    window.removeEventListener('resize', this.#alRedimensionar);
    this.#bloquearScroll(false);
  }

  /** Al cambiar el tamano de la ventana el panel se reajusta (y el tirador se esconde en movil). */
  #alRedimensionar = (): void => this.#aplicarTamano();
  #alMedio = (): void => this.#aplicarTamano();

  override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
    if (oldVal === newVal) return;
    switch (name) {
      case 'open':
        this.#bloquearScroll(newVal !== null);
        return;
      case 'placement':
        if (newVal && !PLACEMENTS.includes(newVal)) this.setAttribute('placement', 'end');
        else this.#syncTirador();
        return;
      case 'label':
        this.#syncAria();
        return;
      case 'size':
      case 'storage-key':
        this.#aplicarTamano();
        return;
      case 'closable':
        this.#syncCerrar();
        return;
      case 'header-height':
        this.#aplicarAltoCabecera();
        return;
      case 'resize':
        this.#syncTirador();
        return;
      default:
        return;
    }
  }

  /* API */

  /** El borde del que sale el panel. */
  get placement(): string {
    const v = this.getAttribute('placement');
    return PLACEMENTS.includes(v ?? '') ? (v as string) : 'end';
  }
  set placement(v: string) {
    if (v == null || v === '') this.removeAttribute('placement');
    else this.setAttribute('placement', PLACEMENTS.includes(v) ? v : 'end');
  }

  /** Tamano preferido (ancho o alto segun el placement). */
  get size(): string {
    return this.getAttribute('size') ?? '';
  }
  set size(v: string) {
    if (v == null || v === '') this.removeAttribute('size');
    else this.setAttribute('size', String(v));
  }

  /** false esconde el boton de cerrar; el header y su titulo siguen. */
  get closable(): boolean {
    const v = (this.getAttribute('closable') ?? 'true').trim().toLowerCase();
    return !(v === 'false' || v === '0' || v === 'no');
  }
  set closable(v: boolean) {
    if (v) this.removeAttribute('closable');
    else this.setAttribute('closable', 'false');
  }

  /** Muestra el tirador del borde (arrastrar cambia el ancho). */
  get resize(): boolean {
    return this.hasAttribute('resize');
  }
  set resize(v: boolean) {
    this.toggleAttribute('resize', !!v);
  }

  /** Clave de localStorage donde se recuerda el ancho elegido. */
  get storageKey(): string {
    return this.getAttribute('storage-key') ?? '';
  }
  set storageKey(v: string) {
    if (!v) this.removeAttribute('storage-key');
    else this.setAttribute('storage-key', String(v));
  }

  /** Alto minimo del header (compacto por defecto, 3rem). */
  get headerHeight(): string {
    return this.getAttribute('header-height') ?? '';
  }
  set headerHeight(v: string) {
    if (!v) this.removeAttribute('header-height');
    else this.setAttribute('header-height', String(v));
  }

  /* Apertura, cierre y scroll del documento */

  override animateOpen(): Promise<void> {
    this.#bloquearScroll(true);
    const dur = this.#readDur('--iswc-drawer-show-duration', 220);
    this.$modal.animate(
      [this.#fuera(), this.#dentro()],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
    );
    this.$backdrop.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: dur, easing: 'ease-out', fill: 'forwards' },
    );
    return new Promise((resolve) => setTimeout(resolve, dur));
  }

  override animateClose(): Promise<void> {
    const dur = this.#readDur('--iswc-drawer-hide-duration', 180);
    this.$modal.animate(
      [this.#dentro(), this.#fuera()],
      { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
    );
    this.$backdrop.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: dur, easing: 'ease-in', fill: 'forwards' },
    );
    return new Promise((resolve) => setTimeout(resolve, dur)).then(() => {
      this.#bloquearScroll(false);
    });
  }

  /** Un solo bloqueo por panel: el documento se libera cuando sale el ultimo panel. */
  #bloquearScroll(bloquear: boolean): void {
    if (this.#bloqueaScroll === bloquear) return;
    this.#bloqueaScroll = bloquear;
    fijarScrollBloqueado(bloquear);
  }

  /** Posicion fuera de pantalla, del lado del borde que ocupa el panel. */
  #fuera(): Keyframe {
    if (this.placement === 'start') return { transform: 'translateX(-100%)' };
    if (this.placement === 'top') return { transform: 'translateY(-100%)' };
    if (this.placement === 'bottom') return { transform: 'translateY(100%)' };
    return { transform: 'translateX(100%)' };
  }

  #dentro(): Keyframe { return { transform: 'translate(0,0)' }; }

  #readDur(propName: string, fallback: number): number {
    const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
    return Number.isFinite(v) ? v : fallback;
  }

  /* Accesibilidad: el nombre de la caja es el titulo del header */

  #syncAria(): void {
    const modal = this.$modal;
    const titulo = this.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!modal || !titulo) return;
    // Con el header oculto no hay titulo visible que nombrar: se usa el atributo label.
    if (this.hasAttribute('without-header')) {
      modal.removeAttribute('aria-labelledby');
      if (this.label) modal.setAttribute('aria-label', this.label);
      else modal.removeAttribute('aria-label');
      return;
    }
    if (!titulo.id) titulo.id = 'titulo';
    modal.removeAttribute('aria-label');
    modal.setAttribute('aria-labelledby', titulo.id);
  }

  override actualizado(): void {
    super.actualizado();
    this.#tirador?.setAttribute('aria-label', this.t('anchoPanel'));
  }

  /* Tamano: atributo, ancho recordado o el que se arrastra */

  /** El tamano se mide contra la ventana (80vw)? Entonces en movil ocupa el 100%. */
  #esRelativoALaVentana(): boolean {
    return /\d\s*(vw|vh|vmin|vmax)\b/.test(this.size);
  }

  #movil(): boolean {
    return this.#medio.matches;
  }

  #aplicarTamano(): void {
    if (this.#arrastrando) return;
    const relativo = this.#esRelativoALaVentana();
    const guardado = this.#leerAncho();
    if (relativo && this.#movil()) {
      // En pantallas angostas el panel del tamano de la ventana ocupa todo (sin aire ni tirador).
      this.style.setProperty('--iswc-drawer-size', '100vw');
      this.style.setProperty('--iswc-drawer-spacing', '0px');
    } else if (guardado) {
      this.style.removeProperty('--iswc-drawer-spacing');
      this.style.setProperty('--iswc-drawer-size', `${Math.round(guardado)}px`);
    } else if (this.hasAttribute('size')) {
      this.style.removeProperty('--iswc-drawer-spacing');
      this.style.setProperty('--iswc-drawer-size', this.size);
    } else {
      // Sin size ni ancho recordado: manda el CSS del consumidor (--iswc-drawer-size).
      this.style.removeProperty('--iswc-drawer-spacing');
      this.style.removeProperty('--iswc-drawer-size');
    }
    this.#syncTirador();
  }

  #leerAncho(): number {
    if (!this.storageKey) return 0;
    try {
      const n = Number(localStorage.getItem(this.storageKey));
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  #guardarAncho(px: number): void {
    if (!this.storageKey) return;
    try {
      localStorage.setItem(this.storageKey, String(Math.round(px)));
    } catch {
      /* sin almacenamiento */
    }
  }

  /** Fija el ancho en pixeles (arrastrando o con el teclado). */
  #fijarAncho(px: number, recordar: boolean): void {
    const tope = Math.max(ANCHO_MIN, Math.round(innerWidth * ANCHO_MAX_PORCENTAJE));
    const ancho = Math.min(tope, Math.max(ANCHO_MIN, Math.round(px)));
    this.style.removeProperty('--iswc-drawer-spacing');
    this.style.setProperty('--iswc-drawer-size', `${ancho}px`);
    this.#tirador?.setAttribute('aria-valuenow', String(ancho));
    if (recordar) this.#guardarAncho(ancho);
  }

  /** Ancho actual en pixeles (del tamano efectivo). */
  #anchoActual(): number {
    const caja = this.$modal;
    if (caja) {
      const ancho = caja.getBoundingClientRect().width;
      if (ancho > 0) return ancho;
    }
    const v = parseFloat(getComputedStyle(this).getPropertyValue('--iswc-drawer-size'));
    return Number.isFinite(v) ? v : 0;
  }

  /* El tirador del borde */

  #tomarTirador(): void {
    const tirador = this.shadowRoot?.querySelector<HTMLElement>('.resize-handle') ?? null;
    if (!tirador) return;
    this.#tirador = tirador;
    if (this.#tiradorConectado) return;
    this.#tiradorConectado = true;
    tirador.addEventListener('pointerdown', this.#alPulsarTirador);
    tirador.addEventListener('keydown', this.#alTeclaTirador);
  }

  /** El tirador solo se ve si se puede redimensionar: hay resize, es lateral y no es movil con tamano de ventana. */
  #syncTirador(): void {
    const tirador = this.#tirador;
    if (!tirador) return;
    const puede = this.resize && LATERALES.includes(this.placement) &&
      !(this.#esRelativoALaVentana() && this.#movil());
    tirador.hidden = !puede;
    if (!puede) return;
    const ancho = Math.round(this.#anchoActual());
    if (ancho > 0) tirador.setAttribute('aria-valuenow', String(ancho));
    tirador.setAttribute('aria-valuemin', String(ANCHO_MIN));
    tirador.setAttribute('aria-valuemax', String(Math.round(innerWidth * ANCHO_MAX_PORCENTAJE)));
  }

  /** Arrastrar el borde: el ancho sigue al puntero y, al soltar, se recuerda. */
  #alPulsarTirador = (e: PointerEvent): void => {
    const tirador = this.#tirador;
    const caja = this.$modal;
    if (!tirador || !caja || e.button !== 0) return;
    e.preventDefault();
    this.#arrastrando = true;
    this.setAttribute('data-resizing', '');
    try { tirador.setPointerCapture(e.pointerId); } catch { /* sin captura: sigue el pointermove normal */ }
    const rect = caja.getBoundingClientRect();
    const alMover = (ev: PointerEvent): void => {
      const px = this.placement === 'start' ? ev.clientX - rect.left : rect.right - ev.clientX;
      this.#fijarAncho(px, false);
    };
    const alSoltar = (): void => {
      tirador.removeEventListener('pointermove', alMover);
      this.#arrastrando = false;
      this.removeAttribute('data-resizing');
      this.#guardarAncho(this.#anchoActual());
    };
    tirador.addEventListener('pointermove', alMover);
    tirador.addEventListener('pointerup', alSoltar, { once: true });
    tirador.addEventListener('pointercancel', alSoltar, { once: true });
  };

  /** El tirador tambien se mueve con el teclado (flechas; Inicio y Fin van a los topes). */
  #alTeclaTirador = (e: KeyboardEvent): void => {
    const paso = e.shiftKey ? 64 : 32;
    const actual = this.#anchoActual();
    // En el borde derecho (placement end) crecer es ir hacia la izquierda; en el izquierdo, al reves.
    const haciaAdentro = this.placement === 'end' ? 1 : -1;
    let siguiente: number | null = null;
    if (e.key === 'ArrowLeft') siguiente = actual + paso * haciaAdentro;
    else if (e.key === 'ArrowRight') siguiente = actual - paso * haciaAdentro;
    else if (e.key === 'Home') siguiente = ANCHO_MIN;
    else if (e.key === 'End') siguiente = innerWidth * ANCHO_MAX_PORCENTAJE;
    if (siguiente === null) return;
    e.preventDefault();
    this.#fijarAncho(siguiente, true);
  };

  /* Boton de cerrar y alto del header */

  #syncCerrar(): void {
    const boton = this.shadowRoot?.querySelector<HTMLElement>('.close-btn');
    if (boton) boton.hidden = !this.closable;
  }

  #aplicarAltoCabecera(): void {
    if (this.headerHeight) this.style.setProperty('--iswc-drawer-header-height', this.headerHeight);
    else this.style.removeProperty('--iswc-drawer-header-height');
  }
}

define(IswcDrawer, 'IswcDrawer');
