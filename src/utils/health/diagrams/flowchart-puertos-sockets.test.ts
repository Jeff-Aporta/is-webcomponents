/**
 * Guardianes WHAT de puertos y sockets del flujo insoft, sobre las rutas reales del lab
 * (`labs/iss-ayudascpia-flujos/payloads/ruta-*.json`):
 *   P1 una entrada y una salida nunca comparten puerto: en ningún nodo el punto por donde LLEGA
 *      una arista continua coincide con el punto por donde SALE otra.
 *   P2 las salidas de un mismo nodo parten de puntos distintos (salvo las que convergen en abanico
 *      hacia la misma punta, que comparten camino por diseño).
 *   K2 todo consumo (arista punteada) de un componente o de una tabla termina en su `-(O-`
 *      (`socket: true`), declare o no lo que expone; entre dos tablas (maestro → detalle) no hay consumo.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { Obj } from '../../../cdn/lib/obj.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../../components/diagrams/flowchart-spec.ts';
import { pathPoints } from '../../../components/_shared/diagram-arrow.ts';
import type { FlowLayout, FlowResolvedSpec } from '../../../components/diagrams/flowchart-spec.schemas.ts';

const DIR = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);

/** Cada ruta real del lab: su spec resuelto y su layout. */
async function rutas(): Promise<Array<{ nombre: string; spec: FlowResolvedSpec; L: FlowLayout }>> {
  const out: Array<{ nombre: string; spec: FlowResolvedSpec; L: FlowLayout }> = [];
  for await (const f of Deno.readDir(DIR)) {
    if (!f.name.startsWith('ruta-')) continue;
    const url = new URL(f.name, DIR);
    const crudo = JSON.parse(await Deno.readTextFile(url));
    const j = await Obj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: Record<string, unknown> };
    const spec = resolveFlowchartSpec(j.payload)!;
    out.push({ nombre: f.name, spec, L: computeFlowchartLayout(spec, null, { style: 'insoft' }) });
  }
  return out;
}

const clave = (p: { x: number; y: number }): string => `${Math.round(p.x)},${Math.round(p.y)}`;

Deno.test('puertos: P1 una entrada y una salida nunca comparten puerto; P2 las salidas no comparten arranque', async () => {
  const malos: string[] = [];
  for (const { nombre, spec, L } of await rutas()) {
    const kindDe = new Map(spec.edges.map((e) => [e.id, e.kind]));
    const salen = new Map<string, Map<string, string[]>>();
    const entran = new Map<string, Map<string, string[]>>();
    const anotar = (m: Map<string, Map<string, string[]>>, nodo: string, p: { x: number; y: number }, id: string) => {
      if (!m.has(nodo)) m.set(nodo, new Map());
      const k = clave(p);
      m.get(nodo)!.set(k, [...(m.get(nodo)!.get(k) ?? []), id]);
    };
    for (const e of L.edges) {
      if (kindDe.get(e.id) === 'dashed' || e.from === e.to) continue;
      const pts = pathPoints(e.path);
      if (pts.length < 2) continue;
      anotar(salen, e.from, pts[0]!, e.id);
      anotar(entran, e.to, { x: e.arrowTipX, y: e.arrowTipY }, e.id);
    }
    for (const [nodo, puertos] of salen) {
      for (const [k, ids] of puertos) {
        const llegan = entran.get(nodo)?.get(k);
        if (llegan) malos.push(`${nombre}: ${nodo} en ${k} sale ${ids.join(',')} y llega ${llegan.join(',')}`);
        // Varias salidas en el mismo punto solo si van a la misma punta (abanico).
        const puntas = new Set(ids.map((id) => { const e = L.edges.find((x) => x.id === id)!; return clave({ x: e.arrowTipX, y: e.arrowTipY }); }));
        if (ids.length > 1 && puntas.size > 1) malos.push(`${nombre}: ${nodo} en ${k} arrancan ${ids.join(',')} hacia puntas distintas`);
      }
    }
  }
  assertEquals(malos, []);
});

Deno.test('sockets: K2 todo consumo de un componente o tabla llega por -(O-', async () => {
  const sinSocket: string[] = [];
  for (const { nombre, spec, L } of await rutas()) {
    const expone = new Set(spec.nodes.filter((n) => n.embed?.kind === 'component' || n.embed?.kind === 'tableder').map((n) => n.id));
    const porId = new Map(L.edges.map((r) => [r.id, r]));
    for (const e of spec.edges) {
      const r = porId.get(e.id);
      // Entre dos tablas (maestro → detalle) no hay consumo ni socket.
      if (!r || e.kind !== 'dashed' || !expone.has(e.to) || expone.has(e.from)) continue;
      if (!r.socket) sinSocket.push(`${nombre}: ${e.from} → ${e.to} (${e.label ?? ''})`);
    }
  }
  assertEquals(sinSocket, []);
});
