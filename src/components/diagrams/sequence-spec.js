/** Especificación y layout SVG de diagramas de secuencia TK (sin Mermaid). */

import {
  applyRectCost,
  blockRect,
  makeCostGrid,
  snapDiagramGrid,
} from '../_shared/diagram-grid.js';
import { routeSequenceHorizontal, routeSequenceSelf } from '../_shared/diagram-astar.js';
import {
  countIconTokens,
  extractLeadingIconToken,
  hasIconJsonSugar,
} from '../_shared/tk-icon-inline.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/** Ancho px estimado de una etiqueta, descontando tokens {{icon}} y sumando su ancho. */
const ICON_INLINE_W = 16;
function diagramLabelW(label) {
  const plain = richTextPlain(label);
  const icons = countIconTokens(label);
  const est = Math.ceil(plain.length * 6.2) + 24 + icons * ICON_INLINE_W;
  return snapDiagramGrid(Math.min(360, Math.max(72, est)));
}

const DEFAULT_HUES = [239, 199, 210];
// Solo iconos presentes en `src/assets/icons`: uno inexistente deja el avatar
// vacío (le pasó a `simple-icons:openai`, que no viaja en el kit).
const DEFAULT_ICONS = ['mdi:account', 'mdi:robot-outline', 'mdi:server', 'mdi:database'];

/** Guía editorial: `log` ≤70 caracteres visibles (`**`, `{{iconify}}` no cuentan). Sin recorte automático. */
export const SEQUENCE_LOG_MAX_VISIBLE = 70;

/** Longitud visible del log — ignora marcado md/html/iconify. */
export function sequenceLogVisibleLength(raw) {
  return richTextPlain(raw).length;
}

/** Normaliza `log`: solo trim; el texto debe ser conciso y completo en BD. */
export function normalizeSequenceLog(raw) {
  const text = String(raw ?? '').trim();
  return text || undefined;
}

/** Normaliza `desc`: sin límite de longitud (md/html/iconify/imágenes). */
export function normalizeSequenceDesc(raw) {
  const text = String(raw ?? '').trim();
  return text || undefined;
}

/** Texto del tooltip hover: `desc` tiene prioridad; `log` solo como fallback. */
export function sequenceMessageTooltipText(m) {
  return normalizeSequenceDesc(m.description) ?? normalizeSequenceLog(m.log);
}

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readActor(raw, i) {
  // Conserva el label COMPLETO (con el sugar) para persistencia round-trip;
  // el ícono líder se extrae al avatar en computeSequenceLayout (display).
  // `name` es alias de `label`: el resto de la categoría nombra así, y un
  // payload con `name` acababa rotulado "Actor 3" sin ningún aviso.
  const rawLabel = String(raw.label ?? raw.name ?? `Actor ${i + 1}`);
  const leading = extractLeadingIconToken(rawLabel);
  return {
    id: String(raw.id ?? `a${i}`),
    label: rawLabel,
    kind: raw.kind ?? 'participant',
    icon: leading?.iconId ?? String(raw.icon ?? DEFAULT_ICONS[i % DEFAULT_ICONS.length]),
    hue: leading?.hue ?? (raw.hue != null ? resolveTkHue(raw) : DEFAULT_HUES[i % DEFAULT_HUES.length]),
  };
}

export function sequenceThemeLight() {
  return {
    text: '#1e293b',
    muted: '#64748b',
    grid: 'rgba(100,116,139,0.28)',
    panel: 'transparent',
    border: 'rgba(100,116,139,0.32)',
    accent: '#475569',
    altFill: 'rgba(99,102,241,0.06)',
    altBorder: 'rgba(99,102,241,0.55)',
    chipFill: 'rgba(255,255,255,0.9)',
    // Etiquetas que van sobre una arista: el fondo tapaba la línea.
    chipFillSoft: 'rgba(255,255,255,0.5)',
    dotText: '#ffffff',
  };
}

export function sequenceThemeDark() {
  return {
    text: '#e2e8f0',
    muted: '#94a3b8',
    grid: 'rgba(148,163,184,0.2)',
    panel: 'transparent',
    border: 'rgba(148,163,184,0.26)',
    accent: '#cbd5e1',
    altFill: 'rgba(129,140,248,0.08)',
    altBorder: 'rgba(129,140,248,0.55)',
    chipFill: 'rgba(13,27,42,0.9)',
    chipFillSoft: 'rgba(13,27,42,0.5)',
    dotText: '#0b1f33',
  };
}

