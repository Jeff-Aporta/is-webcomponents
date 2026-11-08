/**
 * Motor de posicionamiento anclado (flip / shift / arrow).
 * Sin dependencias — usa getBoundingClientRect + flip/shift.
 */
import type { Placement, AnchorLike, Rect, Size, Coords, Boundary, ArrowOffset, ComputePositionOpts, ComputePositionResult, PopupDismissOpciones, Capa, OpcionesCapaModal } from './schemas/position.schemas.js';

export const PLACEMENTS: Placement[] = [
  'top', 'top-start', 'top-end',
  'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end',
  'right', 'right-start', 'right-end',
];

/** Valores admitidos por los componentes: `auto` abre hacia el centro de la pantalla. */
export const PLACEMENTS_AUTO: (Placement | 'auto')[] = [...PLACEMENTS, 'auto'];

const OPPOSITE: Record<'top' | 'bottom' | 'left' | 'right', 'top' | 'bottom' | 'left' | 'right'> = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
};

/**
 * Dirección de apertura: el vector que va del centro del ancla al centro de la pantalla. Abajo a la derecha abre
 * arriba hacia la izquierda (`top-end`); arriba a la izquierda, abajo hacia la derecha (`bottom-start`).
 */
export function placementHaciaCentro(ancla: { top: number; left: number; width: number; height: number }): Placement {
  const lado = ancla.top + ancla.height / 2 > window.innerHeight / 2 ? 'top' : 'bottom';
  const alineado = ancla.left + ancla.width / 2 > window.innerWidth / 2 ? 'end' : 'start';
  return `${lado}-${alineado}`;
}

/** Elemento (real o virtual) del que se puede medir un rectángulo. */

/** Rectángulo medido, normalizado a campos numéricos. */

/** Tamaño popup (w x h). */

/** Coordenadas resultantes de `computeCoords`. */

/** Borde efectivo (rect de viewport / contenedor scroll) en píxeles. */

function sideOf(p: string): string {
  return p.split('-')[0]!;
}

function alignOf(p: string): string {
  const parts = p.split('-');
  return parts[1] || 'center';
}

function getRect(el: AnchorLike | null | undefined): Rect | null {
  if (!el) return null;
  if (typeof el.getBoundingClientRect === 'function') {
    const r = el.getBoundingClientRect();
    return {
      top: r.top, left: r.left, bottom: r.bottom, right: r.right,
      width: r.width, height: r.height, x: r.x ?? r.left, y: r.y ?? r.top,
    };
  }
  return null;
}

/** Ancestros en el flat tree (cruza shadow hosts). */
function* flatAncestors(el: Node): Generator<Element, void, unknown> {
  let node: Node | null = el;
  while (node) {
    let parent: Element | null = node.parentElement;
    if (!parent) {
      const root = node.getRootNode?.();
      if (root instanceof ShadowRoot && root.host) {
        yield root.host;
        node = root.host;
        continue;
      }
      break;
    }
    yield parent;
    node = parent;
  }
}

/** Dialog modal o popover abierto: se pinta en el top layer. */
function isTopLayer(node: Element): boolean {
  try {
    return node.matches(':modal, :popover-open');
  } catch {
    return node.localName === 'dialog' && node.hasAttribute('open');
  }
}

/**
 * Contenedor que atrapa `position: fixed` (transform / filter / etc.).
 * Si hay uno, top/left CSS deben restarse de su getBoundingClientRect.
 */
function fixedContainingBlockRect(el: HTMLElement): Rect | null {
  // El propio popup puede ser el elemento del top layer (un popover), no solo
  // vivir dentro de uno (un dialog modal).
  if (isTopLayer(el)) return null;
  for (const node of flatAncestors(el)) {
    if (!(node instanceof Element) || node === document.documentElement || node === document.body) {
      continue;
    }
    // Un dialog modal / popover corta la cadena: el top layer no hereda el
    // containing block de sus ancestros, así que un transform más arriba no
    // atrapa al popup y `fixed` se resuelve contra el viewport.
    if (isTopLayer(node)) return null;
    const s = getComputedStyle(node);
    const traps =
      (s.transform && s.transform !== 'none')
      || (s.perspective && s.perspective !== 'none')
      || (s.filter && s.filter !== 'none')
      || (s.backdropFilter && s.backdropFilter !== 'none')
      || (s.contain && /(paint|layout|strict|content)/.test(s.contain))
      || /\b(transform|perspective|filter)\b/.test(s.willChange || '');
    if (traps) return getRect(node);
  }
  return null;
}

