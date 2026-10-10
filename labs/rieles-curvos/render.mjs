// labs/rieles-curvos/render.mjs
// Matriz de estilos de riel sobre diagramas reales del ISS: cada base se pinta en
// `orthogonal`, `curved`, `bezier` y `sketch` (servilleta: look="sketch", que usa bezier).
// El router no cambia entre estilos: las curvas siguen exactamente el mismo recorrido.
//
// Uso: deno run -A --no-check labs/rieles-curvos/render.mjs [base…]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { renderDiagramBatch, writeDiagramOutputs } from '../../src/cdn/tools/index.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..', '..');
const OUT = join(LAB, 'out');
await mkdir(OUT, { recursive: true });

const labs = (p) => join(LAB, '..', p);
/** Bases: un diagrama real por tipo (editable con `tag/payload/attrs` o payload suelto). */
const BASES = [
  { id: 'flujo-ruta', file: labs('iss-ayudascpia-flujos/payloads/ruta-conversacion-detalle.json') },
  { id: 'flujo', file: labs('iss-ayudascpia-flujos/payloads/conversacion-detalle.json') },
  { id: 'secuencia', file: labs('iss-ayudascpia-secuencias/payloads/archivo-subida.json'), tag: 'iswc-sequence-diagram', script: 'diagrams/sequence-diagram.min.js' },
  { id: 'clases', file: labs('iss-ayudascpia-clases/payload.json'), tag: 'iswc-class-diagram', script: 'diagrams/class-diagram.min.js', attrs: { 'diagram-style': 'insoft' } },
  { id: 'der', file: labs('iss-ayudascpia-der/payload.json'), tag: 'iswc-er-diagram', script: 'diagrams/er-diagram.min.js', attrs: { theme: 'insoft' } },
  { id: 'componentes', file: labs('iss-ayudascpia-componentes/payload.json'), tag: 'iswc-component-diagram', script: 'diagrams/component-diagram.min.js', attrs: { theme: 'insoft-cd', 'min-gap': '72' } },
];
export const ESTILOS = ['orthogonal', 'curved', 'bezier', 'sketch'];

const only = new Set(process.argv.slice(2));
const jobs = [];
for (const b of BASES) {
  if (only.size && !only.has(b.id)) continue;
  const raw = JSON.parse(await readFile(b.file, 'utf8'));
  const editable = raw.payload !== undefined;
  const payload = editable ? raw.payload : raw;
  const tag = (editable && raw.tag) || b.tag || 'iswc-flowchart';
  const script = (editable && raw.script) || b.script || 'diagrams/flowchart.min.js';
  const attrs = (editable && raw.attrs) || b.attrs || { 'diagram-style': 'insoft' };
  for (const estilo of ESTILOS) {
    const sketch = estilo === 'sketch';
    jobs.push({
      id: `${b.id}--${estilo}`,
      job: {
        tag,
        scriptUrl: `dist/cdn/${script}`,
        // `sketch` no fija edgeStyle: lo elige el look (bezier).
        payload: sketch ? payload : { ...payload, edgeStyle: estilo },
        payloadBase: b.file,
        attrs: sketch ? { ...attrs, look: 'sketch' } : attrs,
      },
    });
  }
}

const results = await renderDiagramBatch(jobs, { chromium, serveRoot: ROOT, timeoutMs: 300_000, settleMs: 600, png: true });
let failed = 0;
for (const r of results) {
  if (r.error || !r.result) { failed++; console.log(`FAIL ${r.id}: ${r.error}`); continue; }
  const svg = join(OUT, `${r.id}.svg`);
  await writeDiagramOutputs(r.result, svg, svg.replace(/\.svg$/, '.png'));
  console.log(`OK ${r.id}.svg (${r.result.width}x${r.result.height})`);
}
process.exit(failed ? 1 : 0);