function readMessage(raw, fallbackStep) {
  const log = normalizeSequenceLog(raw.log);
  const description = normalizeSequenceDesc(raw.desc ?? raw.description);
  const group = String(raw.group ?? '') || undefined;
  return {
    id: String(raw.id ?? `m${fallbackStep}`),
    from: String(raw.from ?? ''),
    to: String(raw.to ?? ''),
    label: String(raw.label ?? ''),
    log,
    description,
    group,
    kind: raw.kind ?? 'sync',
    step: Number(raw.step ?? fallbackStep),
  };
}

function readGroups(seq) {
  const raw = seq.groups ?? [];
  if (!raw.length) return undefined;
  return raw.map((g, i) => ({
    id: String(g.id ?? `grp-${i}`),
    name: String(g.name ?? g.label ?? `Grupo ${i + 1}`),
    hue: resolveTkHue(g, DEFAULT_HUES[i % DEFAULT_HUES.length]),
  }));
}

export function sequenceSpecFromPayload(payload) {
  const p = asRecord(payload);
  const seq = asRecord(p.sequence ?? p);
  const rawActors = seq.actors ?? [];
  if (!rawActors.length) return null;

  const actors = rawActors.map(readActor);
  // Contador de fallback ÚNICO para todo el spec (nunca se reinicia entre
  // preamble/alt/epilogue): un `i + 1` local por bloque hacía que dos
  // mensajes sin `id`/`step` explícitos en bloques distintos cayeran en el
  // mismo fallback ("m1" en preamble y "m1" en una rama de `alt`), y el Map
  // de nodos por id (`#msgNodes`) del componente terminaba reutilizando el
  // nodo cacheado de uno para el hover del otro.
  let ordinal = 0;
  const nextMessage = (m) => readMessage(m, ++ordinal);

  const flatMessages = (seq.messages ?? []).map(nextMessage);
  const preamble = flatMessages.length
    ? flatMessages
    : (seq.preamble ?? []).map(nextMessage);

  let alt;
  const rawAlt = asRecord(seq.alt);
  const branches = rawAlt.branches ?? [];
  if (branches.length) {
    alt = {
      branches: branches.map((b) => ({
        condition: String(b.condition ?? ''),
        messages: (b.messages ?? []).map(nextMessage),
      })),
    };
  }

  const epilogue = (seq.epilogue ?? []).map(nextMessage);

  return {
    title: String(seq.title ?? p.title ?? ''),
    subtitle: String(seq.subtitle ?? p.subtitle ?? ''),
    actors,
    groups: readGroups(seq),
    messages: flatMessages.length ? flatMessages : undefined,
    preamble,
    alt,
    epilogue,
  };
}

/** Inline `sequence` gana sobre `preset` (editable en TK_DOC JSON). */
export function resolveSequenceSpec(payload) {
  const inline = sequenceSpecFromPayload(payload);
  if (inline) return inline;
  const preset = String(asRecord(payload).preset ?? '');
  if (preset === 'tk1437191') return tk1437191SequenceSpec();
  if (preset === 'tk1431662') return tk1431662SequenceSpec();
  return null;
}

/** Serializa un mensaje para JSON en BD (`log` + `desc`). */
function sequenceMessageToJson(m) {
  const row = {
    id: m.id,
    from: m.from,
    to: m.to,
    label: m.label,
    step: m.step,
  };
  if (m.kind && m.kind !== 'sync') row.kind = m.kind;
  if (m.log) row.log = normalizeSequenceLog(m.log);
  if (m.description) row.desc = m.description;
  if (m.group) row.group = m.group;
  return row;
}

/** Serializa actor para BD — icono y tono solo en `label` (sugar iconify). */
function sequenceActorToJson(a) {
  const row = { id: a.id, label: a.label };
  if (a.kind && a.kind !== 'participant') row.kind = a.kind;
  return row;
}

