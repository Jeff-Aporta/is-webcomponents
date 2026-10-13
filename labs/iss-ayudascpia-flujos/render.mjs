// labs/iss-ayudascpia-flujos/render.mjs
// Renderiza los diagramas de flujo (actividad) del ISS-AyudasCPIA con el kit local (dist/cdn) y el
// estilo InSoft. Cada payload de `payloads/` tiene el MISMO formato que el editable de
// docs-experimental/diagramas del ISS: se copia tal cual cuando el diseño cierra. Las referencias
// { path, query, actions } del payload se resuelven contra el editable.
//
// Uso: deno run -A --no-check labs/iss-ayudascpia-flujos/render.mjs [slug…]
import { join } from 'node:path';
import { jobsDeEditables, labDir, renderLab } from '../../src/vendor-distributions/client/tools/render-lab.ts';

const LAB = labDir(import.meta.url);
// Solo soporte de incrustación (`src` de secuencia-subproceso): no se dibuja como diagrama propio.
const jobs = await jobsDeEditables(join(LAB, 'payloads'), { only: process.argv.slice(2), soporte: ['parches-de-datos.json'] });
process.exit(await renderLab(LAB, jobs));
