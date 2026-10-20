/**
 * Guardián WHAT del nodo de declaración de variables (`shape: "vars"`).
 *   V1 es una tabla nombre · valor (obligatorios); una fila sin nombre o sin valor no entra.
 *   V2 la columna desc solo aparece si alguna variable la trae; la tabla cabe en el nodo.
 *   V3 lleva insignia con ícono de variable (y su índice si es paso del flujo).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { layoutRuta, TIMEOUT_RUTAS_REALES } from '../_shared/rutas-reales.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

// Rutas reales: layout memoizado y timeout medido (ver tests/_shared/rutas-reales.ts).
const { test, lista } = coleccionPruebas({ categoria: 'what', timeoutMs: TIMEOUT_RUTAS_REALES });

const denoTest = denoTestCon(test);


const layout = (vars: unknown[]) => computeFlowchartLayout(resolveFlowchartSpec({
  steps: 'auto',
  nodes: [{ id: 'a', label: 'Lee' }, { id: 'v', label: 'Config', shape: 'vars', vars }, { id: 'd', label: '¿N?', shape: 'diamond' }],
  edges: [{ from: 'a', to: 'v' }, { from: 'v', to: 'd' }],
})!, null, { style: 'insoft' });

denoTest('vars: V1-V3 tabla nombre · valor, desc opcional, insignia de variable', () => {
  const sin = layout([{ name: 'N', value: 'conversacion.recalcularTituloCadaMensajesUsuario' }, { name: 'solo-nombre' }, { value: 'solo-valor' }]).nodes.find((n) => n.id === 'v')!;
  assertEquals(sin.vars?.map((v) => v.name), ['N'], 'V1 nombre y valor obligatorios');
  assertEquals(sin.varsCols?.length, 2, 'V2 sin desc, dos columnas');
  const con = layout([{ name: 'N', value: 'cfg.n', desc: 'cada cuántos mensajes' }, { name: 'modelo', value: 'runtime.conversationModel' }]).nodes.find((n) => n.id === 'v')!;
  assertEquals(con.varsCols?.length, 3, 'V2 con desc, tres columnas');
  const b = con.varsBox!;
  assert(b.x >= con.x && b.y >= con.y && b.x + b.w <= con.x + con.w && b.y + b.h <= con.y + con.h, 'V2 la tabla cabe en el nodo');
  assertEquals(con.icon ?? 'mdi:variable-box', 'mdi:variable-box', 'V3 ícono de variable');
  assertEquals(con.stepLabel, '2', 'V3 es paso del flujo');
});

denoTest('vars: V4 en las rutas reales la tabla queda dentro de su nodo (también tras abrir espacio)', async () => {
  const { RefObj } = await import('../../src/vendor-distributions/shared/lib/ref-obj.ts');
  const dir = new URL('../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const ruta = new URL(f.name, dir);
    const j = await RefObj.resolver(JSON.parse(await Deno.readTextFile(ruta)), { base: ruta.pathname.replace(/^\/(\w:)/, '$1'), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: unknown };
    const L = layoutRuta(f.name, j.payload);
    for (const n of L.nodes.filter((x) => x.varsBox)) {
      const b = n.varsBox!;
      assert(b.x >= n.x && b.y >= n.y && b.x + b.w <= n.x + n.w && b.y + b.h <= n.y + n.h, `${f.name}: ${n.id} tabla fuera del nodo`);
    }
  }
});

export default lista();