/** Spec de secuencia → objeto `sequence` listo para persistir en TK_CONTENT. */
export function sequenceSpecToJson(spec) {
  const seq = { actors: spec.actors.map(sequenceActorToJson) };
  if (spec.title) seq.title = spec.title;
  if (spec.subtitle) seq.subtitle = spec.subtitle;
  if (spec.groups?.length) seq.groups = spec.groups;

  if (spec.messages?.length) {
    seq.messages = spec.messages.map(sequenceMessageToJson);
    return seq;
  }

  if (spec.preamble?.length) seq.preamble = spec.preamble.map(sequenceMessageToJson);
  if (spec.alt?.branches?.length) {
    seq.alt = {
      branches: spec.alt.branches.map((b) => ({
        condition: b.condition,
        messages: b.messages.map(sequenceMessageToJson),
      })),
    };
  }
  if (spec.epilogue?.length) seq.epilogue = spec.epilogue.map(sequenceMessageToJson);
  return seq;
}

/** Payload TK_DOC con `sequence` materializada (presets expandidos, `log` en mensajes). */
export function expandSequencePayloadForJson(payload) {
  const out = { ...payload };
  const spec = resolveSequenceSpec(out);
  if (spec) out.sequence = sequenceSpecToJson(spec);
  return out;
}

/**
 * Payload con los mensajes de los grupos en `hiddenIds` OCULTOS (re-diseña sin esas
 * aristas). Materializa la spec (sin preset). Solo afecta render / `d` / código — no BD.
 */
export function sequencePayloadHideGroups(payload, hiddenIds) {
  if (!hiddenIds || hiddenIds.size === 0) return payload;
  const spec = resolveSequenceSpec(payload);
  if (!spec) return payload;
  const keep = (m) => !m.group || !hiddenIds.has(m.group);
  const filtered = {
    ...spec,
    messages: spec.messages ? spec.messages.filter(keep) : undefined,
    preamble: spec.preamble ? spec.preamble.filter(keep) : undefined,
    epilogue: spec.epilogue ? spec.epilogue.filter(keep) : undefined,
    alt: spec.alt
      ? { branches: spec.alt.branches.map((b) => ({ ...b, messages: b.messages.filter(keep) })) }
      : undefined,
  };
  const out = { ...payload, sequence: sequenceSpecToJson(filtered) };
  delete out.preset;
  return out;
}

/** Quita `icon`/`hue` sueltos de actores — deben ir solo en el sugar del `label`. */
export function compactSequenceActorsInPayload(payload) {
  const seq = asRecord(payload.sequence);
  const rawActors = seq.actors;
  if (!Array.isArray(rawActors)) return payload;
  return {
    ...payload,
    sequence: {
      ...seq,
      actors: rawActors.map((raw, i) => {
        const a = asRecord(raw);
        const spec = readActor(a, i);
        return sequenceActorToJson(spec);
      }),
    },
  };
}

/* ───────────────────────── auto-layout ───────────────────────── */

const LOOP_W = 40;
const LOOP_H = 24;
const ROW_H = 48;
const MIN_GAP = 140;
const LABEL_PAD = 16;
const CHIP_H = 18;

/** Ancho de la caja del actor según su etiqueta (descuenta tokens {{icon}}). */
function actorBoxWidth(label, _kind) {
  const plain = richTextPlain(label);
  const icons = countIconTokens(label);
  // Reserva ~50px para el avatar (icono) + paddings, a la izquierda del label.
  const avatarPad = hasIconJsonSugar(label) ? 16 : 50;
  const est = Math.ceil(plain.length * 6.4) + avatarPad + icons * ICON_INLINE_W;
  return snapDiagramGrid(Math.min(240, Math.max(96, est)));
}

/**
 * Posiciones X de las lifelines. La separación entre columnas se deriva del
 * ancho real de las etiquetas (y de los self-loops), de modo que con el JSON
 * mínimo el diagrama se auto-dimensiona sin solapes ni recortes.
 */
