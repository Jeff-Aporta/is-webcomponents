// Captura PNG desde SVG ya generado (revisión visual del agente).
// Uso: deno run -A --no-check labs/iss-ayudascpia-componentes/svg-to-png.mjs [nombre.svg]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { sanitizeSvgRoot, staticSvgWrapper } from '../../src/cdn/tools/sanitize-svg.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const LAB = dirname(fileURLToPath(import.meta.url));
const OUT = join(LAB, 'out');
const name = (process.argv[2] || 'componentes.svg').replace(/\\/g, '/');
const svgPath = join(OUT, name.endsWith('.svg') ? name : `${name}.svg`);
const pngPath = svgPath.replace(/\.svg$/i, '.png');

await mkdir(OUT, { recursive: true });
const svgRaw = await readFile(svgPath, 'utf8');
const sano = sanitizeSvgRoot(svgRaw);
const wrap = staticSvgWrapper(sano.svg, {
  width: sano.width,
  height: sano.height,
  cssHrefs: [],
});
const wrapPath = join(tmpdir(), `iswc-png-${Date.now()}.html`);
await writeFile(wrapPath, wrap, 'utf8');

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  if (page.emulateMedia) await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(pathToFileURL(wrapPath).href, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(400);
  const handle = await page.$('svg');
  if (!handle) throw new Error('sin <svg> en wrapper PNG');
  const buf = await handle.screenshot({ type: 'png', scale: 'device', timeout: 60_000 });
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  await writeFile(pngPath, u8);
  console.log(`OK ${pngPath} (${u8.byteLength} bytes, ${sano.width}x${sano.height})`);
  await ctx.close();
} finally {
  await browser.close();
  await rm(wrapPath, { force: true }).catch(() => {});
}
