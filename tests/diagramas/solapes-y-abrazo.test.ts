/**
 * Guardián WHAT (A13) sobre los diagramas reales del ISS (clases y DER): las entidades no se solapan
 * entre sí (se empujan con margen) y todo agrupador abraza por completo a sus integrantes. Un
 * agrupador anidado cabe dentro de su padre.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { RefObj } from '../../src/vendor-distributions/shared/lib/ref-obj.ts';
import { computeClassLayout, resolveClassSpec } from '../../src/components/diagrams/utils/class-spec.ts';
import { computeErLayout, resolveErSpec } from '../../src/components/diagrams/utils/er-spec.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const denoTest = denoTestCon(test);


// Datos versionados del kit (proyecto hermético): payloads del lab y fixture del ISS.
const DIR = new URL('../fixtures/iss-ayudascpia/docs-experimental/diagramas/', import.meta.url);
type Caja = { x: number; y: number; w: number; h: number };
const MARGEN = 4;
const solapan = (a: Caja, b: Caja): boolean => a.x < b.x + b.w - MARGEN && b.x < a.x + a.w - MARGEN && a.y < b.y + b.h - MARGEN && b.y < a.y + a.h - MARGEN;
const contiene = (g: Caja, m: Caja): boolean => m.x >= g.x - 0.5 && m.y >= g.y - 0.5 && m.x + m.w <= g.x + g.w + 0.5 && m.y + m.h <= g.y + g.h + 0.5;

async function editable(nombre: string): Promise<unknown> {
  const url = new URL(nombre, DIR);
  const crudo = JSON.parse(await Deno.readTextFile(url));
  const j = await RefObj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: unknown };
  return j.payload;
}

function sinSolapes(nombre: string, cajas: Array<Caja & { id: string }>, fallas: string[]): void {
  for (let i = 0; i < cajas.length; i++) for (let k = i + 1; k < cajas.length; k++) {
    if (solapan(cajas[i]!, cajas[k]!)) fallas.push(`${nombre}: ${cajas[i]!.id} y ${cajas[k]!.id} se solapan`);
  }
}

denoTest('solapes: A13 clases del ISS — ninguna clase pisa a otra y cada paquete abraza a sus clases y subpaquetes', async () => {
  const L = computeClassLayout(resolveClassSpec(await editable('clases.json'))!);
  const fallas: string[] = [];
  sinSolapes('clases', L.nodes, fallas);
  const paquetes = L.packages ?? [];
  assert(paquetes.length >= 5, `pocos paquetes: ${paquetes.length}`);
  for (const p of paquetes) {
    for (const n of L.nodes.filter((n) => n.package === p.id)) if (!contiene(p, n)) fallas.push(`clases: el paquete ${p.id} no abraza a ${n.id}`);
    for (const s of paquetes.filter((s) => s.parent === p.id)) if (!contiene(p, s)) fallas.push(`clases: el paquete ${p.id} no abraza al subpaquete ${s.id}`);
  }
  assert(fallas.length === 0, fallas.join('\n'));
});

denoTest('solapes: A13 DER del ISS — ninguna tabla pisa a otra y cada grupo abraza a sus tablas', async () => {
  const fallas: string[] = [];
  for (const nombre of ['der.json', 'der-conversaciones.json']) {
    const L = computeErLayout(resolveErSpec(await editable(nombre))!);
    sinSolapes(nombre, L.entities, fallas);
    for (const c of L.clusters) {
      if (c.id === null) continue;
      for (const e of L.entities.filter((e) => e.group === c.id)) if (!contiene(c, e)) fallas.push(`${nombre}: el grupo ${c.id} no abraza a ${e.id}`);
      for (const s of L.clusters.filter((s) => s.parentId === c.id)) if (!contiene(c, s)) fallas.push(`${nombre}: el grupo ${c.id} no abraza al subgrupo ${s.id}`);
    }
  }
  assert(fallas.length === 0, fallas.join('\n'));
});

export default lista();
