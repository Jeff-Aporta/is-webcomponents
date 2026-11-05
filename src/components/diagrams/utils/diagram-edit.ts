/**
 * Helpers de edición para diagramas SVG (modo lectura / edición).
 *
 * API común a todos los diagramas:
 *   - Atributos:
 *       mode="read" | "edit"            (default: read)
 *       persist="none" | "session" | "local"   (default: none)
 *   - Cada diagrama expone:
 *       onNodePointerDown(evt, node)    — handler instalado por el componente
 *       onEdgePointerDown(evt, edge)    — idem
 *       rebuildLayout()                 — recalcula layout con overrides
 *
 * El helper `installDiagramEditMode(host, ctx)` se encarga del cableado
 * genérico: drag de nodos con snap, emisión de eventos `iswc-layout-change`,
 * persistencia opcional en sessionStorage/localStorage y editor inline para
 * label/color. Lo componentes lo invocan desde su `connectedCallback` cuando
 * `mode === "edit"`.
 */

import { readIswc, writeIswc } from '@jeff-aporta/iswc-base/core/iswc-storage.js';
import type { DiagramOverrides, LayoutChangeDetail, NodeDragMove, NodeDragEnd, NodeDragDestroy, OpenInlineEditorOpts } from "@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-edit.schemas.js";
const STORAGE_PREFIX = 'diagram:';

/** Override parcial por nodo (posición / label / hue). */

/** Override parcial por arista (label / hue). */

/** Mapa de overrides: `id → override`. */

/** Forma persistida de los overrides. */

/** Anclaje en coordenadas de pantalla. */

/** Carga overrides persistidos (posición/color/label) si el modo lo permite. */
export function loadOverrides(host: HTMLElement, key: string): DiagramOverrides | null {
  if (!key) return null;
  const persist = host.getAttribute('persist') || 'none';
  if (persist === 'none') return null;
  try {
    const raw = readIswc(STORAGE_PREFIX + key, persist === 'session' ? 'session' : 'local');
    return raw ? JSON.parse(raw) as DiagramOverrides : null;
  } catch (err) {
    console.warn('[diagram-edit] override load failed', err);
    return null;
  }
}

export function saveOverrides(host: HTMLElement, key: string, data: DiagramOverrides): void {
  if (!key) return;
  const persist = host.getAttribute('persist') || 'none';
  if (persist === 'none') return;
  if (!writeIswc(STORAGE_PREFIX + key, JSON.stringify(data), persist === 'session' ? 'session' : 'local')) console.warn('[diagram-edit] override save failed');
}

/** Detalle del evento `iswc-layout-change`. */

/**
 * Emite un CustomEvent burbujeante y cancelable para notificar cambios.
 * El detalle incluye `nodes` (overrideMap) y `edges` (overrideMap) para que
 * el desarrollador pueda sincronizar a su backend o mantener estado.
 */
