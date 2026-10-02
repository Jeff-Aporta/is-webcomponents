/**
 * _editor-nesting.ts — Modal overlay recursivo para diagramas anidados.
 *
 * 12 de los 16 editores admiten nesting (er, class, state, mindmap, org-chart,
 * journey, sankey, venn, gantt, quadrant, use-case, component). Las 4
 * posicionales (flowchart, sequence, swimlane, timeline) NO admiten nesting.
 *
 * Mecánica:
 *   1. El usuario hace doble-click en un nodo del editor → el editor llama
 *      a `openNestingModal(host, childSpec, currentDepth, maxDepth)`.
 *   2. Esta función crea un `<div>` overlay + un editor del mismo tipo (mismo
 *      tag que el host, e.g. `<iswc-mindmap-editor>` dentro de un
 *      `<iswc-mindmap-editor>`).
 *   3. El editor hijo reusa toda la lógica de la base (toolbar/panel/eventos).
 *   4. Al hacer Escape, click en backdrop, o evento `iswc-editor-close` del hijo,
 *      el modal se desmonta y devuelve control al padre.
 *
 * Profundidad: se mide como `currentDepth + 1` al abrir y se limita a
 * `maxDepth` (default 5). Al exceder, `openNestingModal` retorna `false` y el
 * editor puede mostrar un toast.
 *
 * Animaciones:
 *   - `prefers-reduced-motion: reduce` → fade skip; modal aparece instantáneo.
 *   - Default: 200ms crossfade + slight scale-in. Sin animaciones de SVG.
 *
 * Eventos del modal:
 *   - `iswc-editor-nesting-open` (detail: { depth, childTag })
 *   - `iswc-editor-nesting-close` (detail: { depth, cancelled: boolean })
 *
 * Cleanup:
 *   - Al cerrar: backdrop element removed, child editor disconnected, todos
 *     los listeners eliminados.
 */

import { emit } from '../../core/element.js';

/** Profundidad máxima permitida (handoff §0, decisión cerrada). */
export const NESTING_DEFAULT_MAX_DEPTH = 5;

/** Eventos emitidos por el sistema de nesting. */
export const NESTING_OPEN_EVENT = 'iswc-editor-nesting-open';
export const NESTING_CLOSE_EVENT = 'iswc-editor-nesting-close';
export const NESTING_REMOTE_CLOSE_EVENT = 'iswc-editor-close';

export interface NestingOpenDetail {
  depth: number;
  childTag: string;
  /** Spec del diagrama hijo. Tipo genérico — la subclase lo estrecha. */
  childSpec: unknown;
}
export interface NestingCloseDetail {
  depth: number;
  cancelled: boolean;
}

/** Opciones del modal de nesting. */
export interface NestingOptions {
  /** Profundidad actual antes de abrir (1 = raíz). Default 1. */
  currentDepth?: number;
  /** Profundidad máxima (incluyendo raíz). Default `NESTING_DEFAULT_MAX_DEPTH`. */
  maxDepth?: number;
  /** Override del tag del editor hijo (útil en tests). */
  childTag?: string;
  /** Si true, el modal NO aparece; sólo se verifica `canNest()`. */
  dryRun?: boolean;
}

const NESTING_CSS = `
.iswc-nesting-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  z-index: 10000;
  /* prefers-reduced-motion disables transition */
  transition: opacity 200ms ease-out;
}
.iswc-nesting-backdrop[data-reduced] { transition: none; }
.iswc-nesting-modal {
  position: relative;
  width: min(90vw, 1100px);
  height: min(85vh, 800px);
  background: var(--iswc-bg, #0c1118);
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.18));
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.iswc-nesting-modal[data-reduced] { transform: none; }
.iswc-nesting-modal {
  transform: scale(0.96);
  transition: transform 200ms ease-out;
}
.iswc-nesting-modal.iswc-shown { transform: scale(1); }
.iswc-nesting-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--iswc-bg-elev, #131a24);
  border-bottom: 1px solid var(--iswc-border, rgba(255,255,255,0.12));
  font-family: var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
  color: var(--iswc-text, #e2e8f0);
  font-size: 12px;
}
.iswc-nesting-toolbar .crumbs {
  flex: 1;
  font-weight: 600;
}
.iswc-nesting-toolbar button {
  appearance: none;
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--iswc-text, #e2e8f0);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font: 11px var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
}
.iswc-nesting-toolbar button:hover { background: rgba(255,255,255,0.06); }
.iswc-nesting-toolbar button:focus-visible { outline: 2px solid var(--iswc-accent, #2563eb); outline-offset: 1px; }
.iswc-nesting-host { flex: 1; min-height: 0; padding: 8px; box-sizing: border-box; }
`;

/** Devuelve true si el editor puede anidar (depth actual + 1 ≤ max). */
export function canNest(opts: NestingOptions = {}): boolean {
  const current = opts.currentDepth ?? 1;
  const max = opts.maxDepth ?? NESTING_DEFAULT_MAX_DEPTH;
  return current < max;
}

