/**
 * Motor de posicionamiento anclado (flip / shift / arrow).
 * Sin dependencias — usa getBoundingClientRect + flip/shift.
 */

export const PLACEMENTS = [
  'top', 'top-start', 'top-end',
  'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end',
  'right', 'right-start', 'right-end',
];

const OPPOSITE = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
};

function sideOf(p: string) {
  return p.split('-')[0];
}

function alignOf(p: string) {
  const parts = p.split('-');
  return parts[1] || 'center';
}

function getRect(el) {
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
function* flatAncestors(el) {
  let node = el;
  while (node) {
    let parent = node.parentElement;
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
function isTopLayer(node: HTMLElement) {
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
function fixedContainingBlockRect(el) {
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
function measurePopupSize(popupEl: HTMLElement) {
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
  const size = { width: popupEl.offsetWidth, height: popupEl.offsetHeight };
  popupEl.setAttribute('hidden', '');
  popupEl.style.visibility = prevVis;
  popupEl.style.position = prevPos;
  popupEl.style.top = prevTop;
  popupEl.style.left = prevLeft;
  return size;
}

function viewportBoundary(padding: number = 0) {
  return {
    top: padding,
    left: padding,
    right: window.innerWidth - padding,
    bottom: window.innerHeight - padding,
    width: window.innerWidth - padding * 2,
    height: window.innerHeight - padding * 2,
  };
}

function scrollParentBoundary(el, padding: number = 0) {
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
      };
    }
  }
  return viewportBoundary(padding);
}

function computeCoords(anchor, popup, placement, distance, skidding: number) {
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

function overflowAmount(coords, size, boundary) {
  const right = coords.left + size.width;
  const bottom = coords.top + size.height;
  return Math.max(0, boundary.left - coords.left)
    + Math.max(0, right - boundary.right)
    + Math.max(0, boundary.top - coords.top)
    + Math.max(0, bottom - boundary.bottom);
}

function applyShift(coords, size, boundary, enabled) {
  if (!enabled) return coords;
  let { top, left } = coords;
  if (left < boundary.left) left = boundary.left;
  if (left + size.width > boundary.right) left = boundary.right - size.width;
  if (top < boundary.top) top = boundary.top;
  if (top + size.height > boundary.bottom) top = boundary.bottom - size.height;
  return { ...coords, top, left };
}

function availableSize(coords, size, boundary, autoSize) {
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

function arrowOffset(placement, anchor, popupCoords, popupSize, arrowSize: number, arrowPadding: number, arrowPlacement) {
  const side = sideOf(placement);
  const align = arrowPlacement === 'anchor' ? 'anchor' : arrowPlacement;
  // Cuadrado de lado `arrowSize * 2` (rotado 45° en CSS = rombo). La punta
  // visible es la mitad que asoma fuera del popup: el offset del lado estático
  // debe ser `-arrowSize` (no 0), si no el rombo queda entero detrás del body.
  const side2 = arrowSize * 2;
  const result = { top: '', left: '', right: '', bottom: '' };
  const out = `${-arrowSize}px`;

  if (side === 'top' || side === 'bottom') {
    let x;
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
    let y;
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
 * @param {object} opts
 */
export function computePosition(opts: object) {
  const {
    anchor: anchorRef,
    popupEl,
    placement: preferred = 'top',
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

  const size = measurePopupSize(popupEl);

  const pad = Math.max(flipPadding, shiftPadding, autoSizePadding);
  const bound = boundary === 'scroll'
    ? scrollParentBoundary(popupEl, pad)
    : viewportBoundary(pad);

  // Si la flecha está activa, su mitad exterior ocupa `arrowSize` por encima
  // del borde del popup. Lo añadimos a la `distance` para que la separación
  // entre el cuerpo del popup y el ancla siga siendo la pedida por el usuario.
  const effectiveDistance = arrow ? distance + arrowSize : distance;

  const candidates = [preferred];
  if (flip) {
    const fallbacks = String(flipFallbackPlacements || '')
      .trim()
      .split(/\s+/)
      .filter((p) => PLACEMENTS.includes(p) && p !== preferred);
    if (fallbacks.length) candidates.push(...fallbacks);
    else {
      const opp = `${OPPOSITE[sideOf(preferred)]}${preferred.includes('-') ? `-${alignOf(preferred)}` : ''}`;
      if (PLACEMENTS.includes(opp)) candidates.push(opp);
      for (const p of PLACEMENTS) {
        if (!candidates.includes(p)) candidates.push(p);
      }
    }
  }

  let best = null;
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
    const offsetParent = popupEl.offsetParent || document.documentElement;
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

export function isVirtualElement(v) {
  return v && typeof v.getBoundingClientRect === 'function' && !(v instanceof Element);
}
