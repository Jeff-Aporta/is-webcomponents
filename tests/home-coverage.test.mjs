// tests/home-coverage.test.mjs
//
// Cobertura del home doc de la galería: navega a `http://localhost:8391/`
// con Playwright, captura los tags del catálogo renderizado en
// `nav#shellNav` y los cruza con los `tag` declarados en `src/manifest.ts`.
//
// Por qué un test runtime y no solo `manifest-paths.test`:
//   - El guardián de paths valida archivos en disco; este test valida que la
//     SPA de la galería (`dist/gallery-app.min.js`) realmente pinta cada
//     componente del manifest como un item navegable del catálogo.
//   - Es el canario que detecta regressions en `src/gallery/app.ts` (p.ej. un
//     `navSkip` que filtra de más, o un `categoryMeta` sin el `id` de la
//     categoría de un componente recién añadido).
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `home-coverage.test.mjs: PASS — N/M componentes` (o FAIL con
//     lista de faltantes, y exit 1).
//   - Lee manifest desde disco (no re-evalúa TS). El regex acepta
//     `tag: 'iswc-...'` en cualquier indentación.
//   - Espera al dev server en :8391. Si no responde, falla rápido con un
//     mensaje accionable (corre `deno task dev` en otra terminal).
//
// Conteo histórico (brief 2026-10-03-zod-migration): 133. La cifra real
// actual del manifest es 194 (crecimiento posterior a la zod-migration).
// El test usa la cifra real y reporta N/M honestamente.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const MANIFEST_PATH = join(root, 'src', 'manifest.ts');
const HOME_URL = 'http://localhost:8391/';

// ─── 1. Extraer tags del manifest ──────────────────────────────────────────
const manifestSrc = await readFile(MANIFEST_PATH, 'utf8');
// `tag: 'iswc-...'` con cualquier indentación y separadores antes/después.
const manifestTags = [...manifestSrc.matchAll(/tag:\s*['"](iswc-[a-z0-9-]+)['"]/g)]
  .map((m) => m[1]);
assert.ok(manifestTags.length > 0, `no se encontraron tags en ${MANIFEST_PATH}`);
const manifestSet = new Set(manifestTags);

// ─── 2. Verificar dev server arriba ───────────────────────────────────────
async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    return res;
  } finally {
    clearTimeout(t);
  }
}
{
  const r = await fetchWithTimeout(HOME_URL, 3000);
  assert.equal(r.status, 200, `dev server no responde 200 en ${HOME_URL} (status=${r.status})`);
}

// ─── 3. Playwright: navegar y extraer tags del catálogo ───────────────────
const browser = await chromium.launch();
let exitCode = 0;
let summary = '';
try {
  const page = await browser.newPage();
  await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
  // La galería monta el nav de forma asíncrona tras el loader. Espera al
  // primer item antes de hacer el sweep completo.
  await page.waitForSelector('.shell-nav__item[data-tag]', { timeout: 20000 });
  // Margen extra: hay componentes `module: true` que se hidratan por chunks.
  await page.waitForTimeout(2000);

  const catalogTags = await page.evaluate(() => {
    const items = document.querySelectorAll('.shell-nav__item[data-tag]');
    const tags = [];
    for (const el of items) {
      const t = el.getAttribute('data-tag') || '';
      if (t.startsWith('iswc-')) tags.push(t);
    }
    return tags;
  });
  const catalogSet = new Set(catalogTags);

  const covered = [...manifestSet].filter((t) => catalogSet.has(t)).sort();
  const missing = [...manifestSet].filter((t) => !catalogSet.has(t)).sort();
  const extras = [...catalogSet].filter((t) => !manifestSet.has(t)).sort();

  const total = manifestSet.size;
  const n = covered.length;
  const m = total;

  if (missing.length === 0) {
    summary = `home-coverage.test.mjs: PASS — ${n}/${m} componentes`;
    console.log(summary);
    if (extras.length > 0) {
      console.log(`(nota: ${extras.length} tags en el home no están en el manifest: ${extras.join(', ')})`);
    }
    exitCode = 0;
  } else {
    console.log(`home-coverage.test.mjs: FAIL — ${n}/${m} componentes cubiertos, ${missing.length} faltantes:`);
    for (const t of missing) console.log(`  - ${t}`);
    if (extras.length > 0) {
      console.log(`(extras en home, no en manifest: ${extras.join(', ')})`);
    }
    exitCode = 1;
  }
} catch (err) {
  console.error('home-coverage.test.mjs: FAIL — error durante la navegación Playwright');
  console.error(err?.stack || err);
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
}

process.exit(exitCode);
