import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de mapas de recorrido (user journey), sin Mermaid.
 *
 * Un journey no es una línea de tiempo: además del orden, lleva una MEDIDA por
 * paso (la satisfacción) y un responsable. Por eso vive aparte de
 * `<is-timeline>`: la curva de puntajes es la mitad del mensaje.
 *
 * Escala por defecto 1..5, como en el estándar de journey maps; se puede
 * cambiar con `scale: { min, max }`.
 */

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

const STEP_W = 132;
const PLOT_H = 168;
const PHASE_H = 30;
const MARGIN = { top: 16, right: 24, bottom: 62, left: 54 };

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readPhase(raw, i: number) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `f${i}`),
    name: String(r.name ?? r.label ?? r.id ?? `Fase ${i + 1}`),
    hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
  };
}

function readStep(raw, i: number) {
  const r = asRecord(raw);
  const score = Number(r.score ?? r.value ?? r.satisfaction);
  return {
    id: String(r.id ?? `s${i}`),
    phase: String(r.phase ?? ''),
    label: String(r.label ?? r.name ?? r.id ?? `Paso ${i + 1}`),
    score: Number.isFinite(score) ? score : undefined,
    actor: String(r.actor ?? r.who ?? '').trim() || undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay pasos. */
export function resolveJourneySpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.journey ?? p.journeyMap ?? p);
  const rawSteps = src.steps ?? src.tasks ?? [];
  if (!Array.isArray(rawSteps) || !rawSteps.length) return null;

  const steps = rawSteps.map(readStep);
  const declared = (Array.isArray(src.phases) ? src.phases : []).map(readPhase);
  const byId = new Map(declared.map((f) => [f.id, f]));
  let auto = declared.length;
  for (const s of steps) {
    if (!s.phase) s.phase = declared[0]?.id ?? 'f0';
    if (!byId.has(s.phase)) byId.set(s.phase, readPhase({ id: s.phase, name: s.phase }, auto++));
  }

  const scale = asRecord(src.scale);
  const min = Number(scale.min);
  const max = Number(scale.max);
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    scale: {
      min: Number.isFinite(min) ? min : 1,
      max: Number.isFinite(max) && max > (Number.isFinite(min) ? min : 1) ? max : 5,
    },
    phases: [...byId.values()],
    steps,
  };
}

/** spec → objeto `journey` listo para persistir / mostrar en el editor. */
export function journeySpecToJson(spec) {
  const out = { phases: [], steps: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.scale.min !== 1 || spec.scale.max !== 5) out.scale = { ...spec.scale };
  out.phases = spec.phases.map((f) => ({ id: f.id, name: f.name, hue: f.hue }));
  out.steps = spec.steps.map((s) => {
    const row = { id: s.id, phase: s.phase, label: s.label };
    if (s.score != null) row.score = s.score;
    if (s.actor) row.actor = s.actor;
    if (s.description) row.desc = s.description;
    return row;
  });
  return out;
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, plot:object, phases:Array, steps:Array, line:string, gridLines:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number}}
 */
export function computeJourneyLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  // Los pasos se ordenan por fase declarada: el eje X es el recorrido.
  const phaseOrder = new Map(spec.phases.map((f, i) => [f.id, i]));
  const ordered = [...spec.steps].sort((a, b) => (phaseOrder.get(a.phase) ?? 0) - (phaseOrder.get(b.phase) ?? 0));

  const originX = MARGIN.left;
  const phasesY = MARGIN.top + headerH;
  const plot = {
    x: originX,
    y: phasesY + PHASE_H + 10,
    w: ordered.length * STEP_W,
    h: PLOT_H,
  };

  const { min, max } = spec.scale;
  const span = max - min || 1;
  const toY = (score) => plot.y + plot.h - ((score - min) / span) * plot.h;

  const steps = ordered.map((s, i) => {
    const cx = plot.x + i * STEP_W + STEP_W / 2;
    const score = s.score != null ? Math.min(max, Math.max(min, s.score)) : undefined;
    return {
      id: s.id,
      label: s.label,
      phase: s.phase,
      actor: s.actor,
      description: s.description,
      score,
      hue: spec.phases[phaseOrder.get(s.phase) ?? 0]?.hue,
      cx,
      cy: score != null ? toY(score) : plot.y + plot.h / 2,
      labelY: plot.y + plot.h + 20,
      actorY: plot.y + plot.h + 34,
      hasScore: score != null,
    };
  });

  // Bandas de fase: una por grupo contiguo de pasos de la misma fase.
  const phases = [];
  let cursor = 0;
  while (cursor < steps.length) {
    const phaseId = steps[cursor].phase;
    let end = cursor;
    while (end + 1 < steps.length && steps[end + 1].phase === phaseId) end++;
    const meta = spec.phases[phaseOrder.get(phaseId) ?? 0];
    phases.push({
      id: phaseId,
      name: meta?.name ?? phaseId,
      hue: meta?.hue,
      x: plot.x + cursor * STEP_W,
      y: phasesY,
      w: (end - cursor + 1) * STEP_W,
      h: PHASE_H,
    });
    cursor = end + 1;
  }

  // La curva solo une pasos con puntaje: un paso sin medir no inventa un punto.
  const scored = steps.filter((s) => s.hasScore);
  const line = scored.length > 1
    ? scored.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.cx},${s.cy}`).join(' ')
    : '';

  const gridLines = [];
  for (let v = min; v <= max; v++) {
    gridLines.push({ value: v, y: toY(v), x1: plot.x, x2: plot.x + plot.w, labelX: plot.x - 10 });
  }

  const maxLabel = Math.max(...steps.map((s) => Math.ceil(richTextPlain(s.label).length * 5.4)), 0);
  return {
    width: Math.max(plot.x + plot.w + MARGIN.right, plot.x + maxLabel + MARGIN.right),
    height: plot.y + plot.h + MARGIN.bottom,
    plot,
    phases,
    steps,
    line,
    gridLines,
    scale: spec.scale,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
  };
}