/** Mide el popup sin flicker (no oculta si ya está visible). */
function measurePopupSize(popupEl: HTMLElement): Size {
  if (!popupEl.hasAttribute('hidden')) {
    return { width: popupEl.offsetWidth, height: popupEl.offsetHeight };
  }
  const prevPos = popupEl.style.position;
  const prevVis = popupEl.style.visibility;
  const prevTop = popupEl.style.top;
  const prevLeft = popupEl.style.left;
  popupEl.removeAttribute('hidden');
  popupEl.style.visibility = 'hidden';
  popupEl.style.position = 'fixed';
  popupEl.style.top = '0';
  popupEl.style.left = '0';
  const size: Size = { width: popupEl.offsetWidth, height: popupEl.offsetHeight };
  popupEl.setAttribute('hidden', '');
  popupEl.style.visibility = prevVis;
  popupEl.style.position = prevPos;
  popupEl.style.top = prevTop;
  popupEl.style.left = prevLeft;
  return size;
}

function viewportBoundary(padding: number = 0): Boundary {
  return {
    top: padding,
    left: padding,
    right: window.innerWidth - padding,
    bottom: window.innerHeight - padding,
    width: window.innerWidth - padding * 2,
    height: window.innerHeight - padding * 2,
    x: padding,
    y: padding,
  };
}

function scrollParentBoundary(el: HTMLElement, padding: number = 0): Boundary {
  for (const node of flatAncestors(el)) {
    if (!(node instanceof Element) || node === document.body) continue;
    const s = getComputedStyle(node);
    const ox = s.overflowX;
    const oy = s.overflowY;
    // `hidden` también recorta (p. ej. demos de stage); sin él shift/flip
    // ignoran el contenedor visual y usan el viewport.
    if (/(auto|scroll|overlay|hidden)/.test(ox) || /(auto|scroll|overlay|hidden)/.test(oy)) {
      const r = node.getBoundingClientRect();
      return {
        top: r.top + padding,
        left: r.left + padding,
        right: r.right - padding,
        bottom: r.bottom - padding,
        width: r.width - padding * 2,
        height: r.height - padding * 2,
        x: r.left + padding,
        y: r.top + padding,
      };
    }
  }
  return viewportBoundary(padding);
}

function computeCoords(anchor: Rect, popup: Size, placement: string, distance: number, skidding: number): Coords {
  const side = sideOf(placement);
  const align = alignOf(placement);
  let top = 0;
  let left = 0;

  if (side === 'top') {
    top = anchor.top - popup.height - distance;
    left = align === 'start' ? anchor.left + skidding
      : align === 'end' ? anchor.right - popup.width + skidding
      : anchor.left + (anchor.width - popup.width) / 2 + skidding;
  } else if (side === 'bottom') {
    top = anchor.bottom + distance;
    left = align === 'start' ? anchor.left + skidding
      : align === 'end' ? anchor.right - popup.width + skidding
      : anchor.left + (anchor.width - popup.width) / 2 + skidding;
  } else if (side === 'left') {
    left = anchor.left - popup.width - distance;
    top = align === 'start' ? anchor.top + skidding
      : align === 'end' ? anchor.bottom - popup.height + skidding
      : anchor.top + (anchor.height - popup.height) / 2 + skidding;
  } else {
    left = anchor.right + distance;
    top = align === 'start' ? anchor.top + skidding
      : align === 'end' ? anchor.bottom - popup.height + skidding
      : anchor.top + (anchor.height - popup.height) / 2 + skidding;
  }

  return { top, left, placement };
}

function overflowAmount(coords: Coords, size: Size, boundary: Boundary): number {
  const right = coords.left + size.width;
  const bottom = coords.top + size.height;
  return Math.max(0, boundary.left - coords.left)
    + Math.max(0, right - boundary.right)
    + Math.max(0, boundary.top - coords.top)
    + Math.max(0, bottom - boundary.bottom);
}

function applyShift(coords: Coords, size: Size, boundary: Boundary, enabled: boolean): Coords {
  if (!enabled) return coords;
  let { top, left } = coords;
  if (left < boundary.left) left = boundary.left;
  if (left + size.width > boundary.right) left = boundary.right - size.width;
  if (top < boundary.top) top = boundary.top;
  if (top + size.height > boundary.bottom) top = boundary.bottom - size.height;
  return { ...coords, top, left };
}

