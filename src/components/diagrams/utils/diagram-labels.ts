// @contexto INDICE.md · src/components/diagrams/README.md
/** diagram-text-wrap.ts — helper compartido para los 16 diagramas SVG.
 *
 * Tres funciones públicas:
 *   - `defaultMeasureTextWidth(text, fontSize, fontFamily)` — medición de
 *     ancho de un string en píxeles. Usa `<text>` off-screen en el DOM con
 *     `getComputedTextLength()` (el método canónico en SVG nativo). Cuando
 *     no hay DOM (entorno Node de tests, SSR), cae a un heurístico
 *     proporcional a `fontSize * longitud` para que el helper sea testeable
 *     y usable en build time.
 *   - `wrapText(opts)` — divide un texto en líneas que caben en el ancho del
 *     nodo, soporta `overflow: 'grow' | 'ellipsis'`, quita tokens `{{icon}}`
 *     del cómputo de ancho y respeta palabras más anchas que el nodo (no las
 *     parte; las deja solas en su línea).
 *   - `buildTspans(lines, boxX, boxY, boxW, boxH, anchor, fontSize, lineHeight)`
 *     — convierte las líneas en coordenadas SVG (x + y + dy) listas para
 *     añadir a un `<text>` como `<tspan>` hijos.
 *
 * Los tokens `{{icon-id}}` se quitan antes de medir porque los iconos ocupan
 * ancho fijo (`ICON_INLINE_W = 16` en el consumidor) y se renderizan como
 * `<image>` aparte; contarlos como texto daría wraps falsos.
 *
 * Caveats documentados (no en JSDoc por brevedad):
 *   - El cache de medición es por-globally (un Map estático). Es seguro
 *     porque la métrica de SVG es determinista por fuente/tamaño, no por
 *     navegador, y se asume que `document.fonts.ready` ya resolvió cuando
 *     se llama por primera vez.
 *   - CJK y RTL no se abordan en este spec (sin evidencia de uso actual).
 *   - El heurístico del fallback es solo para tests/build time; en runtime
 *     siempre hay DOM y se usa el método canónico.
 */

// -----------------------------------------------------------------------------
// Tipos públicos (no cambiar — Tasks 2 y 3 dependen de estas firmas)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Medición de texto
// -----------------------------------------------------------------------------

/** Ancho en px que ocupa un caracter promedio en fuentes sans-serif a tamaño
 * dado. Es una aproximación: en runtime se prefiere `getComputedTextLength`. */
import type { WrapOpts, WrappedLine, WrapResult, TSpanSpec } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-labels.schemas.js';
import { ROUTING_COSTS_DEFAULTS } from './diagram-routing.js';
import { pathPoints } from './diagram-edges.js';
import type { EmbedBox } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-view.schemas.js';
import type { FlowLayoutEdge, FlowLayoutNode, FlowPoint } from '@jeff-aporta/iswc-base/components/diagrams/schemas/flowchart-spec.schemas.js';

const APPROX_CHAR_WIDTH_RATIO = 0.55;

/** Estimación de ancho sin DOM: `ratio` em por carácter (0,55 sans-serif genérica; Poppins 500 ≈ 0,6). */
export function estimateTextWidth(text: string, fontSize: number, ratio: number = APPROX_CHAR_WIDTH_RATIO): number {
  return text.length * fontSize * ratio;
}

/** Cache global de mediciones por (fontSize|fontFamily|text). */
const measureCache = new Map<string, number>();

/** Cachea y devuelve la clave de cache para una medición. */
function cacheKey(text: string, fontSize: number, fontFamily: string): string {
  return `${fontSize}|${fontFamily}|${text}`;
}

/** `<svg>` off-screen reusado para todas las mediciones (se crea una sola vez). */
let probeSvg: SVGSVGElement | null = null;
let probeText: SVGTextElement | null = null;

