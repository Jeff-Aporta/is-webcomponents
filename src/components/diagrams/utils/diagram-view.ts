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
import type { PanZoomView, PanZoomOptions, PanZoomController, EmbedBox, EmbedCapture, EmbedCaptureOpts, EmbedSize, EmbeddedDiagram, NodeEmbedSpec } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-view.schemas.js';
import { DiagramHostLikeSchema, EmbeddedDiagramFileSchema, EmbeddedDiagramSchema, NodeEmbedSpecSchema } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-view.schemas.js';

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

// ── diagram-embed ──
/**
 * diagram-embed.ts — nodos especiales reutilizables (`kind` de nodo):
 * `nested` (diagrama anidado), `tableder` (tabla del DER) y `component`
 * (caja del diagrama de componentes). Contrato en `diagram-embed.schemas.ts`.
 *
 * Parte pura (Deno/tests): lectura del nodo, diagrama efectivo de cada kind y
 * ajuste `contain`. Parte de navegador: monta el web component dueño de la
 * forma fuera de pantalla, espera su render y copia su SVG (vectorial) para
 * pintarlo dentro del nodo del diagrama padre.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Lado máximo por defecto del diagrama anidado dentro de su recuadro (px).
 * 200: una secuencia de 4 lifelines se ve como diagrama (no ícono) sin
 * desbordar la columna del flujo (fijado también en flowchart-lanes.test.ts, N1).
 */
export const NESTED_DEFAULT_MAX = 200;
/**
 * Miembros por sección de una clase incrustada en otro diagrama: el mismo default de toda clase
 * (5); el diagrama anfitrión lo cambia con `classMaxMembers` en su config.
 */
const EMBED_CLASS_MAX_MEMBERS = 5;
/** Tamaño de respaldo de `tableder` / `component` mientras no hay captura. */
export const EMBED_FALLBACK_SIZE: EmbedSize = { w: 180, h: 96 };

/** Lee los campos de nodo especial; `undefined` si el nodo no declara un kind válido. */
export function readNodeEmbed(raw: Record<string, unknown>): NodeEmbedSpec | undefined {
  const r = NodeEmbedSpecSchema.safeParse({
    kind: raw.kind,
    diagram: raw.diagram,
    src: typeof raw.src === 'string' && raw.src.trim() ? raw.src.trim() : undefined,
    bg: typeof raw.bg === 'string' && raw.bg.trim() ? raw.bg.trim() : undefined,
    maxW: raw.maxW,
    maxH: raw.maxH,
    table: raw.table,
    component: raw.component,
    class: raw.class,
  });
  return r.success ? r.data : undefined;
}

/** Diagrama que pinta un nodo especial (sin resolver `src`, que es asíncrono). */
export function embedDiagramOf(spec: NodeEmbedSpec): EmbeddedDiagram | null {
  if (spec.kind === 'tableder') {
    if (!spec.table) return spec.diagram ?? null;
    const id = String(spec.table.id ?? spec.table.name ?? 'tabla');
    return {
      tag: 'iswc-er-diagram',
      payload: { erDiagram: { entities: [{ id, ...spec.table }], relations: [], orphans: false } },
      attrs: spec.diagram?.attrs,
    };
  }
  if (spec.kind === 'component') {
    if (!spec.component) return spec.diagram ?? null;
    const id = String(spec.component.id ?? spec.component.name ?? 'componente');
    return {
      tag: 'iswc-component-diagram',
      payload: { componentDiagram: { components: [{ id, ...spec.component }], links: [] } },
      attrs: spec.diagram?.attrs,
    };
  }
  if (spec.kind === 'class') {
    if (!spec.class) return spec.diagram ?? null;
    const id = String(spec.class.id ?? spec.class.name ?? 'clase');
    // Sin `fill`: el que da el diagrama anfitrión por tipo de entidad (ver coloresDeEntidad); suelta, `service`.
    const fill = spec.class.fill ?? 'service';
    return {
      tag: 'iswc-class-diagram',
      // Caja VP (rellena con `fill`: token del tema o hex; por defecto `service`): una clase suelta
      // transparente no se lee dentro de un flujo.
      // Dentro de otro diagrama la clase es un resumen: hasta `classMaxMembers` miembros por sección y un renglón «N más».
      payload: { classDiagram: { classes: [{ id, ...spec.class, fill }], relations: [], layout: { boxStyle: 'vp', maxMembers: spec.classMaxMembers ?? EMBED_CLASS_MAX_MEMBERS } } },
      attrs: spec.diagram?.attrs,
    };
  }
  return spec.diagram ?? null;
}

