import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';

/**
 * Especificación y layout de diagramas de casos de uso (UML), sin Mermaid.
 *
 * Tres primitivas, como en UML:
 *   - actores: monigote fuera del sistema, a izquierda o derecha.
 *   - casos de uso: elipses dentro del límite del sistema.
 *   - relaciones: asociación (línea), «include» / «extend» (punteada con
 *     estereotipo) y generalización (línea con punta hueca).
 *
 * El layout es determinista: los actores se reparten por lado y los casos se
 * apilan en el orden declarado dentro del recuadro del sistema. Igual que en el
 * diagrama de componentes, el autor manda sobre el motor.
 */

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

const ACTOR_W = 96;
const ACTOR_H = 74;
const CASE_H = 46;
const CASE_MIN_W = 130;
const CASE_MAX_W = 230;
const CASE_GAP = 18;
const COL_GAP = 60;
const SYS_PAD = { x: 26, top: 34, bottom: 24 };
const MARGIN = { top: 16, right: 20, bottom: 22, left: 20 };

export const LINK_KINDS = new Set(['association', 'include', 'extend', 'generalization']);

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readActor(raw, i: number) {
  const r = asRecord(raw);
  const side = String(r.side ?? '').toLowerCase();
  return {
    id: String(r.id ?? `a${i}`),
    label: String(r.label ?? r.name ?? r.id ?? `Actor ${i + 1}`),
    side: side === 'right' ? 'right' : 'left',
    // Un actor secundario (sistema externo) se dibuja con trazo punteado.
    external: r.external === true || String(r.kind ?? '') === 'system',
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readCase(raw, i: number) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `uc${i}`),
    label: String(r.label ?? r.name ?? r.id ?? `Caso ${i + 1}`),
    group: String(r.group ?? '') || undefined,
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readLink(raw, i) {
  const r = asRecord(raw);
  const kind = String(r.kind ?? r.type ?? 'association').toLowerCase();
  return {
    id: String(r.id ?? `l${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    kind: LINK_KINDS.has(kind) ? kind : 'association',
    label: String(r.label ?? '').trim() || undefined,
  };
}

function readGroups(src) {
  const raw = src.groups ?? [];
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw.map((g, i: number) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** payload → spec normalizada, o null si no hay casos de uso. */
export function resolveUseCaseSpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.useCase ?? p.useCaseDiagram ?? p);
  const rawCases = src.cases ?? src.useCases ?? [];
  if (!Array.isArray(rawCases) || !rawCases.length) return null;

  const cases = rawCases.map(readCase);
  const actors = (Array.isArray(src.actors) ? src.actors : []).map(readActor);
  const known = new Set([...cases.map((c) => c.id), ...actors.map((a) => a.id)]);
  // Igual que en estados: una relación colgante rompería el layout, se descarta.
  const links = (Array.isArray(src.links ?? src.relations) ? (src.links ?? src.relations) : [])
    .map(readLink)
    .filter((l) => known.has(l.from) && known.has(l.to) && l.from !== l.to);

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    system: String(asRecord(src.system).name ?? src.system ?? '') || undefined,
    groups: readGroups(src),
    actors,
    cases,
    links,
  };
}

/** spec → objeto `useCase` listo para persistir / mostrar en el editor. */
export function useCaseSpecToJson(spec) {
  const out = { actors: [], cases: [], links: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.system) out.system = { name: spec.system };
  if (spec.groups?.length) out.groups = spec.groups;
  out.actors = spec.actors.map((a) => {
    const row = { id: a.id, label: a.label, side: a.side };
    if (a.external) row.external = true;
    if (a.description) row.desc = a.description;
    return row;
  });
  out.cases = spec.cases.map((c) => {
    const row = { id: c.id, label: c.label };
    if (c.group) row.group = c.group;
    if (c.description) row.desc = c.description;
    return row;
  });
  out.links = spec.links.map((l) => {
    const row = { from: l.from, to: l.to };
    if (l.kind !== 'association') row.kind = l.kind;
    if (l.label) row.label = l.label;
    return row;
  });
  if (!out.actors.length) delete out.actors;
  return out;
}

function caseWidth(label) {
  const plain = richTextPlain(label);
  return Math.min(CASE_MAX_W, Math.max(CASE_MIN_W, Math.ceil(plain.length * 6.6) + 34));
}

/** Punto del borde de una elipse en dirección a otro punto. */
function ellipsePoint(node, tx, ty) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx / (node.w / 2), dy / (node.h / 2)) || 1;
  return { x: cx + dx / len, y: cy + dy / len };
}

/** Punto del borde del monigote (caja envolvente) en dirección a otro punto. */
function actorPoint(node, tx, ty) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const side = tx >= cx ? 1 : -1;
  return { x: cx + side * (node.w / 2 - 22), y: cy };
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, actors:Array, cases:Array, links:Array, system:object, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
export function computeUseCaseLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  const left = spec.actors.filter((a) => a.side === 'left');
  const right = spec.actors.filter((a) => a.side === 'right');

  const caseW = Math.max(...spec.cases.map((c) => caseWidth(c.label)));
  const casesH = spec.cases.length * CASE_H + (spec.cases.length - 1) * CASE_GAP;
  const actorsH = Math.max(left.length, right.length) * (ACTOR_H + CASE_GAP);
  const bodyH = Math.max(casesH + SYS_PAD.top + SYS_PAD.bottom, actorsH, 120);

  const leftW = left.length ? ACTOR_W + COL_GAP : 0;
  const rightW = right.length ? ACTOR_W + COL_GAP : 0;
  const sysW = caseW + SYS_PAD.x * 2;

  const originX = MARGIN.left;
  const originY = MARGIN.top + headerH;
  const sysX = originX + leftW;
  const sysY = originY;

  const system = {
    x: sysX,
    y: sysY,
    w: sysW,
    h: bodyH,
    name: spec.system,
    labelX: sysX + sysW / 2,
    labelY: sysY + 20,
  };

  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const casesTop = sysY + SYS_PAD.top + Math.max(0, (bodyH - SYS_PAD.top - SYS_PAD.bottom - casesH) / 2);
  const cases = spec.cases.map((c, i) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    group: c.group,
    hue: c.hue ?? (c.group ? groupHue.get(c.group) : undefined),
    x: sysX + SYS_PAD.x,
    y: casesTop + i * (CASE_H + CASE_GAP),
    w: caseW,
    h: CASE_H,
  }));

  const placeActors = (list, x) => list.map((a, i) => {
    const spread = list.length * (ACTOR_H + CASE_GAP) - CASE_GAP;
    const top = sysY + Math.max(0, (bodyH - spread) / 2);
    return {
      id: a.id,
      label: a.label,
      description: a.description,
      external: a.external,
      hue: a.hue,
      side: a.side,
      x,
      y: top + i * (ACTOR_H + CASE_GAP),
      w: ACTOR_W,
      h: ACTOR_H,
    };
  });
  const actors = [
    ...placeActors(left, originX),
    ...placeActors(right, sysX + sysW + COL_GAP),
  ];

  const byId = new Map([...actors, ...cases].map((n) => [n.id, n]));
  const isActor = new Set(actors.map((a) => a.id));

  const links = spec.links.map((l, i) => {
    const from = byId.get(l.from);
    const to = byId.get(l.to);
    const fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const tc = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
    const a = isActor.has(l.from) ? actorPoint(from, tc.x, tc.y) : ellipsePoint(from, tc.x, tc.y);
    const b = isActor.has(l.to) ? actorPoint(to, fc.x, fc.y) : ellipsePoint(to, fc.x, fc.y);
    const stereotype = l.kind === 'include' ? '«include»' : l.kind === 'extend' ? '«extend»' : undefined;
    return {
      id: l.id ?? `l${i}`,
      from: l.from,
      to: l.to,
      kind: l.kind,
      label: l.label || stereotype,
      stereotype,
      path: `M${a.x},${a.y} L${b.x},${b.y}`,
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      labelX: (a.x + b.x) / 2,
      labelY: (a.y + b.y) / 2 - 6,
      hue: to.hue ?? from.hue,
    };
  });

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const width = originX + leftW + sysW + rightW + MARGIN.right + (legendGroups ? legendW + 16 : 0);
  const height = originY + bodyH + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  assignEdgeHues(links);
  const layout = {
    width,
    height,
    actors,
    cases,
    links,
    system,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
  applyEdgeActorLayout(layout, [
    ...actors.map((a) => ({ x: a.x, y: a.y, w: a.w, h: a.h })),
    ...cases.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })),
  ]);
  return layout;
}
