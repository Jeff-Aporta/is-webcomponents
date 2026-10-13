#!/usr/bin/env node
/**
 * build-online.mjs — bundles ESM AUTOCONTENIDOS de los scripts ONLINE del kit (Jeff, 2026-10-13): lo que los
 * consumidores ejecutan con Deno desde `@main` no es la fuente .ts sino un dist de un solo archivo en `dist/cdn/…`:
 *
 *   src/vendor-distributions/shared/tools/vendor.ts            → dist/cdn/vendor-distributions/shared/tools/vendor.mjs
 *   src/vendor-distributions/shared/tools/pin-update.mjs       → dist/cdn/vendor-distributions/shared/tools/pin-update.mjs
 *   src/vendor-distributions/client/tools/download-iconify.ts  → dist/cdn/vendor-distributions/client/tools/download-iconify.mjs
 *   src/vendor-distributions/client/tools/render-lote.ts       → dist/cdn/vendor-distributions/client/tools/render-lote.mjs
 *   skills/<skill>/tools/<script>.ts                           → dist/cdn/skills/<skill>/tools/<script>.mjs
 *
 * Sin imports relativos (schemas y pin-update inlineados), `node:*`/`npm:*`/`https:` externos, y las dependencias
 * del import map del kit (`zod`…) reescritas a su `npm:` (el bundle corre sin `--import-map`). Nada de
 * `fileURLToPath(import.meta.url)` para localizar hermanos (guardián meta/skills-online.test.ts).
 *
 *   deno run -A scripts/build-online.mjs        (lo llama scripts/build.mjs y el hook pre-commit cuando cambian las fuentes)
 */
import { build } from 'esbuild';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist', 'cdn');

/**
 * Entradas fijas (vendor-distributions) + todo script .ts/.mjs de `tools/` de cada skill.
 * @returns {Promise<Array<[string, string]>>} pares `[fuente relativa al kit, bundle relativo a dist/cdn]`
 */
export async function entradasOnline() {
  /** @type {Array<[string, string]>} */
  const fijas = [
    ['src/vendor-distributions/shared/tools/vendor.ts', 'vendor-distributions/shared/tools/vendor.mjs'],
    ['src/vendor-distributions/shared/tools/pin-update.mjs', 'vendor-distributions/shared/tools/pin-update.mjs'],
    ['src/vendor-distributions/client/tools/download-iconify.ts', 'vendor-distributions/client/tools/download-iconify.mjs'],
    ['src/vendor-distributions/client/tools/render-lote.ts', 'vendor-distributions/client/tools/render-lote.mjs'],
  ];
  /** @type {Array<[string, string]>} */
  const skills = [];
  for (const s of await readdir(join(root, 'skills'), { withFileTypes: true })) {
    if (!s.isDirectory()) continue;
    const tools = join(root, 'skills', s.name, 'tools');
    let names = [];
    try { names = await readdir(tools); } catch { continue; }
    for (const n of names) if (/\.(ts|mjs)$/.test(n)) skills.push([`skills/${s.name}/tools/${n}`, `skills/${s.name}/tools/${n.replace(/\.(ts|mjs)$/, '.mjs')}`]);
  }
  return [...fijas, ...skills];
}

/** Plugin: `node:`, `npm:`, `jsr:`, `https:` quedan externos; un bare del import map del kit pasa a su `npm:`. */
async function pluginExternos() {
  const deno = JSON.parse(await readFile(join(root, 'deno.json'), 'utf8'));
  const mapa = deno.imports ?? {};
  return {
    name: 'online-externos',
    setup(b) {
      b.onResolve({ filter: /^(node:|npm:|jsr:|https?:)/ }, (a) => ({ path: a.path, external: true }));
      b.onResolve({ filter: /^[^./]/ }, (a) => {
        const destino = mapa[a.path] ?? Object.entries(mapa).find(([k]) => k.endsWith('/') && a.path.startsWith(k))?.[1];
        if (destino && /^(npm:|jsr:|https?:)/.test(destino)) return { path: destino, external: true };
        return undefined; // relativo o del node_modules del kit: se inlinea
      });
    },
  };
}

export async function construirOnline(log = console.log) {
  const plugin = await pluginExternos();
  const entradas = await entradasOnline();
  const salidas = [];
  for (const [desde, hacia] of entradas) {
    const outfile = join(dist, hacia);
    await mkdir(dirname(outfile), { recursive: true });
    await build({
      entryPoints: [join(root, desde)],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      minify: false,
      legalComments: 'none',
      banner: { js: `// Bundle autocontenido de ${desde} (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es ${desde}.` },
      plugins: [plugin],
    });
    salidas.push(relative(root, outfile).replaceAll('\\', '/'));
  }
  log(`  ${'online/'.padEnd(18)} ${salidas.length} bundles autocontenidos (${salidas.map((s) => s.split('/').pop()).join(', ')})`);
  return salidas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await construirOnline();
}