/** true si el kind se dibuja a tamaño natural (sin recuadro ni escala). */
export function embedIsNatural(spec: NodeEmbedSpec): boolean {
  return spec.kind === 'tableder' || spec.kind === 'component' || spec.kind === 'class';
}

/** `object-fit: contain`: escala `src` para caber en `max` conservando la proporción. */
export function fitContain(src: EmbedSize, max: EmbedSize): EmbedSize {
  const k = Math.min(max.w / src.w, max.h / src.h);
  return { w: Math.max(1, src.w * k), h: Math.max(1, src.h * k) };
}

/** Caja máxima del anidado según el nodo (por defecto `NESTED_DEFAULT_MAX` por lado). */
export function nestedMaxSize(spec: NodeEmbedSpec): EmbedSize {
  return { w: spec.maxW ?? NESTED_DEFAULT_MAX, h: spec.maxH ?? NESTED_DEFAULT_MAX };
}

/* ───────────────────────── navegador ───────────────────────── */

/**
 * URL del bundle que define `tag`: `script` (relativo a la raíz del CDN) o, por defecto, `diagrams/<tag>.min.mjs`.
 * Publicado (`.mjs`) el código de quien captura puede vivir en `diagrams/` o en un chunk de `_chunks/`, ambos a un
 * nivel de `dist/cdn/`: por eso se resuelve desde la raíz y no como hermano. Desde fuente, hermano `.js`.
 */
