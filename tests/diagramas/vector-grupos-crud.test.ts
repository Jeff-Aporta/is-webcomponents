/**
 * Guardián WHAT de los agrupadores automáticos del flujo en vector (A10), sobre las rutas reales del
 * ISS (docs-experimental/diagramas/ruta-*.json):
 *   K1 un paso que usa un puente C/U/D (o INSERT/UPDATE/DELETE) queda en Escritura; uno que usa un
 *      puente R (o SELECT), en Lectura; uno sin usos cuya salida va al fin, en Respuesta.
 *   K2 cada paso agrupado queda DENTRO de un recuadro con el título de su grupo, y ningún recuadro
 *      abraza un nodo que no es de su grupo.
 *   K3 `agrupar: false` apaga los agrupadores automáticos.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { RefObj } from '../../src/vendor-distributions/shared/lib/ref-obj.ts';
import { GRUPOS_CRUD, vectorAFlujo } from '../../src/components/diagrams/utils/vector-flow-spec.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { conFixtureIss } from '../_shared/iss-fixture.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test: registrar, lista } = coleccionPruebas({ categoria: 'what' });
// Los casos que leen el fixture del ISS (D:\Dev, fuera del VPS) se saltan si no está.
const test = conFixtureIss(registrar);

const denoTest = denoTestCon(test);


const DIR = new URL('../../../../../PatyIA/_experimental/ISS-AyudasCPIA/docs-experimental/diagramas/', import.meta.url);
type Caja = { x: number; y: number; w: number; h: number };
const dentro = (n: Caja, c: Caja): boolean => n.x >= c.x && n.y >= c.y && n.x + n.w <= c.x + c.w && n.y + n.h <= c.y + c.h;
const toca = (n: Caja, c: Caja): boolean => n.x < c.x + c.w && c.x < n.x + n.w && n.y < c.y + c.h && c.y < n.y + n.h;

async function rutas(): Promise<Array<{ nombre: string; vector: Record<string, unknown> }>> {
  const out = [];
  for await (const f of Deno.readDir(DIR)) {
    if (!f.name.startsWith('ruta-') || !f.name.endsWith('.json')) continue;
    const url = new URL(f.name, DIR);
    const crudo = JSON.parse(await Deno.readTextFile(url));
    const j = await RefObj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: { vectorFlow?: Record<string, unknown> } };
    if (j.payload.vectorFlow) out.push({ nombre: f.name, vector: j.payload.vectorFlow });
  }
  return out;
}

denoTest('vector: A10 K1/K2 los pasos se agrupan por verbo CRUD y cada recuadro abraza solo a su grupo', async () => {
  const fallas: string[] = [];
  let agrupados = 0;
  const vistos = new Set<string>();
  for (const { nombre, vector } of await rutas()) {
    const flujo = vectorAFlujo(vector) as { nodes: Array<{ id: string; context?: string; shape?: string; op?: string }>; edges: Array<{ from: string; to: string; kind?: string; label?: string }> };
    const porId = new Map(flujo.nodes.map((n) => [n.id, n]));
    const titulos = new Set<string>(Object.values(GRUPOS_CRUD));
    for (const n of flujo.nodes.filter((x) => x.context && titulos.has(x.context))) {
      agrupados++;
      vistos.add(n.context!);
      const ops = flujo.edges.filter((e) => e.from === n.id && e.kind === 'dashed').map((e) => porId.get(e.to)?.op ?? '');
      if (ops.some((o) => /[CUD]/.test(o)) && n.context !== GRUPOS_CRUD.escritura) fallas.push(`K1 ${nombre}: ${n.id} escribe y quedó en ${n.context}`);
      if (n.context === GRUPOS_CRUD.lectura && ops.some((o) => /[CUD]/.test(o))) fallas.push(`K1 ${nombre}: ${n.id} en Lectura usa un puente de escritura`);
    }
    const L = computeFlowchartLayout(resolveFlowchartSpec(flujo)!, null, { style: 'insoft' });
    const grupoDe = new Map(flujo.nodes.map((n) => [n.id, n.context]));
    // La nota de un paso es parte de su grupo (va dentro de su recuadro).
    for (const n of L.nodes) if (n.shape === "comment" && n.about) grupoDe.set(n.id, grupoDe.get(n.about));
    for (const c of (L.contexts ?? []).filter((x) => titulos.has(x.label))) {
      for (const n of L.nodes) {
        const mio = grupoDe.get(n.id) === c.label && c.members?.includes(n.id);
        if (mio && !dentro(n, c)) fallas.push(`K2 ${nombre}: ${n.id} sale del recuadro ${c.label}`);
        if (!mio && grupoDe.get(n.id) !== c.label && toca(n, c)) fallas.push(`K2 ${nombre}: el recuadro ${c.label} abraza a ${n.id}`);
      }
    }
  }
  assert(agrupados >= 20, `pocos pasos agrupados: ${agrupados}`);
  for (const t of [GRUPOS_CRUD.lectura, GRUPOS_CRUD.escritura, GRUPOS_CRUD.respuesta]) assert(vistos.has(t), `ningún paso cayó en ${t}`);
  assert(fallas.length === 0, fallas.join('\n'));
});

denoTest('vector: A10 K3 agrupar: false apaga los agrupadores automáticos', async () => {
  const [{ vector }] = await rutas();
  const flujo = vectorAFlujo({ ...vector, agrupar: false }) as { nodes: Array<{ context?: string }> };
  const titulos = new Set<string>(Object.values(GRUPOS_CRUD));
  assertEquals(flujo.nodes.filter((n) => n.context && titulos.has(n.context)).length, 0);
});

export default lista();
