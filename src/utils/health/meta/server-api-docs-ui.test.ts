/**
 * Guardián WHAT de UI de `<iswc-server-api-docs>` en un navegador real (Chromium de Playwright) con el bundle
 * de `dist/cdn` y el documento de su demo, servido como lo sirve un host (`GET /api/docs`). Lo que ve y hace
 * quien lee la documentación de la API:
 *   U1 la portada muestra el título del documento y lista sus operaciones; el índice también.
 *   U2 abrir una operación desde la portada no recarga, deja `?s=` compartible y emite
 *      `iswc-server-api-docs-page` con su id; la URL compartida reabre esa operación.
 *   U3 «Probar» ejecuta la petición real contra el host (mismo origen + `/api`) con el parámetro de ruta y
 *      muestra el estado; emite `iswc-server-api-docs-response`.
 *   U4 contrato heredado: el documento asignado por propiedad (`el.doc = obj`) desde un script JSON se pinta.
 *   U5 un documento que no es InSoft ni OpenAPI muestra el error en vez de pintar vacío.
 *   U6 sin errores de consola ni de página en todo el recorrido.
 *
 * Caja negra: solo DOM visible, URL y eventos. Sin build o sin Chromium se salta.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const BUNDLE = 'dist/cdn/layout/server-api-docs.min.js';

/** El documento del demo de la ficha (`server-api-docs.json`). */
async function documentoDemo(): Promise<string> {
  const ficha = JSON.parse(await readFile(join(RAIZ, 'src/components/layout/server-api-docs.json'), 'utf8')) as {
    sections: Array<{ blocks: Array<{ kind: string; html?: string[] }> }>;
  };
  const demo = ficha.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'demo' && b.html?.some((l) => l.includes('<iswc-server-api-docs')));
  assert(demo?.html, 'el demo de server-api-docs no tiene documento');
  const json = demo.html.join('\n').match(/<script type="application\/json">([\s\S]*?)<\/script>/);
  assert(json, 'el demo no trae el documento en un script JSON hijo');
  return JSON.stringify(JSON.parse(json[1]!)).replace(/</g, '\\u003c');
}

const pagina = (cuerpo: string) => `<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="/dist/cdn/is-base.min.css"><link rel="stylesheet" href="/dist/cdn/palettes.min.css">
<script type="module" src="/${BUNDLE}"></script>
<style>html, body { margin: 0; height: 100%; } iswc-server-api-docs { display: block; height: 100vh; }</style>
</head><body>${cuerpo}</body></html>`;

const TIPOS: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

type Pagina = {
  goto: (u: string, o?: Record<string, unknown>) => Promise<unknown>;
  url: () => string;
  on: (ev: string, fn: (x: { type?: () => string; text?: () => string; message?: string }) => void) => void;
  evaluate: <T>(fn: string) => Promise<T>;
  waitForFunction: (fn: string, arg?: unknown, o?: Record<string, unknown>) => Promise<unknown>;
};
type Navegador = { newPage: () => Promise<Pagina>; close: () => Promise<void> };
let chromium: { launch: (o: Record<string, unknown>) => Promise<Navegador> } | null = null;
try {
  chromium = (createRequire(import.meta.url)('playwright') as { chromium: typeof chromium }).chromium;
} catch { chromium = null; }

/** Búsqueda profunda (atraviesa shadow roots) disponible en la página como `window.__q(sel)` / `__qa(sel)`. */
const AYUDA = `(() => {
  const todos = (r, out = []) => { for (const el of r.querySelectorAll('*')) { out.push(el); if (el.shadowRoot) todos(el.shadowRoot, out); } return out; };
  window.__qa = (sel) => todos(document).filter((el) => el.matches(sel));
  window.__q = (sel) => window.__qa(sel)[0] || null;
  window.__h1 = () => { const h = window.__qa('h1').find((x) => x.textContent.trim()); return h ? h.textContent.trim() : ''; };
})()`;

const espera = (p: Pagina, cond: string) => p.waitForFunction(cond, undefined, { timeout: 20_000 }).then(() => true, () => false);

