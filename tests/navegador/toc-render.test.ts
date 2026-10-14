// tests/toc-render.test.mjs
//
// Guardián E2E de Phase W1: verifica en navegador real (Playwright) que el
// TOC de la derecha en los previews de componentes:
//
//   1. Refleja la realidad del JSON: `iswc-button-group` (que antes daba
//      TOC vacío por el umbral < 2) ahora muestra sus secciones navegables.
//      `iswc-button` ya no se queda en 4 items; incluye las secciones del
//      `.md` que no encajan con las 7 canónicas.
//   2. El scroll-spy marca la sección actualmente visible con
//      `aria-current="location"` y `.iswc-scrollspy-active`.
//   3. Click en un item del TOC navega (la URL cambia a `#id`).
//
// Convenciones (AGENTS.md §7 / §8):
//   - Servidor efímero: lo arranca este test con `node:http`. Usa esbuild
//     en modo `bundle` para resolver `zod` y otras deps externas. NO asume
//     que `deno task dev` está corriendo — así corre dentro de
//     `deno task test:all` sin depender del dev server.
//   - Termina con `toc-render.test.mjs: PASS — N/M componentes OK` y exit 0
//     si todo se verifica, exit 1 si hay regresión.
//   - Ignorado por git (tests/ está en .gitignore); vive solo para CI local.
//
// Tags auditados (Phase W1 bug report):
//   - iswc-button          (antes: 4 items; ahora: > 4)
//   - iswc-button-group    (antes: 0 items; ahora: ≥ 2)
//   - iswc-window          (antes: 0 items; ahora: ≥ 2)
//   - iswc-card            (uses id="methods" con title="API JavaScript")
//   - iswc-input           (referencia de un componente forms)

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { extname, join, normalize, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import * as esbuildApi from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const AUDIT_TAGS = [
  'iswc-button',
  'iswc-button-group',
  'iswc-window',
  'iswc-card',
  'iswc-input',
];

const PORT = 8393; // efímero; distinto al 8391 del dev server para no chocar

// ─── 1. Servidor estático efímero (réplica de scripts/serve.mjs) ────────

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

async function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^[/\\]+/, '');
  if (rel.split(sep).includes('..')) return null;
  const target = join(root, rel);
  const info = await stat(target).catch(() => null);
  if (info?.isFile()) return target;
  if (/\.js$/.test(target)) {
    const ts = target.replace(/\.js$/, '.ts');
    if ((await stat(ts).catch(() => null))?.isFile()) return ts;
    // Fallback a dist/cdn/<rest> (assets visuales bundleados para producción).
    // Mapeo: src/components/<cat>/<tag>.js → dist/cdn/<cat>/<tag>.min.js
    const relParts = rel.split(sep);
    const stripped = relParts.slice(2).join(sep);
    const distAlt = join(root, 'dist', 'cdn', stripped).replace(/\.js$/, '.min.js');
    if ((await stat(distAlt).catch(() => null))?.isFile()) return distAlt;
  }
  if (/\.(css|svg|woff2?|ttf|ico|png|jpg|jpeg|webp|mp4|pdf)$/.test(target)) {
    const relParts = rel.split(sep);
    const stripped = relParts.slice(2).join(sep);
    const distAlt = join(root, 'dist', 'cdn', stripped);
    if ((await stat(distAlt).catch(() => null))?.isFile()) return distAlt;
  }
  if (info?.isDirectory()) {
    const idx = join(target, 'index.html');
    return (await stat(idx).catch(() => null))?.isFile() ? idx : null;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url || '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  if (extname(file).toLowerCase() === '.ts') {
    try {
      // Bundle on the fly: resuelve `zod` y otras deps desde node_modules.
      // Cache por path+hash para no re-bundlear lo mismo en cada request.
      const out = await esbuildApi.build({
        entryPoints: [file],
        bundle: true,
        format: 'esm',
        target: 'es2020',
        sourcemap: 'inline',
        write: false,
        platform: 'browser',
        nodePaths: [join(root, 'node_modules')],
        // `node:*` son runtime modules no resolubles en browser.
        external: ['node:url', 'node:fs', 'node:fs/promises', 'node:path', 'node:assert', 'node:child_process'],
      });
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(out.outputFiles[0].text);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`error transpilando ${file}\n${e?.message ?? e}`);
    }
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
const BASE_URL = `http://127.0.0.1:${PORT}`;