function embedScriptUrl(diagram: EmbeddedDiagram, moduleUrl: string): string {
  if (diagram.script) return new URL(diagram.script, new URL('../', moduleUrl)).href;
  const name = diagram.tag.replace(/^iswc-/, '');
  if (/\.mjs(\?|#|$)/.test(moduleUrl)) return new URL(`../diagrams/${name}.min.mjs`, moduleUrl).href;
  return new URL(`./${name}.js`, moduleUrl).href;
}

/** Diagrama efectivo de un nodo: carga `src` si lo hay; si falla, usa el inline. */
export async function resolveEmbedDiagram(spec: NodeEmbedSpec): Promise<EmbeddedDiagram | null> {
  const inline = embedDiagramOf(spec);
  if (!spec.src || typeof fetch === 'undefined') return inline;
  try {
    const base = typeof document !== 'undefined' ? document.baseURI : undefined;
    const res = await fetch(new URL(spec.src, base).href);
    if (!res.ok) return inline;
    const file = EmbeddedDiagramFileSchema.parse(await res.json());
    const tag = file.tag ?? inline?.tag ?? 'iswc-flowchart';
    // Formato del ISS (`payload` adentro) o payload suelto.
    const payload = file.payload !== undefined ? file.payload : file;
    return EmbeddedDiagramSchema.parse({ tag, payload, script: file.script ?? inline?.script, attrs: file.attrs ?? inline?.attrs });
  } catch {
    return inline;
  }
}

async function ensureDefined(diagram: EmbeddedDiagram, moduleUrl: string): Promise<void> {
  if (customElements.get(diagram.tag)) return;
  await import(embedScriptUrl(diagram, moduleUrl));
  await customElements.whenDefined(diagram.tag);
}

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

/** Prefija ids y sus referencias (`url(#…)`, `href="#…"`) para no chocar con el padre. */
function prefixIds(svg: SVGSVGElement, prefix: string): string {
  const ids = [...svg.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean);
  let html = svg.innerHTML;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html
      .replace(new RegExp(`id="${esc}"`, 'g'), `id="${prefix}${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${prefix}${id})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${prefix}${id}"`);
  }
  return html;
}

/** Acota los selectores `svg …` de los `<style>` copiados al svg anidado. */
function scopeStyles(html: string, scope: string): string {
  return html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open: string, css: string, close: string) =>
    open + css.replace(/(^|[{},]\s*)svg(?=[\s{,.:[])/g, `$1svg.${scope}`) + close);
}

/**
 * Monta el diagrama fuera de pantalla dentro de `stage`, espera su render y
 * devuelve su SVG listo para incrustar. El host temporal se retira al final.
 */
export async function captureEmbeddedDiagram(
  stage: HTMLElement,
  diagram: EmbeddedDiagram,
  opts: EmbedCaptureOpts,
): Promise<EmbedCapture | null> {
  await ensureDefined(diagram, opts.moduleUrl);
  const el = document.createElement(diagram.tag);
  for (const [k, v] of Object.entries(diagram.attrs ?? {})) el.setAttribute(k, v);
  if (opts.styleName && !el.hasAttribute('diagram-style')) el.setAttribute('diagram-style', opts.styleName);
  Object.assign(el.style, { display: 'block', width: '1200px' });
  stage.appendChild(el);
  try {
    const host = DiagramHostLikeSchema.safeParse(el);
    Reflect.set(el, 'payload', diagram.payload);
    if (host.success) await host.data.updateComplete();
    // Los diagramas re-maquetan cuando llega su webfont: dos frames y otra espera.
    await frame();
    await frame();
    if (host.success) await host.data.updateComplete();
    const svg = el.shadowRoot?.querySelector('svg');
    if (!(svg instanceof SVGSVGElement) || !svg.childElementCount) return null;
    const bb = svg.getBBox();
    if (!(bb.width > 1 && bb.height > 1)) return null;
    const pad = 1;
    const scope = `${opts.idPrefix}scope`;
    return {
      markup: scopeStyles(prefixIds(svg, opts.idPrefix), scope),
      box: { x: bb.x - pad, y: bb.y - pad, w: bb.width + pad * 2, h: bb.height + pad * 2 },
      scope,
    };
  } finally {
    el.remove();
  }
}

/** Etapa fuera de pantalla (una por shadow root) donde se montan los diagramas a capturar. */
export function embedStage(root: ShadowRoot): HTMLElement {
  const previa = root.querySelector<HTMLElement>(':scope > .iswc-embed-stage');
  if (previa) return previa;
  const stage = document.createElement('div');
  stage.className = 'iswc-embed-stage';
  stage.setAttribute('aria-hidden', 'true');
  Object.assign(stage.style, { position: 'absolute', left: '-30000px', top: '0', width: '1200px', visibility: 'hidden', pointerEvents: 'none' });
  root.appendChild(stage);
  return stage;
}

/**
 * Resuelve (`src` o inline) y captura el diagrama de un nodo especial, con
 * tope de tiempo: un bundle o un `src` caídos dan `null` (marco punteado), no
 * congelan el render.
 */
export async function captureNodeEmbed(stage: HTMLElement, spec: NodeEmbedSpec, opts: EmbedCaptureOpts, ms = 15000): Promise<EmbedCapture | null> {
  try {
    const diagram = await resolveEmbedDiagram(spec);
    if (!diagram) return null;
    const tope = new Promise<null>((r) => setTimeout(() => r(null), ms));
    return (await Promise.race([captureEmbeddedDiagram(stage, diagram, opts), tope])) ?? null;
  } catch {
    return null;
  }
}

/** `<svg>` anidado con el diagrama capturado, encajado (contain) en `box`. */
export function embedSvgElement(capture: EmbedCapture, box: EmbedBox): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('x', String(box.x));
  svg.setAttribute('y', String(box.y));
  svg.setAttribute('width', String(box.w));
  svg.setAttribute('height', String(box.h));
  const b = capture.box;
  svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('overflow', 'hidden');
  svg.setAttribute('class', `iswc-embed ${capture.scope}`);
  // Se ESCALA entero (viewBox): sin `non-scaling-stroke`, las líneas y sus guiones se reducen con
  // el diagrama en vez de quedar con el grosor de pantalla del original.
  svg.innerHTML = capture.markup.replace(/\svector-effect="non-scaling-stroke"/g, '');
  return svg;
}
