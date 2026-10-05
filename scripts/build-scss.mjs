#!/usr/bin/env node
/**
 * build-scss.mjs — compila cada `.scss` de `src/` a un `.css` hermano
 * para que `build.mjs` siga leyendo `.css` como hasta ahora.
 *
 * Regla del contrato:
 *   - source  : `src/<ruta>/<nombre>.scss`           (versionado en git)
 *   - salida  : `src/<ruta>/<nombre>.css`            (gitignored; regenerado)
 *
 * La conversion es 1:1 + aplanado de CSS Nesting que Sass aplica al
 * compilar; los `@import url(...)` se preservan tal cual porque llevan
 * el prefijo `url(` o una extension `.css` y Sass los trata como
 * imports de runtime (mismo criterio que un navegador moderno).
 *
 * Por que CSS expandido y no compressed:
 *   - esbuild ya minifica (mejor que sass para el caso de bundle).
 *   - Mantener la salida legible ayuda a diffs y a debugging en CI.
 *
 * Por que loadPaths = src/styles:
 *   - Para que futuros `@use 'tokens'` o `@use 'mixins'` encuentren
 *     parciales compartidos. Hoy los fuentes son CSS plano.
 */
import { readdirSync, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const srcDir = join(root, 'src');

/** Recorre `dir` recursivamente y devuelve paths absolutos de `.scss`. */
function walkScss(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    // No entrar en carpetas que no producen CSS: dist, build artifacts, etc.
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name.startsWith('.')) continue;
      walkScss(join(dir, name.name), out);
    } else if (name.isFile() && name.name.endsWith('.scss')) {
      out.push(join(dir, name.name));
    }
  }
  return out;
}

function toCssPath(scssAbs) {
  return scssAbs.replace(/\.scss$/, '.css');
}

function compileOne(scssAbs) {
  const result = sass.compile(scssAbs, {
    style: 'expanded',
    sourceMap: false,
    // Busca parciales por nombre sin extension (`@use 'tokens'`).
    // Los `@import './_foo.css'` se tratan como runtime (tienen extension)
    // y se preservan en la salida, igual que hacia el bundler con el
    // .css plano original.
    loadPaths: [dirname(scssAbs), join(srcDir, 'styles')],
    importers: [],
    silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
  });
  return { css: result.css, bytes: Buffer.byteLength(result.css, 'utf8') };
}

async function main() {
  const t0 = Date.now();
  const scssFiles = walkScss(srcDir).sort();
  if (!scssFiles.length) {
    throw new Error(`build-scss: no hay .scss bajo ${srcDir}`);
  }
  console.log(`build-scss — Dart Sass (${scssFiles.length} fuentes)`);

  let compiled = 0;
  let failed = 0;
  const failures = [];
  for (const scssAbs of scssFiles) {
    const scssRel = relative(root, scssAbs).split(sep).join('/');
    const cssAbs = toCssPath(scssAbs);
    try {
      const { css, bytes } = compileOne(scssAbs);
      await mkdir(dirname(cssAbs), { recursive: true });
      const { writeFile } = await import('node:fs/promises');
      await writeFile(cssAbs, css, 'utf8');
      compiled += 1;
      console.log(`  ${scssRel.padEnd(48)} -> ${relative(root, cssAbs).split(sep).join('/')}  (${bytes} B)`);
    } catch (err) {
      failed += 1;
      const msg = err && err.message ? err.message : String(err);
      failures.push({ scssRel, msg });
      console.error(`  FAIL ${scssRel}: ${msg}`);
    }
  }

  const dt = Date.now() - t0;
  if (failed) {
    console.error(`build-scss: FAIL — ${failed} de ${scssFiles.length} fallaron en ${dt} ms`);
    for (const f of failures) console.error(`  - ${f.scssRel}: ${f.msg}`);
    process.exit(1);
  }
  console.log(`OK ${compiled} scss -> css en ${dt} ms`);
}

main().catch((err) => {
  console.error('build-scss: FAIL');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
