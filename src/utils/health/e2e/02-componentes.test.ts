// 02-componentes.test.ts: visita representativa por categorias del catalogo.
// Para cada tag: el preview controlado monta contenido real (no placeholder),
// el componente esta definido y el docs usa instancias del kit. Las vistas
// pesadas (diagramas/graficos) exigen ademas senal de render (svg/canvas).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@browserbasehq/stagehand';
import {
  arrancar,
  abrirGaleria,
  esperarMs,
  evidencia,
  faltanRequisitos,
} from './lib/harness.ts';
import type { CtxE2E } from './lib/tipos.ts';

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;

before(async () => {
  if (!DISPONIBLE) return;
  ctx = await arrancar({ etiqueta: '02-componentes' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

/** [tag, senal extra opcional { svg: true }] */
const VISTAS: Array<[string, { svg: boolean } | null]> = [
  ['is-button', null],
  ['is-input', null],
  ['is-icon', null],
  ['is-progress-bar', null],
  ['is-confirm-modal', null],
  ['is-cdn-snippet', null],
  ['is-component-diagram', { svg: true }],
  ['is-flowchart', { svg: true }],
  ['is-er-diagram', { svg: true }],
  ['is-bar-chart', { svg: true }],
  ['is-split-panel', null],
];

interface EstadoVista {
  definido: boolean;
  instancias: number;
  texto: number;
  svg: number;
  canvas: number;
  demos: number;
}

test('cada vista representativa monta contenido real con su componente definido', { timeout: 600000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  const fallos: string[] = [];
  for (const [tag, senal] of VISTAS) {
    try {
      await abrirGaleria(page, tag, { ms: 5000 });
    } catch (e) {
      fallos.push(`${tag}: no monto preview — ${String(e instanceof Error ? e.message : e).slice(0, 200)}`);
      continue;
    }
    await esperarMs(2000);
    const r = (await page.evaluate((tg: string) => {
      const host = document.getElementById('previewHost');
      // Los diagramas/graficos dibujan dentro de su shadow root: contar
      // svg/canvas penetrando todos los shadow roots del host.
      const cuentaPercolando = (raiz: ParentNode, sel: string): number => {
        let n = raiz.querySelectorAll(sel).length;
        for (const el of raiz.querySelectorAll('*')) {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr) n += cuentaPercolando(sr, sel);
        }
        return n;
      };
      return {
        definido: !!customElements.get(tg),
        instancias: host?.querySelectorAll(tg).length ?? 0,
        texto: (host?.textContent ?? '').trim().length,
        svg: host ? cuentaPercolando(host, 'svg') : 0,
        canvas: host ? cuentaPercolando(host, 'canvas') : 0,
        demos: host?.querySelectorAll('is-demo').length ?? 0,
      };
    }, tag)) as EstadoVista;
    if (!r.definido) fallos.push(`${tag}: el custom element no esta definido`);
    if (r.instancias === 0 && r.demos === 0) {
      fallos.push(`${tag}: el preview no monta instancias ni demos (texto ${r.texto})`);
    }
    if (r.texto < 120) fallos.push(`${tag}: contenido demasiado corto (${r.texto})`);
    if (senal?.svg && r.svg === 0 && r.canvas === 0) {
      fallos.push(`${tag}: vista de diagrama/grafico sin svg ni canvas (${r.svg}/${r.canvas})`);
    }
    t.diagnostic(`vista ${tag}: ${r.instancias} instancias, ${r.demos} demos, texto ${r.texto}, svg ${r.svg}, canvas ${r.canvas}`);
    await evidencia(page, `02-${tag}`);
  }
  assert.deepEqual(fallos, [], `FALLOS DE RENDER:\n${fallos.join('\n')}`);
});
