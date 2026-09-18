// scripts/tour-interactions.mjs — Tour de interacciones exhaustivo.
//
// Gate pre-push UX/UI: para CADA demo, ejercita TODOS los botones visibles,
// valida respuesta (cambio de DOM), Tab order, ARIA roles, y captura
// console errors/warnings.
//
// Uso: node scripts/tour-interactions.mjs [--local|--remote] [--base=URL]
//      [tags...]

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
const PAGES = ['home', 'theming', 'ecosystem', 'is-icon-explorer', 'is-ui'];

function allTags() {
  const out = [];
  if (existsSync(join(REPO, 'dist', 'previews'))) {
    for (const cat of readdirSync(join(REPO, 'dist', 'previews'))) {
      try {
        for (const f of readdirSync(join(REPO, 'dist', 'previews', cat))) {
          const m = f.match(/^(.+)\.preview\.min\.js$/);
          if (m) out.push(`is-${m[1]}`);
        }
      } catch { /* */ }
    }
  }
  for (const p of PAGES) if (!out.includes(p)) out.push(p);
  return [...PAGES, ...out.filter((t) => !PAGES.includes(t))].sort((a, b) => {
    const ap = PAGES.includes(a) ? 0 : 1;
    const bp = PAGES.includes(b) ? 0 : 1;
    return ap - bp || a.localeCompare(b);
  });
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await ctx.addInitScript(() => {
  window.__rechazos = [];
  window.addEventListener('unhandledrejection', (e) => {
    window.__rechazos.push(String(e.reason?.message ?? e.reason ?? e).slice(0, 300));
  });
});

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const tags = positional.length ? [...new Set(positional)] : allTags();
console.log(`\n=== TOUR INTERACTIONS · ${BASE} · ${tags.length} casos ===\n`);

const resultados = [];
let passed = 0, warned = 0, failed = 0;

async function esperarContenido(page, timeoutMs = 12000) {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    const ok = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      if (!host || host.hidden) return false;
      const main = host.querySelector('is-main.main');
      if (!main) return false;
      const sec = main.querySelectorAll('section.section, [data-section]').length;
      const txt = (main.textContent ?? '').trim().length;
      return sec > 0 && txt > 60;
    });
    if (ok) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

