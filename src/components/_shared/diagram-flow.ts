/**
 * diagram-flow.ts — animación de flujo de los rieles, común a TODOS los diagramas del kit.
 *
 * Estándar: cada riel muestra hacia dónde va lo que transporta.
 *   - Riel punteado: el patrón de trazos avanza (SMIL `stroke-dashoffset`).
 *   - Riel continuo: encima, una segunda línea de puntos (trazo de largo 0, remate redondo) más
 *     gruesa y espaciada, que avanza; un efecto sutil.
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
  puntos: { paso: 100, velocidad: 60, grosorExtra: 3 },
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
 * devuelve la línea de puntos para insertarla después del riel (encima). `null` si no hay nada que
 * agregar fuera del path.
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
  p.setAttribute('stroke', op.color ?? path.getAttribute('stroke') ?? 'currentColor');
  p.setAttribute('stroke-width', String((op.ancho ?? Number(path.getAttribute('stroke-width') ?? 1)) + grosorExtra));
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-dasharray', `0 ${paso}`);
  p.setAttribute('class', 'iswc-flow__dots');
  p.setAttribute('pointer-events', 'none');
  const a = document.createElementNS(SVG_NS, 'animate');
  a.setAttribute('attributeName', 'stroke-dashoffset');
  a.setAttribute('values', op.reverse ? `0;${paso}` : `${paso};0`);
  a.setAttribute('dur', `${paso / velocidad}s`);
  a.setAttribute('repeatCount', 'indefinite');
  p.appendChild(a);
  return p;
}

/** Periodo (suma) de un `stroke-dasharray` («5 4» → 9). */
function periodoDe(dash: string | null | undefined): number | null {
  if (!dash) return null;
  const n = dash.split(/[\s,]+/).map(Number).filter((x) => Number.isFinite(x) && x >= 0);
  const s = n.reduce((a, b) => a + b, 0) * (n.length % 2 ? 2 : 1);
  return s > 0 ? s : null;
}
