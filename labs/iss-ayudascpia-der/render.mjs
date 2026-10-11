// labs/iss-ayudascpia-der/render.mjs
// Render del DER ISS·AyudasCPIA con el kit local (dist/cdn) + theme InSoft.
// Uso: deno run -A --no-check labs/iss-ayudascpia-der/render.mjs
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { labDir, renderLab } from '../../src/vendor-distributions/tools/render-lab.ts';

const LAB = labDir(import.meta.url);
const payload = JSON.parse(await readFile(join(LAB, 'payload.json'), 'utf8'));
process.exit(await renderLab(LAB, [{
  id: 'der',
  job: { tag: 'iswc-er-diagram', scriptUrl: 'dist/cdn/diagrams/er-diagram.min.js', payload, attrs: { theme: 'insoft' } },
}], { settleMs: 500 }));
