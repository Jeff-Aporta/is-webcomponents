/**
 * diagram-flow.ts — animación de flujo de los rieles, común a TODOS los diagramas del kit.
 *
 * Estándar: cada riel muestra hacia dónde va lo que transporta.
 *   - Riel punteado: el patrón de trazos avanza (SMIL `stroke-dashoffset`).
 *   - Riel continuo: detrás, una segunda línea de puntos color cielo (trazo de largo 0, remate
 *     redondo) más gruesa y espaciada, que avanza; el riel queda encima: un efecto sutil.
 *   - Pulsos: los puntos laten en alfa y cada O (`-(O-`, `-(O=`) y cada ⦿ de llegada emite un
 *     pulso de radar periódico. Todo pulso arranca transparente y empieza tras `FLUJO.pulso.inicio`:
 *     el PNG (captura estática) sale limpio; la animación solo se ve en el SVG vivo.
 *   - `reverse`: el movimiento va de la punta al origen (p. ej. herencia en clases, o el lado N→1
 *     en el DER cuando la arista se dibuja del 1 al N).
 *
 * Es animación SVG nativa: viaja con el SVG exportado. Se apaga con `prefers-reduced-motion` en el
 * navegador o con el atributo `flow-anim="off"` en el host del diagrama.
 *
 * Doc: diagram-flow.md
 */

/** Medidas del efecto (compartidas por todos los diagramas). */
export const FLUJO = {
  /** Periodo del patrón punteado (trazo + hueco) y su duración. */
  punteado: { periodo: 9, dur: 0.9 },
  /** Puntos de los rieles continuos: separación, velocidad (px/s) y grosor extra sobre el riel. */
  puntos: { paso: 100, velocidad: 60, grosorExtra: 3, color: '#7ACFF4' },
  /** Pulsos (radar en las O y ⦿, alfa en los puntos): periodo, arranque diferido y crecimiento del radar. */
  pulso: { periodo: 3, inicio: 1.5, crece: 2.4, alfa: 0.55 },
} as const;

import type { TOpcionesFlujo } from './diagram-flow.schemas.js';

export type * from './diagram-flow.schemas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** ¿El host permite la animación? (atributo `flow-anim="off"` o movimiento reducido la apagan). */
export function flujoActivo(host?: Element | null): boolean {
  if (host?.getAttribute('flow-anim') === 'off') return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}


/**
 * Anima un riel ya pintado. En un punteado agrega el `<animate>` a su `path`; en un continuo
 * devuelve la línea de puntos para insertarla ANTES del riel (detrás: el trazo queda encima). `null`
 * si no hay nada que agregar fuera del path. Los pintores usan `animarRielEn`, que ya la coloca.
 */
export function animarRiel(path: SVGElement, op: TOpcionesFlujo): SVGElement | null {
  if (op.punteado) {
    const periodo = periodoDe(op.dasharray ?? path.getAttribute('stroke-dasharray')) ?? FLUJO.punteado.periodo;
    const a = document.createElementNS(SVG_NS, 'animate');
    a.setAttribute('attributeName', 'stroke-dashoffset');
    a.setAttribute('values', op.reverse ? `0;${periodo}` : `${periodo};0`);
    a.setAttribute('dur', `${(FLUJO.punteado.dur * periodo) / FLUJO.punteado.periodo}s`);
    a.setAttribute('repeatCount', 'indefinite');
    a.setAttribute('class', 'iswc-flow__dash');
    path.appendChild(a);
    return null;
  }
  const d = path.getAttribute('d');
  if (!d) return null;
  const { paso, velocidad, grosorExtra } = FLUJO.puntos;
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'none');
  // Color secundario (cielo) y DETRÁS del riel (el llamador lo inserta antes): el riel continuo
  // queda encima y los puntos no invaden.
  p.setAttribute('stroke', op.color ?? FLUJO.puntos.color);
  p.setAttribute('stroke-width', String((op.ancho ?? Number(path.getAttribute('stroke-width') ?? 1)) + grosorExtra));
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-dasharray', `0 ${paso}`);
  p.setAttribute('class', 'iswc-flow__dots');
  p.setAttribute('pointer-events', 'none');
  // Pulso de alfa: arranca transparente (el PNG no lleva los puntos).
  p.setAttribute('stroke-opacity', '0');
  p.appendChild(animar('stroke-opacity', '0;1;0', { keyTimes: '0;0.5;1' }));
  const a = document.createElementNS(SVG_NS, 'animate');
  a.setAttribute('attributeName', 'stroke-dashoffset');
  a.setAttribute('values', op.reverse ? `0;${paso}` : `${paso};0`);
  a.setAttribute('dur', `${paso / velocidad}s`);
  a.setAttribute('repeatCount', 'indefinite');
  p.appendChild(a);
  return p;
}

/**
 * Anima el riel `path` dentro de su grupo `g`: la línea de puntos de un continuo queda detrás del
 * riel (estándar de todos los diagramas). Único punto de entrada de los pintores.
 */
export function animarRielEn(g: Element, path: SVGElement, op: TOpcionesFlujo): void {
  const puntos = animarRiel(path, op);
  if (puntos) g.insertBefore(puntos, path);
}

/**
 * Pulso de radar de una O o un ⦿: un anillo que nace en el borde, crece y se desvanece cada
 * `FLUJO.pulso.periodo` s. Arranca transparente. Se inserta DETRÁS de la figura (el llamador lo pone
 * antes de ella).
 */
export function pulsoRadar(cx: number, cy: number, r: number, color: string): SVGElement {
  const { crece, alfa } = FLUJO.pulso;
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', String(cx));
  c.setAttribute('cy', String(cy));
  c.setAttribute('r', String(r));
  c.setAttribute('fill', color);
  c.setAttribute('fill-opacity', '0.25');
  c.setAttribute('stroke', color);
  c.setAttribute('stroke-width', '1.5');
  c.setAttribute('opacity', '0');
  c.setAttribute('class', 'iswc-flow__radar');
  c.setAttribute('pointer-events', 'none');
  c.appendChild(animar('r', `${r};${r * crece}`));
  c.appendChild(animar('opacity', `${alfa};0`));
  return c;
}

/** `<animate>` periódico del pulso, con arranque diferido (antes de empezar rige el valor base). */
function animar(atributo: string, valores: string, extra: Record<string, string> = {}): SVGElement {
  const a = document.createElementNS(SVG_NS, 'animate');
  a.setAttribute('attributeName', atributo);
  a.setAttribute('values', valores);
  a.setAttribute('dur', `${FLUJO.pulso.periodo}s`);
  a.setAttribute('begin', `${FLUJO.pulso.inicio}s`);
  a.setAttribute('repeatCount', 'indefinite');
  for (const [k, v] of Object.entries(extra)) a.setAttribute(k, v);
  return a;
}

/** Periodo (suma) de un `stroke-dasharray` («5 4» → 9). */
function periodoDe(dash: string | null | undefined): number | null {
  if (!dash) return null;
  const n = dash.split(/[\s,]+/).map(Number).filter((x) => Number.isFinite(x) && x >= 0);
  const s = n.reduce((a, b) => a + b, 0) * (n.length % 2 ? 2 : 1);
  return s > 0 ? s : null;
}