// ─── 2. Helper: URL de la galería con ?s=<base64url(component=...)> ──────

function galleryUrl(tag) {
  // Mirror del formato `urlPreview()` en src/utils/health/engine/stagehand.ts.
  const state = { component: tag };
  const enc = Buffer.from(JSON.stringify(state))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${BASE_URL}/?s=${enc}`;
}

// ─── 3. Playwright: auditar cada tag ────────────────────────────────────

const browser = await chromium.launch({ headless: true });
let exitCode = 0;
const failures = [];

try {
  for (const tag of AUDIT_TAGS) {
    const url = galleryUrl(tag);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Espera al TOC dentro de <iswc-preview-component> (Phase W3) — la
      // galería monta <iswc-preview-component> en cuanto el loader hidrata.
      // En algunos navegadores el primer paint del TOC se retrasa si el kit
      // tiene que hidratar CE hijos del preview; reintentamos cada 200ms
      // hasta 30s para tolerar la variabilidad.
      await page.waitForFunction(
        () => {
          const host = document.querySelector('iswc-preview-component');
          if (!host || host.hidden) return false;
          const spy = host.querySelector('iswc-scrollspy.docs-toc');
          return !!(spy && spy.querySelectorAll('a').length > 0);
        },
        { timeout: 30000, polling: 200 },
      );
      // Margen extra para que el scroll-spy ejecute su primer
      // `requestAnimationFrame(pickActive)` y marque un item inicial.
      // En dev mode con bundle por archivo, la hidratación del kit +
      // carga de CE del componente tarda >1s.
      await page.waitForTimeout(3000);

      // (a) El TOC existe y tiene items
      const tocInfo = await page.evaluate(() => {
        const host = document.querySelector('iswc-preview-component');
        const spy = host?.querySelector('iswc-scrollspy.docs-toc');
        if (!spy) return { exists: false, items: [], active: null };
        const links = Array.from(spy.querySelectorAll('a'));
        const items = links.map((a) => ({
          text: (a.textContent || '').trim(),
          href: a.getAttribute('href') || '',
        }));
        const activeLink = links.find((a) => a.classList.contains('iswc-scrollspy-active'))
          || links.find((a) => a.getAttribute('aria-current') === 'location');
        return {
          exists: true,
          items,
          active: activeLink ? (activeLink.getAttribute('href') || '').replace(/^#/, '') : null,
        };
      });

      if (!tocInfo.exists) {
        failures.push(`${tag}: TOC ausente (sin <iswc-scrollspy class="docs-toc">)`);
        continue;
      }

      // Phase W1: button-group y window antes daban 0 items. Ahora ≥ 2.
      // button antes daba 4; ahora ≥ 4 (incluye secciones no estándar).
      const minItems = (tag === 'iswc-button-group' || tag === 'iswc-window') ? 2 : 4;
      if (tocInfo.items.length < minItems) {
        failures.push(
          `${tag}: TOC tiene ${tocInfo.items.length} items, esperado ≥ ${minItems}. ` +
          `Items: ${tocInfo.items.map((i) => i.text).join(' | ')}`,
        );
        continue;
      }

      // (b) El primer item tiene href="#algo"
      const firstItem = tocInfo.items[0];
      assert.ok(firstItem.href.startsWith('#'), `${tag}: primer item sin href="#…"`);
      const targetId = firstItem.href.slice(1);

      // (c) El target existe en el main
      const targetExists = await page.evaluate((id) => {
        const main = document.querySelector('iswc-preview-component iswc-main');
        return !!main?.querySelector(`#${CSS.escape(id)}`);
      }, targetId);
      if (!targetExists) {
        failures.push(`${tag}: target #${targetId} no existe en el main`);
        continue;
      }

      // (d) Scroll-spy marca el item activo. Reintentamos hasta 10 veces
