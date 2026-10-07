// labs/iss-ayudascpia-clases/render.mjs
// Render del diagrama de clases ISS·AyudasCPIA con el kit local (dist/cdn).
// Uso: deno run -A --no-check labs/iss-ayudascpia-clases/render.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { renderDiagramBatch, writeDiagramOutputs } from '../../src/cdn/tools/index.ts';

const { chromium } = createRequire(import.meta.url)('playwright');
const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..', '..');
const OUT = join(LAB, 'out');
await mkdir(OUT, { recursive: true });

const payload = JSON.parse(await readFile(join(LAB, 'payload.json'), 'utf8'));
const [r] = await renderDiagramBatch([{
  id: 'clases',
  job: {
    tag: 'iswc-class-diagram',
    scriptUrl: 'dist/cdn/diagrams/class-diagram.min.js',
    payload,
    attrs: {},
  },
}], { chromium, serveRoot: ROOT, timeoutMs: 300_000, settleMs: 500, png: true });

if (r.error || !r.result) throw new Error(`FAIL clases: ${r.error || 'sin result'}`);
const outSvg = join(OUT, 'clases.svg');
await writeDiagramOutputs(r.result, outSvg, outSvg.replace(/\.svg$/, '.png'));
console.log(`OK clases.svg (${r.result.svg.length} bytes, ${r.result.width}x${r.result.height}, png=${r.result.png?.byteLength ?? 0}B)`);
