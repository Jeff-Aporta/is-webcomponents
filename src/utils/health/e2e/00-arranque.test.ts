// 00-arranque.test.ts: arranque de la galeria is-webcomponents, deep link por
// componente y navegacion por el nav. Port del esquema de PatyIA 00-sesion
// sin login/ISS: aqui el "estado" es el tag del componente (?s={component}).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@browserbasehq/stagehand';
import {
  arrancar,
  abrirGaleria,
  clicTagNav,
  esperarMs,
  esperarTexto,
  esperarContenido,
  arbolTexto,
  evidencia,
  problemasDeConsola,
  faltanRequisitos,
} from './lib/harness.ts';
import type { CtxE2E } from './lib/tipos.d.ts';

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;

before(async () => {
  if (!DISPONIBLE) return;
  ctx = await arrancar({ etiqueta: '00-arranque' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}
export type EstadoHome = { categorias: string[]; items: number; kitShell: string; hostTexto: number; };
export type EstadoDocs = { current: string; isCodeDefined: boolean; isCodeEnHost: boolean; demos: number; texto: number; };
export type EstadoNav = { current: string; texto: number; svg: number; };
test('la galeria sin estado monta el catalogo (categorias) y el home', { timeout: 150000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E (MINIMAX_API_KEY)');
  const page = pagina();
  await abrirGaleria(page, null, { ms: 4000 });
  // El nav se construye tras el shell: esperar a que existan las categorías.
  await esperarTexto(page, '#shellNav', 'Código', { ms: 30000 }).catch(() => {});
  const r = (await page.evaluate(() => {
    const nav = document.getElementById('shellNav');
    return {
      categorias: nav ? [...nav.querySelectorAll('.shell-nav__heading')].map((h) => (h.textContent ?? '').trim()) : [],
      items: nav ? nav.querySelectorAll('.shell-nav__item').length : 0,
      kitShell: document.documentElement.dataset.kitShell ?? '',
      hostTexto: (document.getElementById('previewHost')?.textContent ?? '').trim().length,
    };
  })) as EstadoHome;
  assert.equal(r.kitShell, '1', 'el shell del kit debe quedar listo');
  for (const cat of ['Diagramas', 'Código', 'Datos', 'Gráficos', 'Formularios']) {
    assert.ok(r.categorias.includes(cat), `categoria ${cat} en el nav`);
  }
  assert.ok(r.items > 150, `el nav debe listar el catalogo (${r.items} items)`);
  assert.ok(r.hostTexto > 200, `el home debe montar contenido (${r.hostTexto} chars)`);
  await evidencia(page, '00a-home');
});

test('deep link ?s={component:is-code} abre el docs del componente', { timeout: 180000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 5000 });
  const r = (await page.evaluate(() => {
    const host = document.getElementById('previewHost');
    const current = document.querySelector('#shellNav .shell-nav__item[aria-current="true"]');
    return {
      current: current?.getAttribute('data-tag') ?? '',
      isCodeDefined: !!customElements.get('is-code'),
      isCodeEnHost: !!host?.querySelector('is-code'),
      demos: host?.querySelectorAll('is-demo').length ?? 0,
      texto: (host?.textContent ?? '').trim().length,
    };
  })) as EstadoDocs;
  assert.equal(r.current, 'is-code', 'el nav debe marcar is-code como activo');
  assert.ok(r.isCodeDefined, 'is-code debe estar definido');
  assert.ok(r.isCodeEnHost, 'el preview debe montar instancias de is-code');
  assert.ok(r.demos > 0, 'debe haber demos (is-demo)');
  assert.ok(r.texto > 500, `docs con contenido (${r.texto} chars)`);
  const arbol = await arbolTexto(page);
  assert.match(arbol, /is-code/i, 'el arbol menciona is-code');
  await evidencia(page, '00b-deep-link-is-code');
});

test('navegar por el nav (is-code â†’ is-component-diagram) cambia el preview', { timeout: 200000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 4000 });
  const ok = await clicTagNav(page, 'is-component-diagram');
  assert.ok(ok, 'item del nav is-component-diagram');
  await esperarContenido(page, { ms: 60000 });
  await esperarMs(3500);
  const r = (await page.evaluate(() => {
    const host = document.getElementById('previewHost');
    const current = document.querySelector('#shellNav .shell-nav__item[aria-current="true"]');
    return {
      current: current?.getAttribute('data-tag') ?? '',
      texto: (host?.textContent ?? '').trim().length,
      svg: host?.querySelectorAll('svg, canvas').length ?? 0,
    };
  })) as EstadoNav;
  assert.equal(r.current, 'is-component-diagram', 'el nav activo debe cambiar');
  assert.ok(r.texto > 200, `el nuevo preview debe montar contenido (${r.texto})`);
  await evidencia(page, '00c-nav-a-diagrama');
});

test('sin errores de consola en arranque/navegacion', { timeout: 30000 }, async (t) => {
  // Detector centralizado en 03-problemas.test.ts; aqui solo se informa.
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const problemas = problemasDeConsola(ctx!.consola);
  const unicos = [...new Set(problemas.map((p) => p.texto))];
  if (unicos.length) {
    t.diagnostic(`consola con avisos (ver 03-problemas): ${unicos.join(' | ')}`);
  }
});
