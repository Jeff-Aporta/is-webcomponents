// labs/iss-ayudascpia-clases/render.mjs
// Render del diagrama de clases ISS·AyudasCPIA con el kit local (dist/cdn).
// Uso: deno run -A --no-check labs/iss-ayudascpia-clases/render.mjs
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { labDir, renderLab } from '../../src/vendor-distributions/client/tools/render-lab.ts';

const LAB = labDir(import.meta.url);
const payload = JSON.parse(await readFile(join(LAB, 'payload.json'), 'utf8'));
process.exit(await renderLab(LAB, [{
  id: 'clases',
  job: { tag: 'iswc-class-diagram', scriptUrl: 'dist/cdn/diagrams/class-diagram.min.js', payload, attrs: { 'diagram-style': 'insoft' } },
}], { settleMs: 500 }));
