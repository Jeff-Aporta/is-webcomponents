#!/usr/bin/env node
/**
 * build-scss.mjs — compila `.scss` a `.css` con Dart Sass.
 *
 * Fase 1 (POC): solo `src/components/actions/button.scss` se procesa.
 * El `.css` que el `build.mjs` ya consume se sobreescribe con la salida
 * expandida de sass; esbuild se encarga de minificar a `.min.css` despues.
 *
 * Fase 2 (siguiente tarea): procesar todos los `.scss` que vivan junto
 * a un `.css` en `src/`. Mantener el contrato: cada `.scss` produce
 * un `.css` hermano, que es el archivo que `build.mjs` sigue leyendo.
 *
 * Por que CSS expandido y no compressed:
 *   - esbuild ya minifica (mejor que sass para el caso de bundle).
 *   - Mantener la salida legible ayuda a diffs y a debugging en CI.
 *
 * Por que loadPaths = src/styles:
 *   - Para que `@use 'tokens'` o `@use 'mixins'` encuentre futuros
 *     parciales compartidos (Fase 2). El POC no los usa todavia.
 */
import { readdirSync, existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const srcDir = join(root, 'src');

/**
 * Lista de `.scss` que se compilan en este build.
 * Por ahora solo el POC; Fase 2 la convierte en walk recursivo de
 * src/components y src/styles cuando se migren.
 */
const POC_ENTRIES = [
  'src/components/actions/button.scss',
];

function toCssPath(scssPath) {
  return scssPath.replace(/\.scss$/, '.css');
}

async function compileOne(scssRel) {
  const scssAbs = join(root, scssRel);
  if (!existsSync(scssAbs)) {
    throw new Error(`build-scss: no existe ${scssRel}`);
  }
  const result = sass.compile(scssAbs, {
    style: 'expanded',
    sourceMap: false,
    // Busca parciales por nombre sin extension (`@use 'tokens'`).
    // El POC no usa @use, pero la convención queda lista para Fase 2.
    loadPaths: [dirname(scssAbs), join(srcDir, 'styles')],
    // CSS plano que aparece dentro de un .scss se trata como @import
    // de runtime (preserva el `@import url(...)` que usa esbuild para
    // bundling) en vez de inlinearlo.
    importers: [],
    silenceDeprecations: ['legacy-js-api', 'import'],
  });
  const cssRel = toCssPath(scssRel);
  const cssAbs = join(root, cssRel);
  await mkdir(dirname(cssAbs), { recursive: true });
  await writeFile(cssAbs, result.css, 'utf8');
  return { scssRel, cssRel, bytes: Buffer.byteLength(result.css, 'utf8') };
}

async function main() {
  const t0 = Date.now();
  console.log('build-scss — Dart Sass (Fase 1: POC button)');
  let compiled = 0;
  for (const scssRel of POC_ENTRIES) {
    const { cssRel, bytes } = await compileOne(scssRel);
    console.log(`  ${scssRel.padEnd(42)} → ${cssRel}  (${bytes} B)`);
    compiled += 1;
  }
  console.log(`OK ${compiled} scss → css en ${Date.now() - t0} ms`);
}

main().catch((err) => {
  console.error('build-scss: FAIL');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
