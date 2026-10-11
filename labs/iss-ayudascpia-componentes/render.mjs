// labs/iss-ayudascpia-componentes/render.mjs
// Render del diagrama de componentes ISS·AyudasCPIA (v2) y del legado (v1) con el kit local.
// Uso: deno run -A --no-check labs/iss-ayudascpia-componentes/render.mjs [v1|v2|all]
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { labDir, renderLab } from '../../src/cdn/tools/render-lab.ts';

const LAB = labDir(import.meta.url);
const arg = (process.argv[2] || 'all').toLowerCase();
const VERSIONES = [
  { id: 'v1-legacy', file: 'payload-v1-legacy.json', solo: 'v1' },
  { id: 'componentes', file: 'payload.json', solo: 'v2' },
];
const jobs = [];
for (const v of VERSIONES) {
  if (arg !== 'all' && arg !== v.solo) continue;
  const payload = JSON.parse(await readFile(join(LAB, v.file), 'utf8'));
  jobs.push({ id: v.id, job: { tag: 'iswc-component-diagram', scriptUrl: 'dist/cdn/diagrams/component-diagram.min.js', payload, attrs: { theme: 'insoft-cd', 'min-gap': '72' } } });
}
// W57+: A* + wrap en este lab puede superar 360 s.
process.exit(await renderLab(LAB, jobs, { timeoutMs: 900_000, settleMs: 500 }));
