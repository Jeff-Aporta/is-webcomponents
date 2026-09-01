/**
 * Motor de layout puro (sin DOM) para diagramas de línea de tiempo (Gantt,
 * timeline). Resuelve fechas, escalas de tiempo, marcas de eje "agradables"
 * y empaquetado de intervalos en carriles (interval partitioning greedy).
 * Sin dependencias externas: se puede testear con Node puro.
 */

const HOUR_MS = 3600000;
const DAY_MS = 86400000;

/** Redondea al múltiplo de 8px más cercano (misma rejilla que node-link-layout). */
function snap8(v: number) {
  return Math.round(v / 8) * 8;
}

/**
 * Convierte un valor de fecha a epoch ms. Acepta `YYYY-MM-DD`,
 * `YYYY-MM-DDTHH:mm` (también con espacio en vez de `T`) y un número epoch.
 * `YYYY-MM-DD` se interpreta como MEDIANOCHE LOCAL (no UTC): en zonas con
 * offset negativo (como Colombia) parsear como UTC desplaza la barra un día.
 * @param {string|number} v
 * @returns {number} epoch ms, o NaN si `v` no es reconocible.
 */
export function parseDate(v: string|number) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const s = String(v ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(s);
  if (!m) return NaN;
  const [, y, mo, d, h, mi] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0), 0, 0);
  return dt.getTime();
}

/**
 * Suma una duración tipo `'3d'`, `'2w'`, `'6h'`, `'1M'` a un epoch ms.
 * d=día, w=semana, h=hora, M=mes calendario (respeta la longitud real del mes).
 * @param {number} startMs
 * @param {string} spec
 * @returns {number} epoch ms, o NaN si `spec` no matchea.
 */
export function addDuration(startMs: number, spec: string) {
  const m = /^(\d+)([dwhM])$/.exec(String(spec ?? '').trim());
  if (!m || !Number.isFinite(startMs)) return NaN;
  const n = Number(m[1]);
  switch (m[2]) {
    case 'h': return startMs + n * HOUR_MS;
    case 'd': return startMs + n * DAY_MS;
    case 'w': return startMs + n * 7 * DAY_MS;
    case 'M': {
      const dt = new Date(startMs);
      dt.setMonth(dt.getMonth() + n);
      return dt.getTime();
    }
    default: return NaN;
  }
}

/**
 * Escala lineal tiempo → píxel. `domain`/`range` son `[min, max]`.
 * @param {[number, number]} domain
 * @param {[number, number]} range
 * @returns {((ms:number)=>number) & {invert:(px:number)=>number}}
 */
export function timeScale([d0, d1], [r0, r1]) {
  const dspan = (d1 - d0) || 1;
  const rspan = r1 - r0;
  const scale = (ms) => r0 + ((ms - d0) / dspan) * rspan;
  scale.invert = (px) => d0 + ((px - r0) / (rspan || 1)) * dspan;
  return scale;
}

function floorHour(ms) { const d = new Date(ms); d.setMinutes(0, 0, 0); return d.getTime(); }
function floorDay(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function floorMonth(ms) { const d = new Date(ms); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); }
function floorYear(ms) { const d = new Date(ms); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addHours(ms, n) { return ms + n * HOUR_MS; }
function addDays(ms, n) { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }
function addMonths(ms, n) { const d = new Date(ms); d.setMonth(d.getMonth() + n); return d.getTime(); }
function addYears(ms, n) { const d = new Date(ms); d.setFullYear(d.getFullYear() + n); return d.getTime(); }

// Pasos candidatos por unidad; step=7 en 'day' da un efecto "semana", step=3
// en 'month' da un efecto "trimestre" — sin duplicar ramas por cada nombre.
function stepCandidates(unit) {
  if (unit === 'hour') return [1, 2, 3, 4, 6, 12];
  if (unit === 'day') return [1, 2, 3, 7, 14];
  if (unit === 'month') return [1, 2, 3, 6];
  return [1, 2, 5, 10, 20, 50];
}

/**
 * Marcas de eje "agradables" entre `minMs` y `maxMs`. Elige la unidad
 * (hora/día/semana/mes/trimestre/año) según el rango total y apunta a
 * `target` marcas. `label` se formatea con `Intl.DateTimeFormat('es-CO')`.
 * `major` es `true` en los límites que merecen una gridline más marcada
 * (p. ej. inicio de mes cuando el paso es por días).
 * @param {number} minMs
 * @param {number} maxMs
 * @param {number} [target]
 * @returns {Array<{ms:number, label:string, major:boolean}>}
 */
export function niceTimeTicks(minMs: number, maxMs: number, target: number = 6) {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) return [];
  const span = maxMs - minMs;

  const fmtHour = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtDay = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' });
  const fmtYear = new Intl.DateTimeFormat('es-CO', { year: 'numeric' });

  let unit;
  if (span <= DAY_MS * 3) unit = 'hour';
  else if (span <= DAY_MS * 400) unit = 'day';
  else if (span <= DAY_MS * 365 * 8) unit = 'month';
  else unit = 'year';

  const approxUnitMs = unit === 'hour' ? HOUR_MS : unit === 'day' ? DAY_MS : unit === 'month' ? DAY_MS * 30 : DAY_MS * 365;
  let bestStep = stepCandidates(unit)[0];
  let bestDiff = Infinity;
  for (const c of stepCandidates(unit)) {
    const diff = Math.abs(span / (approxUnitMs * c) - target);
    if (diff < bestDiff) { bestDiff = diff; bestStep = c; }
  }

  const floorFn = unit === 'hour' ? floorHour : unit === 'day' ? floorDay : unit === 'month' ? floorMonth : floorYear;
  const addFn = unit === 'hour' ? addHours : unit === 'day' ? addDays : unit === 'month' ? addMonths : addYears;
  const fmtFn = unit === 'hour' ? fmtHour : unit === 'day' ? fmtDay : unit === 'month' ? fmtMonth : fmtYear;
  const majorFn = (ms) => {
    const d = new Date(ms);
    if (unit === 'hour') return d.getHours() === 0;
    if (unit === 'day') return d.getDate() === 1;
    if (unit === 'month') return d.getMonth() === 0;
    return true;
  };

  const ticks = [];
  let t = floorFn(minMs);
  let guard = 0;
  while (t <= maxMs && guard < 1000) {
    if (t >= minMs) ticks.push({ ms: t, label: fmtFn.format(new Date(t)), major: majorFn(t) });
    t = addFn(t, bestStep);
    guard += 1;
  }
  return ticks;
}

