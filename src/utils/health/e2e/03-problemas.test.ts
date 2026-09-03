// 03-problemas.test.ts: barrido detector (el "ataque") por las vistas del
// catalogo. Abre cada tag con ?s= y exige: sin errores de consola
// (console.error), sin patrones de peligro en el arbol de accesibilidad y sin
// rastro de CodeMirror. Cada hallazgo se reporta con la vista, el texto y una
// captura como evidencia. Este test queda ROJO mientras existan problemas
// reales en la galeria/componentes.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@browserbasehq/stagehand';
import {
  arrancar,
  abrirGaleria,
  arbolTexto,
  evidencia,
  problemasDeConsola,
  rastroCodeMirror,
  faltanRequisitos,
  ENV,
} from './lib/harness.ts';
import type { CtxE2E } from './lib/tipos.d.ts';

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;

before(async () => {
  if (!DISPONIBLE) return;
  ctx = await arrancar({ etiqueta: '03-problemas' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}
export type Hallazgo = { vista: string; tipo: string; texto: string; captura: string; };
test('barrido: ninguna vista del catalogo debe producir errores ni peligros', { timeout: 900000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  const hallazgos: Hallazgo[] = [];
  const vistas: Array<string | null> = [null, ...ENV.sweep]; // home + sweep
  for (const tag of vistas) {
    const nombre = tag ?? 'home';
    const marcador = ctx!.consola.length;
    try {
      await abrirGaleria(page, tag, { ms: 4500 });
    } catch (e) {
      hallazgos.push({
        vista: nombre,
        tipo: 'montaje',
        texto: String(e instanceof Error ? e.message : e).slice(0, 300),
        captura: '',
      });
      continue;
    }
    await new Promise((r) => setTimeout(r, 1200));
    const problemas = problemasDeConsola(ctx!.consola.slice(marcador));
    const rastro = await rastroCodeMirror(page);
    const arbol = await arbolTexto(page);
    const textoAlerta = /TypeError|ReferenceError|is not defined|Uncaught|Cannot read propert|Failed to fetch|Internal Server Error/i.exec(arbol);
    const ev = await evidencia(page, `03-${nombre.replace(/^is-/, '')}`);
    t.diagnostic(`vista ${nombre}: ${problemas.length} error(es) de consola, rastro CM ${rastro.total}; captura ${ev.png}`);
    for (const p of problemas) {
      hallazgos.push({ vista: nombre, tipo: p.tipo, texto: p.texto, captura: ev.png });
    }
    if (rastro.total > 0) {
      hallazgos.push({
        vista: nombre,
        tipo: 'rastro-codemirror',
        texto: JSON.stringify({ nodos: rastro.nodos, recursos: rastro.recursos, tags: rastro.tags }),
        captura: ev.png,
      });
    }
    if (textoAlerta && problemas.length === 0) {
      hallazgos.push({ vista: nombre, tipo: 'texto-en-pantalla', texto: textoAlerta[0], captura: ev.png });
    }
  }
  const resumen = hallazgos.map((h) => `[${h.vista}] ${h.tipo}: ${h.texto}${h.captura ? ` (${h.captura})` : ''}`).join('\n');
  assert.deepEqual(
    hallazgos,
    [],
    `PROBLEMAS DETECTADOS en la galeria is-webcomponents:\n${resumen}`,
  );
});

test('sin rastro de CodeMirror tras el barrido (motor nativo)', { timeout: 60000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  const rastro = await rastroCodeMirror(page);
  assert.equal(rastro.total, 0, `no debe quedar rastro de codemirror tras el barrido (${JSON.stringify(rastro)})`);
});
