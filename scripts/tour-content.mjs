// scripts/tour-content.mjs — Tour de contenido end-to-end.
//
// A diferencia de tour-deploy (HTTP) y tour-stagehand (network+console.error),
// este tour verifica que CADA caso tenga CONTENIDO REAL renderizado en el DOM,
// porque HTTP 200 + 0 console.error NO es "funciona" (punto ciego §0 del handoff
// 2026-09-18). El bug original (§3.A): JsonPreview pisaba `sections: []` en el
// constructor; render.ts itera `def.sections`, así que con el array vacio no se
// pintaba NADA aunque el JSON hubiera cargado perfecto.
//
// Aserciones por caso (TODAS obligatorias; una sola falla ⇒ caso rojo):
//   - HTTP: ninguna respuesta con status >= 400.
//   - Console: ninguna entrada type=error NI type=warning (incluye el
//     "[registry] behavior missing …" que el tour viejo ignoraba).
//   - pageerror, unhandledrejection: vacios.
//   - requestfailed: SOLO se tolera net::ERR_ABORTED (churn de re-render de
//     <is-icon>, evidenciado en probe-icons.mjs: 0 fallos reales, todos los
//     iconos terminan con status=200). Cualquier OTRO motivo (DNS, ERR_*, etc.)
//     falla.
//   - Render: <is-preview-component id="previewHost"> presente, con
//     `host.preview.definition.sections.length > 0` (el campo bugueado, NO un
//     umbral de texto que el chrome puede satisfacer) Y al menos un
//     `section.section` en el DOM Y mainText > 200.
//   - Paginas (home/theming/ecosystem): marcadores regex especificos.
//   - Componentes (no pages): customElements.get(tag) definido Y <tag>
//     instanciado en el DOM (incluyendo shadow roots).
//
// Casos (sin muestreo):
//   1. index.html raiz (sin ?s=) — verifica que la galeria bootea.
//   2. Las 3 paginas: home, theming, ecosystem.
//   3. Los 64 demos (dist/previews/<cat>/*.preview.min.js).
//   4. Recorrido del nav real (#shellNav .shell-nav__item[data-tag=…]) haciendo
//      click en cada item y validando que el re-render cumple lo mismo.
//
// Salida: reporte por caso en stdout + .tour/last.json. exit 0 solo si TODO pasa.

import { chromium } from 'playwright';
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const BASE = (() => {
  if (process.argv.includes('--remote')) return 'https://jeff-aporta.github.io/is-webcomponents';
  if (process.argv.includes('--local')) return 'http://127.0.0.1:8491';
  const eq = process.argv.find((a) => a.startsWith('--base='));
  return eq ? eq.slice(7) : 'http://127.0.0.1:8491';
})();

