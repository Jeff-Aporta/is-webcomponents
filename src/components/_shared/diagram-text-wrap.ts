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

export interface WrapOpts {
  text: string;
  maxWidth: number;        // ancho del nodo en px SVG
  maxHeight: number;       // alto del nodo en px SVG
  fontSize: number;        // px
  fontFamily: string;      // CSS font-family
  lineHeight?: number;     // default 1.2
  paddingX?: number;       // default 10
  paddingY?: number;       // default 8
  overflow: 'grow' | 'ellipsis';
}

export interface WrappedLine {
  text: string;
  truncated: boolean;
}

export interface WrapResult {
  lines: WrappedLine[];
  requiredHeight: number;       // alto total que el texto necesita (con padding)
  requiredHeightUsed: number;   // alto que se va a usar (puede ser < requiredHeight en ellipsis)
  grewHeight: boolean;          // true si requiredHeight > maxHeight y overflow=grow
}

export interface TSpanSpec {
  text: string;
  x: number;
  y: number;
  dy?: number;
  /** Si está presente, el caller debe aplicarlo como atributo
   *  `text-anchor` al `<tspan>` correspondiente. Útil cuando el `<text>`
   *  padre no setea text-anchor (default `start` en SVG) y los tspans
   *  llevan su propio `x`: embebido se renderiza correctamente
   *  centrado en x. Ver bug fix de swimlane-diagram y otros 9 diagramas. */
  textAnchor?: 'start' | 'middle' | 'end';
  /** Si está presente, el caller debe aplicarlo como atributo
   *  `dominant-baseline` al `<tspan>` correspondiente. SVG por defecto
   *  usa `alphabetic` (y = baseline del texto), por lo que para centrar
   *  verticalmente hay que usar `middle` o `central` y poner y al
   *  centro del box. Ver bug fix vertical centering diagramas 2026-09. */
  dominantBaseline?: 'auto' | 'middle' | 'central' | 'hanging' | 'alphabetic' | 'ideographic';
}

// -----------------------------------------------------------------------------
// Medición de texto
// -----------------------------------------------------------------------------

/** Ancho en px que ocupa un caracter promedio en fuentes sans-serif a tamaño
 * dado. Es una aproximación: en runtime se prefiere `getComputedTextLength`. */
const APPROX_CHAR_WIDTH_RATIO = 0.55;

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
    width = text.length * fontSize * APPROX_CHAR_WIDTH_RATIO;
  }
  measureCache.set(key, width);
  return width;
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
  const measure = (s: string): number => defaultMeasureTextWidth(s, fontSize, fontFamily);

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
const DEFAULT_PADDING_Y = 8;
const BASELINE_RATIO = 0.85; // baseline ≈ 0.85 × fontSize por debajo del top

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

/** Construye un `<text>` SVG con tspans ya listos. La primera línea lleva
 *  `y` absoluto; las siguientes llevan `dy` incremental.
 *
 *  Devuelve el `<text>` element pre-armado con `text-anchor` correcto para
 *  que cada tspan (que ya lleva su `x` calculado por `anchorX`) se centre
 *  correctamente. Sin esto, el default SVG es `start` y el texto se
 *  renderiza arrancando en x y extendiéndose a la derecha → descentrado
 *  visible (ver swimlane-diagram: 22-33px offset por nodo).
 *
 *  Uso:
 *    const text = buildTextWithTspans({ lines, box, anchor: 'middle', ... });
 *    g.appendChild(text);
 */
export function buildTextWithTspans(opts: {
  lines: WrappedLine[];
  boxX: number;
  boxY: number;
  boxW: number;
  _boxH: number;
  textAnchor: 'start' | 'middle' | 'end';
  fontSize: number;
  lineHeight: number;
  baseAttrs: Record<string, string | number | null>;
}): { text: SVGTextElement; tspans: TSpanSpec[] } {
  const { lines, boxX, boxY, textAnchor, fontSize, lineHeight, baseAttrs } = opts;
  const x = anchorX(textAnchor, boxX, opts.boxW);
  const firstY = boxY + DEFAULT_PADDING_Y + fontSize * BASELINE_RATIO;
  const dy = fontSize * lineHeight;
  const tspans: TSpanSpec[] = lines.map((line, i) => {
    if (i === 0) return { text: line.text, x, y: firstY };
    return { text: line.text, x, y: firstY, dy };
  });
  // Construye el <text> con text-anchor correcto (el bug que esto evita).
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  for (const [k, v] of Object.entries(baseAttrs)) {
    if (v == null) continue;
    text.setAttribute(k, String(v));
  }
  text.setAttribute('text-anchor', textAnchor);
  return { text, tspans };
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