function availableSize(coords: Coords, size: Size, boundary: Boundary, autoSize: '' | 'horizontal' | 'vertical' | 'both'): { width: number | null; height: number | null } {
  if (!autoSize) return { width: null, height: null };
  let width = size.width;
  let height = size.height;
  if (autoSize === 'horizontal' || autoSize === 'both') {
    width = Math.max(0, Math.min(size.width, boundary.right - Math.max(coords.left, boundary.left)));
  }
  if (autoSize === 'vertical' || autoSize === 'both') {
    height = Math.max(0, Math.min(size.height, boundary.bottom - Math.max(coords.top, boundary.top)));
  }
  return { width, height };
}

/** Estilo CSS resuelto para la flecha. */

function arrowOffset(
  placement: string,
  anchor: Rect,
  popupCoords: Coords,
  popupSize: Size,
  arrowSize: number,
  arrowPadding: number,
  arrowPlacement: string,
): ArrowOffset {
  const side = sideOf(placement);
  const align = arrowPlacement === 'anchor' ? 'anchor' : arrowPlacement;
  // Cuadrado de lado `arrowSize * 2` (rotado 45° en CSS = rombo). La punta
  // visible es la mitad que asoma fuera del popup: el offset del lado estático
  // debe ser `-arrowSize` (no 0), si no el rombo queda entero detrás del body.
  const side2 = arrowSize * 2;
  const result: ArrowOffset = { top: '', left: '', right: '', bottom: '' };
  const out = `${-arrowSize}px`;

  if (side === 'top' || side === 'bottom') {
    let x: number;
    if (align === 'start') x = arrowPadding;
    else if (align === 'end') x = popupSize.width - side2 - arrowPadding;
    else if (align === 'center') x = (popupSize.width - side2) / 2;
    else {
      const anchorCenter = anchor.left + anchor.width / 2;
      x = anchorCenter - popupCoords.left - arrowSize;
      x = Math.max(arrowPadding, Math.min(popupSize.width - side2 - arrowPadding, x));
    }
    result.left = `${x}px`;
    // placement top → popup arriba del ancla → flecha en el borde inferior
    if (side === 'top') result.bottom = out;
    else result.top = out;
  } else {
    let y: number;
    if (align === 'start') y = arrowPadding;
    else if (align === 'end') y = popupSize.height - side2 - arrowPadding;
    else if (align === 'center') y = (popupSize.height - side2) / 2;
    else {
      const anchorCenter = anchor.top + anchor.height / 2;
      y = anchorCenter - popupCoords.top - arrowSize;
      y = Math.max(arrowPadding, Math.min(popupSize.height - side2 - arrowPadding, y));
    }
    result.top = `${y}px`;
    if (side === 'left') result.right = out;
    else result.left = out;
  }
  return result;
}

/**
 * Posiciona un popup anclado a un elemento, con flip/shift/arrow opcionales.
 */
