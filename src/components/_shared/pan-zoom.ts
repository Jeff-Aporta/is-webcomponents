/**
 * pan-zoom.ts — viewport 2D reutilizable (SVG editors / lightbox / canvas).
 *
 * Contrato industria (Figma / Miro / Excalidraw):
 *   - Arrastre 1 dedo / botón izquierdo → PAN (nunca escala).
 *   - Rueda / trackpad scroll → PAN (deltaX/deltaY).
 *   - Ctrl/Meta + rueda, o pinch (browsers marcan ctrlKey) → ZOOM anclado al cursor.
 *   - Botones zoomIn/zoomOut/reset → zoom explícito al centro.
 *
 * El scale permanece estático hasta un gesto de zoom deliberado.
 */

import type { PanZoomView, PanZoomOptions, PanZoomController } from "./pan-zoom.schemas.js";
const DEFAULTS = {
  minScale: 0.3,
  maxScale: 6,
  zoomFactor: 1.12,
  panThresholdPx: 4,
  wheelZooms: false,
};

export function createPanZoom(
  stage: HTMLElement,
  target: HTMLElement,
  opts: PanZoomOptions = {},
): PanZoomController {
  const minScale = opts.minScale ?? DEFAULTS.minScale;
  const maxScale = opts.maxScale ?? DEFAULTS.maxScale;
  const zoomFactor = opts.zoomFactor ?? DEFAULTS.zoomFactor;
  const panThresholdPx = opts.panThresholdPx ?? DEFAULTS.panThresholdPx;
  const wheelZooms = opts.wheelZooms ?? DEFAULTS.wheelZooms;

  const view: PanZoomView = { scale: 1, x: 0, y: 0 };
  let drag: { sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
  let dragged = false;

  const apply = (): void => {
    target.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    opts.onChange?.({ ...view });
  };

  const clampScale = (s: number): number => Math.max(minScale, Math.min(maxScale, s));

  const zoomAt = (factor: number, clientX: number, clientY: number): void => {
    const next = clampScale(view.scale * factor);
    const k = next / view.scale;
    if (k === 1) return;
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    view.x = (clientX - cx) * (1 - k) + view.x * k;
    view.y = (clientY - cy) * (1 - k) + view.y * k;
    view.scale = next;
    apply();
  };

  const zoomBy = (factor: number, clientX?: number, clientY?: number): void => {
    const rect = stage.getBoundingClientRect();
    zoomAt(
      factor,
      clientX ?? rect.left + rect.width / 2,
      clientY ?? rect.top + rect.height / 2,
    );
  };

  const onWheel = (e: WheelEvent): void => {
    const wantsZoom = wheelZooms || e.ctrlKey || e.metaKey;
    if (wantsZoom) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      zoomAt(factor, e.clientX, e.clientY);
      return;
    }
    // Scroll / trackpad → pan. No tocar scale.
    if (e.deltaX === 0 && e.deltaY === 0) return;
    e.preventDefault();
    view.x -= e.deltaX;
    view.y -= e.deltaY;
    apply();
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.abs(dx) < panThresholdPx && Math.abs(dy) < panThresholdPx) return;
    drag.moved = true;
    stage.dataset.panning = '';
    view.x = drag.ox + dx;
    view.y = drag.oy + dy;
    apply();
  };

  const onPointerUp = (): void => {
    dragged = !!drag?.moved;
    if (dragged) opts.onPanEnd?.();
    drag = null;
    delete stage.dataset.panning;
    window.removeEventListener('pointermove', onPointerMove);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    drag = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };

  const onStageClick = (e: MouseEvent): void => {
    if (!dragged) return;
    dragged = false;
    e.stopPropagation();
    e.preventDefault();
  };

  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('click', onStageClick, true);

  apply();

  return {
    get view() { return view; },
    setView(next) {
      if (typeof next.scale === 'number') view.scale = clampScale(next.scale);
      if (typeof next.x === 'number') view.x = next.x;
      if (typeof next.y === 'number') view.y = next.y;
      apply();
    },
    zoomBy,
    reset() {
      view.scale = 1;
      view.x = 0;
      view.y = 0;
      apply();
    },
    apply,
    destroy() {
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('click', onStageClick, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      delete stage.dataset.panning;
    },
  };
}
