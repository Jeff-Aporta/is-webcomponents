// @vendor 2026-10-14T13:21:59.537Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/client/tools/render-lab.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
/**
 * render-lab.ts — lo común de los `render.mjs` de `labs/`: arma los jobs desde los editables de una
 * carpeta (o desde una lista), renderiza el lote con `renderDiagramBatch` sirviendo la raíz del kit
 * (dist/cdn) y escribe `<out>/<id>.svg` + `.png`. Devuelve cuántos fallaron (el lab hace `exit`).
 *
 *   const LAB = labDir(import.meta.url);
 *   const jobs = await jobsDeEditables(join(LAB, 'payloads'), { only: process.argv.slice(2) });
 *   process.exit(await renderLab(LAB, jobs));
 *
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/tools/render-lab.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./render-diagram.js`, `../../shared/schemas.ts` (secciones `render-lab`, `render-diagram`).
 * Skill: skills/iswc-diagramas-enriquecidos/SKILL.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDiagramBatch, writeDiagramOutputs } from './render-diagram.js';
import type { Editable, LabJob, OpcionesEditables, OpcionesLab, RenderDiagramOptions, SyntheticDiagramJob } from '../../shared/schemas.ts';

/** Carpeta del lab a partir de `import.meta.url` de su `render.mjs`. */
export const labDir = (metaUrl: string): string => dirname(fileURLToPath(metaUrl));

/** Un job por editable `.json` de `dir` (ordenados), con las referencias resueltas contra el archivo. */
export async function jobsDeEditables(dir: string, op: OpcionesEditables = {}): Promise<LabJob[]> {
  const only = new Set(op.only ?? []);
  const soporte = new Set(op.soporte ?? []);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && !soporte.has(f)).sort();
  const jobs: LabJob[] = [];
  for (const f of files) {
    const spec = JSON.parse(await readFile(join(dir, f), 'utf8')) as Editable;
    const slug = spec.slug || f.replace(/\.json$/, '');
    if (only.size && !only.has(slug)) continue;
    jobs.push({ id: slug, job: jobDeEditable(spec, join(dir, f), op) });
  }
  return jobs;
}

/** Job sintético de un editable (`tag`, `script` y `attrs` propios, o los defaults del lab). */
export function jobDeEditable(spec: Editable, archivo: string, op: OpcionesEditables = {}): SyntheticDiagramJob {
  return {
    tag: spec.tag || op.tag || 'iswc-flowchart',
    scriptUrl: `dist/cdn/${spec.script || op.script || 'diagrams/flowchart.min.js'}`,
    payload: spec.payload,
    payloadBase: archivo,
    attrs: spec.attrs || op.attrs || { 'diagram-style': 'insoft' },
  };
}

/** Renderiza el lote y escribe los SVG/PNG en `out`; devuelve cuántos fallaron. */
export async function renderLab(lab: string, jobs: readonly LabJob[], op: OpcionesLab = {}): Promise<number> {
  if (!jobs.length) {
    console.error('sin payloads que coincidan');
    return 1;
  }
  const out = op.outDir ?? join(lab, 'out');
  await mkdir(out, { recursive: true });
  const chromium = op.chromium ?? (createRequire(import.meta.url)('playwright') as { chromium: RenderDiagramOptions['chromium'] }).chromium;
  const results = await renderDiagramBatch([...jobs], {
    ...op,
    chromium,
    serveRoot: op.serveRoot ?? resolve(lab, '..', '..'),
    timeoutMs: op.timeoutMs ?? 300_000,
    settleMs: op.settleMs ?? 600,
    png: op.png ?? true,
  });
  let failed = 0;
  for (const r of results) {
    if (r.error || !r.result) {
      failed++;
      console.error(`FAIL ${r.id}: ${r.error || 'sin result'}`);
      continue;
    }
    const svg = join(out, `${r.id}.svg`);
    await writeDiagramOutputs(r.result, svg, svg.replace(/\.svg$/, '.png'));
    console.log(`OK ${r.id}.svg (${r.result.svg.length} bytes, ${r.result.width}x${r.result.height}${r.result.png ? `, png=${r.result.png.byteLength}B` : ''})`);
  }
  return failed;
}
