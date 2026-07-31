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
 * genérico: drag de nodos con snap, emisión de eventos `is-layout-change`,
 * persistencia opcional en sessionStorage/localStorage y editor inline para
 * label/color. Lo componentes lo invocan desde su `connectedCallback` cuando
 * `mode === "edit"`.
 */

const STORAGE_PREFIX = 'is-diagram:';

/** Carga overrides persistidos (posición/color/label) si el modo lo permite. */
export function loadOverrides(host, key) {
  if (!key) return null;
  const persist = host.getAttribute('persist') || 'none';
  if (persist === 'none') return null;
  try {
    const store = persist === 'session' ? sessionStorage : localStorage;
    const raw = store.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[diagram-edit] override load failed', err);
    return null;
  }
}

export function saveOverrides(host, key, data) {
  if (!key) return;
  const persist = host.getAttribute('persist') || 'none';
  if (persist === 'none') return;
  try {
    const store = persist === 'session' ? sessionStorage : localStorage;
    store.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.warn('[diagram-edit] override save failed', err);
  }
}

export function clearOverrides(host, key) {
  if (!key) return;
  const persist = host.getAttribute('persist') || 'none';
  if (persist === 'none') return;
  try {
    const store = persist === 'session' ? sessionStorage : localStorage;
    store.removeItem(STORAGE_PREFIX + key);
  } catch (err) {
    /* ignore */
  }
}

/**
 * Emite un CustomEvent burbujeante y cancelable para notificar cambios.
 * El detalle incluye `nodes` (overrideMap) y `edges` (overrideMap) para que
 * el desarrollador pueda sincronizar a su backend o mantener estado.
 */
export function emitLayoutChange(host, detail) {
  host.dispatchEvent(
    new CustomEvent('is-layout-change', {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

/**
 * Aplica overrides persistidos a un layout recién calculado.
 *
 *   overrides = {
 *     nodes: { [id]: { x?, y?, label?, hue? } },
 *     edges: { [id]: { label?, hue? } },
 *   }
 *
 * Solo pisa lo que el override trae definido. Si el nodo ha sido reposicionado
 * (x/y presentes) se respeta la posición y se omite el algoritmo de layout
 * automático para ese nodo (caller debe comprobar).
 */
export function applyOverrides(layout, overrides) {
  if (!overrides) return layout;
  if (overrides.nodes) {
    for (const n of layout.nodes ?? []) {
      const o = overrides.nodes[n.id];
      if (!o) continue;
      if (Number.isFinite(o.x)) n.x = o.x;
      if (Number.isFinite(o.y)) n.y = o.y;
      if (typeof o.label === 'string') n.label = o.label;
      if (Number.isFinite(o.hue)) n.hue = o.hue;
    }
  }
  if (overrides.edges) {
    for (const e of layout.edges ?? layout.relations ?? []) {
      const o = overrides.edges[e.id];
      if (!o) continue;
      if (typeof o.label === 'string') e.label = o.label;
      if (Number.isFinite(o.hue)) e.hue = o.hue;
    }
  }
  return layout;
}

/**
 * Snapping de coordenadas al grid del diagrama (8px por defecto).
 * Importado dinámicamente para evitar dependencias circulares.
 */
export function snap(value, grid = 8) {
  return Math.round(value / grid) * grid;
}

/**
 * Instala un drag de nodo sobre un elemento SVG. Devuelve un destructor.
 *
 *   onMove: (deltaX, deltaY) => void    — llamado durante el drag
 *   onEnd:  () => void                  — al soltar (snap final)
 *
 * El drag se activa con pointerdown sobre un nodo y termina en pointerup
 * global. Usa `setPointerCapture` para no perder el puntero fuera del nodo.
 */
export function attachNodeDrag(el, onMove, onEnd) {
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let active = false;

  function down(evt) {
    if (evt.button !== 0) return;
    active = true;
    startX = evt.clientX;
    startY = evt.clientY;
    lastX = evt.clientX;
    lastY = evt.clientY;
    el.setPointerCapture?.(evt.pointerId);
    el.classList.add('is-dragging');
    evt.stopPropagation();
  }

  function move(evt) {
    if (!active) return;
    const dx = evt.clientX - lastX;
    const dy = evt.clientY - lastY;
    lastX = evt.clientX;
    lastY = evt.clientY;
    onMove(dx, dy, evt.clientX - startX, evt.clientY - startY);
  }

  function up(evt) {
    if (!active) return;
    active = false;
    el.releasePointerCapture?.(evt.pointerId);
    el.classList.remove('is-dragging');
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
export function openInlineEditor({ anchor, initial = {}, onSave, onCancel }) {
  closeInlineEditor();
  const host = document.createElement('div');
  host.className = 'is-diagram-editor';
  host.style.cssText = `
    position: fixed;
    left: ${Math.round(anchor.x)}px;
    top: ${Math.round(anchor.y)}px;
    z-index: 10000;
    background: var(--is-bg-elev, #1f2937);
    color: var(--is-text, #e2e8f0);
    border: 1px solid var(--is-border, rgba(255,255,255,0.2));
    border-radius: 6px;
    padding: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    display: flex;
    gap: 6px;
    align-items: center;
    font: 12px system-ui, sans-serif;
  `;
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.value = initial.label ?? '';
  labelInput.placeholder = 'Etiqueta';
  labelInput.style.cssText = `
    flex: 1;
    min-width: 120px;
    background: transparent;
    color: inherit;
    border: 1px solid var(--is-border, rgba(255,255,255,0.2));
    border-radius: 4px;
    padding: 4px 6px;
    font: inherit;
  `;
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = initial.hue != null ? hslToHex(initial.hue, 70, 50) : '#475569';
  colorInput.style.cssText = `
    width: 32px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--is-border, rgba(255,255,255,0.2));
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  `;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✓';
  saveBtn.style.cssText = btnStyle();
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.style.cssText = btnStyle();

  function commit() {
    const hue = hexToHsl(colorInput.value);
    onSave?.({ label: labelInput.value.trim(), hue });
    closeInlineEditor();
  }
  function abort() {
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
  function outsideClose(e) {
    if (!host.contains(e.target)) abort();
  }

  return host;
}

export function closeInlineEditor() {
  document.querySelectorAll('.is-diagram-editor').forEach((el) => el.remove());
}

function btnStyle() {
  return `
    width: 28px;
    height: 28px;
    border: 1px solid var(--is-border, rgba(255,255,255,0.2));
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 14px;
  `;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
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