/**
 * Asigna un carril a cada ítem. Si se da `laneKey`, agrupa por ese campo
 * (un carril por valor distinto, en orden de aparición). Si no, empaqueta
 * codiciosamente por el menor número de carriles tal que ningún par de
 * ítems del mismo carril se solape en el tiempo (interval partitioning:
 * ordena por inicio, coloca cada ítem en el primer carril cuyo último fin
 * sea <= su inicio).
 * @param {Array<{id:string,start:number,end:number,[k:string]:any}>} items
 * @param {{laneKey?:string}} [opts]
 * @returns {Array<Object>} los ítems originales + `lane` (índice numérico).
 */
export function packLanes(items, { laneKey } = {}) {
  if (laneKey) {
    const laneOf = new Map();
    for (const it of items) {
      const k = it[laneKey] ?? '';
      if (!laneOf.has(k)) laneOf.set(k, laneOf.size);
    }
    return items.map((it) => ({ ...it, lane: laneOf.get(it[laneKey] ?? '') }));
  }

  const order = items.map((it, i) => ({ it, i })).sort((a, b) => a.it.start - b.it.start || a.i - b.i);
  const laneEnds = [];
  const laneByIndex = new Map();
  for (const { it, i } of order) {
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end); }
    else laneEnds[lane] = it.end;
    laneByIndex.set(i, lane);
  }
  return items.map((it, i) => ({ ...it, lane: laneByIndex.get(i) }));
}

/**
 * Layout completo: escala de tiempo, carriles y coordenadas px.
 * @param {Array<{id:string,start:number,end:number,[k:string]:any}>} items
 * @param {{width?:number, rowH?:number, rowGap?:number, laneKey?:string, domain?:[number,number]}} [opts]
 * @returns {{items:Array, lanes:Array, width:number, height:number, scale:Function, ticks:Array}}
 */
export function layoutLanes(items, opts = {}) {
  const { width = 800, rowH = 28, rowGap = 6, laneKey, domain: domainOpt } = opts;

  if (!items.length) {
    return { items: [], lanes: [], width, height: 0, scale: timeScale([0, 1], [0, width]), ticks: [] };
  }

  let domain = domainOpt;
  if (!domain) {
    let min = Infinity;
    let max = -Infinity;
    for (const it of items) {
      min = Math.min(min, it.start);
      max = Math.max(max, it.end ?? it.start);
    }
    if (min === max) { min -= DAY_MS; max += DAY_MS; }
    const pad = (max - min) * 0.04;
    domain = [min - pad, max + pad];
  }

  const scale = timeScale(domain, [0, width]);
  const packed = packLanes(items, { laneKey });

  // Un único snap sobre el paso de carril evita que el redondeo por-fila
  // acumule error hasta solapar filas consecutivas.
  const rowStep = Math.max(8, snap8(rowH + rowGap));

  const laneKeys = [];
  const laneLabel = new Map();
  for (const it of packed) {
    if (!laneLabel.has(it.lane)) {
      laneKeys.push(it.lane);
      laneLabel.set(it.lane, laneKey ? String(it[laneKey] ?? '') : `Carril ${it.lane + 1}`);
    }
  }
  laneKeys.sort((a, b) => a - b);
  const laneY = new Map(laneKeys.map((k, i) => [k, i * rowStep]));

  const lanes = laneKeys.map((k) => ({ key: k, label: laneLabel.get(k), y: laneY.get(k), h: rowH }));

  const outItems = packed.map((it) => {
    const x0 = scale(it.start);
    const x1 = scale(it.end ?? it.start);
    return {
      id: it.id,
      x: snap8(x0),
      y: laneY.get(it.lane),
      w: Math.max(8, snap8(x1 - x0)),
      h: rowH,
      lane: it.lane,
    };
  });

  const height = lanes.length ? lanes[lanes.length - 1].y + rowH : 0;
  const ticks = niceTimeTicks(domain[0], domain[1]);

  return { items: outItems, lanes, width, height, scale, ticks };
}
