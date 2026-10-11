/**
 * diagram-socket.ts — pintor del conector InSoft `-(O-` / `-(O=`, común a todos los diagramas.
 *
 * El expositor (componente, tabla, controller) pone el palo y el socket `(`; quien consume llega a
 * la bola O. Geometría a lo largo de `dir` (unitario, de la bola hacia el expositor): el palo arranca
 * en `tip` (el borde del expositor), el arco se abre hacia quien consume y la bola queda en
 * `tip - dir · (palo + socket)`. El pulso de radar de la O va DETRÁS de la bola.
 *
 * Doc: diagram-flow.md § Pulsos.
 */
import { svgEl } from './svg-chart-engine.js';
import { pulsoRadar } from './diagram-flow.js';
import type { OpcionesSocket } from './diagram-socket.schemas.js';

export type * from './diagram-socket.schemas.js';

/** Color de relleno estándar de las O (el celeste secundario del kit). */
export const SOCKET_FILL = '#7ACFF4';

/** Pinta palo + socket `(` + (pulso) + bola O dentro de `g`; devuelve el centro de la bola. */
export function pintarSocket(g: Element, o: OpcionesSocket): { x: number; y: number } {
  const { palo, socket: S, bola } = o.medidas;
  const { tip, dir } = o;
  const c = { x: tip.x - dir.x * (palo + S), y: tip.y - dir.y * (palo + S) };
  // Perpendicular a `dir`: extremos del arco del socket.
  const t = { x: -dir.y, y: dir.x };
  const a1 = { x: c.x + t.x * S, y: c.y + t.y * S };
  const a2 = { x: c.x - t.x * S, y: c.y - t.y * S };
  g.appendChild(svgEl('line', { x1: tip.x, y1: tip.y, x2: tip.x - dir.x * palo, y2: tip.y - dir.y * palo, stroke: o.color, 'stroke-width': o.ancho, class: `${o.clase}__lollipop` }));
  g.appendChild(svgEl('path', { d: `M${a1.x},${a1.y} A${S},${S} 0 0 0 ${a2.x},${a2.y}`, fill: 'none', stroke: o.color, 'stroke-width': o.ancho, class: `${o.clase}__socket` }));
  const relleno = o.relleno ?? SOCKET_FILL;
  if (o.pulso) g.appendChild(pulsoRadar(c.x, c.y, bola, relleno));
  g.appendChild(svgEl('circle', { cx: c.x, cy: c.y, r: bola, fill: relleno, stroke: o.color, 'stroke-width': o.ancho, class: `${o.clase}__lollipop` }));
  return c;
}