function layoutActorPositions(boxW, flat) {
  const n = boxW.length;
  const selfSide = new Array(n).fill(1);
  if (n <= 1) {
    const x0 = snapDiagramGrid(48 + (boxW[0] ?? 88) / 2);
    return { x: [x0], rightMargin: Math.max((boxW[0] ?? 88) / 2 + 12, 24), selfSide };
  }

  // Espacio que reclama a su derecha el self-loop de cada actor.
  const selfExtent = new Array(n).fill(0);
  for (const f of flat) {
    if (f.kind === 'self') selfExtent[f.fromIdx] = Math.max(selfExtent[f.fromIdx], LOOP_W + 12 + f.labelW);
  }
  // El último actor dibuja su self-loop hacia la izquierda (no hay columna a la derecha).
  selfSide[n - 1] = -1;

  const gaps = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    gaps[i] = Math.max(MIN_GAP, boxW[i] / 2 + boxW[i + 1] / 2 + 24);
    if (selfExtent[i] > 0) gaps[i] = Math.max(gaps[i], selfExtent[i] + 24);
  }
  // El self del último actor va a la izquierda → asegura hueco en el último gap.
  if (selfExtent[n - 1] > 0) gaps[n - 2] = Math.max(gaps[n - 2], selfExtent[n - 1] + 24);

  // Relajación: ensanchar huecos para que las etiquetas multi-columna quepan.
  for (let pass = 0; pass < 2; pass++) {
    const pos = [0];
    for (let i = 1; i < n; i++) pos[i] = pos[i - 1] + gaps[i - 1];
    for (const f of flat) {
      const lo = Math.min(f.fromIdx, f.toIdx);
      const hi = Math.max(f.fromIdx, f.toIdx);
      if (hi <= lo) continue;
      const need = f.labelW + LABEL_PAD;
      const span = pos[hi] - pos[lo];
      if (span < need) {
        const add = (need - span) / (hi - lo);
        for (let i = lo; i < hi; i++) gaps[i] += add;
      }
    }
  }

  const pos = [0];
  for (let i = 1; i < n; i++) pos[i] = pos[i - 1] + gaps[i - 1];
  const leftMargin = 48 + boxW[0] / 2;
  const x = pos.map((p) => snapDiagramGrid(leftMargin + p));
  const rightMargin = Math.max(boxW[n - 1] / 2 + 12, 24);
  return { x, rightMargin, selfSide };
}