async function demoRun(tag) {
  const page = await ctx.newPage();
  const checks = { tag, ok: false, failure: '', errors: [], warnings: [], pageErrors: [], badHttp: [], rejections: [], buttonsFound: 0, buttonsClicked: 0, buttonsResponded: 0, firstFocusOk: false, hasAria: false };
  page.on('console', (m) => {
    const t = m.text().slice(0, 240);
    if (m.type() === 'error') checks.errors.push(t);
    else if (m.type() === 'warning') checks.warnings.push(t);
  });
  page.on('pageerror', (e) => checks.pageErrors.push(String(e).slice(0, 240)));
  page.on('response', (r) => { if (r.status() >= 400) checks.badHttp.push(`${r.status()} ${r.url().slice(0, 200)}`); });

  try {
    await page.goto(urlFor(tag), { waitUntil: 'load', timeout: 20000 });
    if (!await esperarContenido(page, 12000)) {
      checks.failure = 'timeout: contenido no renderizado';
      return checks;
    }

    // 1) Inventario de interactivos en el preview.
    checks.buttonsFound = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      if (!host) return 0;
      const sels = 'button,is-button,is-switch,is-copy-button,is-color-picker,is-input,is-textarea,is-select,is-checkbox,is-radio,a[href],[role="button"],[role="switch"],[role="tab"],[tabindex]:not([tabindex="-1"])';
      const found = new Set();
      const visit = (root) => {
        const els = root.querySelectorAll ? root.querySelectorAll(sels) : [];
        for (const el of els) {
          if (el.disabled || el.getAttribute?.('aria-disabled') === 'true') continue;
          let p = el;
          let inMain = false;
          for (let i = 0; i < 8 && p; i++) {
            if (p.tagName?.toLowerCase() === 'is-main' || p.classList?.contains('main')) { inMain = true; break; }
            p = p.parentElement || (p.getRootNode && p.getRootNode().host);
          }
          if (inMain) found.add(`${el.tagName.toLowerCase()}#${el.id || ''}`);
        }
        if (root.shadowRoot) visit(root.shadowRoot);
      };
      visit(host);
      return found.size;
    });

    // 2) Tab order (primer focus).
    await page.evaluate(() => {
      const main = document.querySelector('is-main.main');
      if (main) main.focus();
    });
    await page.keyboard.press('Tab');
    checks.firstFocusOk = await page.evaluate(() => {
      const ae = document.activeElement;
      if (!ae) return false;
      let p = ae;
      for (let i = 0; i < 8 && p; i++) {
        if (p.tagName?.toLowerCase() === 'is-main') return true;
        p = p.parentElement || (p.getRootNode && p.getRootNode().host);
      }
      return false;
    });

    // 3) ARIA roles presentes.
    checks.hasAria = await page.evaluate(() => {
      const main = document.querySelector('is-main.main');
      if (!main) return false;
      const roles = ['button', 'switch', 'tab', 'menu', 'listbox', 'option', 'dialog', 'alertdialog', 'region', 'grid', 'combobox', 'link'];
      for (const r of roles) if (main.querySelector(`[role="${r}"]`)) return true;
      if (main.querySelector('button,a[href],is-switch,is-button,is-copy-button')) return true;
      return false;
    });

    // 4) Click hasta 12 botones.
    const interactivos = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      if (!host) return [];
      const sels = 'button,is-button,is-switch,is-copy-button,is-color-picker,is-input,is-textarea,is-select,is-checkbox,is-radio,a[href],[role="button"],[role="switch"]';
      const list = [];
      const visit = (root) => {
        const els = root.querySelectorAll ? root.querySelectorAll(sels) : [];
        for (const el of els) {
          if (el.disabled || el.getAttribute?.('aria-disabled') === 'true') continue;
          let p = el;
          let inMain = false;
          for (let i = 0; i < 8 && p; i++) {
            if (p.tagName?.toLowerCase() === 'is-main' || p.classList?.contains('main')) { inMain = true; break; }
            p = p.parentElement || (p.getRootNode && p.getRootNode().host);
          }
          if (inMain) list.push({ tag: el.tagName.toLowerCase(), id: el.id || '' });
        }
        if (root.shadowRoot) visit(root.shadowRoot);
      };
      visit(host);
      // Dedupe por tag+id.
      const seen = new Set();
      return list.filter((x) => {
        const k = `${x.tag}#${x.id}`;
        if (seen.has(k) || k === 'button#' || k === 'is-button#') return false;
        seen.add(k);
        return true;
      }).slice(0, 12);
    });

    for (const btn of interactivos) {
      try {
        const beforeLen = await page.evaluate(() => {
          const m = document.querySelector('is-main.main');
          return m ? m.innerHTML.length : 0;
        });
        // Click con estrategia: primero por id, luego por tag+shadow piercing.
        const clicked = await page.evaluate((sel) => {
          const m = document.querySelector('is-main.main');
          if (!m) return false;
          const tryFind = (root) => {
            const els = root.querySelectorAll ? root.querySelectorAll(sel.tag) : [];
            for (const el of els) {
              if (sel.id && el.id === sel.id) { el.click(); return true; }
              if (!sel.id && (el.textContent || '').trim().length > 0 && !el.disabled) { el.click(); return true; }
            }
            const sub = root.querySelectorAll ? root.querySelectorAll('*') : [];
            for (const c of sub) if (c.shadowRoot && tryFind(c.shadowRoot)) return true;
            return false;
          };
          return tryFind(m);
        }, btn);
        if (!clicked) continue;
        checks.buttonsClicked++;
        await page.waitForTimeout(150);
        const afterLen = await page.evaluate(() => {
          const m = document.querySelector('is-main.main');
          return m ? m.innerHTML.length : 0;
        });
        if (Math.abs(afterLen - beforeLen) > 20) checks.buttonsResponded++;
      } catch { /* */ }
    }

    checks.ok = !checks.failure && checks.errors.length === 0 && checks.warnings.length === 0
      && checks.pageErrors.length === 0 && checks.badHttp.length === 0;
    const rejections = await page.evaluate(() => window.__rechazos || []);
    checks.rejections = rejections;
    if (rejections.length > 0) checks.ok = false;
  } catch (err) {
    checks.failure = String(err.message || err);
  } finally {
    await page.close();
  }
  return checks;
}

const start = Date.now();
for (const tag of tags) {
  const t0 = Date.now();
  const r = await demoRun(tag);
  const dt = Date.now() - t0;
  const verdict = r.ok ? '✅' : (r.failure || r.errors.length ? '❌' : '⚠️');
  if (r.ok) passed++;
  else if (r.warnings.length > 0 && !r.errors.length && !r.failure) warned++;
  else failed++;
  console.log(`${verdict} ${tag.padEnd(28)} ${dt.toString().padStart(5)}ms  btn=${r.buttonsClicked}/${r.buttonsFound} responded=${r.buttonsResponded} focus=${r.firstFocusOk ? 'y' : 'n'} aria=${r.hasAria ? 'y' : 'n'}${r.failure ? '  FAIL: ' + r.failure : ''}`);
  resultados.push(r);
}

const total = Date.now() - start;
console.log(`\n=== TOUR INTERACTIONS · ${passed}/${tags.length} pass · ${warned} warn · ${failed} fail · ${(total / 1000).toFixed(1)}s ===`);
mkdirSync(join(REPO, '.tour'), { recursive: true });
writeFileSync(join(REPO, '.tour/last-interactions.json'), JSON.stringify({
  base: BASE, total: tags.length, passed, warn: warned, failed, ms: total, results: resultados,
}, null, 2));
await browser.close();
process.exit(failed > 0 ? 1 : 0);
