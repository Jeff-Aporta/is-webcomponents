/**
 * Guardián WHAT del lote de diagramas con caché por hash (`client/tools/render-lote.ts`):
 *   L1 plan puro con fixtures temporales (dos editables, uno con referencia a `_fuentes.json`):
 *      primera vez ambos `render`; con caché completo y salidas presentes, ambos `skip`; cambiar un value de
 *      `_fuentes.json` que SÍ entra al diagrama → solo ese `render`; uno que NO entra → ambos `skip`; borrar el
 *      SVG → `render`; `forzar` → todos; `pinKit` distinto → todos; una referencia rota → `error` con motivo;
 *      el archivo de caché y los `_x.json` no cuentan como diagramas.
 *   L2 la huella no depende del orden de las claves del editable, y sí de `module`/`attrs`.
 *   L3 caja negra con Chromium real y el bundle de `dist/cdn`: un flujo mínimo renderiza (OK + SVG + PNG +
 *      caché con huella/ancho/alto); la segunda corrida imprime SKIP y no toca el SVG (mtime igual).
 *      Requiere `deno task build` y Chromium de Playwright; sin ellos se salta con aviso.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  anotarCache, CACHE_NOMBRE, leerCache, planificarLote, renderizarLote, VERSION,
} from '../../../vendor-distributions/client/tools/render-lote.ts';
import type { OpcionesLote, PlanLote, RenderDiagramOptions } from '../../../vendor-distributions/shared/schemas.ts';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const BUNDLE = 'dist/cdn/diagrams/flowchart.min.js';

const json = (f: string, v: unknown) => writeFileSync(f, JSON.stringify(v, null, 2));
const acciones = (p: PlanLote) => Object.fromEntries(p.diagramas.map((d) => [d.slug, d.accion]));

/** Carpeta temporal con `a.json` (referencia a `_fuentes.json`), `b.json` y las salidas. */
function fixtures(): { op: OpcionesLote; dir: string; fuentes: string; cache: string } {
  const dir = Deno.makeTempDirSync({ prefix: 'render-lote-' });
  const editables = join(dir, 'diagramas');
  mkdirSync(editables);
  const fuentes = join(editables, '_fuentes.json');
  json(fuentes, { titulos: { a: 'Recibe', b: 'Responde' } });
  json(join(editables, 'a.json'), {
    module: '010', tag: 'iswc-flowchart', script: 'diagrams/flowchart.min.js',
    payload: { nodes: [{ id: 'n', label: { path: './_fuentes.json', query: { titulos: { a: true } } } }], edges: [] },
  });
  json(join(editables, 'b.json'), { module: '010', tag: 'iswc-flowchart', script: 'diagrams/flowchart.min.js', payload: { nodes: [{ id: 'n', label: 'Fijo' }], edges: [] } });
  const op: OpcionesLote = { carpeta: editables, salidaSvg: join(dir, 'svg'), salidaPng: join(dir, 'png'), kit: RAIZ, pinKit: 'pin-1' };
  return { op, dir, fuentes, cache: join(editables, CACHE_NOMBRE) };
}

/** Simula un lote OK: salidas en disco y caché con la huella del plan. */
async function simularRender(plan: PlanLote, op: OpcionesLote): Promise<void> {
  mkdirSync(op.salidaSvg, { recursive: true });
  mkdirSync(op.salidaPng, { recursive: true });
  for (const d of plan.diagramas) {
    if (d.accion !== 'render') continue;
    writeFileSync(d.svg, '<svg/>');
    writeFileSync(d.png!, 'png');
    await anotarCache(plan.cache, d.slug, { huella: d.huella, svg: `../svg/${d.slug}.svg`, png: `../png/${d.slug}.png`, fecha: 'x', ancho: 1, alto: 1 });
  }
}

