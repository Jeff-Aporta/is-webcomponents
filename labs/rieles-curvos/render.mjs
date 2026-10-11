// labs/rieles-curvos/render.mjs
// Matriz de estilos de riel sobre diagramas reales del ISS: cada base se pinta en
// `orthogonal`, `curved`, `bezier` y `sketch` (servilleta: look="sketch", que usa bezier).
// El router no cambia entre estilos: las curvas siguen exactamente el mismo recorrido.
//
// Uso: deno run -A --no-check labs/rieles-curvos/render.mjs [base…]

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { labDir, renderLab } from '../../src/vendor-distributions/tools/render-lab.ts';

const LAB = labDir(import.meta.url);
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

process.exit(await renderLab(LAB, jobs));
