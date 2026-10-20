// rutas-reales.ts — layout de las rutas reales del ISS (labs/iss-ayudascpia-flujos/payloads/ruta-*.json),
// calculado UNA vez por proceso y compartido entre los casos de un mismo archivo.
//
// Medido 2026-10-20: las 24 rutas tardan ~67 s en total (ruta-conversacion-turno sola ~28 s: A* de
// `route()`). Recalcularlas en cada caso multiplicaba ese tiempo y los casos caían por el timeout de 30 s
// del runner. `TIMEOUT_RUTAS_REALES` (~4× el total medido) cubre al primer caso, que paga el cálculo.
// El layout devuelto es compartido: los casos solo lo leen, no lo mutan.
// category: "how"
import { computeFlowchartLayout } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { resolveFlowchartSpec } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import type { FlowLayout } from '../../src/components/diagrams/schemas/flowchart-spec.schemas.ts';

export const TIMEOUT_RUTAS_REALES = 300_000;

const memo = new Map<string, FlowLayout>();

/** Layout `insoft` de una ruta real (por nombre de archivo), memoizado. */
export function layoutRuta(nombre: string, payload: unknown): FlowLayout {
  let L = memo.get(nombre);
  if (!L) {
    L = computeFlowchartLayout(resolveFlowchartSpec(payload as Record<string, unknown>)!, null, { style: 'insoft' }) as FlowLayout;
    memo.set(nombre, L);
  }
  return L;
}