Deno.test({
  name: 'server-api-docs UI: portada, operación con ?s=, Probar contra el host, .doc por propiedad y documento inválido (navegador real)',
  ignore: !chromium || !existsSync(join(RAIZ, BUNDLE)),
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const doc = await documentoDemo();
    const paginas: Record<string, string> = {
      '/docs.html': pagina(`<iswc-server-api-docs><script type="application/json">${doc}</script></iswc-server-api-docs>`),
      '/prop.html': pagina(`<iswc-server-api-docs id="v"></iswc-server-api-docs><script type="application/json" id="api-doc">${doc}</script>
<script type="module">document.getElementById('v').doc = JSON.parse(document.getElementById('api-doc').textContent);</script>`),
      '/malo.html': pagina(`<iswc-server-api-docs><script type="application/json">{"hola": 1}</script></iswc-server-api-docs>`),
    };
    const pedidas: string[] = [];
    const ac = new AbortController();
    const srv = Deno.serve({ port: 0, signal: ac.signal, onListen: () => {} }, async (req) => {
      const u = new URL(req.url);
      const p = decodeURIComponent(u.pathname);
      if (paginas[p]) return new Response(paginas[p], { headers: { 'content-type': 'text/html; charset=utf-8' } });
      if (p.startsWith('/api/')) {
        pedidas.push(`${req.method} ${p}`);
        return Response.json({ encabezado: { resultado: true }, respuesta: { iconversacion: p.split('/').pop() } });
      }
      try {
        return new Response(await Deno.readFile(join(RAIZ, p)), { headers: { 'content-type': TIPOS[extname(p)] ?? 'application/octet-stream' } });
      } catch {
        return new Response('404', { status: 404 });
      }
    });
    const origen = `http://127.0.0.1:${(srv.addr as Deno.NetAddr).port}`;
    const nav = await chromium!.launch({ headless: true });
    const errores: string[] = [];
    const vigilar = (pg: Pagina) => {
      pg.on('console', (m) => { if (m.type?.() === 'error') errores.push(m.text?.() ?? ''); });
      pg.on('pageerror', (e) => errores.push(`pageerror: ${e.message ?? ''}`));
    };
    try {
      const page = await nav.newPage();
      vigilar(page);

      // U1
      await page.goto(`${origen}/docs.html`, { waitUntil: 'load' });
      await page.evaluate(AYUDA);
      assert(await espera(page, `window.__h1() === 'API PatyIA'`), `U1 la portada no muestra el título (h1 = «${await page.evaluate<string>('window.__h1()')}»)`);
      assert(await espera(page, `window.__qa('.ops a').length === 6`), `U1 la portada no lista las 6 operaciones (${await page.evaluate<number>("window.__qa('.ops a').length")})`);
      assertEquals(await page.evaluate<number>("(window.__q('iswc-doc-index')?.items ?? []).length"), 7, 'U1 el índice trae portada + 6 operaciones');

      // U2
      await page.evaluate(`(window.__paginas = [], document.addEventListener('iswc-server-api-docs-page', (e) => window.__paginas.push(e.detail.id)), window.__marca = 1)`);
      await page.evaluate(`window.__qa('.ops a').find((a) => a.textContent.includes('Detalle de una conversación')).click()`);
      assert(await espera(page, `window.__h1() === 'Detalle de una conversación'`), `U2 no abrió la operación (h1 = «${await page.evaluate<string>('window.__h1()')}»)`);
      const compartida = page.url();
      assert(new URL(compartida).searchParams.get('s'), `U2 la URL no guarda la operación en ?s= (${compartida})`);
      assertEquals(await page.evaluate<number>('window.__marca'), 1, 'U2 abrir la operación recargó la página');
      assert((await page.evaluate<string[]>('window.__paginas')).includes('get_conversacion_by_iconversacion'), 'U2 sin evento de página con el id');
      const otra = await nav.newPage();
      vigilar(otra);
      await otra.goto(compartida, { waitUntil: 'load' });
      await otra.evaluate(AYUDA);
      assert(await espera(otra, `window.__h1() === 'Detalle de una conversación'`), 'U2 la URL compartida no reabrió la operación');

      // U3
      await page.evaluate(`(window.__respuestas = [], document.addEventListener('iswc-server-api-docs-response', (e) => window.__respuestas.push(e.detail)))`);
      await page.evaluate(`window.__q('iswc-input.campo[data-nombre="iconversacion"]').value = 'c-42'`);
      await page.evaluate(`window.__q('iswc-button.enviar').click()`);
      assert(await espera(page, `(window.__respuestas || []).length === 1`), 'U3 «Probar» no terminó la petición');
      const r = await page.evaluate<{ status: number; url: string }>('window.__respuestas[0]');
      assertEquals(r.status, 200, 'U3 estado');
      assertEquals(r.url, `${origen}/api/conversacion/c-42`, 'U3 mismo origen + /api + parámetro de ruta');
      assert(pedidas.includes('GET /api/conversacion/c-42'), `U3 el host no recibió la petición: ${pedidas.join(', ')}`);
      assert(await espera(page, `(window.__q('iswc-tag.estado')?.textContent || '').startsWith('200')`), 'U3 el estado 200 no se muestra');

      // U4
      const prop = await nav.newPage();
      vigilar(prop);
      await prop.goto(`${origen}/prop.html`, { waitUntil: 'load' });
      await prop.evaluate(AYUDA);
      assert(await espera(prop, `window.__h1() === 'API PatyIA'`), 'U4 el documento asignado por propiedad no se pintó');
      assertEquals(await prop.evaluate<boolean>(`document.getElementById('v').validacion.ok`), true, 'U4 validación Zod expuesta');

      // U5
      const malo = await nav.newPage();
      vigilar(malo);
      await malo.goto(`${origen}/malo.html`, { waitUntil: 'load' });
      await malo.evaluate(AYUDA);
      assert(await espera(malo, `(window.__q('.errores')?.textContent || '').includes('no se puede mostrar')`), 'U5 el documento inválido no muestra su error');

      // U6
      assertEquals(errores, [], `U6 errores en consola:\n${errores.join('\n')}`);
    } finally {
      await nav.close();
      ac.abort();
      await srv.finished;
    }
  },
});