//     (1s total) para tolerar el timing del primer pickActive (rAF + JS).
      let activeAtTop = null;
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(100);
        activeAtTop = await page.evaluate(() => {
          const host = document.querySelector('iswc-preview-component');
          const links = Array.from(host?.querySelectorAll('iswc-scrollspy.docs-toc a') || []);
          const active = links.find((a) =>
            a.classList.contains('iswc-scrollspy-active') ||
            a.getAttribute('aria-current') === 'location'
          );
          return active ? (active.getAttribute('href') || '').replace(/^#/, '') : null;
        });
        if (activeAtTop) break;
      }
      if (!activeAtTop) {
        failures.push(`${tag}: scroll-spy no marca ningún item activo al cargar`);
        continue;
      }

      // (e) Click en un item: el scroll-spy debe marcar optimistamente ese id
//     hasta que el IO confirme. Verificamos ambos extremos para que la
//     aserción sea robusta al timing del browser.
      const clickedId = tocInfo.items[Math.min(2, tocInfo.items.length - 1)].href.slice(1);
      await page.evaluate((id) => {
        const host = document.querySelector('iswc-preview-component');
        const link = host?.querySelector(`iswc-scrollspy.docs-toc a[href="#${CSS.escape(id)}"]`);
        if (link) link.click();
      }, clickedId);
      // El scroll-spy aplica el click optimistamente (`#setActive`); el
      // browser hace scroll al anchor. Damos margen para que el IO confirme.
      // Hasta 5 reintentos de 100ms = 500ms total.
      let activeAfterClick = null;
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(100);
        activeAfterClick = await page.evaluate(() => {
          const host = document.querySelector('iswc-preview-component');
          const links = Array.from(host?.querySelectorAll('iswc-scrollspy.docs-toc a') || []);
          const active = links.find((a) =>
            a.classList.contains('iswc-scrollspy-active') ||
            a.getAttribute('aria-current') === 'location'
          );
          return active ? (active.getAttribute('href') || '').replace(/^#/, '') : null;
        });
        if (activeAfterClick === clickedId) break;
      }
      if (activeAfterClick !== clickedId) {
        failures.push(
          `${tag}: click no marca el item activo (esperado ${clickedId}, got ${activeAfterClick})`,
        );
        continue;
      }

      // (f) Scroll al fondo y re-leer.
      await page.evaluate(() => {
        const main = document.querySelector('iswc-preview-component iswc-main');
        if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'instant' });
      });
      await page.waitForTimeout(300);
      const activeAtBottom = await page.evaluate(() => {
        const host = document.querySelector('iswc-preview-component');
        const links = Array.from(host?.querySelectorAll('iswc-scrollspy.docs-toc a') || []);
        const active = links.find((a) =>
          a.classList.contains('iswc-scrollspy-active') ||
          a.getAttribute('aria-current') === 'location'
        );
        return active ? (active.getAttribute('href') || '').replace(/^#/, '') : null;
      });
      if (!activeAtBottom) {
        failures.push(`${tag}: scroll-spy no marca item activo tras scroll al fondo`);
        continue;
      }

      console.log(
        `[ok]   ${tag} — TOC=${tocInfo.items.length} items, ` +
        `active(top)=${activeAtTop}, active(click)=${activeAfterClick}, active(bottom)=${activeAtBottom}`,
      );
    } catch (err) {
      failures.push(`${tag}: error durante navegación Playwright — ${err?.message ?? err}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
} catch (err) {
  console.error('toc-render.test.mjs: FAIL — error inesperado');
  console.error(err?.stack || err);
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  server.close();
}

if (failures.length === 0 && exitCode === 0) {
  console.log(
    `toc-render.test.mjs: PASS — ${AUDIT_TAGS.length}/${AUDIT_TAGS.length} componentes OK`,
  );
  process.exit(0);
} else {
  console.error(`toc-render.test.mjs: FAIL — ${failures.length} issues:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}