export function computePosition(opts: ComputePositionOpts): ComputePositionResult | null {
  const {
    anchor: anchorRef,
    popupEl,
    placement: pedido = 'top',
    distance = 0,
    skidding = 0,
    flip = false,
    flipFallbackPlacements = '',
    flipFallbackStrategy = 'best-fit',
    flipPadding = 0,
    shift = false,
    shiftPadding = 0,
    autoSize = '',
    autoSizePadding = 0,
    boundary = 'viewport',
    strategy = 'absolute',
    arrow = false,
    arrowSize = 8,
    arrowPadding = 10,
    arrowPlacement = 'anchor',
  } = opts;

  const anchor = getRect(anchorRef);
  if (!anchor || !popupEl) return null;

  const preferred = pedido === 'auto' ? placementHaciaCentro(anchor) : pedido;
  const size = measurePopupSize(popupEl);

  const pad = Math.max(flipPadding, shiftPadding, autoSizePadding);
  const bound = boundary === 'scroll'
    ? scrollParentBoundary(popupEl, pad)
    : viewportBoundary(pad);

  // Si la flecha está activa, su mitad exterior ocupa `arrowSize` por encima
  // del borde del popup. Lo añadimos a la `distance` para que la separación
  // entre el cuerpo del popup y el ancla siga siendo la pedida por el usuario.
  const effectiveDistance = arrow ? distance + arrowSize : distance;

  const candidates: string[] = [preferred];
  if (flip) {
    const fallbacks = String(flipFallbackPlacements || '')
      .trim()
      .split(/\s+/)
      .filter((p): p is Placement => PLACEMENTS.includes(p as Placement) && p !== preferred);
    if (fallbacks.length) candidates.push(...fallbacks);
    else {
      const opp = `${OPPOSITE[sideOf(preferred) as 'top' | 'bottom' | 'left' | 'right']}${preferred.includes('-') ? `-${alignOf(preferred)}` : ''}`;
      if (PLACEMENTS.includes(opp as Placement)) candidates.push(opp);
      for (const p of PLACEMENTS) {
        if (!candidates.includes(p)) candidates.push(p);
      }
    }
  }

  let best: Coords | null = null;
  let bestOverflow = Infinity;
  for (const p of candidates) {
    const coords = computeCoords(anchor, size, p, effectiveDistance, skidding);
    const overflow = overflowAmount(coords, size, bound);
    if (overflow < bestOverflow) {
      bestOverflow = overflow;
      best = { ...coords, placement: p };
    }
    if (overflow === 0) {
      best = { ...coords, placement: p };
      break;
    }
  }

  if (!best) best = computeCoords(anchor, size, preferred, effectiveDistance, skidding);

  if (flip && bestOverflow > 0 && flipFallbackStrategy === 'initial') {
    best = { ...computeCoords(anchor, size, preferred, effectiveDistance, skidding), placement: preferred };
  }

  best = applyShift(best, size, bound, shift);
  const avail = availableSize(best, size, bound, autoSize);

  const viewportTop = best.top;
  const viewportLeft = best.left;
  let top = best.top;
  let left = best.left;

  if (strategy === 'fixed') {
    const cb = fixedContainingBlockRect(popupEl);
    if (cb) {
      top = best.top - cb.top;
      left = best.left - cb.left;
    }
  } else {
    const offsetParent: Element = popupEl.offsetParent || document.documentElement;
    const parentRect = offsetParent.getBoundingClientRect();
    const parentStyle = getComputedStyle(offsetParent);
    const bl = parseFloat(parentStyle.borderLeftWidth) || 0;
    const bt = parseFloat(parentStyle.borderTopWidth) || 0;
    if (offsetParent === document.body || offsetParent === document.documentElement) {
      top = best.top + window.scrollY;
      left = best.left + window.scrollX;
    } else {
      top = best.top - parentRect.top - bt + (offsetParent.scrollTop || 0);
      left = best.left - parentRect.left - bl + (offsetParent.scrollLeft || 0);
    }
  }

  const arrowPos = arrow
    ? arrowOffset(best.placement, anchor, best, size, arrowSize, arrowPadding, arrowPlacement)
    : null;

  return {
    top,
    left,
    viewportTop,
    viewportLeft,
    placement: best.placement,
    strategy,
    availableWidth: avail.width,
    availableHeight: avail.height,
    arrow: arrowPos,
    anchor,
    popupSize: size,
  };
}

export function isVirtualElement(v: unknown): boolean {
  return !!v && typeof (v as { getBoundingClientRect?: unknown }).getBoundingClientRect === 'function' && !(v instanceof Element);
}

// ── popup-dismiss ──
/**
 * popup-dismiss.js — el "mientras está abierto" de un popup.
 *
 * Todo panel flotante del kit (iswc-dropdown, iswc-context-menu, y cualquiera que
 * venga) necesita exactamente lo mismo mientras está abierto:
 *
 *   · Escape lo cierra.
 *   · Un pointerdown fuera lo cierra.
 *   · Al hacer scroll o redimensionar, o se recoloca o se cierra.
 *   · Y al cerrar hay que quitar TODOS esos listeners, incluidos los que se
 *     pusieron en `document` y `window`, que sobreviven al elemento.
 *
 * Eso último es lo que hace que valga la pena tenerlo en un sitio: cada
 * componente lo escribía con su propio par `#setupListeners/#teardown`, y
 * basta olvidar un `capture: true` en el remove para dejar un listener global
 * colgado del documento cada vez que se abre el panel.
 *
 * Este módulo NO decide dónde se coloca el panel ni cómo se abre: el anclaje
 * de iswc-dropdown (a un trigger) y el de iswc-context-menu (a las coordenadas
 * del click derecho) son distintos a propósito, y forzarlos al mismo molde
 * complicaría los dos. Aquí solo vive el ciclo de escucha.
 *
 * Uso:
 *
 *   #dismiss = createPopupDismiss(this, {
 *     onEscape:     () => this.close(),
 *     onOutside:    () => this.close(),
 *     onReposition: () => this.#reposition(),   // ya viene con rAF
 *   });
 *
 *   abrir()  { …;  this.#dismiss.attach(); }
 *   cerrar() { …;  this.#dismiss.detach(); }
 */

