/**
 * Motor de posicionamiento anclado (estilo Floating UI / wa-popup).
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

function sideOf(p) {
  return p.split('-')[0];
}

function alignOf(p) {
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

function viewportBoundary(padding = 0) {
  return {
    top: padding,
    left: padding,
    right: window.innerWidth - padding,
    bottom: window.innerHeight - padding,
    width: window.innerWidth - padding * 2,
    height: window.innerHeight - padding * 2,
  };
}

function scrollParentBoundary(el, padding = 0) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const s = getComputedStyle(node);
    const ox = s.overflowX;
    const oy = s.overflowY;
    if (/(auto|scroll|overlay)/.test(ox) || /(auto|scroll|overlay)/.test(oy)) {
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
    node = node.parentElement;
  }
  return viewportBoundary(padding);
}

function computeCoords(anchor, popup, placement, distance, skidding) {
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

function arrowOffset(placement, anchor, popupCoords, popupSize, arrowSize, arrowPadding, arrowPlacement) {
  const side = sideOf(placement);
  const align = arrowPlacement === 'anchor' ? 'anchor' : arrowPlacement;
  const result = { top: '', left: '', right: '', bottom: '' };

  if (side === 'top' || side === 'bottom') {
    let x;
    if (align === 'start') x = arrowPadding;
    else if (align === 'end') x = popupSize.width - arrowSize - arrowPadding;
    else if (align === 'center') x = (popupSize.width - arrowSize) / 2;
    else {
      const anchorCenter = anchor.left + anchor.width / 2;
      x = anchorCenter - popupCoords.left - arrowSize / 2;
      x = Math.max(arrowPadding, Math.min(popupSize.width - arrowSize - arrowPadding, x));
    }
    result.left = `${x}px`;
    if (side === 'top') result.bottom = `${-arrowSize / 2}px`;
    else result.top = `${-arrowSize / 2}px`;
  } else {
    let y;
    if (align === 'start') y = arrowPadding;
    else if (align === 'end') y = popupSize.height - arrowSize - arrowPadding;
    else if (align === 'center') y = (popupSize.height - arrowSize) / 2;
    else {
      const anchorCenter = anchor.top + anchor.height / 2;
      y = anchorCenter - popupCoords.top - arrowSize / 2;
      y = Math.max(arrowPadding, Math.min(popupSize.height - arrowSize - arrowPadding, y));
    }
    result.top = `${y}px`;
    if (side === 'left') result.right = `${-arrowSize / 2}px`;
    else result.left = `${-arrowSize / 2}px`;
  }
  return result;
}

/**
 * @param {object} opts
 * @param {Element|{getBoundingClientRect:Function}} opts.anchor
 * @param {HTMLElement} opts.popupEl
 * @param {string} opts.placement
 * @param {number} [opts.distance]
 * @param {number} [opts.skidding]
 * @param {boolean} [opts.flip]
 * @param {string} [opts.flipFallbackPlacements] space-separated
 * @param {'best-fit'|'initial'} [opts.flipFallbackStrategy]
 * @param {number} [opts.flipPadding]
 * @param {boolean} [opts.shift]
 * @param {number} [opts.shiftPadding]
 * @param {''|'horizontal'|'vertical'|'both'} [opts.autoSize]
 * @param {number} [opts.autoSizePadding]
 * @param {'viewport'|'scroll'} [opts.boundary]
 * @param {'absolute'|'fixed'} [opts.strategy]
 * @param {boolean} [opts.arrow]
 * @param {number} [opts.arrowSize]
 * @param {number} [opts.arrowPadding]
 * @param {string} [opts.arrowPlacement]
 */
export function computePosition(opts) {
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

  // Measure natural size
  const wasHidden = popupEl.hasAttribute('hidden');
  if (wasHidden) popupEl.removeAttribute('hidden');
  const prevVis = popupEl.style.visibility;
  popupEl.style.visibility = 'hidden';
  const size = {
    width: popupEl.offsetWidth,
    height: popupEl.offsetHeight,
  };
  popupEl.style.visibility = prevVis;
  if (wasHidden) popupEl.setAttribute('hidden', '');

  const pad = Math.max(flipPadding, shiftPadding, autoSizePadding);
  const bound = boundary === 'scroll'
    ? scrollParentBoundary(popupEl, pad)
    : viewportBoundary(pad);

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
    const coords = computeCoords(anchor, size, p, distance, skidding);
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

  if (!best) best = computeCoords(anchor, size, preferred, distance, skidding);

  if (flip && bestOverflow > 0 && flipFallbackStrategy === 'initial') {
    best = { ...computeCoords(anchor, size, preferred, distance, skidding), placement: preferred };
  }

  best = applyShift(best, size, bound, shift);
  const avail = availableSize(best, size, bound, autoSize);

  // Convert fixed coords → absolute relative to offsetParent if needed
  let top = best.top;
  let left = best.left;
  if (strategy === 'absolute') {
    const offsetParent = popupEl.offsetParent || document.documentElement;
    const parentRect = offsetParent.getBoundingClientRect();
    const parentStyle = getComputedStyle(offsetParent);
    const bl = parseFloat(parentStyle.borderLeftWidth) || 0;
    const bt = parseFloat(parentStyle.borderTopWidth) || 0;
    top = best.top - parentRect.top - bt + (offsetParent.scrollTop || 0);
    left = best.left - parentRect.left - bl + (offsetParent.scrollLeft || 0);
    // For fixed-positioned ancestors / body as offsetParent, use viewport-relative via fixed strategy
    if (offsetParent === document.body || offsetParent === document.documentElement) {
      // Keep viewport coords when using absolute on body — switch to fixed-like top/left
      top = best.top + window.scrollY;
      left = best.left + window.scrollX;
    }
  }

  const arrowPos = arrow
    ? arrowOffset(best.placement, anchor, best, size, arrowSize, arrowPadding, arrowPlacement)
    : null;

  return {
    top,
    left,
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
