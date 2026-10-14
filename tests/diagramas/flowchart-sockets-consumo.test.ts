/**
 * Guardián WHAT (A7): en las rutas reales del ISS, TODO consumo punteado de un componente llega por
 * -(O- (socket), declare o no el componente lo que expone; y toda tabla DER que un puente consume
 * expone también su -(O-. Una consecuencia continua (p. ej. la llamada al login) no cambia.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { Obj } from '../../src/vendor-distributions/shared/lib/obj.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const denoTest = denoTestCon(test);


const DIR = new URL('../../labs/iss-ayudascpia-flujos/payloads', import.meta.url);

async function rutas(): Promise<Array<{ nombre: string; payload: Record<string, unknown> }>> {
  const out: Array<{ nombre: string; payload: Record<string, unknown> }> = [];
  for await (const f of Deno.readDir(DIR)) {
    if (!f.name.startsWith('ruta-') || !f.name.endsWith('.json')) continue;
    const url = new URL(f.name, DIR);
    const crudo = JSON.parse(await Deno.readTextFile(url));
    const j = await Obj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: Record<string, unknown> };
    out.push({ nombre: f.name, payload: j.payload });
  }
  return out;
}

denoTest('sockets: A7 todo consumo punteado de un componente o tabla termina en -(O-', async () => {
  const fallas: string[] = [];
  let consumos = 0;
  for (const r of await rutas()) {
    const spec = resolveFlowchartSpec(r.payload);
    if (!spec) continue;
    const L = computeFlowchartLayout(spec, null, { style: 'insoft' });
    const kindDe = new Map(spec.nodes.map((n) => [n.id, n.embed?.kind ?? n.shape ?? 'action']));
    for (const e of L.edges) {
      const k = kindDe.get(e.to);
      const punteada = e.kind === 'dashed';
      // Tabla→tabla es una relación del DER (propagación maestro→detalle), no un consumo.
      if (!punteada || (k !== 'component' && k !== 'tableder') || kindDe.get(e.from) === 'tableder') continue;
      consumos++;
      if (!e.socket) fallas.push(`${r.nombre}: ${e.from}→${e.to} (${k}) sin socket`);
    }
  }
  assert(consumos >= 20, `pocos consumos encontrados: ${consumos}`);
  assert(fallas.length === 0, `consumos sin -(O-:\n${fallas.join('\n')}`);
});

export default lista();
