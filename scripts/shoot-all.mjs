// scripts/shoot-all.mjs
// Captura screenshots de todos los demos del catalogo (los que tienen behavior)
// y los guarda en .shots/<tag>.png. Para auditoria visual.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT_DIR = join(ROOT, '.shots');

const BASE = 'http://127.0.0.1:8491';
mkdirSync(OUT_DIR, { recursive: true });

// Extrae los tags con behavior usando node + experimental-strip-types.
const probe = `
import catalog from './src/previews/catalog.ts';
const tags = Object.keys(catalog).filter((t) => !!catalog[t]?.behavior).sort();
process.stdout.write(JSON.stringify(tags));
`;
const r = spawnSync('node', ['--experimental-strip-types', '--eval', probe], {
  encoding: 'utf8',
  cwd: ROOT,
});
if (r.status !== 0) {
  console.error('error extrayendo tags:', r.stderr);
  process.exit(1);
}
const tags = JSON.parse(r.stdout);
console.log(`Capturando ${tags.length} demos...`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let ok = 0, fail = 0;
for (const tag of tags) {
  const state = Buffer.from(JSON.stringify({ component: tag }), 'utf8').toString('base64url');
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?s=${state}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(OUT_DIR, `${tag}.png`), fullPage: false });
    ok++;
  } catch (e) {
    console.log(`FAIL ${tag}: ${e.message.slice(0, 60)}`);
    fail++;
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(`\n${ok}/${tags.length} capturados, ${fail} fail`);
console.log(`Salida: ${OUT_DIR}`);
