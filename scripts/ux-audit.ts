/**
 * ux-audit.ts — QA UX de la galería: carga cada preview, interactúa demos,
 * captura pantallazos y recolecta errores de consola / pageerror.
 *
 * Uso:
 *   node scripts/serve.mjs 8391          # en otra terminal
 *   node scripts/ux-audit.ts            # barrido completo
 *   node scripts/ux-audit.ts --only is-button,is-toast
 *   node scripts/ux-audit.ts --limit 10
 *   node scripts/ux-audit.ts --port 8391 --out .tmp/ux-audit
 *
 * Playwright: reusa el de Personal/apps/src/screenshot/node_modules.
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
};
const has = (name) => args.includes(`--${name}`);

const PORT = Number(arg('port', '8391'));
const OUT = arg('out', join(root, '.tmp', 'ux-audit'));
const ONLY = (arg('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(arg('limit', '0')) || 0;
const START_SERVER = !has('no-server');

const pwPath = join(root, '..', 'src', 'screenshot', 'node_modules', 'playwright');
const { chromium } = require(pwPath);

const b64url = (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

const canReach = async (port) => {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
    return r.ok || r.status === 404;
  } catch {
    return false;
  }
};

async function ensureServer() {
  if (await canReach(PORT)) {
    console.log(`[ux] reusa http://127.0.0.1:${PORT}/`);
    return null;
  }
  if (!START_SERVER) throw new Error(`Nada escucha en :${PORT} y --no-server`);
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, [join(root, 'scripts', 'serve.mjs'), String(PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 150));
    if (await canReach(PORT)) {
      console.log(`[ux] serve.mjs en :${PORT} (pid ${child.pid})`);
      return child;
    }
  }
  child.kill('SIGTERM');
  throw new Error(`serve.mjs no respondió en :${PORT}`);
}

const manifest = (await import(pathToFileURL(join(root, 'src', 'manifest.js')).href)).default;
let tags = manifest.map((m) => m.tag).filter(Boolean);
// home / theming viven fuera del manifest a veces — añadir si hay preview
try {
  const previewDirs = await readdir(join(root, 'src', 'previews'));
  // no añadir carpetas; home.json está en previews/
} catch { /* ignore */ }

if (ONLY.length) tags = tags.filter((t) => ONLY.includes(t));
if (LIMIT > 0) tags = tags.slice(0, LIMIT);

await mkdir(join(OUT, 'shots'), { recursive: true });

