/**
 * Guardianes WHAT de conectores y rieles del flujo insoft (rutas reales del lab
 * `labs/iss-ayudascpia-flujos/payloads/ruta-*.json` y casos mínimos):
 *   C1 paralelismo: la arista que inicia una bifurcación llega CENTRADA a su barra (de una salen
 *      varias); la reunión de ramas (2+ entradas, una salida) es un ⦿, no una barra.
 *   C2 auto-cruce prohibido: ninguna arista se corta ni se pisa a sí misma.
 *   C3 proximidad: pasar cerca de entidades, conectores y textos cuesta más cuanto más cerca, hasta
 *      3U; fuera del radio no cuesta; los `-(O` pesan más que los demás conectores.
 *   C4 puentes CRUD: la operación SQL lleva el color de su método HTTP y su ícono (sin letras).
 *   C5 puntos de los rieles continuos: por defecto del color de la arista; el consumidor los
 *      personaliza (color y tamaño); la arista acepta su propio color.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { RefObj } from '../../src/vendor-distributions/shared/lib/ref-obj.ts';
import { computeFlowchartLayout, resolveFlowchartSpec, CRUD_SQL, PROXIMIDAD, unionesDe } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { pathPoints, quitarAutoCruces, tieneAutoCruce } from '../../src/components/diagrams/utils/diagram-arrow.ts';
import { applyRadialCost, makeCostGrid } from '../../src/core/diagram-grid.ts';
import { U } from '../../src/components/diagrams/utils/flowchart-labels.ts';
import type { FlowLayout } from '../../src/components/diagrams/schemas/flowchart-spec.schemas.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { conFixtureIss } from '../_shared/iss-fixture.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test: registrar, lista } = coleccionPruebas({ categoria: 'what' });
// Los casos que leen el fixture del ISS (D:\Dev, fuera del VPS) se saltan si no está.
const test = conFixtureIss(registrar);

const denoTest = denoTestCon(test);


const DIR = new URL('../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);

async function rutas(): Promise<Array<{ nombre: string; L: FlowLayout }>> {
  const out: Array<{ nombre: string; L: FlowLayout }> = [];
  for await (const f of Deno.readDir(DIR)) {
    if (!f.name.startsWith('ruta-')) continue;
    const url = new URL(f.name, DIR);
    const crudo = JSON.parse(await Deno.readTextFile(url));
    const j = await RefObj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: Record<string, unknown> };
    out.push({ nombre: f.name, L: computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' }) });
  }
  return out;
}

const PARALELO = {
  style: 'insoft',
  nodes: [
    { id: 'i', label: 'Inicio', shape: 'start' },
    { id: 'a', label: 'Arranca' },
    { id: 'f', label: '', shape: 'bar' },
    { id: 'x', label: 'Rama uno' },
    { id: 'y', label: 'Rama dos' },
    { id: 'z', label: 'Rama tres' },
    { id: 'u', label: '', shape: 'bar' },
    { id: 'r', label: 'Responde' },
    { id: 'fin', label: 'Fin', shape: 'end' },
  ],
  edges: [
    { from: 'i', to: 'a' }, { from: 'a', to: 'f' },
    { from: 'f', to: 'x' }, { from: 'f', to: 'y' }, { from: 'f', to: 'z' },
    { from: 'x', to: 'u' }, { from: 'y', to: 'u' }, { from: 'z', to: 'u' },
    { from: 'u', to: 'r' }, { from: 'r', to: 'fin' },
  ],
};

denoTest('conectores: C1 la arista que inicia el paralelismo llega centrada; la reunión es un ⦿', () => {
  const spec = resolveFlowchartSpec(PARALELO)!;
  assertEquals([...unionesDe(spec)], ['u'], 'solo la barra que reúne es punto de convergencia');
  const L = computeFlowchartLayout(spec, null, { style: 'insoft' });
  const f = L.nodes.find((n) => n.id === 'f')!;
  const u = L.nodes.find((n) => n.id === 'u')!;
  const entra = L.edges.find((e) => e.from === 'a' && e.to === 'f')!;
  const fin = pathPoints(entra.path).at(-1)!;
  assertEquals(fin.x, f.x + f.w / 2, 'la llegada a la bifurcación cae en el centro de la barra');
  assert(!f.union, 'la bifurcación sigue siendo barra');
  assert(u.union && u.w === u.h, 'la reunión es un ⦿ (círculo)');
  const sale = L.edges.find((e) => e.from === 'u')!;
  const p0 = pathPoints(sale.path)[0]!;
  assertEquals(p0.x, u.x + u.w / 2, 'lo que sigue a la reunión sale del centro del ⦿');
});

denoTest('conectores: C1 rutas reales — toda bifurcación recibe su arista centrada', async () => {
  const malos: string[] = [];
  for (const { nombre, L } of await rutas()) {
    for (const bar of L.nodes.filter((n) => n.shape === 'bar' && !n.union)) {
      const entran = L.edges.filter((e) => e.to === bar.id);
      if (entran.length !== 1) continue;
      const t = pathPoints(entran[0]!.path).at(-1)!;
      // Centrada en el costado que le toque: en el eje largo de la barra, o al centro de un extremo.
      const centrado = Math.abs(t.x - (bar.x + bar.w / 2)) <= 1 || Math.abs(t.y - (bar.y + bar.h / 2)) <= 1;
      if (!centrado) malos.push(`${nombre}: ${bar.id} recibe en ${t.x},${t.y}`);
    }
  }
  assertEquals(malos, []);
});

denoTest('conectores: C2 auto-cruce — se corta el bucle y ninguna arista real se cruza a sí misma', async () => {
  // Baja, va a la izquierda, baja, vuelve a la derecha cruzando su propia bajada y sube a la punta.
  const bucle = [{ x: 100, y: 0 }, { x: 100, y: 100 }, { x: 60, y: 100 }, { x: 60, y: 140 }, { x: 140, y: 140 }, { x: 140, y: 60 }, { x: 80, y: 60 }];
  assert(tieneAutoCruce(bucle));
  const limpio = quitarAutoCruces(bucle);
  assert(!tieneAutoCruce(limpio), 'sin cruce tras quitar el bucle');
  assertEquals(limpio[0], bucle[0]);
  assertEquals(limpio.at(-1), bucle.at(-1), 'los extremos se conservan');
  assert(tieneAutoCruce([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 5 }]), 'ida y vuelta por la misma recta también es auto-cruce');
  const sano = [{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }];
  assertEquals(quitarAutoCruces(sano), sano, 'sin cruce no cambia nada');
  const malos: string[] = [];
  for (const { nombre, L } of await rutas()) {
    for (const e of L.edges) if (tieneAutoCruce(pathPoints(e.path))) malos.push(`${nombre}: ${e.id}`);
  }
  assertEquals(malos, []);
});

denoTest('conectores: C3 proximidad radial a 3U, decreciente, y los -(O pesan más', () => {
  assertEquals(PROXIMIDAD.radio, 3 * U);
  assert(PROXIMIDAD.socket > PROXIMIDAD.conector && PROXIMIDAD.conector >= PROXIMIDAD.entidad, 'socket > conector ≥ entidad');
  const g = makeCostGrid(400, 80);
  applyRadialCost(g, { x: 0, y: 0, w: 80, h: 80 }, PROXIMIDAD.radio, PROXIMIDAD.entidad);
  const fila = 4; // y = 32
  const costo = (px: number) => g.cost[fila * g.cols + Math.ceil(px / g.grid)]!;
  assert(costo(88) > costo(104) && costo(104) > costo(120), 'más caro cuanto más cerca');
  assertEquals(costo(80 + PROXIMIDAD.radio), 1, 'en el radio ya no cuesta');
  assertEquals(costo(200), 1, 'fuera del radio no cuesta');
  applyRadialCost(g, { x: 0, y: 0, w: 80, h: 80 }, PROXIMIDAD.radio, PROXIMIDAD.entidad);
  assert(costo(88) < 1 + PROXIMIDAD.entidad + 0.01, 'se combina por máximo, no se suma');
});

denoTest('conectores: C4 puentes CRUD con colores HTTP llevados a SQL e ícono propio', () => {
  assertEquals(Object.fromEntries(Object.entries(CRUD_SQL).map(([k, v]) => [k, [v.sql, v.http]])), {
    R: ['SELECT', 'GET'], C: ['INSERT', 'POST'], U: ['UPDATE', 'PUT'], D: ['DELETE', 'DELETE'],
  });
  assertEquals(new Set(Object.values(CRUD_SQL).map((v) => v.color)).size, 4, 'un color por operación');
  assertEquals(CRUD_SQL.D.color.toUpperCase(), '#F93E3E', 'DELETE rojo');
  assertEquals(CRUD_SQL.U.color.toUpperCase(), '#FCA130', 'UPDATE (PUT) naranja');
  for (const v of Object.values(CRUD_SQL)) assert(v.icono.startsWith('mdi:database-'), 'ícono de BD por operación');
});

/** DOM mínimo para el pintor de la animación (sin navegador). */
function domFalso(): void {
  class El {
    attrs = new Map<string, string>();
    children: El[] = [];
    constructor(public tag: string) {}
    setAttribute(k: string, v: string) { this.attrs.set(k, String(v)); }
    getAttribute(k: string) { return this.attrs.get(k) ?? null; }
    appendChild(c: El) { this.children.push(c); return c; }
    insertBefore(c: El) { this.children.unshift(c); return c; }
  }
  (globalThis as unknown as { document: unknown }).document = { createElementNS: (_: string, tag: string) => new El(tag) };
}