export function computeSequenceLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 24 : 16;
  const subtitleY = title ? 44 : 26;

  const actors = spec.actors;
  const idx = new Map(actors.map((a, i) => [a.id, i]));
  // Etiqueta sin el sugar líder (el ícono va al avatar circular).
  const actorLabels = actors.map((a) => extractLeadingIconToken(a.label)?.rest ?? a.label);
  const boxW = actors.map((a, i) => actorBoxWidth(actorLabels[i], a.kind ?? 'participant'));
  const groupHueMap = new Map((spec.groups ?? []).map((gp) => [gp.id, gp.hue]));

  // 1) Aplanar mensajes en orden de render (preamble/messages → alt → epilogue).
  const flat = [];
  const toFlat = (m, branch, branchFirst = false) => {
    const kind = m.kind ?? (m.from === m.to ? 'self' : 'sync');
    const fromIdx = idx.get(m.from) ?? 0;
    const toIdx = idx.get(m.to) ?? fromIdx;
    return { m, kind, fromIdx, toIdx, labelW: diagramLabelW(m.label), branch, branchFirst };
  };
  (spec.messages ?? spec.preamble ?? []).forEach((m) => flat.push(toFlat(m)));
  const altStart = flat.length;
  spec.alt?.branches?.forEach((b) => b.messages.forEach((m, mi) => flat.push(toFlat(m, b.condition, mi === 0))));
  const altEnd = flat.length;
  (spec.epilogue ?? []).forEach((m) => flat.push(toFlat(m)));

  // 2) Posiciones X (auto) y ancho del lienzo.
  const { x: ax, rightMargin, selfSide } = layoutActorPositions(boxW, flat);
  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  // La leyenda se acomoda en grid: máximo 3 filas por columna, y tantas
  // columnas como hagan falta para no invadir el área del último actor.
  // Antes era una columna única apilada, y con 5+ grupos solapaba el último
  // actor del diagrama. Ahora se reparte horizontal y se respeta el ancho
  // del lienzo.
  const LEGEND_MAX_ROWS = 3;
  const LEGEND_GAP_X = 20;
  const legendItemWidths = legendGroups
    ? legendGroups.map((gp) => Math.ceil(gp.name.length * 6) + 30)
    : [];
  const legendCols = legendGroups
    ? Math.max(1, Math.ceil(legendGroups.length / LEGEND_MAX_ROWS))
    : 0;
  const legendColsWidths = Array.from({ length: legendCols }, (_, c) =>
    legendItemWidths.slice(c * LEGEND_MAX_ROWS, (c + 1) * LEGEND_MAX_ROWS).reduce((m, w) => Math.max(m, w), 0),
  );
  const legendW = legendColsWidths.reduce((a, b) => a + b, 0)
    + LEGEND_GAP_X * Math.max(0, legendCols - 1);
  // baseW mide hasta el CENTRO del último actor; hay que sumarle la mitad de
  // su caja para que la leyenda no monte encima de la etiqueta del actor.
  const lastActorBoxHalf = boxW.length ? (boxW[boxW.length - 1] / 2) : 0;
  const baseW = snapDiagramGrid((ax[ax.length - 1] ?? 88) + rightMargin);
  // La leyenda vive a la derecha del último actor, nunca se monta encima.
  // El ancho del lienzo = lo que pide el diagrama + lo que pide la leyenda.
  const W = legendGroups ? baseW + lastActorBoxHalf + legendW + 32 : baseW;
  // legendX devuelve el inicio de la PRIMERA columna. Las siguientes se
  // calculan en el renderer sumando legendColsWidths[i-1] + LEGEND_GAP_X.
  const legendX = legendGroups ? baseW + lastActorBoxHalf + 16 : 0;
  const legendColX = legendColsWidths;

  // 3) Métricas verticales (más aire bajo el subtítulo).
  const headerCenterY = hasHeader ? 100 : 56;
  const lifelineY1 = headerCenterY + 22;
  const messagesTop = snapDiagramGrid(headerCenterY + 58);
  const yAt = (r) => snapDiagramGrid(messagesTop + r * ROW_H);
  const rowCount = flat.length;
  const lifelineY2 = snapDiagramGrid((rowCount ? yAt(rowCount - 1) : lifelineY1 + 40) + 30);
  const H = lifelineY2 + 24;

  const actorLayouts = actors.map((a, i) => ({
    id: a.id,
    x: ax[i],
    y: headerCenterY,
    w: boxW[i],
    label: actorLabels[i],
    icon: a.icon ?? DEFAULT_ICONS[i % DEFAULT_ICONS.length],
    hue: a.hue ?? DEFAULT_HUES[i % DEFAULT_HUES.length],
    kind: a.kind ?? 'participant',
  }));

  // 4) Rejilla de costos: cajas de actor bloqueadas + lifelines con costo suave.
  const g = makeCostGrid(W, H);
  actorLayouts.forEach((a, i) => blockRect(g, a.x - boxW[i] / 2, a.y - 16, boxW[i], 34));
  for (const a of actorLayouts) applyRectCost(g, a.x - 4, lifelineY1, 8, lifelineY2 - lifelineY1, 5, true);

  // 5) Rutear cada mensaje y colocar su etiqueta (registrada como obstáculo).
  const messages = [];
  flat.forEach((f, row) => {
    const y = yAt(row);
    const fromX = ax[f.fromIdx];
    const toX = ax[f.toIdx];
    let labelX;
    let labelY;
    let route;

    if (f.kind === 'self') {
      const side = selfSide[f.fromIdx];
      route = routeSequenceSelf(fromX, y, g, side, LOOP_W, LOOP_H);
      labelX =
        side === 1
          ? snapDiagramGrid(fromX + LOOP_W + 8)
          : snapDiagramGrid(fromX - LOOP_W - 8 - f.labelW);
      labelY = snapDiagramGrid(y - LOOP_H / 2 - CHIP_H / 2);
      applyRectCost(g, Math.min(fromX, fromX + side * LOOP_W), y - LOOP_H, LOOP_W, LOOP_H, 8, true);
    } else {
      route = routeSequenceHorizontal(fromX, toX, y, g);
      labelX = snapDiagramGrid((fromX + toX) / 2 - f.labelW / 2);
      labelY = snapDiagramGrid(y - 24);
    }
    applyRectCost(g, labelX, labelY, f.labelW, CHIP_H, 6, true);

    messages.push({
      id: f.m.id,
      // Siempre el `step` propio del mensaje (ya resuelto en `readMessage`
      // con su fallback ordinal) — nunca un contador compartido que se
      // desincroniza del orden real cuando se mezclan mensajes con y sin
      // `step` explícito entre preamble/alt/epilogue.
      step: f.m.step,
      label: f.m.label,
      log: f.m.log,
      description: f.m.description,
      kind: f.kind,
      y,
      fromX,
      toX,
      path: route.path,
      lineX1: fromX,
      lineX2: toX,
      // Tip exacto en la lifeline destino (horizontal) o el que calcule el
      // router (self). Nunca confiar en un tip “a una celda de distancia”.
      arrowTipX: f.kind === 'self' ? route.arrowTipX : toX,
      arrowTipY: route.arrowTipY ?? y,
      arrowDir: route.arrowDir,
      labelX,
      labelW: f.labelW,
      labelY,
      labelH: CHIP_H,
      branch: f.branch,
      branchFirst: f.branchFirst,
      groupHue: f.m.group ? groupHueMap.get(f.m.group) : undefined,
    });
  });

  // 6) Caja alt (si hay ramas).
  let altBox;
  if (altEnd > altStart) {
    const y1 = yAt(altStart) - 28;
    const y2 = yAt(altEnd - 1) + 26;
    const x0 = ax[0] - boxW[0] / 2 - 8;
    const x1 = ax[ax.length - 1] + boxW[boxW.length - 1] / 2 + 8;
    altBox = { x: x0, y: y1, w: x1 - x0, h: y2 - y1, label: 'alt' };
  }

  const lifelines = actorLayouts.map((a) => ({ id: a.id, x: a.x, y1: lifelineY1, y2: lifelineY2 }));

  return {
    width: W,
    height: H,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    actors: actorLayouts,
    lifelines,
    messages,
    altBox,
    groups: legendGroups,
    legendX,
    legendColX,
    legendMaxRows: LEGEND_MAX_ROWS,
  };
}