/**
 * Opciones del ciclo de cierre compartido por iswc-dropdown, iswc-context-menu,
 * iswc-palette-selector y cualquier popup que necesite el patrón "abrir →
 * escuchar Escape/fuera/scroll → cerrar y limpiar".
 */

/**
 * @param host  El componente dueño del popup. Se usa para saber qué es
 *              "dentro" (vía `composedPath`, que sí atraviesa el Shadow DOM:
 *              con `e.target` a secas un click en el panel parecería venir
 *              de fuera).
 * @returns `{ attach, detach, get attached() }`
 */
export function createPopupDismiss(host: HTMLElement, opciones: PopupDismissOpciones = {}) {
  const {
    onEscape,
    onKeydown,
    onOutside,
    onReposition,
    onScroll,
    scrollLock = false,
  } = opciones;
  let enganchado = false;
  let raf = 0;
  let overflowPrevio: string | null = null;

  const alPulsar = (e: KeyboardEvent) => {
    // Con capas apiladas (un select dentro de un dialog) Escape cierra solo la de arriba.
    if (e.key === 'Escape' && esCapaSuperior(host)) onEscape?.();
    onKeydown?.(e);
  };

  const alApuntar = (e: PointerEvent) => {
    // composedPath ve el interior del shadow: sin esto, un pointerdown en el
    // propio panel se leería como "fuera" y lo cerraría al instante.
    if (e.composedPath().includes(host)) return;
    onOutside?.();
  };

  const alMover = () => {
    if (!onReposition) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => onReposition());
  };

  return {
    get attached() { return enganchado; },

    attach() {
      if (enganchado) return;
      enganchado = true;
      apilar({ host, modal: false, cerrar: null, contenedor: null, previo: null, inertes: [], liberados: [] });

      if (onEscape || onKeydown) document.addEventListener('keydown', alPulsar, true);
      if (onOutside) document.addEventListener('pointerdown', alApuntar, true);

      if (scrollLock) {
        overflowPrevio = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      } else {
        // capture: el scroll de un contenedor interno no burbujea hasta
        // window; en fase de captura sí se ve.
        if (onScroll) window.addEventListener('scroll', onScroll, true);
        if (onReposition) {
          window.addEventListener('scroll', alMover, true);
          window.addEventListener('resize', alMover, { passive: true });
        }
      }
    },

    detach() {
      if (!enganchado) return;
      enganchado = false;
      desapilar(host);

      document.removeEventListener('keydown', alPulsar, true);
      document.removeEventListener('pointerdown', alApuntar, true);
      if (onScroll) window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', alMover);
      cancelAnimationFrame(raf);

      if (overflowPrevio !== null) {
        document.documentElement.style.overflow = overflowPrevio;
        overflowPrevio = null;
      }
    },
  };
}

// ── capas ──
/**
 * Pila única de capas del documento (F8, paridad con el `dismissible-stack` de Web Awesome).
 *
 * Flotantes (`createPopupDismiss`) y modales (`abrirCapaModal`) se apilan en orden de apertura: Escape y el clic fuera
 * son SOLO de la capa de arriba, así que un `select` abierto dentro de un `dialog` se cierra primero. Un modal además:
 *
 *   · pone `inert` en los hermanos de cada ancestro del host hasta `<body>` (y lo quita al cerrar solo donde lo puso;
 *     si el host estaba dentro de algo inertizado por un modal anterior, lo libera mientras esté abierto);
 *   · atrapa Tab dentro del contenedor, también a través de los shadow roots de los `iswc-*` que tenga dentro;
 *   · enfoca `inicial`, el primer `[autofocus]` o el primer enfocable, y al cerrar devuelve el foco a quien lo tenía.
 *
 * Lo que tiene `[popover]` (toasts, paneles en la capa superior) no se inertiza.
 */
const CAPAS: Capa[] = [];

const ENFOCABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,[contenteditable=""],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
const NUNCA_INERTE = 'script,style,link,template,[popover]';