const B64 = (s) => Buffer.from(s, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const urlFor = (tag) => `${BASE}/?s=${B64(JSON.stringify({ component: tag }))}`;

const PAGES = ['home', 'theming', 'ecosystem'];
const PAGE_MARKERS = {
  home: [/IS Web Components|Componentes|kit/i, /cat(?:egorías|egory)|sección|hero/i],
  theming: [/theming|palette|theme|tema|paleta|color/i],
  ecosystem: [/ecosistema|ecosystem|componentes|categor/i],
};

function allTags() {
  const out = [];
  if (existsSync(join(REPO, 'dist', 'previews'))) {
    for (const cat of readdirSync(join(REPO, 'dist', 'previews'))) {
      try {
        for (const f of readdirSync(join(REPO, 'dist', 'previews', cat))) {
          const m = f.match(/^(.+)\.preview\.min\.js$/);
          if (m) out.push(`is-${m[1]}`);
        }
      } catch { /* dir no legible */ }
    }
  }
  for (const p of PAGES) if (!out.includes(p)) out.push(p);
  return [...PAGES, ...out.filter((t) => !PAGES.includes(t))].sort((a, b) => {
    // Páginas primero, luego alfabético.
    const ap = PAGES.includes(a) ? 0 : 1;
    const bp = PAGES.includes(b) ? 0 : 1;
    return ap - bp || a.localeCompare(b);
  });
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// unhandledrejection no se expone directamente; capturarlo via init script.
await page.addInitScript(() => {
  window.__rechazos = [];
  window.addEventListener('unhandledrejection', (e) => {
    window.__rechazos.push(String(e.reason?.message ?? e.reason ?? e).slice(0, 300));
  });
});

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const tags = positional.length ? [...new Set(positional)] : allTags();
console.log(`\n=== TOUR CONTENT · ${BASE} · ${tags.length} casos (3 pages + ${tags.length - PAGES.length} demos) ===\n`);

const resultados = [];

async function esperarContenido(timeoutMs = 15000) {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    const ok = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      if (!host || host.hidden) return false;
      const main = host.querySelector('is-main.main');
      if (!main) return false;
      const secciones = main.querySelectorAll('section.section, [data-section]').length;
      const texto = (main.textContent ?? '').trim().length;
      return secciones > 0 && texto > 60;
    });
    if (ok) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

async function visitar(tag, { via = 'url' } = {}) {
  const checks = { tag, via, ok: false, failure: '', errores: [], warnings: [], pageErrors: [], rejections: [], badHttp: [], failedNet: [], metrics: null };
  const consoleErrs = [];
  const consoleWarns = [];
  const pageErrors = [];
  const badHttp = [];
  const failedNet = [];
  const onConsole = (m) => {
    if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 240));
    else if (m.type() === 'warning') consoleWarns.push(m.text().slice(0, 240));
  };
  const onPageError = (e) => pageErrors.push(String(e).slice(0, 240));
  const onResponse = (r) => { if (r.status() >= 400) badHttp.push(`${r.status()} ${r.url().slice(0, 200)}`); };
  const onFailed = (r) => failedNet.push(`${r.failure()?.errorText ?? '?'} ${r.url().slice(0, 200)}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);

  try {
    if (via === 'nav') {
      const sel = `#shellNav .shell-nav__item[data-tag="${tag}"]`;
      const clicked = await page.locator(sel).first().click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (!clicked) checks.failure = `nav click: ${sel} no encontrado o no clickeable`;
    } else {
      await page.goto(urlFor(tag), { waitUntil: 'load', timeout: 20000 });
    }

    if (!checks.failure) {
      const listo = await esperarContenido(15000);
      if (!listo) {
        checks.failure = 'timeout: contenido no renderizado tras 15s';
        // Diagnostico post-timeout: leer las metricas igual para que el mensaje
        // apunte a la causa real (p.ej. definition.sections=0 = bug §3.A).
        checks.metrics = await page.evaluate(() => {
          const host = document.getElementById('previewHost');
          const main = host?.querySelector('is-main.main');
          const def = host?.preview?.definition;
          return {
            hostPresent: !!host,
            mainTextLen: (main?.textContent ?? '').trim().length,
            sectionsRendered: main?.querySelectorAll('section.section, [data-section]').length ?? 0,
            definitionSections: Array.isArray(def?.sections) ? def.sections.length : null,
            definitionTag: def?.tag ?? null,
          };
        });
        if (checks.metrics.definitionSections === 0) {
          checks.failure += ` — definition.sections=0 (bug §3.A del handoff: JsonPreview pisa con [])`;
        } else if (checks.metrics.sectionsRendered === 0) {
          checks.failure += ` — 0 section.section en DOM pese a def.sections=${checks.metrics.definitionSections}`;
        } else if (checks.metrics.mainTextLen < 60) {
          checks.failure += ` — mainTextLen=${checks.metrics.mainTextLen} (umbral 60 del predicate)`;
        }
      }
    }

    if (!checks.failure) {
      checks.metrics = await page.evaluate(() => {
        const host = document.getElementById('previewHost');
        const main = host?.querySelector('is-main.main');
        const def = host?.preview?.definition;
        return {
          hostPresent: !!host,
          mainTextLen: (main?.textContent ?? '').trim().length,
          sectionsRendered: main?.querySelectorAll('section.section, [data-section]').length ?? 0,
          definitionSections: Array.isArray(def?.sections) ? def.sections.length : null,
          definitionTag: def?.tag ?? null,
        };
      });

      // Validación FUERTE del campo bugueado: definition.sections > 0.
      if (!checks.metrics.definitionSections || checks.metrics.definitionSections <= 0) {
        checks.failure = `definition.sections=${checks.metrics.definitionSections} (esperaba >0). Bug §3.A del handoff.`;
      } else if (!checks.metrics.sectionsRendered) {
        checks.failure = `0 section.section en el DOM (esperaba >=1)`;
      } else if (checks.metrics.mainTextLen < 200) {
        checks.failure = `mainTextLen=${checks.metrics.mainTextLen} (umbral 200)`;
      }

      // Marcadores por página.
      const markers = PAGE_MARKERS[tag];
      if (!checks.failure && markers) {
        const txt = await page.evaluate(() => (document.getElementById('previewHost')?.textContent ?? '').toLowerCase());
        const hit = markers.some((re) => re.test(txt));
        if (!hit) checks.failure = `marcadores de pagina no encontrados: ${markers.map((r) => r.toString()).join('|')}`;
      }

      // Validación de custom element + instancias (solo componentes, no pages).
      const isPage = PAGES.includes(tag);
      if (!checks.failure && !isPage) {
        const ceInfo = await page.evaluate((t) => {
          const defined = !!customElements.get(t);
          let inst = 0;
          for (const el of document.querySelectorAll('*')) {
            if (el.tagName.toLowerCase() === t.toLowerCase()) inst++;
            const sr = el.shadowRoot;
            if (sr) {
              for (const c of sr.querySelectorAll('*')) {
                if (c.tagName.toLowerCase() === t.toLowerCase()) inst++;
              }
            }
          }
          return { defined, instances: inst };
        }, tag);
        if (!ceInfo.defined) checks.failure = `customElements.get(${tag}) === undefined (tag no registrado)`;
        else if (ceInfo.instances === 0) checks.failure = `<${tag}> no esta instanciado en el DOM (ni en shadow roots)`;
      }
    }

    checks.rejections = await page.evaluate(() => (window.__rechazos ?? []).slice());
    // Limpiar para el siguiente caso
    await page.evaluate(() => { window.__rechazos = []; });

    // requestfailed: ABORTED es churn benigno; el resto falla.
    const realFails = failedNet.filter((s) => !/ABORTED/i.test(s));
    checks.failedNet = realFails;
    if (realFails.length) checks.failure = checks.failure || `requestfailed (no ABORTED): ${realFails[0].slice(0, 120)}`;

    checks.errores = consoleErrs;
    checks.warnings = consoleWarns;
    checks.pageErrors = pageErrors;
    checks.badHttp = badHttp;
    if (consoleErrs.length) checks.failure = checks.failure || `console.error: ${consoleErrs[0].slice(0, 140)}`;
    if (consoleWarns.length) checks.failure = checks.failure || `console.warn: ${consoleWarns[0].slice(0, 140)}`;
    if (pageErrors.length) checks.failure = checks.failure || `pageerror: ${pageErrors[0].slice(0, 140)}`;
    if (badHttp.length) checks.failure = checks.failure || `HTTP ${badHttp[0].split(' ')[0]}: ${badHttp[0].split(' ').slice(1).join(' ').slice(0, 100)}`;
    if (checks.rejections.length) checks.failure = checks.failure || `unhandledrejection: ${checks.rejections[0].slice(0, 140)}`;
  } catch (err) {
    checks.failure = checks.failure || `excepcion: ${String(err).slice(0, 150)}`;
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('response', onResponse);
  page.off('requestfailed', onFailed);
  checks.ok = !checks.failure;
  resultados.push(checks);

  const status = checks.ok ? '✓' : '✗';
  const m = checks.metrics;
  const met = m ? `defSec=${m.definitionSections} domSec=${m.sectionsRendered} txt=${m.mainTextLen}` : '';
  console.log(`  ${status} [${via}] ${tag.padEnd(22)} ${met} ${checks.failure ? '— ' + checks.failure.slice(0, 90) : ''}`);
  if (!checks.ok) {
    if (checks.errores.length) console.log(`      console.error: ${checks.errores[0].slice(0, 130)}`);
    if (checks.warnings.length) console.log(`      console.warn:  ${checks.warnings[0].slice(0, 130)}`);
    if (checks.pageErrors.length) console.log(`      pageerror:    ${checks.pageErrors[0].slice(0, 130)}`);
    if (checks.badHttp.length) console.log(`      badHttp:      ${checks.badHttp[0].slice(0, 130)}`);
    if (checks.failedNet.length) console.log(`      failedNet:    ${checks.failedNet[0].slice(0, 130)}`);
  }
  return checks;
}

