// @contexto INDICE.md · tests/navegador/README.md
// tests/navegador/scrollspy-restore.test.ts
//
// Guardián E2E de Phase W10: verifica en navegador real (Playwright) que el
// scroll-spy de los previews de componente persiste el id del anchor activo
// en `localStorage` y lo restaura al hacer F5:
//
//   1. Al marcar una sección como activa (vía click en el TOC o scroll) se
//      escribe `iswc:root['iswc-scrollspy'][storageKey].activeId` con
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
// Uso: node tests/navegador/scrollspy-restore.test.ts

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cerrarChromium } from '../_shared/navegador.ts';
import { lanzarChromium } from '../_shared/navegador.ts';
import * as esbuildApi from 'esbuild';
import { aliasKit } from '../../src/cdn/build/alias.ts';
import { cssVirtual } from '../../src/cdn/build/css-virtual.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

// E2E con navegador real: 2 tags × varias cargas de página con F5 y esperas al IO: ~50 s medidos (el default
// del runner es 30 s). 180 s deja margen con la máquina cargada.
test('navegador/scrollspy-restore', { timeout: 180_000 }, async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  
  const AUDIT_TAGS = [
    'iswc-button',
    'iswc-card',
  ];
  
  
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
      const distAlt = join(root, 'dist', 'cdn', stripped).replace(/\.js$/, '.min.mjs');
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
          plugins: [aliasKit(), cssVirtual()],
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
  
  // Puerto libre que asigna el SO (listen(0)): un puerto fijo choca con el dev
  // server u otras corridas en paralelo (EADDRINUSE en doListen).
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const BASE_URL = `http://127.0.0.1:${server.address().port}`;
  
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
        const raw = localStorage.getItem('iswc:root');
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
        const raw = localStorage.getItem('iswc:root');
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && data['iswc-scrollspy']) {
          delete data['iswc-scrollspy'];
          localStorage.setItem('iswc:root', JSON.stringify(data));
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
  
  // Click en el enlace del TOC → optimistic setActive + persistencia debounced (200 ms; el IO tarda 1-2 frames). Con
  // la máquina cargada (gate completo) el primer click puede caer antes de que el scrollspy enganche sus enlaces y la
  // pref no se escribe: se reintenta hasta 6 veces, 750 ms cada una, en vez de esperar un tiempo fijo.
  async function clicHastaPref(page, id, storageKey) {
    let pref = null;
    for (let intento = 0; intento < 6; intento++) {
      await page.evaluate((anchor) => {
        const host = document.querySelector('iswc-preview-component');
        const link = host?.querySelector(`iswc-scrollspy.docs-toc a[href="#${CSS.escape(anchor)}"]`);
        if (link) link.click();
      }, id);
      await page.waitForTimeout(750);
      pref = await readActiveAnchorPref(page, storageKey);
      if (pref?.activeId === id) break;
    }
    return pref;
  }

  async function waitForMain(page) {
    await page.waitForFunction(() => {
      const host = document.querySelector('iswc-preview-component');
      if (!host || host.hidden) return false;
      // El TOC con sus enlaces, no solo el <iswc-main>: con el equipo cargado el TOC llega después.
      return !!host.querySelector('iswc-main') && host.querySelectorAll('iswc-scrollspy.docs-toc a[href^="#"]').length >= 2;
    }, { timeout: 30000, polling: 100 });
    // Margen para que el IO del scroll-spy ejecute su primer pickActive.
    await page.waitForTimeout(2500);
  }
  
  // ─── 4. Playwright: auditar cada tag ────────────────────────────────────
  
  // Edge headless del sistema (regla del repo: nunca el Chrome del usuario), hermético: todo host que no sea el
  // servidor efímero no resuelve. Así la prueba no depende de la red y cubre siempre el caso «sin red»: el @import de
  // fuentes web de doc-presentation cae y el loader no debe quitar la hoja ni bajar a los espejos (rojo de F7b).
  const browser = await lanzarChromium({ args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] }).catch((e) => { server.close(); throw e; });
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

        // Sin red el @import de fuentes web de doc-presentation cae: la hoja del kit sigue puesta (no se quita ni se
        // pide a los espejos: core/preview/… da 404 y la ref por api.github.com tampoco resuelve).
        const hojas = await page1.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href));
        checksTotal += 1;
        const presentacion = hojas.filter((h) => /\/preview\/doc-presentation\.min\.css/.test(h));
        if (presentacion.length === 1 && !presentacion[0].includes('/core/preview/')) {
          checksPass += 1;
          console.log(`[ok]   ${tag} [no-guard] doc-presentation sigue enlazada sin red (${new URL(presentacion[0]).pathname})`);
        } else {
          failures.push(`${tag} [no-guard]: hoja doc-presentation sin red: ${JSON.stringify(presentacion)} (esperada una, la de dist/cdn/preview/)`);
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
  
          const pref = await clicHastaPref(page2, pickedAnchor, storageKey);
  
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
            if (!main) return { found: false, top: -1, delta: -1, max: -1, height: -1, client: -1 };
            const section = main.querySelector(`#${CSS.escape(id)}`);
            if (!section) return { found: false, top: Math.round(main.scrollTop), delta: -1, max: -1, height: -1, client: -1 };
            // Posición esperada: la sección debe estar cerca del top del viewport
            // del main. Calculamos la distancia entre sectionTop y main.scrollTop.
            const r = section.getBoundingClientRect();
            const mr = main.getBoundingClientRect();
            const delta = Math.round(r.top - mr.top);
            const max = main.scrollHeight - main.clientHeight;
            return { found: true, top: Math.round(main.scrollTop), delta, max, height: main.scrollHeight, client: main.clientHeight };
          }, pickedAnchor);
          checksTotal += 1;
          if (!restored.found) {
            failures.push(`${tag} [restore]: tras F5, no se encontró #${pickedAnchor} en <iswc-main>`);
          } else {
            // La restauración deja el encabezado elegido en el tope del área de scroll: |delta| ≤ TOLERANCIA (el
            // scroll-margin del encabezado da unos −10 px). Solo si el scroll quedó topado al fondo (la sección está
            // tan abajo que no puede subir hasta el tope) basta con que el encabezado quede dentro del área visible.
            // Antes se aceptaba cualquier delta positivo: una restauración que no ocurrió (scrollTop=0, la sección
            // abajo) pasaba por buena.
            const TOLERANCIA = 40;
            const alTope = Math.abs(restored.delta) <= TOLERANCIA;
            const topadoAlFondo = restored.max > 0 && restored.top >= restored.max - 2
              && restored.delta >= -TOLERANCIA && restored.delta < restored.client;
            if (restored.top <= 4 || !(alTope || topadoAlFondo)) {
              failures.push(
                `${tag} [restore]: tras F5, #${pickedAnchor} dista ${restored.delta}px del top del main ` +
                `(scrollTop=${restored.top}, max=${restored.max}, alto visible=${restored.client}). ` +
                `Esperado |delta| ≤ ${TOLERANCIA}px (o dentro del área visible si el scroll quedó topado al fondo).`,
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
  
          // Sembrar pref: marcar la sección y dejar que persista (mismos reintentos de clic que el caso 2).
          const beforeTopPref = await clicHastaPref(page3, pickedAnchor, storageKey);
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
    // `browser.close()` del Edge del sistema a veces no resuelve: cerrarChromium no cuelga la prueba.
    await cerrarChromium(browser);
    server.closeAllConnections?.();
    server.close();
  }
  
  if (failures.length === 0 && exitCode === 0) {
    console.log(
      `scrollspy-restore.test.mjs: PASS — ${checksPass}/${checksTotal} checks ` +
      `(${tagSummary.join(', ')})`,
    );
    return;
  } else {
    console.error(
      `scrollspy-restore.test.mjs: FAIL — ${failures.length} issues (${checksPass}/${checksTotal} checks OK):`,
    );
    for (const f of failures) console.error(`  - ${f}`);
    // El mensaje lleva las fallas: el runner solo muestra el error (el stderr del proceso no llega al log del gate).
    throw new Error(failures.length ? `${failures.length} falla(s): ${failures.join(' · ')}` : 'error inesperado fuera de los casos');
  }
});

export default lista();
