/**
 * routing-costs.ts — Configuración compartida del campo de costos del router.
 *
 * Todos los diagramas (componentes, clases, DER) rutean con el mismo motor y
 * las mismas reglas; aquí viven los valores por defecto de radios, brillos y
 * límites. No son absolutos: cada diagrama puede sobreescribir cualquiera
 * desde su payload (`layout.routing`), y el build publica una copia en
 * `dist/cdn/diagrams/routing-costs.json` para quien quiera leerlos.
 *
 *   { "componentDiagram": { "layout": { "routing": { "share": { "radius": 200 } } } } }
 *
 * Convención del campo: cada nodo parte de 1; un brillo > 1 desincentiva,
 * uno < 1 incentiva; `radius` es hasta dónde llega (px) con caída lineal.
 */
import { RoutingCostsSchema } from './component-router.schemas.js';
import type { RoutingCosts, RoutingCostsInput } from './component-router.schemas.js';

export type { RoutingCosts, RoutingCostsInput };

/** Valores por defecto del kit (los publica el build como routing-costs.json). */
export const ROUTING_COSTS_DEFAULTS: RoutingCosts = RoutingCostsSchema.parse({
  grid: { step: 20, clearance: 20, lanePitch: 32, stub: 20, iterations: 8, turnPenalty: 200, minFactor: 0.05 },
  // Brillo de entidad: un paso mas alla del aire (clearance); un radio mayor
  // se comia los carriles de los corredores estrechos entre franjas.
  entity: { glow: 3, radius: 20 },
  // Entrar/salir de un agrupador y girar son sumas fijas (no brillos):
  // relación 10 : 5 : 3 entre giro, entrada y salida.
  package: { borderGlow: 10, borderRadius: 64, nestingFactor: 4, enter: 100, exit: 60 },
  rail: { overlap: 120, near: 6, headOn: 120, cross: 8, sameFunnel: 42, retreat: 30, history: 6, mergePitches: 2 },
  share: { radius: 150, joinTail: 0.1, newTip: 240 },
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Defaults + sobreescritura parcial (profunda). Un valor inválido se ignora
 * con aviso; nunca rompe el diagrama.
 */
export function resolveRoutingCosts(override?: RoutingCostsInput | null): RoutingCosts {
  if (!override || !isObj(override)) return ROUTING_COSTS_DEFAULTS;
  const merged: Record<string, unknown> = {};
  for (const [k, base] of Object.entries(ROUTING_COSTS_DEFAULTS)) {
    const o = (override as Record<string, unknown>)[k];
    merged[k] = isObj(o) ? { ...(base as Record<string, unknown>), ...o } : base;
  }
  const r = RoutingCostsSchema.safeParse(merged);
  if (r.success) return r.data;
  console.warn(`[iswc-router] routing inválido, se usan los defaults: ${r.error.issues[0]?.message ?? ''}`);
  return ROUTING_COSTS_DEFAULTS;
}

/** Lee `routing` de un objeto `layout` de payload (o null). */
export function readRoutingOverride(layout: unknown): RoutingCostsInput | null {
  if (!isObj(layout)) return null;
  const r = layout.routing;
  return isObj(r) ? (r as RoutingCostsInput) : null;
}
