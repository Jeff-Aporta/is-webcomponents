// labs/iss-ayudascpia-secuencias/render.mjs
// Renderiza los diagramas de secuencia del ISS-AyudasCPIA con el kit local (dist/cdn) y el estilo
// InSoft. Cada payload de `payloads/` tiene el MISMO formato que el editable de
// docs-experimental/diagramas del ISS: se copia tal cual cuando el diseño cierra.
//
// Uso: deno run -A --no-check labs/iss-ayudascpia-secuencias/render.mjs [slug…]
import { join } from 'node:path';
import { jobsDeEditables, labDir, renderLab } from '../../src/vendor-distributions/client/tools/render-lab.ts';

const LAB = labDir(import.meta.url);
const jobs = await jobsDeEditables(join(LAB, 'payloads'), {
  only: process.argv.slice(2), tag: 'iswc-sequence-diagram', script: 'diagrams/sequence-diagram.min.js',
});
process.exit(await renderLab(LAB, jobs));
