// labs/iss-ayudascpia-componentes/render.mjs
// Thin wrapper: utilidad transversal src/cdn/tools (vendor = dist/cdn/tools).
// Uso: deno run -A --no-check labs/iss-ayudascpia-componentes/render.mjs [v1|v2|all]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import {
  renderDiagramBatch,
  writeDiagramOutputs,
} from '../../src/cdn/tools/index.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..', '..');
const OUT = join(LAB, 'out');
await mkdir(OUT, { recursive: true });

const arg = (process.argv[2] || 'all').toLowerCase();
const jobs = [];
if (arg === 'all' || arg === 'v1') {
  jobs.push({
    id: 'v1-legacy',
    payloadFile: 'payload-v1-legacy.json',
    out: 'v1-legacy.svg',
  });
}
if (arg === 'all' || arg === 'v2') {
  jobs.push({
    id: 'componentes',
    payloadFile: 'payload.json',
    out: 'componentes.svg',
  });
}

const batch = [];
for (const j of jobs) {
  const payload = JSON.parse(await readFile(join(LAB, j.payloadFile), 'utf8'));
  batch.push({
    id: j.id,
    job: {
      tag: 'iswc-component-diagram',
      scriptUrl: 'dist/cdn/diagrams/component-diagram.min.js',
      payload,
      attrs: { theme: 'insoft-cd', 'min-gap': '72' },
    },
  });
}

// W57+: A* + wrap en este lab puede superar 360s.
// png:true en el batch + svg-to-png.mjs de respaldo (visión del agente).
const results = await renderDiagramBatch(batch, {
  chromium,
  serveRoot: ROOT,
  timeoutMs: 900_000,
  settleMs: 500,
  png: true,
});

const { spawn } = await import('node:child_process');
const runSvgToPng = (svgName) => new Promise((resolve, reject) => {
  const p = spawn(
    'deno',
    ['run', '-A', '--no-check', join(LAB, 'svg-to-png.mjs'), svgName],
    { cwd: ROOT, stdio: 'inherit', shell: true },
  );
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`svg-to-png exit ${code}`))));
});

for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const job = jobs[i];
  if (r.error || !r.result) {
    throw new Error(`FAIL ${r.id}: ${r.error || 'sin result'}`);
  }
  const outSvg = join(OUT, job.out);
  const outPng = outSvg.replace(/\.svg$/i, '.png');
  await writeDiagramOutputs(r.result, outSvg, outPng);
  if (!r.result.png) await runSvgToPng(job.out);
  const pngNote = r.result.png ? `, png=${r.result.png.byteLength}B` : ', png via svg-to-png';
  console.log(`OK ${job.out} (${r.result.svg.length} bytes, ${r.result.width}x${r.result.height}${pngNote})`);
}

console.log('lab render done →', OUT);