/**
 * Abre un modal recursivo con un editor hijo del mismo tipo que el host.
 *
 * @param host El editor padre (`<is-X-editor>`).
 * @param childSpec El spec del nodo que se va a expandir.
 * @param opts.currentDepth Profundidad actual (1 = raíz).
 * @returns El HTMLElement backdrop (o `null` si no se pudo abrir).
 */
export function openNestingModal(host: HTMLElement, childSpec: unknown, opts: NestingOptions = {}): HTMLElement | null {
  const current = opts.currentDepth ?? 1;
  const max = opts.maxDepth ?? NESTING_DEFAULT_MAX_DEPTH;
  if (current >= max) return null;
  if (opts.dryRun) return null;
  const childTag = opts.childTag ?? host.tagName.toLowerCase();
  const reduced = host.matches?.(':host') === false
    ? false
    : typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Backdrop overlay
  const backdrop = document.createElement('div');
  backdrop.className = 'iswc-nesting-backdrop';
  if (reduced) backdrop.setAttribute('data-reduced', '');
  backdrop.style.opacity = '0';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `Nivel ${current + 1} de ${max}: ${childTag}`);

  const modal = document.createElement('div');
  modal.className = 'iswc-nesting-modal';
  if (reduced) modal.setAttribute('data-reduced', '');
  backdrop.appendChild(modal);

  const tb = document.createElement('div');
  tb.className = 'iswc-nesting-toolbar';
  const crumbs = document.createElement('span');
  crumbs.className = 'crumbs';
  crumbs.textContent = `Nivel ${current + 1} / ${max} — ${childTag}`;
  tb.appendChild(crumbs);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Cerrar';
  closeBtn.setAttribute('aria-label', 'Cerrar modal de nesting');
  closeBtn.addEventListener('click', () => closeModal(backdrop, current, true));
  tb.appendChild(closeBtn);
  modal.appendChild(tb);

  // Host del editor hijo
  const childHost = document.createElement('div');
  childHost.className = 'iswc-nesting-host';
  modal.appendChild(childHost);

  // Estilos (los inyectamos una sola vez)
  if (typeof document !== 'undefined' && !document.getElementById('iswc-nesting-style')) {
    const s = document.createElement('style');
    s.id = 'iswc-nesting-style';
    s.textContent = NESTING_CSS;
    document.head.appendChild(s);
  }

  // Crear el editor hijo con su payload = childSpec.
  let childEl: HTMLElement | null = null;
  try {
    const ctor = customElements.get(childTag);
    if (ctor) {
      childEl = new (ctor as CustomElementConstructor)() as unknown as HTMLElement;
      // Si el child es un editor que respeta `payload`, lo asignamos por slot
      // JSON para que la subclase lo lea en `connectedCallback`.
      try {
        const script = document.createElement('script');
        script.type = 'application/json';
        script.textContent = JSON.stringify(childSpec);
        childEl.appendChild(script);
      } catch { /* ignore */ }
      childHost.appendChild(childEl);
    }
  } catch (err) {
    // Si el componente aún no está definido, dejamos el host vacío con un mensaje.
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color: var(--iswc-text-soft); padding: 20px; font: 12px var(--iswc-ui);';
    errDiv.textContent = `Editor hijo "${childTag}" aún no está definido. (${String(err)})`;
    childHost.appendChild(errDiv);
  }

  // Listeners de cierre.
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      closeModal(backdrop, current, true);
    }
  };
  document.addEventListener('keydown', onKey, { capture: true });
  backdrop.addEventListener('click', (ev) => {
    // Sólo cerramos si el click fue en el backdrop, no en el modal.
    if (ev.target === backdrop) closeModal(backdrop, current, true);
  });

  // Si el editor hijo emite `iswc-editor-close`, también cerramos.
  if (childEl) {
    childEl.addEventListener(NESTING_REMOTE_CLOSE_EVENT, () => {
      closeModal(backdrop, current, false);
    });
  }

  // Append & animate.
  document.body.appendChild(backdrop);
  // Crossfade: forzar reflow antes de pasar a opacity=1.
  void backdrop.offsetWidth;
  backdrop.style.opacity = '1';
  modal.classList.add('iswc-shown');
  emit(host, NESTING_OPEN_EVENT, {
    depth: current + 1,
    childTag,
    childSpec,
  } satisfies NestingOpenDetail);

  // Función de cierre locales.
  function teardown(): void {
    document.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions);
    if (childEl && childEl.parentNode) childEl.parentNode.removeChild(childEl);
    childEl = null;
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  }

  // Reemplaza con un cierre "final" que respeta reduced-motion.
  (backdrop as HTMLElement & { __teardown?: () => void }).__teardown = teardown;

  return backdrop;
}

/** Cierra un modal abierto por `openNestingModal`. */
export function closeModal(backdrop: HTMLElement, depth: number, cancelled: boolean): void {
  const teardown = (backdrop as HTMLElement & { __teardown?: () => void }).__teardown;
  backdrop.style.opacity = '0';
  setTimeout(() => {
    teardown?.();
    emit(backdrop, NESTING_CLOSE_EVENT, { depth, cancelled } satisfies NestingCloseDetail);
  }, 200);
}
