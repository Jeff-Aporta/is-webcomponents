import { adoptCss, defineElement, emit } from '@jeff-aporta/iswc-base/core/element.js';
import { ElementBase } from '@jeff-aporta/iswc-base/core/element-base.js';
import { computePosition } from '@jeff-aporta/iswc-base/core/position.js';
import { createPopupDismiss } from '@jeff-aporta/iswc-base/core/popup-dismiss.js';
import type { Placement } from '@jeff-aporta/iswc-base/core/schemas/position.schemas.js';
import '@jeff-aporta/iswc-base/components/actions/button.js';

/**
 * <iswc-popconfirm> — Web Component (vanilla, zero dependencies).
 *
 * Cuadro de confirmación emergente anclado a un disparador. Sin modal de fondo.
 * Vive en la capa superior (popover): se ve también sobre un diálogo abierto.
 *
 *   <iswc-button id="trigger">Borrar</iswc-button>
 *   <iswc-popconfirm for="trigger" message="¿Seguro?" color="danger" confirm-label="Sí, borrar"></iswc-popconfirm>
 *
 * Atributos
 *   for           string — id del trigger element.
 *   message       string — texto principal.
 *   placement     top | bottom | start | end | top-start | top-end | bottom-start | bottom-end (default 'top')
 *   hide-arrow    boolean
 *   open          boolean — controlado.
 *   color         brand | danger | … — color del botón de aceptar por defecto (default brand).
 *   confirm-label texto del botón de aceptar por defecto (default "Aceptar").
 *   cancel-label  texto del botón de cancelar por defecto (default "Cancelar").
 *
 * Slots
 *   message — contenido rico en vez del atributo message.
 *   confirm — sustituye el botón de aceptar; su click confirma.
 *   cancel  — sustituye el botón de cancelar; su click cancela.
 *
 * Eventos
 *   iswc-popconfirm-show    detail: { trigger }
 *   iswc-popconfirm-hide    detail: { trigger }
 *   iswc-popconfirm-confirm detail: { trigger }
 *   iswc-popconfirm-cancel  detail: { trigger }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="popconfirm" part="base" role="dialog" aria-modal="false" aria-labelledby="mensaje" popover="manual">
      <div class="arrow" part="arrow"></div>
      <div class="message" id="mensaje" part="message"><span class="message-text"></span><slot name="message"></slot></div>
      <div class="actions" part="actions">
        <span class="cancel-wrap"><slot name="cancel"><iswc-button variant="text" color="text" class="cancel">Cancelar</iswc-button></slot></span>
        <span class="confirm-wrap"><slot name="confirm"><iswc-button color="brand" class="confirm">Aceptar</iswc-button></slot></span>
      </div>
    </div>
  `;

  const OBSERVED = ['for', 'message', 'placement', 'hide-arrow', 'open', 'color', 'confirm-label', 'cancel-label'];

  const VALID_PLACEMENT = [
    'top', 'bottom', 'start', 'end',
    'top-start', 'top-end', 'bottom-start', 'bottom-end',
  ];

  /** `start`/`end` del API público son los lados físicos de core/position. */
  const LADO: Record<string, string> = { start: 'left', end: 'right' };
  /** Separación con el disparador, y margen de la flecha a la esquina, en em del globo. */
  const DISTANCIA_EM = 0.6;
  const MARGEN_FLECHA_EM = 1;

  class IswcPopconfirm extends ElementBase {

    static get observedAttributes(): string[] { return OBSERVED; }

    #pop!: HTMLElement;
    #arrow!: HTMLElement;
    #envolturaAceptar!: HTMLElement;
    #envolturaCancelar!: HTMLElement;
    #trigger: HTMLElement | null = null;
    #abierto = false;
    /** g07 (Cat 24): elemento que tenía foco antes de abrir, para devolverlo al cerrar. */
    #restoreFocus: HTMLElement | null = null;

    /** Ciclo "abierto" compartido con iswc-dropdown / iswc-context-menu. El click fuera es propio: excluye al trigger. */
    #dismiss = createPopupDismiss(this, {
      onEscape: () => this.hide(),
      onReposition: () => this.#reposition(),
    });

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#pop = shadow.querySelector<HTMLElement>('.popconfirm')!;
      this.#arrow = shadow.querySelector<HTMLElement>('.arrow')!;
      // Cada envoltura cubre su slot: botón por defecto o el del consumidor, una sola vez.
      this.#envolturaAceptar = shadow.querySelector<HTMLElement>('.confirm-wrap')!;
      this.#envolturaCancelar = shadow.querySelector<HTMLElement>('.cancel-wrap')!;
      this.#envolturaAceptar.addEventListener('click', () => this.#decidir('iswc-popconfirm-confirm'));
      this.#envolturaCancelar.addEventListener('click', () => this.#decidir('iswc-popconfirm-cancel'));
      shadow.querySelector('slot[name="message"]')!.addEventListener('slotchange', () => this.#syncMessage());
    }

    onConnected(): void {
      this.#bindTrigger();
      this.#syncMessage();
      this.#syncBotones();
      this.#pop.dataset.placement = this.placement;
      if (this.hasAttribute('open')) this.#abrir();
    }

    onDisconnected(): void {
      this.#unbindTrigger();
      this.#cerrar(false);
    }

    onAttributeChanged(name: string): void {
      if (name === 'for') {
        this.#unbindTrigger();
        this.#bindTrigger();
      }
      if (name === 'placement') this.#pop.dataset.placement = this.placement;
      if (name === 'message') this.#syncMessage();
      if (name === 'color' || name === 'confirm-label' || name === 'cancel-label') this.#syncBotones();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.#abrir();
        else this.#cerrar(true);
      }
    }

    get placement(): string {
      const v = this.getAttribute('placement') ?? '';
      return VALID_PLACEMENT.includes(v) ? v : 'top';
    }
    set placement(v: string | null | undefined) {
      if (v == null || v === '') this.removeAttribute('placement');
      else if (VALID_PLACEMENT.includes(v)) this.setAttribute('placement', v);
    }

    show(): void { this.setAttribute('open', ''); }
    hide(): void { this.removeAttribute('open'); }

    #abrir(): void {
      if (this.#abierto || !this.isConnected) return;
      this.#abierto = true;
      const activo = document.activeElement;
      this.#restoreFocus = activo instanceof HTMLElement && activo !== document.body ? activo : this.#trigger;
      this.#pop.showPopover();
      this.#dismiss.attach();
      document.addEventListener('click', this.#onDocClick);
      this.#trigger?.setAttribute('aria-expanded', 'true');
      emit(this, 'iswc-popconfirm-show', { trigger: this.#trigger });
      // Tras el layout: el globo ya tiene tamaño y los iswc-button terminaron su upgrade.
      requestAnimationFrame(() => {
        this.#reposition();
        if (this.#abierto) this.#botonCancelar()?.focus({ preventScroll: true });
      });
    }

    #cerrar(avisar: boolean): void {
      if (!this.#abierto) return;
      this.#abierto = false;
      this.#dismiss.detach();
      document.removeEventListener('click', this.#onDocClick);
      if (this.#pop.matches(':popover-open')) this.#pop.hidePopover();
      this.#trigger?.setAttribute('aria-expanded', 'false');
      const restore = this.#restoreFocus;
      this.#restoreFocus = null;
      if (restore?.isConnected) restore.focus({ preventScroll: true });
      if (avisar) emit(this, 'iswc-popconfirm-hide', { trigger: this.#trigger });
    }

    #decidir(evento: string): void {
      emit(this, evento, { trigger: this.#trigger });
      this.hide();
    }

    #botonCancelar(): HTMLElement | null {
      return this.querySelector<HTMLElement>('[slot="cancel"]') ?? this.shadowRoot!.querySelector<HTMLElement>('.cancel');
    }

    #onDocClick = (e: MouseEvent): void => {
      const ruta = e.composedPath();
      if (ruta.includes(this) || (this.#trigger && ruta.includes(this.#trigger))) return;
      this.hide();
    };

    #onTriggerClick = (e: Event): void => {
      e.preventDefault();
      this.toggleAttribute('open');
    };

    #reposition(): void {
      if (!this.#abierto || !this.#trigger) return;
      const em = parseFloat(getComputedStyle(this.#pop).fontSize) || 16;
      const pedido = this.placement;
      const r = computePosition({
        anchor: this.#trigger,
        popupEl: this.#pop,
        placement: (LADO[pedido] ?? pedido) as Placement,
        distance: DISTANCIA_EM * em,
        flip: true,
        shift: true,
        flipPadding: em / 2,
        shiftPadding: em / 2,
        strategy: 'fixed',
      });
      if (!r) return;
      Object.assign(this.#pop.style, { top: `${r.top}px`, left: `${r.left}px` });
      const lado = r.placement.split('-')[0]!;
      this.#pop.dataset.lado = lado;
      // La flecha apunta al centro del disparador aunque el globo se haya desplazado para caber.
      const vertical = lado === 'top' || lado === 'bottom';
      const centro = vertical ? r.anchor.left + r.anchor.width / 2 - r.viewportLeft : r.anchor.top + r.anchor.height / 2 - r.viewportTop;
      const largo = vertical ? r.popupSize.width : r.popupSize.height;
      const margen = MARGEN_FLECHA_EM * em;
      this.#arrow.style.setProperty('--_flecha', `${Math.min(largo - margen, Math.max(margen, centro))}px`);
    }

    #bindTrigger(): void {
      const id = this.getAttribute('for');
      if (!id) return;
      const root = this.getRootNode() as Document | ShadowRoot;
      this.#trigger = root.getElementById?.(id) ?? document.getElementById(id);
      if (!this.#trigger) return;
      this.#trigger.addEventListener('click', this.#onTriggerClick);
      this.#trigger.setAttribute('aria-haspopup', 'dialog');
      this.#trigger.setAttribute('aria-expanded', String(this.#abierto));
    }

    #unbindTrigger(): void {
      this.#trigger?.removeEventListener('click', this.#onTriggerClick);
      this.#trigger = null;
    }

    #syncMessage(): void {
      const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="message"]')!;
      const texto = this.shadowRoot!.querySelector<HTMLElement>('.message-text')!;
      texto.textContent = slot.assignedNodes().length > 0 ? '' : (this.getAttribute('message') ?? '');
    }

    #syncBotones(): void {
      const aceptar = this.shadowRoot!.querySelector<HTMLElement>('.confirm')!;
      const cancelar = this.shadowRoot!.querySelector<HTMLElement>('.cancel')!;
      aceptar.setAttribute('color', this.getAttribute('color') || 'brand');
      aceptar.textContent = this.getAttribute('confirm-label') || 'Aceptar';
      cancelar.textContent = this.getAttribute('cancel-label') || 'Cancelar';
    }
  }

  defineElement('iswc-popconfirm', IswcPopconfirm, 'IswcPopconfirm');
})();