// ── 1. index.html raíz ──
{
  const bootErrs = [];
  const bootBad = [];
  const bootFails = [];
  const onC = (m) => { if (m.type() === 'error' || m.type() === 'warning') bootErrs.push(`${m.type()}: ${m.text().slice(0, 200)}`); };
  const onR = (r) => { if (r.status() >= 400) bootBad.push(`${r.status()} ${r.url().slice(0, 200)}`); };
  const onF = (r) => { const t = r.failure()?.errorText ?? ''; if (!/ABORTED/i.test(t)) bootFails.push(`${t} ${r.url().slice(0, 200)}`); };
  page.on('console', onC);
  page.on('response', onR);
  page.on('requestfailed', onF);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  const boot = await page.evaluate(() => ({
    shell: document.documentElement.hasAttribute('data-kit-shell'),
    host: !!document.getElementById('previewHost'),
    navItems: document.querySelectorAll('#shellNav .shell-nav__item').length,
  }));
  page.off('console', onC);
  page.off('response', onR);
  page.off('requestfailed', onF);
  const okBoot = boot.shell && boot.host && boot.navItems > 0 && bootErrs.length === 0 && bootBad.length === 0 && bootFails.length === 0;
  resultados.push({
    tag: '<index root>', via: 'root', ok: okBoot,
    failure: okBoot ? '' : `boot shell=${boot.shell} host=${boot.host} navItems=${boot.navItems} errs=${bootErrs.length} bad=${bootBad.length} fail=${bootFails.length}`,
    errores: bootErrs.filter((e) => e.startsWith('error:')),
    warnings: bootErrs.filter((e) => e.startsWith('warning:')),
    badHttp: bootBad, failedNet: bootFails,
  });
  console.log(`  ${okBoot ? '✓' : '✗'} [root] <index root>             shell=${boot.shell} host=${boot.host} navItems=${boot.navItems}`);
}

