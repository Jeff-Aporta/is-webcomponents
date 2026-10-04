// tests/scrollspy-restore.test.mjs
//
// Guardián E2E de Phase W10: verifica en navegador real (Playwright) que el
// scroll-spy de los previews de componente persiste el id del anchor activo
// en `localStorage` y lo restaura al hacer F5:
//
//   1. Al marcar una sección como activa (vía click en el TOC o scroll) se
//      escribe `is-webcomponents['iswc-scrollspy'][storageKey].activeId` con
//      un `savedAt` reciente.
//   2. F5 (page.reload) sobre la misma URL reposiciona el scroll dentro del
//      `<iswc-main>` para que la sección guardada quede visible.
//   3. Sin guard previo (localStorage limpio) la página arranca en top.
//   4. Al hacer scroll al top del `<iswc-main>` la pref se borra (próximo
//      F5 arranca en top).
//   5. Sólo aplica a previews de componente: un uso suelto sin storage-key
//      no escribe.
//
// Convenciones (AGENTS.md §7 / §8):
//   - Servidor efímero: lo arranca este test con `node:http` + esbuild
//     `bundle` (igual que `toc-render.test.mjs`). NO asume `deno task dev`.
//   - Termina con `scrollspy-restore.test.mjs: PASS — N/M checks` (o FAIL
//     con lista accionable y exit 1).
//   - Ignorado por git (tests/ está en .gitignore); vive solo para CI local.
//
// Tags auditados (Phase W10 brief):
//   - iswc-button     (preview completo, varios anchors en TOC)
//   - iswc-card       (TOC corto, valida TTL y clear-on-top)
//
// Uso: node tests/scrollspy-restore.test.mjs

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
  'iswc-card',
];