/** Devuelve un `<svg>` off-screen reutilizable, o `null` si no hay DOM. */
function getProbe(): { svg: SVGSVGElement; text: SVGTextElement } | null {
  if (typeof document === 'undefined' || !document.body) return null;
  if (probeSvg && probeText) return { svg: probeSvg, text: probeText };
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
  svg.setAttribute('aria-hidden', 'true');
  // Off-screen pero presente en el documento para que el navegador calcule layout.
  Object.assign(svg.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: '0',
    height: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  const text = document.createElementNS(NS, 'text') as SVGTextElement;
  svg.appendChild(text);
  document.body.appendChild(svg);
  probeSvg = svg;
  probeText = text;
  return { svg, text };
}

/** Mide el ancho de `text` en píxeles usando `<text>` SVG off-screen.
 *  Si no hay DOM, cae a un heurístico `text.length * fontSize * ratio`. */
export function defaultMeasureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
): number {
  if (!text) return 0;
  const key = cacheKey(text, fontSize, fontFamily);
  const cached = measureCache.get(key);
  if (cached !== undefined) return cached;

  const probe = getProbe();
  let width: number;
  if (probe) {
    probe.text.setAttribute('font-family', fontFamily);
    probe.text.setAttribute('font-size', `${fontSize}px`);
    probe.text.textContent = text;
    width = probe.text.getComputedTextLength();
  } else {
    // Fallback heurístico: ~0.55 × fontSize por caracter para sans-serif.
    width = estimateTextWidth(text, fontSize);
  }
  // Solo se cachea con las fuentes ya cargadas: medir con la de respaldo
  // (más estrecha que Poppins) y guardarlo dejaba las notas cortas para siempre.
  if (fuentesListas(fontFamily, fontSize)) measureCache.set(key, width);
  return width;
}

/**
 * ¿La fuente ya está cargada para medir con ella? (fuera del navegador: sí).
 * `fonts.status` no basta: la webfont del tema (Poppins) se pide recién al
 * pintar el SVG, así que en el primer render el set parece «loaded» y se
 * medía con la de respaldo, más estrecha.
 */
function fuentesListas(fontFamily?: string, fontSize = 10): boolean {
  const fonts = typeof document !== 'undefined' ? (document as Document & { fonts?: FontFaceSet }).fonts : undefined;
  if (!fonts) return true;
  if (fonts.status !== 'loaded') return false;
  if (!fontFamily) return true;
  try { return fonts.check(`${fontSize}px ${fontFamily}`); } catch { return true; }
}

/** Pide la webfont (normal y negrita) y resuelve cuando está lista para medir. */
export function cargarFuente(fontFamily: string, fontSize = 10): Promise<unknown> {
  const fonts = typeof document !== 'undefined' ? (document as Document & { fonts?: FontFaceSet }).fonts : undefined;
  if (!fonts) return Promise.resolve();
  return Promise.all([
    fonts.load(`${fontSize}px ${fontFamily}`),
    fonts.load(`700 ${fontSize}px ${fontFamily}`),
  ]).then(() => fonts.ready).catch(() => undefined);
}

// -----------------------------------------------------------------------------
// Wrap de texto
// -----------------------------------------------------------------------------

/** Quita tokens `{{algo}}` (iconos inline) del texto a medir. */
function stripIconTokens(text: string): string {
  return text.replace(/\{\{[^}]+\}\}/g, '');
}

/** Greedy word-wrap que devuelve un array de strings (palabras, sin
 *  particiones). Una palabra más ancha que `availableWidth` queda sola en su
 *  línea (no se rompe). */