denoTest('conectores: C5 los puntos toman el color de la arista y se personalizan', async () => {
  domFalso();
  const { animarRiel, FLUJO } = await import('../../src/components/diagrams/utils/diagram-flow.ts');
  const riel = document.createElementNS('http://www.w3.org/2000/svg', 'path') as unknown as SVGElement;
  riel.setAttribute('d', 'M0,0 L100,0');
  riel.setAttribute('stroke', '#112233');
  riel.setAttribute('stroke-width', '1.5');
  const def = animarRiel(riel, { punteado: false })!;
  assertEquals(def.getAttribute('stroke'), '#112233', 'por defecto, el color de la arista');
  assertEquals(def.getAttribute('stroke-width'), String(1.5 + FLUJO.puntos.grosorExtra), 'tamaño por defecto');
  const propio = animarRiel(riel, { punteado: false, puntos: { color: '#FF0000', size: 7 } })!;
  assertEquals([propio.getAttribute('stroke'), propio.getAttribute('stroke-width')], ['#FF0000', '7']);
  assertEquals(FLUJO.puntos.velocidad, 120, 'el doble de la velocidad original (60 px/s)');
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    style: 'insoft',
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    edges: [{ from: 'a', to: 'b', color: '#0A7', dots: { color: '#F00', size: 6 } }],
  })!, null, { style: 'insoft' });
  assertEquals([L.edges[0]!.color, L.edges[0]!.dots], ['#0A7', { color: '#F00', size: 6 }], 'la arista lleva su color y sus puntos al layout');
});

export default lista();