// ── 2 & 3. Páginas + demos via URL ──
console.log(`\n--- via URL (?s=<tag>) ---`);
for (const tag of tags) {
  await visitar(tag, { via: 'url' });
}

// ── 4. Recorrido del nav real (click en cada item) ──
console.log(`\n--- via NAV (#shellNav click) ---`);
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
try {
  await page.waitForSelector('#shellNav .shell-nav__item', { timeout: 10000 });
} catch { /* se reportara en el primer nav */ }
for (const tag of tags) {
  await visitar(tag, { via: 'nav' });
}

// ── Reporte ──
const okCount = resultados.filter((r) => r.ok).length;
const failCount = resultados.length - okCount;
console.log(`\n${'─'.repeat(72)}`);
console.log(`  Total: ${resultados.length}  ·  ✓ ${okCount}  ·  ✗ ${failCount}`);

mkdirSync(join(REPO, '.tour'), { recursive: true });
writeFileSync(
  join(REPO, '.tour', 'last.json'),
  JSON.stringify({
    base: BASE,
    fecha: new Date().toISOString(),
    total: resultados.length,
    ok: okCount,
    fail: failCount,
    resultados,
  }, null, 2),
);
console.log(`  Evidencia: .tour/last.json`);

await browser.close();
process.exit(failCount > 0 ? 1 : 0);
