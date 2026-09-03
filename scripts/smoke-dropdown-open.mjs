// scripts/smoke-dropdown-open.mjs — smoke local: is-dropdown.show() abre <dialog>
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist', 'cdn');
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.map': 'application/json' };

const html = `<!doctype html>
<html><body>
<is-dropdown id="dd">
  <button slot="trigger" type="button">Menú</button>
  <is-dropdown-item value="out">Cerrar sesión</is-dropdown-item>
</is-dropdown>
<script type="module">
  await import('/actions/dropdown.min.js');
  await customElements.whenDefined('is-dropdown');
  window.__ready = true;
</script>
</body></html>`;

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '/smoke.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(html);
    return;
  }
  const rel = urlPath.replace(/^\//, '');
  const path = join(root, rel);
  if (!path.startsWith(root) || !existsSync(path)) {
    res.writeHead(404); res.end('no ' + rel); return;
  }
  res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });

await page.goto(`${base}/smoke.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });

const result = await page.evaluate(() => {
  const dd = document.getElementById('dd');
  const Ctor = customElements.get('is-dropdown');
  const obs = Ctor?.observedAttributes ?? [];
  if (typeof dd.show !== 'function') {
    return { err: 'no show', tag: dd?.localName, ctor: !!Ctor, obs };
  }
  dd.show();
  const dialog = dd.shadowRoot?.querySelector('dialog');
  return {
    observed: obs,
    hostOpen: dd.hasAttribute('open'),
    dialogOpen: !!dialog?.open,
    display: dialog ? getComputedStyle(dialog).display : null,
  };
});

await browser.close();
server.close();

console.log(JSON.stringify(result, null, 2));
if (result.err) throw new Error(result.err);
if (!result.observed?.includes('open')) throw new Error('open no está en observedAttributes');
if (!result.dialogOpen) throw new Error('dialog no abrió tras show()');
console.log('SMOKE OK');