export function emitLayoutChange(host: HTMLElement, detail: LayoutChangeDetail): void {
  host.dispatchEvent(
    new CustomEvent('iswc-layout-change', {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

/** Nodo del layout con `id` y los campos que `applyOverrides` pisa. */

/** Arista del layout con `id` y los campos que `applyOverrides` pisa. */

/** Callback que recibe el delta desde el último move del drag. */

/** Callback al soltar el drag. */

/** Destructor del drag: quita los listeners. */

/**
 * Instala un drag de nodo sobre un elemento SVG. Devuelve un destructor.
 *
 *   onMove: (deltaX, deltaY) => void    — llamado durante el drag
 *   onEnd:  () => void                  — al soltar (snap final)
 *
 * El drag se activa con pointerdown sobre un nodo y termina en pointerup
 * global. Usa `setPointerCapture` para no perder el puntero fuera del nodo.
 */
export function attachNodeDrag(el: HTMLElement | SVGElement, onMove: NodeDragMove, onEnd?: NodeDragEnd): NodeDragDestroy {
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let active = false;

  function down(evt: Event): void {
    if (!(evt instanceof PointerEvent) || evt.button !== 0) return;
    active = true;
    startX = evt.clientX;
    startY = evt.clientY;
    lastX = evt.clientX;
    lastY = evt.clientY;
    el.setPointerCapture?.(evt.pointerId);
    el.classList.add('iswc-dragging');
    evt.stopPropagation();
  }

  function move(evt: Event): void {
    if (!active || !(evt instanceof PointerEvent)) return;
    const dx = evt.clientX - lastX;
    const dy = evt.clientY - lastY;
    lastX = evt.clientX;
    lastY = evt.clientY;
    onMove(dx, dy, evt.clientX - startX, evt.clientY - startY);
  }

  function up(evt: Event): void {
    if (!active || !(evt instanceof PointerEvent)) return;
    active = false;
    el.releasePointerCapture?.(evt.pointerId);
    el.classList.remove('iswc-dragging');
    onEnd?.();
  }

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}

/**
 * Editor inline flotante (label + color). Se ancla al viewport del diagrama.
 *
 *   anchor: { x, y }   coordenadas de pantalla donde aparecerá el editor
 *   initial: { label?, hue? }
 *   onSave({ label, hue }) | onCancel()
 */
export function openInlineEditor({ anchor, initial = {}, onSave, onCancel }: OpenInlineEditorOpts): HTMLElement {
  closeInlineEditor();
  const host = document.createElement('div');
  host.className = 'iswc-diagram-editor';
  host.style.cssText = `
    position: fixed;
    left: ${Math.round(anchor.x)}px;
    top: ${Math.round(anchor.y)}px;
    z-index: 10000;
    background: var(--iswc-bg-elev, #1f2937);
    color: var(--iswc-text, #e2e8f0);
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .5em;
    padding: .6667em;
    box-shadow: 0 .6667em 2em rgba(0,0,0,0.35);
    display: flex;
    gap: .5em;
    align-items: center;
    font: .75em system-ui, sans-serif;
  `;
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.value = initial.label ?? '';
  labelInput.placeholder = 'Etiqueta';
  labelInput.style.cssText = `
    flex: 1;
    min-width: 10em;
    background: transparent;
    color: inherit;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .3333em;
    padding: .3333em .5em;
    font: inherit;
  `;
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = initial.hue != null ? hslToHex(initial.hue, 70, 50) : '#475569';
  colorInput.style.cssText = `
    width: 2.6667em;
    height: 2.3333em;
    padding: 0;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .3333em;
    background: transparent;
    cursor: pointer;
  `;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✓';
  saveBtn.style.cssText = btnStyle();
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.style.cssText = btnStyle();

  function commit(): void {
    const hue = hexToHsl(colorInput.value);
    onSave?.({ label: labelInput.value.trim(), hue });
    closeInlineEditor();
  }
  function abort(): void {
    onCancel?.();
    closeInlineEditor();
  }

  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', abort);
  labelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') abort();
  });

  host.append(labelInput, colorInput, saveBtn, cancelBtn);
  document.body.appendChild(host);
  labelInput.focus();
  labelInput.select();

  // Cerrar al hacer click fuera
  setTimeout(() => {
    document.addEventListener('pointerdown', outsideClose, { capture: true, once: true });
  }, 0);
  function outsideClose(e: Event): void {
    if (!host.contains(e.target as Node)) abort();
  }

  return host;
}

function closeInlineEditor(): void {
  document.querySelectorAll<HTMLElement>('.iswc-diagram-editor').forEach((el) => el.remove());
}

function btnStyle(): string {
  return `
    width: 2em;
    height: 2em;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .2857em;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 1.1667em;
  `;
}

function hslToHex(h: number, s: number, l: number): string {
  const ss = s / 100;
  const ll = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number): number => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number): string => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex: string): number | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1]!, 16) / 255;
  const g = parseInt(m[2]!, 16) / 255;
  const b = parseInt(m[3]!, 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return h;
}