function greedyWrap(plainText: string, availableWidth: number, measure: (s: string) => number): string[] {
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = measure(candidate);
    if (!current || w <= availableWidth) {
      current = candidate;
    } else {
      // La palabra suelta cabe sola en la línea anterior → cerramos y abrimos
      // nueva con la palabra actual. Si ni siquiera la palabra suelta cabe,
      // la dejamos igualmente (se desbordará visualmente).
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Trunca `line` para que `line + '…'` quepa en `availableWidth`. Si la línea
 *  sola ya excede, devuelve la línea entera + '…'. */
function ellipsizeLine(line: string, availableWidth: number, measure: (s: string) => number): string {
  const ellipsisWidth = measure('…');
  const budget = availableWidth - ellipsisWidth;
  if (budget <= 0 || measure(line) <= availableWidth) {
    return `${line}…`;
  }
  // Quitar palabras del final hasta que entre. Conservamos al menos 1 palabra.
  const words = line.split(/\s+/);
  for (let i = words.length; i > 1; i--) {
    const candidate = words.slice(0, i).join(' ');
    if (measure(candidate) <= budget) {
      return `${candidate}…`;
    }
  }
  // Ni una palabra entra sola: truncamos por caracter.
  let trimmed = words[0] ?? line;
  while (trimmed.length > 0 && measure(trimmed) > budget) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/** Divide el texto en líneas que caben en el nodo, respetando padding y
 *  soporte de `grow` vs `ellipsis`. */
export function wrapText(opts: WrapOpts): WrapResult {
  const {
    text,
    maxWidth,
    maxHeight,
    fontSize,
    fontFamily,
    overflow,
  } = opts;

  const lineHeight = opts.lineHeight ?? 1.2;
  const paddingX = opts.paddingX ?? 10;
  const paddingY = opts.paddingY ?? 8;

  const lineHeightPx = fontSize * lineHeight;
  const availableWidth = Math.max(1, maxWidth - paddingX * 2);
  const availableHeight = Math.max(lineHeightPx, maxHeight - paddingY * 2);
  const maxLines = Math.max(1, Math.floor(availableHeight / lineHeightPx));

  // Medición: si hay tokens `{{icon}}` se quitan antes.
  const plainText = stripIconTokens(text);
  const measure = opts.measure ?? ((s: string): number => defaultMeasureTextWidth(s, fontSize, fontFamily));

  // Greedy wrap del texto plano.
  const rawLines = plainText.length === 0
    ? ['']
    : greedyWrap(plainText, availableWidth, measure);

  if (rawLines.length <= maxLines) {
    // Cabe entero.
    const lines: WrappedLine[] = rawLines.map((l) => ({ text: l, truncated: false }));
    const requiredHeight = paddingY * 2 + rawLines.length * lineHeightPx;
    return {
      lines,
      requiredHeight,
      requiredHeightUsed: requiredHeight,
      grewHeight: requiredHeight > maxHeight,
    };
  }

  // No cabe: aplica la política de overflow.
  if (overflow === 'grow') {
    const lines: WrappedLine[] = rawLines.map((l) => ({ text: l, truncated: false }));
    const requiredHeight = paddingY * 2 + rawLines.length * lineHeightPx;
    return {
      lines,
      requiredHeight,
      requiredHeightUsed: requiredHeight,
      grewHeight: requiredHeight > maxHeight,
    };
  }

  // overflow === 'ellipsis': truncamos a maxLines y marcamos la última.
  const kept = rawLines.slice(0, Math.max(1, maxLines));
  const lastIndex = kept.length - 1;
  kept[lastIndex] = ellipsizeLine(kept[lastIndex], availableWidth, measure);
  const lines: WrappedLine[] = kept.map((l, i) => ({
    text: l,
    truncated: i === lastIndex,
  }));
  const requiredHeight = paddingY * 2 + rawLines.length * lineHeightPx;
  const requiredHeightUsed = paddingY * 2 + kept.length * lineHeightPx;
  return {
    lines,
    requiredHeight,
    requiredHeightUsed,
    grewHeight: false,
  };
}

// -----------------------------------------------------------------------------
// buildTspans
// -----------------------------------------------------------------------------

const DEFAULT_PADDING_X = 10;
// baseline ≈ 0.85 × fontSize por debajo del top

/** Coordenadas X según el text-anchor solicitado. El padding X por defecto
 *  (10) coincide con el de `wrapText`. */
function anchorX(
  anchor: 'start' | 'middle' | 'end',
  boxX: number,
  boxW: number,
  paddingX: number = DEFAULT_PADDING_X,
): number {
  if (anchor === 'start') return boxX + paddingX;
  if (anchor === 'end') return boxX + boxW - paddingX;
  return boxX + boxW / 2;
}

/** Construye specs de `<tspan>` listas para un `<text>` SVG. La primera
 *  línea lleva `y` absoluto; las siguientes llevan `dy` incremental.
 *
 *  Centrado horizontal: si `textAnchor === 'middle'` (o `'end'`), incluye
 *  `textAnchor` en cada spec para que el caller lo aplique al `<tspan>`
 *  correspondiente. El default SVG del `<text>` es `start`, y los tspans
 *  (que llevan su propio `x`) heredan ese anchor — el texto se renderiza
 *  arrancando en x y extendiéndose a la derecha, descentrado. Aplicando
 *  `text-anchor` en cada tspan, el texto se centra en su x.
 *
 *  Centrado vertical: por defecto, SVG pone `y` en la BASELINE del texto
 *  (no en el centro), por lo que poner `y = boxY + boxH/2` deja el texto
 *  visualmente desplazado hacia arriba por ~`fontSize * 0.35`. El fix es
 *  embeber `dominantBaseline: 'middle'` en cada spec y poner `y` al
 *  centro vertical del box (`boxY + boxH/2`). Las líneas siguientes se
 *  posicionan con `dy` relativo al centro (lineHeight * fontSize).
 */
export function buildTspans(
  lines: WrappedLine[],
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  textAnchor: 'start' | 'middle' | 'end',
  fontSize: number,
  lineHeight: number,
): TSpanSpec[] {
  const x = anchorX(textAnchor, boxX, boxW);
  // Centro vertical: con dominant-baseline='middle', y es el centro del
  // texto (no la baseline). Para multilinea, la primera linea arranca en
  // `centerY - (n-1)/2 * lineHeight * fontSize` para que el conjunto
  // quede centrado alrededor de centerY.
  const centerY = boxY + boxH / 2;
  const dy = fontSize * lineHeight;
  // Offset inicial: posiciona la primera linea para que el bloque de N
  // lineas quede centrado verticalmente en centerY.
  // Para 1 linea: firstY = centerY.
  // Para 3 lineas: firstY = centerY - dy (la segunda cae sobre centerY, la tercera +dy).
  const firstY = centerY - ((lines.length - 1) / 2) * dy;
  // Solo embebemos textAnchor en el spec si NO es 'start' (el default SVG
  // ya es start; embebido o no, el resultado es el mismo). Esto minimiza
  // cambios para callers que no necesitan el fix.
  const embedAnchor = textAnchor !== 'start';
  // Embebemos dominantBaseline='middle' siempre para centrado vertical.
  return lines.map((line, i) => {
    const base = (i === 0) ? { text: line.text, x, y: firstY } : { text: line.text, x, y: firstY, dy };
    return embedAnchor
      ? { ...base, textAnchor, dominantBaseline: 'middle' }
      : { ...base, dominantBaseline: 'middle' };
  });
}

// ── flowchart-labels ──
/**
 * flowchart-labels — las etiquetas de las aristas como ENTIDADES del layout (estilo iswc).
 *
 * Una etiqueta ocupa una caja y guarda 1U (el paso de la rejilla de ruteo, 15 px) con todo lo demás:
 *   - nodos, insignias y títulos de carriles / grupos (estos empujan pero nunca se mueven),
 *   - las demás etiquetas (nunca se cruzan),
 *   - las aristas ajenas (ningún riel pasa por encima de un texto).
 * Con su arista dueña la regla es otra: va PEGADA a ella (a media U) sin taparla; si al ubicarse
 * cae encima de su propia línea se corre lo justo (≤ 1U) a un costado.
 *
 * Cada etiqueta prueba candidatas a lo largo de su arista (la posición que propuso el ruteo
 * primero, luego cerca del arranque, del final y del centro de cada tramo, a uno y otro lado).
 * Si es larga se parte en un rectángulo de ancho máximo (2 líneas) y, si aun así no cabe, se
 * resume con «…». Lo que no encuentra sitio se devuelve como conflicto: el layout abre espacio
 * (empuja las entidades) y vuelve a rutear.
 */
/** 1U (el paso de la rejilla de ruteo del kit, 15 px): margen de las etiquetas con todo lo que no es su arista. */
export const U = ROUTING_COSTS_DEFAULTS.grid.step;
/** Ancho máximo de una etiqueta antes de partirse (20U). */
const ETIQUETA_MAX_W = 20 * U;
/** Interlineado y distancia a la arista dueña. */
export const ETIQUETA_LINE_H = 12;
/** Ícono de la etiqueta: lado y aire hasta el texto. */
export const ETIQUETA_ICONO = 12;
const ICONO_AIRE = 3;
const PEGADA = U / 2;

const corta = (a: EmbedBox, b: EmbedBox, m = 0): boolean =>
  a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

/** Caja fina de un tramo ortogonal (para medir choques con textos). */
const cajaTramo = (p: FlowPoint, q: FlowPoint): EmbedBox => ({
  x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.max(1, Math.abs(q.x - p.x)), h: Math.max(1, Math.abs(q.y - p.y)),
});

/** Parte un texto en líneas de ancho ≤ `max` (por palabras); más de 2 líneas → 2 con «…». */
function partirEtiqueta(texto: string, max: number, mide: (t: string) => number): string[] {
  if (mide(texto) <= max) return [texto];
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (mide(prueba) <= max || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length <= 2) return lineas;
  return [lineas[0]!, resumir(lineas.slice(1).join(' '), max, mide)];
}

/** Recorta con «…» hasta caber en `max`. */
function resumir(texto: string, max: number, mide: (t: string) => number): string {
  if (mide(texto) <= max) return texto;
  let t = texto;
  while (t.length > 1 && mide(`${t}…`) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Caja de la etiqueta tal como la dejó el ruteo (x/y/anchor de una línea). */
function cajaInicial(e: FlowLayoutEdge, w: number, h: number): EmbedBox {
  const a = e.labelAnchor ?? 'middle';
  const x = a === 'start' ? e.labelX : a === 'end' ? e.labelX - w : e.labelX - w / 2;
  return { x, y: e.labelY - 9.5, w, h };
}

/**
 * Candidatas COHERENTES: el riel pasa por los lados largos de la caja.
 *   - horizontal: a lo largo de un tramo horizontal, encima o debajo, con la caja entera dentro del
 *     tramo (el riel recorre todo su lado largo);
 *   - vertical: a lo largo de un tramo vertical, a la derecha o a la izquierda, igual de contenida.
 * Por tramo (primero, último, resto) y, dentro del tramo, cada 2U desde el arranque.
 */
function candidatas(pts: readonly FlowPoint[], w: number, h: number, vertical: boolean): EmbedBox[] {
  const out: EmbedBox[] = [];
  const orden = [0, pts.length - 2, ...Array.from({ length: Math.max(0, pts.length - 3) }, (_, i) => i + 1)];
  for (const k of [...new Set(orden)].filter((k) => k >= 0)) {
    const p = pts[k]!;
    const q = pts[k + 1]!;
    if (!vertical && p.y === q.y) {
      const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
      for (let x = x0 + U; x + w <= x1 - U; x += 2 * U) {
        out.push({ x, y: p.y - PEGADA - h, w, h }); // encima
        out.push({ x, y: p.y + PEGADA, w, h }); // debajo
      }
    } else if (vertical && p.x === q.x) {
      const [y0, y1] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
      for (let y = y0 + U; y + h <= y1 - U; y += 2 * U) {
        out.push({ x: p.x + PEGADA, y, w, h }); // a la derecha
        out.push({ x: p.x - PEGADA - w, y, w, h }); // a la izquierda
      }
    }
  }
  return out;
}

/** ¿El riel recorre el lado largo de la caja? (horizontal: encima/debajo; vertical: a un costado). */
function coherente(c: EmbedBox, pts: readonly FlowPoint[], vertical: boolean): boolean {
  return pts.slice(1).some((q, k) => {
    const p = pts[k]!;
    if (!vertical && p.y === q.y) {
      const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
      const pegada = Math.abs(c.y + c.h + PEGADA - p.y) <= 1 || Math.abs(c.y - PEGADA - p.y) <= 1;
      return pegada && c.x >= x0 - 0.5 && c.x + c.w <= x1 + 0.5;
    }
    if (vertical && p.x === q.x) {
      const [y0, y1] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
      const pegada = Math.abs(c.x + c.w + PEGADA - p.x) <= 1 || Math.abs(c.x - PEGADA - p.x) <= 1;
      return pegada && c.y >= y0 - 0.5 && c.y + c.h <= y1 + 0.5;
    }
    return false;
  });
}

/**
 * Ubica todas las etiquetas sin choques. Muta cada arista (`labelBox`, `labelLines`, `labelX/Y`,
 * `labelAnchor`, `labelVertical`) y devuelve las que no encontraron sitio (para abrir espacio ahí).
 * `fijos`: cajas que empujan y no se mueven (títulos de carriles y grupos, insignias).
 * Orientación: horizontal (preferencia ISWC); vertical solo si la arista la pide (`labelVertical`
 * en el spec) o si no tiene ningún tramo horizontal. Lo que no cabe abre espacio. Con el emisor y el receptor guarda 3U (si no
 * cabe, 1U).
 */
export function resolverEtiquetas(
  edges: FlowLayoutEdge[],
  nodes: readonly FlowLayoutNode[],
  fijos: readonly EmbedBox[],
  mide: (t: string) => number,
  lienzo: { w: number; h: number },
): Array<{ caja: EmbedBox; edge: number; tramo: 'h' | 'v' }> {
  const tramos = edges.map((e) => {
    const pts = pathPoints(e.path);
    return pts.slice(1).map((q, i) => cajaTramo(pts[i]!, q));
  });
  const ocupadas: EmbedBox[] = [];
  const conflictos: Array<{ caja: EmbedBox; edge: number; tramo: 'h' | 'v' }> = [];
  const cajaDe = (n: FlowLayoutNode): EmbedBox => ({ x: n.x, y: n.y, w: n.w, h: n.h });
  edges.forEach((e, i) => {
    if (!e.label) return;
    const pts = pathPoints(e.path);
    const extremos = nodes.filter((n) => n.id === e.from || n.id === e.to).map(cajaDe);
    const otros = [...nodes.filter((n) => n.id !== e.from && n.id !== e.to).map(cajaDe), ...fijos];
    const libre = (c: EmbedBox, margenExtremos: number): boolean =>
      c.x >= 0 && c.y >= 0 && c.x + c.w <= lienzo.w && c.y + c.h <= lienzo.h
      && !extremos.some((b) => corta(c, b, margenExtremos))
      && !otros.some((b) => corta(c, b, U))
      && !ocupadas.some((b) => corta(c, b, U))
      && !tramos.some((ts, j) => (j === i ? ts.some((t) => corta(c, t, 1)) : ts.some((t) => corta(c, t, U))));
    const pideVertical = e.labelPide === 'vertical';
    // Con ícono, la caja reserva su lado (más el aire) delante del texto.
    const extra = e.labelIcon ? ETIQUETA_ICONO + ICONO_AIRE : 0;
    const horizontales = [partirEtiqueta(e.label, ETIQUETA_MAX_W - extra, mide), [resumir(e.label, ETIQUETA_MAX_W / 2, mide)]];
    const verticales = [[e.label], [resumir(e.label, ETIQUETA_MAX_W / 2, mide)], [resumir(e.label, ETIQUETA_MAX_W / 4, mide)]];
    // ISWC: horizontal siempre; la vertical solo si la arista la pide. Si no cabe, se abre espacio
    // (no se gira ni se recorta una etiqueta que la arista no pidió vertical).
    // Sin ningún tramo horizontal (una recta vertical), lo coherente es vertical: empujar no crea tramos.
    const sinHorizontal = !pts.slice(1).some((q, k) => q.y === pts[k]!.y && q.x !== pts[k]!.x);
    const intentos: Array<{ lineas: string[]; vertical: boolean }> = pideVertical || sinHorizontal
      ? verticales.map((lineas) => ({ lineas, vertical: true }))
      : [{ lineas: horizontales[0]!, vertical: false }];
    let elegida: { caja: EmbedBox; lineas: string[]; vertical: boolean } | null = null;
    let preferida: { caja: EmbedBox; vertical: boolean } | null = null;
    // Orden: horizontal (3U, luego 1U de los extremos) y solo después vertical (3U, 1U).
    const rondas = [false, true].flatMap((v) => [3 * U, U].map((margen) => ({ v, margen })));
    for (const { v, margen } of rondas) {
      for (const { lineas, vertical } of intentos.filter((x) => x.vertical === v)) {
        const largo = Math.ceil(Math.max(...lineas.map(mide))) + 4 + extra;
        const w = vertical ? ETIQUETA_LINE_H : largo;
        const h = vertical ? largo : lineas.length * ETIQUETA_LINE_H;
        // La caja de la pasada anterior primero (si sigue valiendo, no se mueve: determinismo).
        const previa = e.labelBox && Math.abs(e.labelBox.w - w) < 1 && Math.abs(e.labelBox.h - h) < 1 ? [e.labelBox] : [];
        const inicial = vertical ? [] : [cajaInicial(e, w, h)];
        const cands = [...previa, ...inicial, ...candidatas(pts, w, h, vertical)].filter((c) => coherente(c, pts, vertical));
        preferida ??= cands[0] ? { caja: cands[0], vertical } : null;
        const c = cands.find((x) => libre(x, margen));
        if (c) {
          elegida = { caja: c, lineas, vertical };
          break;
        }
      }
      if (elegida) break;
    }
    if (!elegida) {
      // Sin sitio: se abre espacio a lo largo del tramo más largo de la arista (donde cabría horizontal).
      let largoMax = -1;
      let tramo: 'h' | 'v' = 'h';
      let ref: FlowPoint = pts[0] ?? { x: 0, y: 0 };
      pts.slice(1).forEach((q, k) => {
        const p = pts[k]!;
        const l = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
        if (p.y === q.y && l > largoMax) { largoMax = l; tramo = 'h'; ref = { x: Math.min(p.x, q.x), y: p.y }; }
      });
      if (largoMax < 0) { tramo = 'v'; ref = pts[0] ?? ref; }
      const lineas = horizontales[0]!;
      const w = Math.ceil(Math.max(...lineas.map(mide))) + 4 + extra;
      const h = lineas.length * ETIQUETA_LINE_H;
      // Sin sitio limpio: al menos no pisa otro texto (los textos son entidades; nunca se montan).
      const sinTexto = (c: EmbedBox): boolean => !ocupadas.some((o) => corta(c, o, 2));
      // Salida corta (p. ej. del vértice de un rombo): encima del primer tramo, más allá del codo y
      // hacia donde va la arista, para no quedar sobre el emisor.
      const codo: Array<{ caja: EmbedBox; vertical: boolean }> = [];
      if (pts.length >= 3 && pts[0]!.y === pts[1]!.y && pts[0]!.x !== pts[1]!.x) {
        const dx = Math.sign(pts[1]!.x - pts[0]!.x);
        const e1 = pts[1]!;
        codo.push({ caja: { x: dx > 0 ? e1.x + 4 : e1.x - 4 - w, y: e1.y - h - 2, w, h }, vertical: false });
      }
      const cands = [
        ...(preferida ? [preferida] : []),
        ...codo,
        ...candidatas(pts, w, h, false).map((caja) => ({ caja, vertical: false })),
        ...candidatas(pts, ETIQUETA_LINE_H, w, true).map((caja) => ({ caja, vertical: true })),
      ];
      // Primero sin texto ni nodo encima; si no hay, al menos sin texto.
      const sinNodo = (c: EmbedBox): boolean => !nodes.some((n) => corta(c, { x: n.x, y: n.y, w: n.w, h: n.h }, 2));
      const sinChoque = cands.find((c) => sinTexto(c.caja) && sinNodo(c.caja)) ?? cands.find((c) => sinTexto(c.caja));
      if (sinChoque) preferida = sinChoque;
      const caja = preferida?.caja ?? { x: ref.x + U, y: ref.y - PEGADA - h, w, h };
      conflictos.push({ caja, edge: i, tramo });
      elegida = { caja, lineas: preferida?.vertical ? [e.label] : lineas, vertical: !!preferida?.vertical };
    }
    const { caja, lineas, vertical } = elegida;
    e.labelBox = caja;
    e.labelLines = lineas;
    e.labelVertical = vertical || undefined;
    if (vertical) {
      // Girada −90° alrededor de su centro: el texto corre de abajo arriba dentro de la caja.
      // El ícono va abajo (el texto corre de abajo arriba): el texto se centra en el resto.
      e.labelX = caja.x + caja.w - 2;
      e.labelY = caja.y + (caja.h - extra) / 2;
      e.labelAnchor = 'middle';
    } else {
      e.labelX = caja.x + 2 + extra;
      e.labelY = caja.y + 9.5;
      e.labelAnchor = 'start';
    }
    ocupadas.push(caja);
  });
  return conflictos;
}