/** Mensajes TK-1437191 — `log`: animación tortuga; `desc`: tooltip hover (extendida). */
const TK1437191_SEQUENCE_MESSAGES = [
  {
    id: 'm1',
    group: 'grp-turno',
    from: 'U',
    to: 'A',
    label: 'turno conversación (stream)',
    step: 1,
    log: 'Usuario envía mensaje; Paty responde en stream',
    description:
      'El usuario escribe en el chat del portal. **ISS-AyudasCPIA** atiende el turno en **SSE/stream**: tokens del asistente y evento **`end`** con el slot **`imensaje`**.',
  },
  {
    id: 'm2',
    group: 'grp-turno',
    from: 'A',
    to: 'A',
    label: 'Persiste CONVERSACION_LOG · asigna imensaje',
    kind: 'self',
    step: 2,
    log: 'Backend persiste turno y asigna imensaje',
    description:
      'Se persiste el turno en **`CONVERSACION_LOG`** (usuario + asistente). Al turno del asistente se le asigna **`imensaje`** secuencial dentro de **`iconversacion`**.',
  },
  {
    id: 'm3',
    group: 'grp-hilo',
    from: 'UI',
    to: 'A',
    label: 'GET /api/conversacion/{id}',
    step: 3,
    log: 'Portal solicita la conversación por GET',
    description:
      'El portal PatyIA consulta **`GET /api/conversacion/{iconversacion}`** para reconstruir el hilo visible y preparar la UI de calificación.',
  },
  {
    id: 'm4',
    group: 'grp-hilo',
    from: 'A',
    to: 'UI',
    label: 'mensajesOpenAI[] · fecha_hora · imensaje',
    kind: 'async',
    step: 4,
    log: 'API devuelve hilo con fecha_hora e imensaje',
    description:
      'La API devuelve **`mensajesOpenAI[]`** con **`fecha_hora`** (desde `meta.ts` del log) e **`imensaje`** en cada turno del asistente, habilitando el cruce con **`mensajesCalificados`**.',
  },
  {
    id: 'm5',
    group: 'grp-calif',
    from: 'U',
    to: 'A',
    label: 'POST /api/mensaje · calificar {{thumb-up}}/{{thumb-down}}',
    step: 5,
    log: 'Usuario califica mensaje del asistente',
    description:
      'El usuario califica un mensaje del asistente con {{thumb-up}} o {{thumb-down}}. **`POST /api/mensaje`** envía **`imensaje`**, **`iconversacion`** y **`butil`**.',
  },
  {
    id: 'm6',
    group: 'grp-calif',
    from: 'A',
    to: 'A',
    label: 'Valida imensaje en log · rechaza duplicados',
    kind: 'self',
    step: 6,
    log: 'API valida imensaje y rechaza duplicado',
    description:
      'Se valida que **`imensaje`** exista en el log de la conversación. Un segundo **`POST`** con el mismo par **`(imensaje, iconversacion)`** se rechaza como duplicado.',
  },
  {
    id: 'm7',
    group: 'grp-calif',
    from: 'A',
    to: 'UI',
    label: 'Calificación enlazada al turno Paty',
    kind: 'async',
    step: 7,
    log: 'Calificación queda enlazada al turno Paty',
    description:
      'Tras **GET conversación**, la calificación queda en **`mensajesCalificados`**, enlazada al turno Paty evaluado mediante **`imensaje`**.',
  },
];