const server = await ensureServer();
const base = `http://127.0.0.1:${PORT}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

/** @type {Array<{tag:string, ok:boolean, demos:number, interactions:number, consoleErrors:string[], pageErrors:string[], issues:string[], shot?:string}>} */
const results = [];

/** Controles del demo. `is-demo` lleva class `demo`; el chrome de código
 *  vive fuera o con clases demo-code-* — no clicarlo. */
const INTERACT_SELECTORS = [
  'is-demo is-button:not([disabled])',
  'is-demo > button:not([disabled]):not(.demo-code-btn):not(.demo-sources-btn):not([data-demo-code])',
  'is-demo is-switch',
  'is-demo is-checkbox',
  'is-demo is-tab[slot="nav"]:not([disabled])',
  'is-demo is-fab',
  'is-demo is-check-icon-button',
  'is-demo is-copy-button',
  'is-demo [role="button"]:not(.demo-code-pop__btn):not(.demo-code-btn)',
].join(', ');

/** Ruido esperado de demos (CDN externos / URLs intencionalmente rotas). */
const isNoiseConsole = (t) => {
  if (/favicon/i.test(t)) return true;
  if (/Download the React DevTools/i.test(t)) return true;
  if (/ERR_NAME_NOT_RESOLVED/i.test(t)) return true;
  if (/pravatar\.cc|i\.pravatar/i.test(t)) return true;
  if (/invalid\.example/i.test(t)) return true;
  if (/interactive-examples\.mdn|mdn\.mozillademos|developer\.mozilla/i.test(t)) return true;
  if (/Failed to load resource:.*net::ERR_/i.test(t)) return true;
  if (/net::ERR_CONNECTION_/i.test(t)) return true;
  return false;
};

for (let i = 0; i < tags.length; i += 1) {
  const tag = tags[i];
  const row = {
    tag,
    ok: true,
    demos: 0,
    sections: 0,
    interactions: 0,
    consoleErrors: [],
    pageErrors: [],
    issues: [],
    shot: null,
  };

  const onConsole = (msg) => {
    if (msg.type() === 'error') row.consoleErrors.push(msg.text().slice(0, 400));
  };
  const onPageError = (err) => {
    row.pageErrors.push(String(err?.message || err).slice(0, 400));
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const url = `${base}/?s=${b64url({ component: tag })}`;
  process.stdout.write(`[${i + 1}/${tags.length}] ${tag} … `);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Preview host o iframe legacy
    await page.waitForFunction(() => {
      const host = document.querySelector('is-preview-component');
      if (host?.preview || host?.querySelector('is-main .section, is-main is-demo, .main .section')) return true;
      const frame = document.querySelector('#previewFrame, iframe');
      return !!frame && !frame.hidden;
    }, { timeout: 20000 }).catch(() => {
      row.issues.push('timeout: preview no montó en 20s');
      row.ok = false;
    });

    await page.waitForTimeout(350);

    row.sections = await page.locator('is-preview-component is-main .section, is-main.main .section').count();
    row.demos = await page.locator('is-preview-component is-demo, is-main.main is-demo').count();

    if (row.sections === 0 && row.demos === 0) {
      // home / theming pueden no usar is-demo
      const mainKids = await page.locator('is-preview-component is-main, is-main.main').count();
      if (!mainKids) {
        row.issues.push('sin contenido en main');
        row.ok = false;
      }
    }

    // Interactuar: hasta 8 controles clickables en demos (sin chrome de código)
    const handles = await page.locator(INTERACT_SELECTORS).elementHandles();
    const max = Math.min(handles.length, 8);
    let clicked = 0;
    for (let k = 0; k < handles.length && clicked < max; k += 1) {
      const inChrome = await handles[k].evaluate((el) => !!el.closest('.demo-code-dd, .demo-code-pop')).catch(() => true);
      if (inChrome) continue;
      try {
        await handles[k].click({ timeout: 1500 });
        row.interactions += 1;
        clicked += 1;
        await page.waitForTimeout(120);
      } catch {
        // Timeout de click no es fallo de componente (overlay, offscreen, etc.).
      }
    }

    // Hover tooltips / first is-button
    const tip = page.locator('is-demo is-tooltip, is-demo [aria-describedby]').first();
    if (await tip.count()) {
      try {
        await tip.hover({ timeout: 1000 });
        row.interactions += 1;
        await page.waitForTimeout(200);
      } catch { /* ignore */ }
    }

    // Detect demos vacíos / altura 0
    const emptyDemos = await page.evaluate(() => {
      const bad = [];
      for (const d of document.querySelectorAll('is-demo')) {
        const r = d.getBoundingClientRect();
        if (r.height < 8) bad.push(d.id || d.getAttribute('label') || 'sin-id');
      }
      return bad.slice(0, 5);
    });
    if (emptyDemos.length) {
      row.issues.push(`demo altura~0: ${emptyDemos.join(', ')}`);
      row.ok = false;
    }

    // Shot del main
    const shotName = `${String(i + 1).padStart(3, '0')}-${tag}.png`;
    const shotPath = join(OUT, 'shots', shotName);
    const main = page.locator('is-preview-component, #previewHost, main.main').first();
    if (await main.count()) {
      await main.screenshot({ path: shotPath, animations: 'disabled' }).catch(async () => {
        await page.screenshot({ path: shotPath, fullPage: true, animations: 'disabled' });
      });
    } else {
      await page.screenshot({ path: shotPath, fullPage: true, animations: 'disabled' });
    }
    row.shot = shotName;

    // Filtrar ruido de consola conocido (red externa / demos rotos a propósito)
    row.consoleErrors = [...new Set(row.consoleErrors)].filter((t) => !isNoiseConsole(t));
    row.pageErrors = [...new Set(row.pageErrors)].filter((t) => !isNoiseConsole(t));
    if (row.consoleErrors.length || row.pageErrors.length) row.ok = false;

  } catch (e) {
    row.ok = false;
    row.issues.push(`exception: ${String(e.message || e).slice(0, 300)}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }

  console.log(row.ok ? `OK demos=${row.demos} ix=${row.interactions}` : `FAIL ${row.issues[0] || row.consoleErrors[0] || 'errores'}`);
  results.push(row);
}

await browser.close();
if (server) server.kill('SIGTERM');

const failed = results.filter((r) => !r.ok);
const summary = {
  generatedAt: new Date().toISOString(),
  base,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  failedTags: failed.map((r) => r.tag),
  results,
};

await writeFile(join(OUT, 'report.json'), `${JSON.stringify(summary, null, 2)}\n`);

const md = [
  `# UX audit — is-webcomponents`,
  ``,
  `- Fecha: ${summary.generatedAt}`,
  `- Base: ${base}`,
  `- Total: **${summary.total}** · Pass: **${summary.passed}** · Fail: **${summary.failed}**`,
  ``,
  summary.failed ? `## Fallos\n` : '## Sin fallos\n',
  ...failed.map((r) => {
    const errs = [
      ...r.issues,
      ...r.pageErrors.map((e) => `pageerror: ${e}`),
      ...r.consoleErrors.slice(0, 3).map((e) => `console: ${e}`),
    ];
    return `### \`${r.tag}\`\n- shot: \`shots/${r.shot}\`\n- demos: ${r.demos}, interactions: ${r.interactions}\n${errs.map((e) => `- ${e}`).join('\n')}\n`;
  }),
  ``,
  `## Todos`,
  ``,
  `| tag | ok | demos | ix | issues |`,
  `| --- | --- | ---: | ---: | --- |`,
  ...results.map((r) => `| ${r.tag} | ${r.ok ? '✓' : '✗'} | ${r.demos} | ${r.interactions} | ${(r.issues[0] || '').replace(/\|/g, '/')} |`),
  ``,
].join('\n');

await writeFile(join(OUT, 'REPORT.md'), md);
console.log(`\n[ux] report → ${join(OUT, 'REPORT.md')}`);
console.log(`[ux] ${summary.passed}/${summary.total} pass · ${summary.failed} fail`);
process.exit(summary.failed ? 1 : 0);
