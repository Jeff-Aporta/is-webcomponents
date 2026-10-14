/**
 * Guardián WHAT de UI (E4) del lector `<iswc-md-docs-vault>` en un navegador real (Chromium de Playwright)
 * con el bundle de `dist/cdn` y el libro embebido de su demo. Lo que ve y hace un lector:
 *   U1 sin `?s=` abre la portada (main = README.md) y su título.
 *   U2 un enlace a otra hoja la abre sin recargar, deja `?s=` compartible en la URL y emite
 *      `iswc-md-docs-vault-page` con su ruta.
 *   U3 las flechas → y ← pasan a la hoja siguiente y vuelven a la anterior en el orden del libro.
 *   U4 abrir la URL compartida (con su `?s=`) muestra esa misma hoja.
 *   U5 sin errores de consola ni de página en todo el recorrido.
 *
 * Caja negra: solo DOM visible y URL (sin leer el código del lector). Sin build o sin Chromium se salta.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


const RAIZ = fileURLToPath(new URL('./', import.meta.url));
const BUNDLES = [
  'layout/md-docs-vault', 'layout/doc-layout', 'navigation/doc-index', 'helpers/md-render', 'navigation/pager',
  'media/figure', 'data/meta-list', 'layout/dialog', 'actions/copy-button', 'actions/button',
  'actions/button-group', 'media/icon', 'feedback/spinner', 'layout/callout',
].map((b) => `dist/cdn/${b}.min.js`);

/** El libro del demo (`md-docs-vault.json`): portada, ficha y seguridad, en ese orden. */
async function paginaDemo(): Promise<string> {
  const ficha = JSON.parse(await readFile(join(RAIZ, 'src/components/layout/md-docs-vault.json'), 'utf8')) as {
    sections: Array<{ blocks: Array<{ kind: string; html?: string[] }> }>;
  };
  const demo = ficha.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'demo' && b.html?.some((l) => l.includes('<iswc-md-docs-vault')));
  assert(demo?.html, 'el demo de md-docs-vault no tiene libro embebido');
  return `<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="/dist/cdn/is-base.min.css"><link rel="stylesheet" href="/dist/cdn/palettes.min.css">
${BUNDLES.map((b) => `<script type="module" src="/${b}"></script>`).join('\n')}
</head><body>${demo.html.join('\n')}</body></html>`;
}

const TIPOS: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

type Pagina = {
  goto: (u: string, o?: Record<string, unknown>) => Promise<unknown>;
  url: () => string;
  on: (ev: string, fn: (x: { type?: () => string; text?: () => string; message?: string }) => void) => void;
  locator: (s: string) => { first: () => { waitFor: (o: Record<string, unknown>) => Promise<void>; click: () => Promise<void> } };
  keyboard: { press: (k: string) => Promise<void> };
  evaluate: <T>(fn: string) => Promise<T>;
  waitForFunction: (fn: string, arg?: unknown, o?: Record<string, unknown>) => Promise<unknown>;
  mouse: { click: (x: number, y: number) => Promise<void> };
};
type Navegador = { newPage: () => Promise<Pagina>; close: () => Promise<void> };
let chromium: { launch: (o: Record<string, unknown>) => Promise<Navegador> } | null = null;
try {
  chromium = (createRequire(import.meta.url)('playwright') as { chromium: typeof chromium }).chromium;
} catch { chromium = null; }

/** Título (h1) de la hoja visible: el lector lo pinta dentro de shadow roots anidados. */
const H1 = `(() => {
  const buscar = (r) => { for (const el of r.querySelectorAll('*')) { if (el.tagName === 'H1' && el.textContent.trim()) return el.textContent.trim(); if (el.shadowRoot) { const t = buscar(el.shadowRoot); if (t) return t; } } return ''; };
  return buscar(document);
})()`;

denoTest({
  name: 'md-docs-vault UI: E4 portada, enlace entre hojas con ?s=, flechas y URL compartida (navegador real)',
  ignore: !chromium || BUNDLES.some((b) => !existsSync(join(RAIZ, b))),
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const html = await paginaDemo();
    const ac = new AbortController();
    const srv = Deno.serve({ port: 0, signal: ac.signal, onListen: () => {} }, async (req) => {
      const p = decodeURIComponent(new URL(req.url).pathname);
      if (p === '/' || p === '/vault.html') return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      try {
        return new Response(await Deno.readFile(join(RAIZ, p)), { headers: { 'content-type': TIPOS[extname(p)] ?? 'application/octet-stream' } });
      } catch {
        return new Response('404', { status: 404 });
      }
    });
    const base = `http://127.0.0.1:${(srv.addr as Deno.NetAddr).port}/vault.html`;
    const nav = await chromium!.launch({ headless: true });
    const errores: string[] = [];
    try {
      const page = await nav.newPage();
      page.on('console', (m) => { if (m.type?.() === 'error') errores.push(m.text?.() ?? ''); });
      page.on('pageerror', (e) => errores.push(`pageerror: ${e.message ?? ''}`));
      const tituloEs = (t: string) => page.waitForFunction(`${H1} === ${JSON.stringify(t)}`, undefined, { timeout: 20_000 }).then(() => true, () => false);

      // U1
      await page.goto(base, { waitUntil: 'load' });
      assert(await tituloEs('Mi proyecto'), `U1 la portada no se abrió (h1 = «${await page.evaluate<string>(H1)}»)`);
      assertEquals(new URL(page.url()).searchParams.get('s'), null, 'U1 la portada no lleva ?s=');

      // U2
      await page.evaluate(`(window.__hojas = [], document.addEventListener('iswc-md-docs-vault-page', (e) => window.__hojas.push(e.detail.ruta)), window.__marca = 1)`);
      await page.locator('text=ficha').first().click();
      assert(await tituloEs('Ficha del proyecto'), `U2 el enlace no abrió la ficha (h1 = «${await page.evaluate<string>(H1)}»)`);
      const compartida = page.url();
      assert(new URL(compartida).searchParams.get('s'), `U2 la URL no guarda la hoja en ?s= (${compartida})`);
      assertEquals(await page.evaluate<number>('window.__marca'), 1, 'U2 abrir la hoja recargó la página');
      const hojas = await page.evaluate<string[]>('window.__hojas');
      assert(hojas.some((r) => r.includes('010-Ficha.md')), `U2 iswc-md-docs-vault-page no informó la ficha: ${JSON.stringify(hojas)}`);

      // U3 (el foco fuera de campos: clic en un área neutra de la página)
      await page.mouse.click(5, 5);
      await page.keyboard.press('ArrowRight');
      assert(await tituloEs('Seguridad'), `U3 → no pasó a Seguridad (h1 = «${await page.evaluate<string>(H1)}»)`);
      await page.keyboard.press('ArrowLeft');
      assert(await tituloEs('Ficha del proyecto'), `U3 ← no volvió a la ficha (h1 = «${await page.evaluate<string>(H1)}»)`);

      // U4
      const otra = await nav.newPage();
      otra.on('pageerror', (e) => errores.push(`pageerror: ${e.message ?? ''}`));
      await otra.goto(compartida, { waitUntil: 'load' });
      const ok4 = await otra.waitForFunction(`${H1} === 'Ficha del proyecto'`, undefined, { timeout: 20_000 }).then(() => true, () => false);
      assert(ok4, `U4 la URL compartida no abrió la ficha (h1 = «${await otra.evaluate<string>(H1)}»)`);

      // U5
      assertEquals(errores, [], `U5 errores en consola:\n${errores.join('\n')}`);
    } finally {
      await nav.close();
      ac.abort();
      await srv.finished;
    }
  },
});

export default lista();