/** Spec predefinida TK-1437191 — imensaje + calificación (estilo sequenceDiagram). */
export function tk1437191SequenceSpec() {
  return {
    title: 'Diagrama de secuencia',
    subtitle: 'imensaje · mensajesOpenAI · calificación',
    groups: [
      { id: 'grp-turno', name: 'Turno y persistencia', hue: 239 },
      { id: 'grp-hilo', name: 'Consulta del hilo', hue: 199 },
      { id: 'grp-calif', name: 'Calificación', hue: 38 },
    ],
    actors: [
      { id: 'U', label: '{{iconify: {icon: "mdi:account", hue: 239}}} Usuario', kind: 'actor' },
      { id: 'UI', label: '{{iconify: {icon: "mdi:monitor-dashboard", hue: 199}}} Portal PatyIA', kind: 'participant' },
      { id: 'A', label: '{{iconify: {icon: "mdi:api", hue: 210}}} ISS-AyudasCPIA', kind: 'participant' },
    ],
    messages: TK1437191_SEQUENCE_MESSAGES,
  };
}

/** Spec predefinida TK-1431662 — resolución de modelo por turno. */
export function tk1431662SequenceSpec() {
  return {
    title: 'Resolución del modelo por turno',
    subtitle: 'Clasificación operativa → MODELO en BD → respuesta final',
    actors: [
      { id: 'U', label: 'Usuario', kind: 'actor', icon: 'mdi:account', hue: 215 },
      { id: 'P', label: 'PatyIA', kind: 'participant', icon: 'mdi:robot-outline', hue: 210 },
      { id: 'O', label: 'OpenAI', kind: 'participant', icon: 'simple-icons:openai', hue: 160 },
    ],
    preamble: [
      { id: 'm1', from: 'U', to: 'P', label: 'Mensaje del usuario', step: 1 },
      { id: 'm2', from: 'P', to: 'O', label: 'clasificar · PR_TIPO_CONSULTAS · gpt-4.1-nano', step: 2 },
      { id: 'm3', from: 'O', to: 'P', label: 'tipo_consulta (JSON)', kind: 'async', step: 3 },
      { id: 'm4', from: 'P', to: 'P', label: 'resolverPorTipo · MODELO en BD', kind: 'self', step: 4 },
    ],
    alt: {
      branches: [
        {
          condition: 'MODELO en fila',
          messages: [{ id: 'm5', from: 'P', to: 'O', label: 'responses.create(MODELO)', step: 5 }],
        },
        {
          condition: 'fallback system-prompts',
          messages: [{ id: 'm6', from: 'P', to: 'O', label: 'responses.create(modeloConversacion)', step: 6 }],
        },
      ],
    },
    epilogue: [
      { id: 'm7', from: 'O', to: 'P', label: 'respuesta', kind: 'async', step: 7 },
      { id: 'm8', from: 'P', to: 'P', label: 'log turno · modelo + tokens + costo', kind: 'self', step: 8 },
    ],
  };
}