Deno.test('render-lote: L1 el plan decide render/skip por huella del spec resuelto, salidas y pinKit', async () => {
  const { op, dir, fuentes, cache } = fixtures();
  try {
    let plan = await planificarLote(op);
    assertEquals(acciones(plan), { a: 'render', b: 'render' }, 'primera vez: ambos');
    assertEquals(plan.diagramas.map((d) => d.motivo), ['sin caché', 'sin caché']);
    assertEquals((plan.diagramas[0]!.job!.payload as { nodes: { label: string }[] }).nodes[0]!.label, 'Recibe', 'la referencia se resolvió');
    const huellaA = plan.diagramas[0]!.huella;

    await simularRender(plan, op);
    plan = await planificarLote(op);
    assertEquals(acciones(plan), { a: 'skip', b: 'skip' }, 'caché completo y salidas: ambos skip');
    assert(existsSync(cache) && !Object.keys(acciones(plan)).includes('diagramas-iswc.cache'), 'el caché no es un diagrama');
    assert(!('_fuentes' in acciones(plan)), '_fuentes.json no es un diagrama');

    json(fuentes, { titulos: { a: 'Recibe', b: 'Otro' } });
    assertEquals(acciones(await planificarLote(op)), { a: 'skip', b: 'skip' }, 'un value que NO entra al diagrama no cambia nada');

    json(fuentes, { titulos: { a: 'Recibe la petición', b: 'Otro' } });
    plan = await planificarLote(op);
    assertEquals(acciones(plan), { a: 'render', b: 'skip' }, 'un value que SÍ entra cambia solo ese');
    assertEquals(plan.diagramas[0]!.motivo, 'huella distinta');
    assert(plan.diagramas[0]!.huella !== huellaA);
    await simularRender(plan, op);
    assertEquals(acciones(await planificarLote(op)), { a: 'skip', b: 'skip' });

    rmSync(join(op.salidaSvg, 'b.svg'));
    plan = await planificarLote(op);
    assertEquals(acciones(plan), { a: 'skip', b: 'render' }, 'sin SVG se vuelve a renderizar');
    assertEquals(plan.diagramas[1]!.motivo, 'falta el SVG');
    await simularRender(plan, op);

    assertEquals(acciones(await planificarLote({ ...op, forzar: true })), { a: 'render', b: 'render' }, 'forzar ignora el caché');
    assertEquals(acciones(await planificarLote({ ...op, pinKit: 'pin-2' })), { a: 'render', b: 'render' }, 'otro pinKit cambia todas las huellas');
    assertEquals(acciones(await planificarLote({ ...op, solo: ['b'] })), { b: 'skip' }, 'solo filtra por slug');

    json(fuentes, { titulos: { b: 'Otro' } });
    plan = await planificarLote(op);
    assertEquals(acciones(plan), { a: 'error', b: 'skip' }, 'referencia sin resolver → error');
    assert(plan.diagramas[0]!.motivo.includes('no existe'), plan.diagramas[0]!.motivo);

    const c = await leerCache(cache);
    assertEquals(c.version, VERSION);
    assertEquals(Object.keys(c.diagramas).sort(), ['a', 'b']);
    assertEquals(c.diagramas.a!.svg, '../svg/a.svg');
    assertEquals(await leerCache(join(dir, 'no-existe.json')), { version: VERSION, diagramas: {} });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

Deno.test('render-lote: L2 la huella ignora el orden de claves y cambia con module/attrs', async () => {
  const { op, dir } = fixtures();
  try {
    const base = (await planificarLote(op)).diagramas[1]!.huella;
    const b = join(op.carpeta, 'b.json');
    const spec = JSON.parse(readFileSync(b, 'utf8'));
    json(b, { payload: spec.payload, script: spec.script, tag: spec.tag, module: spec.module });
    assertEquals((await planificarLote(op)).diagramas[1]!.huella, base, 'otro orden de claves, misma huella');
    json(b, { ...spec, module: '020' });
    const conModulo = (await planificarLote(op)).diagramas[1]!.huella;
    assert(conModulo !== base, 'module entra en la huella');
    json(b, { ...spec, attrs: { theme: 'insoft' } });
    assert((await planificarLote(op)).diagramas[1]!.huella !== base, 'attrs entran en la huella');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

let chromium: RenderDiagramOptions['chromium'] | null = null;
try {
  chromium = (createRequire(import.meta.url)('playwright') as { chromium: RenderDiagramOptions['chromium'] }).chromium;
} catch { chromium = null; }

Deno.test({
  name: 'render-lote: L3 caja negra, un flujo mínimo renderiza en hijo, la segunda corrida hace SKIP y no toca el SVG',
  ignore: !chromium || !existsSync(`${RAIZ}${BUNDLE}`),
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const dir = Deno.makeTempDirSync({ prefix: 'render-lote-e2e-' });
    try {
      const editables = join(dir, 'diagramas');
      mkdirSync(editables);
      json(join(editables, 'chico.json'), {
        tag: 'iswc-flowchart', script: 'diagrams/flowchart.min.js', attrs: { 'flow-anim': 'off' },
        payload: { nodes: [{ id: 'a', label: 'Recibe' }, { id: 'b', label: 'Responde' }], edges: [{ from: 'a', to: 'b' }] },
      });
      const lineas: string[] = [];
      const op: OpcionesLote = { carpeta: editables, salidaSvg: join(dir, 'svg'), salidaPng: join(dir, 'png'), kit: RAIZ, settleMs: 200, log: (l) => lineas.push(l) };
      const r1 = await renderizarLote(op);
      assertEquals(r1.fallidos, [], lineas.join('\n'));
      assertEquals(r1.renderizados, ['chico']);
      assert(lineas.some((l) => /^OK chico\.svg \(\d+x\d+\)$/.test(l)), lineas.join('\n'));
      assert(lineas.at(-1)!.startsWith('lote · 1 renderizados · 0 sin cambios · 0 fallidos'));
      const svg = join(dir, 'svg', 'chico.svg');
      assert(existsSync(svg) && existsSync(join(dir, 'png', 'chico.png')), 'SVG y PNG escritos');
      const c = await leerCache(join(editables, CACHE_NOMBRE));
      const e = c.diagramas.chico!;
      assert(/^[0-9a-f]{64}$/.test(e.huella) && e.ancho! > 0 && e.alto! > 0, JSON.stringify(e));
      assertEquals(e.svg, '../svg/chico.svg');

      const mtime = statSync(svg).mtimeMs;
      lineas.length = 0;
      const r2 = await renderizarLote(op);
      assertEquals(r2.sinCambios, ['chico']);
      assertEquals(lineas[0], 'SKIP chico (sin cambios)');
      assertEquals(statSync(svg).mtimeMs, mtime, 'el SVG no se tocó');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
});