/** `true` si `host` es la capa de arriba (o si no hay capas). */
export function esCapaSuperior(host: HTMLElement): boolean {
  const tope = CAPAS[CAPAS.length - 1];
  return !tope || tope.host === host;
}

function apilar(capa: Capa): void {
  desapilar(capa.host, false);
  CAPAS.push(capa);
  if (capa.modal && CAPAS.filter((c) => c.modal).length === 1) document.addEventListener('keydown', alTecladoModal, true);
}

function desapilar(host: HTMLElement, restaurar = true): Capa | null {
  const k = CAPAS.findIndex((c) => c.host === host);
  if (k < 0) return null;
  const [capa] = CAPAS.splice(k, 1);
  if (!CAPAS.some((c) => c.modal)) document.removeEventListener('keydown', alTecladoModal, true);
  if (restaurar && capa?.modal) {
    for (const el of capa.inertes) el.removeAttribute('inert');
    for (const el of capa.liberados) el.setAttribute('inert', '');
  }
  return capa ?? null;
}

/** Elemento con el foco, atravesando shadow roots. */
function enfocado(): Element | null {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

/** Enfocables visibles dentro de `raiz`, en orden de documento, entrando en los shadow roots abiertos. */
function enfocables(raiz: ParentNode, out: HTMLElement[] = []): HTMLElement[] {
  for (const el of raiz.querySelectorAll<HTMLElement>('*')) {
    if (el.closest('[inert]')) continue;
    if (el.matches(ENFOCABLE) && el.getClientRects().length > 0) out.push(el);
    if (el.shadowRoot) enfocables(el.shadowRoot, out);
  }
  return out;
}

/** Enfocables del host: los de su shadow y después los proyectados desde el light DOM. */
function enfocablesDe(host: HTMLElement): HTMLElement[] {
  return host.shadowRoot ? [...enfocables(host.shadowRoot), ...enfocables(host)] : enfocables(host);
}

function alTecladoModal(e: KeyboardEvent): void {
  const tope = CAPAS[CAPAS.length - 1];
  if (!tope?.modal) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    tope.cerrar?.('escape');
    return;
  }
  if (e.key !== 'Tab') return;
  const lista = enfocablesDe(tope.host);
  const actual = enfocado();
  const i = lista.findIndex((el) => el === actual || el.shadowRoot?.contains(actual));
  const fin = lista.length - 1;
  if (fin < 0 || (e.shiftKey ? i <= 0 : i === -1 || i === fin)) {
    e.preventDefault();
    (lista[e.shiftKey ? fin : 0] ?? tope.contenedor ?? tope.host).focus?.();
  }
}

/** Abre `host` como capa modal: `inert` alrededor, trampa de Tab, Escape y foco inicial. Idempotente. */
export function abrirCapaModal(host: HTMLElement, opciones: OpcionesCapaModal): void {
  if (CAPAS.some((c) => c.host === host && c.modal)) return;
  const inertes: Element[] = [];
  const liberados: Element[] = [];
  const previo = enfocado();
  // Sube hasta <body> cruzando los shadow roots (un dialog dentro de otro componente también aísla la página).
  for (let n: Element | null = opciones.inertizar === false ? null : host; n && n !== document.body && n !== document.documentElement; ) {
    if (n.hasAttribute('inert')) {
      n.removeAttribute('inert');
      liberados.push(n);
    }
    const padre = n.parentNode as Element | ShadowRoot | null;
    for (const hermano of padre?.children ?? []) {
      if (hermano === n || hermano.hasAttribute('inert') || hermano.matches(NUNCA_INERTE)) continue;
      hermano.setAttribute('inert', '');
      inertes.push(hermano);
    }
    n = n.parentElement ?? (padre instanceof ShadowRoot ? padre.host : null);
  }
  const contenedor = opciones.contenedor ?? null;
  apilar({ host, modal: true, cerrar: opciones.cerrar, contenedor, previo, inertes, liberados });
  const destino = opciones.inicial ?? host.querySelector<HTMLElement>('[autofocus]') ?? enfocablesDe(host)[0] ?? contenedor ?? host;
  destino.focus?.({ preventScroll: true });
}

/** Cierra la capa modal de `host`: quita el `inert` que puso y devuelve el foco. */
export function cerrarCapaModal(host: HTMLElement): void {
  const capa = desapilar(host);
  const previo = capa?.previo as HTMLElement | null | undefined;
  if (previo?.isConnected) previo.focus?.({ preventScroll: true });
}
