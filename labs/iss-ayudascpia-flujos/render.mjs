// labs/iss-ayudascpia-flujos/render.mjs
// Renderiza los diagramas de flujo (actividad) del ISS-AyudasCPIA con el kit local
// (dist/cdn) y el estilo InSoft. Cada payload de `payloads/` tiene el MISMO
// formato que el editable de docs-experimental/diagramas del ISS: se copia
// tal cual cuando el diseño cierra.
//
// Uso: deno run -A --no-check labs/iss-ayudascpia-flujos/render.mjs [slug…]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { renderDiagramBatch, writeDiagramOutputs } from '../../src/cdn/tools/index.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..', '..');
const OUT = join(LAB, 'out');
const PAYLOADS = join(LAB, 'payloads');
await mkdir(OUT, { recursive: true });

const only = new Set(process.argv.slice(2));
// Solo soporte de incrustación (`src` de secuencia-subproceso): no se dibuja como diagrama propio.
const SOPORTE = new Set(['parches-de-datos.json']);
const files = (await readdir(PAYLOADS)).filter((f) => f.endsWith('.json') && !SOPORTE.has(f)).sort();
const jobs = [];
for (const f of files) {
  const spec = JSON.parse(await readFile(join(PAYLOADS, f), 'utf8'));
  const slug = spec.slug || f.replace(/\.json$/, '');
  if (only.size && !only.has(slug)) continue;
  jobs.push({
    id: slug,
    job: {
      tag: spec.tag || 'iswc-flowchart',
      scriptUrl: `dist/cdn/${spec.script || 'diagrams/flowchart.min.js'}`,
      payload: spec.payload,
      attrs: spec.attrs || { 'diagram-style': 'insoft' },
    },
  });
}
if (!jobs.length) {
  console.error('sin payloads que coincidan');
  process.exit(1);
}

const results = await renderDiagramBatch(jobs, {
  chromium,
  serveRoot: ROOT,
  timeoutMs: 300_000,
  settleMs: 600,
  png: true,
});

let failed = 0;
for (const r of results) {
  if (r.error || !r.result) {
    failed++;
    console.error(`FAIL ${r.id}: ${r.error || 'sin result'}`);
    continue;
  }
  const svg = join(OUT, `${r.id}.svg`);
  await writeDiagramOutputs(r.result, svg, svg.replace(/\.svg$/, '.png'));
  console.log(`OK ${r.id}.svg (${r.result.svg.length} bytes, ${r.result.width}x${r.result.height})`);
}
process.exit(failed ? 1 : 0);