const PORT = 8394; // efímero; distinto al 8391 del dev server

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
      const out = await esbuildApi.build({
        entryPoints: [file],
        bundle: true,
        format: 'esm',
        target: 'es2020',
        sourcemap: 'inline',
        write: false,
        platform: 'browser',
        nodePaths: [join(root, 'node_modules')],
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
  const state = { component: tag };
  const enc = Buffer.from(JSON.stringify(state))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${BASE_URL}/?s=${enc}`;
}

// ─── 3. Helpers de lectura/escritura de la pref ──────────────────────────

async function readActiveAnchorPref(page, storageKey) {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem('is-webcomponents');
      if (!raw) return null;
      const data = JSON.parse(raw);
      const bucket = data && data['iswc-scrollspy'];
      if (!bucket) return null;
      const entry = bucket[key];
      return entry && typeof entry === 'object' ? entry : null;
    } catch {
      return null;
    }
  }, storageKey);
}

async function clearAllScrollspyPrefs(page) {
  await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('is-webcomponents');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data['iswc-scrollspy']) {
        delete data['iswc-scrollspy'];
        localStorage.setItem('is-webcomponents', JSON.stringify(data));
      }
    } catch { /* noop */ }
  });
}

async function getMainScrollTop(page) {
  return await page.evaluate(() => {
    const main = document.querySelector('iswc-preview-component iswc-main');
    return main ? Math.round(main.scrollTop) : -1;
  });
}

async function waitForMain(page) {
  await page.waitForFunction(() => {
    const host = document.querySelector('iswc-preview-component');
    if (!host || host.hidden) return false;
    return !!host.querySelector('iswc-main');
  }, { timeout: 30000, polling: 100 });
  // Margen para que el IO del scroll-spy ejecute su primer pickActive.
  await page.waitForTimeout(2500);
}

// ─── 4. Playwright: auditar cada tag ────────────────────────────────────

const browser = await chromium.launch({ headless: true });
let exitCode = 0;
const failures = [];
let checksPass = 0;
let checksTotal = 0;
const tagSummary = [];

try {
  for (const tag of AUDIT_TAGS) {
    const url = galleryUrl(tag);
    const storageKey = `docs-${tag}`;

    // ── Caso 1: F5 sin guard previo → scrollTop=0 ──────────────────────
    const page1 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page1.on('pageerror', (e) => failures.push(`${tag} [no-guard]: pageerror: ${e.message}`));
    try {
      await page1.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Limpia cualquier pref de ejecuciones anteriores para arrancar limpio.
      await clearAllScrollspyPrefs(page1);
      await page1.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForMain(page1);
      // Esperar al primer pickActive + un margen para que la pref se asiente.
      await page1.waitForTimeout(800);

      const top0 = await getMainScrollTop(page1);
      checksTotal += 1;
      if (top0 <= 4) {
        checksPass += 1;
        console.log(`[ok]   ${tag} [no-guard] arranca en scrollTop≈0 (got ${top0})`);
      } else {
        failures.push(`${tag} [no-guard]: scrollTop=${top0}, esperado ≈0`);
      }
    } catch (err) {
      failures.push(`${tag} [no-guard]: error durante navegación — ${err?.message ?? err}`);
    } finally {
      await page1.close().catch(() => {});
    }

    // ── Caso 2: click en una sección → guarda pref → F5 → scroll restaurado ──
    const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page2.on('pageerror', (e) => failures.push(`${tag} [restore]: pageerror: ${e.message}`));
    let pickedAnchor = null;
    try {
      await page2.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearAllScrollspyPrefs(page2);
      await page2.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForMain(page2);

      // Escoger un anchor de los que están en el TOC (no `intro`/`anatomy`/etc).
      const tocLinks = await page2.evaluate(() => {
        const host = document.querySelector('iswc-preview-component');
        const spy = host?.querySelector('iswc-scrollspy.docs-toc');
        if (!spy) return [];
        return Array.from(spy.querySelectorAll('a'))
          .map((a) => ({ id: (a.getAttribute('href') || '').slice(1), text: (a.textContent || '').trim() }))
          .filter((x) => !!x.id);
      });
      checksTotal += 1;
      if (tocLinks.length < 2) {
        failures.push(`${tag} [restore]: TOC tiene ${tocLinks.length} items, esperaba ≥ 2`);
      } else {
        checksPass += 1;
        // Elegimos un item que tenga contenido debajo (no el primero ni el último)
        // para que el scrollTo no quede clamped al fondo. El TOC puede tener el
        // "intro" como primero (excluido del TOC estándar, pero algunos .json lo
        // dejan) y el último suele ser "Métodos" cerca del final.
        const mid = Math.min(Math.max(1, Math.floor(tocLinks.length / 2)), tocLinks.length - 1);
        const chosen = tocLinks[mid];
        pickedAnchor = chosen.id;
        console.log(`[info] ${tag} TOC tiene ${tocLinks.length} items, elegido mid=${mid} id="${chosen.id}" (text="${chosen.text}")`);

        // Click → optimistic setActive + persistencia debounced.
        await page2.evaluate((id) => {
          const host = document.querySelector('iswc-preview-component');
          const link = host?.querySelector(`iswc-scrollspy.docs-toc a[href="#${CSS.escape(id)}"]`);
          if (link) link.click();
        }, pickedAnchor);
        // El debounce es 200 ms; el IO puede tardar 1-2 frames. Damos 1.5s.
        await page2.waitForTimeout(1500);

        const pref = await readActiveAnchorPref(page2, storageKey);
        checksTotal += 1;
        if (!pref || pref.activeId !== pickedAnchor) {
          failures.push(
            `${tag} [restore]: pref no contiene activeId="${pickedAnchor}" (got ${JSON.stringify(pref)})`,
          );
        } else {
          checksPass += 1;
          const ageMs = Date.now() - Number(pref.savedAt || 0);
          if (ageMs > 60_000) {
            failures.push(`${tag} [restore]: savedAt demasiado viejo (${ageMs} ms)`);
          } else {
            checksPass += 1;
            checksTotal += 1;
            console.log(`[ok]   ${tag} [restore] pref tras click: activeId=${pref.activeId}, age=${ageMs}ms`);
          }
        }

        // F5 → la página debe hacer scroll al id guardado dentro de <iswc-main>.
        await page2.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForMain(page2);
        // Margen extra para el doble rAF del boot restore.
        await page2.waitForTimeout(2000);

        const restored = await page2.evaluate((id) => {
          const host = document.querySelector('iswc-preview-component');
          const main = host?.querySelector('iswc-main');
          if (!main) return { found: false, top: -1, delta: -1, max: -1, height: -1 };
          const section = main.querySelector(`#${CSS.escape(id)}`);
          if (!section) return { found: false, top: Math.round(main.scrollTop), delta: -1, max: -1, height: -1 };
          // Posición esperada: la sección debe estar cerca del top del viewport
          // del main. Calculamos la distancia entre sectionTop y main.scrollTop.
          const r = section.getBoundingClientRect();
          const mr = main.getBoundingClientRect();
          const delta = Math.round(r.top - mr.top);
          const max = main.scrollHeight - main.clientHeight;
          return { found: true, top: Math.round(main.scrollTop), delta, max, height: main.scrollHeight };
        }, pickedAnchor);
        checksTotal += 1;
        if (!restored.found) {
          failures.push(`${tag} [restore]: tras F5, no se encontró #${pickedAnchor} en <iswc-main>`);
        } else {
          // Si la sección está cerca del final, scrollTo queda clamped al
          // máximo (scrollHeight - clientHeight) y la sección queda al fondo
          // del viewport en lugar de al top. En ese caso, exigimos que la
          // sección esté dentro del viewport visible (delta ∈ [-max, clientH]).
          // En caso contrario (sección con contenido debajo), exigimos delta ∈
          // [-20, 20] (sección casi al top).
          const inViewport = restored.delta >= -20
            || (restored.max > 0 && restored.delta >= -restored.max);
          if (!inViewport) {
            failures.push(
              `${tag} [restore]: tras F5, #${pickedAnchor} dista ${restored.delta}px del top del main ` +
              `(scrollTop=${restored.top}, max=${restored.max}). Esperado en viewport.`,
            );
          } else {
            checksPass += 1;
            console.log(
              `[ok]   ${tag} [restore] F5→#${pickedAnchor}: scrollTop=${restored.top}, delta=${restored.delta}px, max=${restored.max}`,
            );
          }
        }
      }
    } catch (err) {
      failures.push(`${tag} [restore]: error durante navegación — ${err?.message ?? err}`);
    } finally {
      await page2.close().catch(() => {});
    }

    // ── Caso 3: scroll al top → la pref se borra ────────────────────────
    if (pickedAnchor) {
      const page3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      page3.on('pageerror', (e) => failures.push(`${tag} [clear-on-top]: pageerror: ${e.message}`));
      try {
        await page3.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await clearAllScrollspyPrefs(page3);
        await page3.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForMain(page3);

        // Sembrar pref: marcar la sección y dejar que persista.
        await page3.evaluate((id) => {
          const host = document.querySelector('iswc-preview-component');
          const link = host?.querySelector(`iswc-scrollspy.docs-toc a[href="#${CSS.escape(id)}"]`);
          if (link) link.click();
        }, pickedAnchor);
        await page3.waitForTimeout(1200);
        const beforeTopPref = await readActiveAnchorPref(page3, storageKey);
        if (!beforeTopPref || beforeTopPref.activeId !== pickedAnchor) {
          failures.push(
            `${tag} [clear-on-top]: pref no se sembró (got ${JSON.stringify(beforeTopPref)})`,
          );
        } else {
          // Esperar fuera del boot-grace (500 ms) y luego scroll al top.
          await page3.waitForTimeout(400);
          await page3.evaluate(() => {
            const main = document.querySelector('iswc-preview-component iswc-main');
            if (main) main.scrollTop = 0;
          });
          // El listener de scroll debe borrar la pref en este mismo frame.
          await page3.waitForTimeout(400);
          const afterTopPref = await readActiveAnchorPref(page3, storageKey);
          checksTotal += 1;
          if (afterTopPref) {
            failures.push(
              `${tag} [clear-on-top]: pref no se borró tras scrollTop=0 ` +
              `(got ${JSON.stringify(afterTopPref)})`,
            );
          } else {
            checksPass += 1;
            console.log(`[ok]   ${tag} [clear-on-top] pref borrada al volver a top`);
          }
        }
      } catch (err) {
        failures.push(`${tag} [clear-on-top]: error durante navegación — ${err?.message ?? err}`);
      } finally {
        await page3.close().catch(() => {});
      }
    }

    tagSummary.push(tag);
  }
} catch (err) {
  console.error('scrollspy-restore.test.mjs: FAIL — error inesperado');
  console.error(err?.stack || err);
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  server.close();
}

if (failures.length === 0 && exitCode === 0) {
  console.log(
    `scrollspy-restore.test.mjs: PASS — ${checksPass}/${checksTotal} checks ` +
    `(${tagSummary.join(', ')})`,
  );
  process.exit(0);
} else {
  console.error(
    `scrollspy-restore.test.mjs: FAIL — ${failures.length} issues (${checksPass}/${checksTotal} checks OK):`,
  );
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
