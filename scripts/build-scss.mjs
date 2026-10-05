#!/usr/bin/env node
/**
 * build-scss.mjs — compila cada `.scss` de `src/` a un `.css` en un
 * directorio de staging `.tmp-scss/src/`, espejando la estructura de `src/`.
 *
 * Antes (legacy): los `.css` se escribian junto a cada `.scss` (en `src/`),
 * 198 artefactos que ensuciaban el working tree aunque estuvieran en
 * `.gitignore` (con la regla `src/` + `**` + `/*.css`). El guardián W54
 * los contaba via `git ls-files` y no fallaba, pero la regla del usuario
 * es "0 .css en src/".
 *
 * Ahora: el `.css` sale a `.tmp-scss/src/<mismo-path-relativo>.css`, y los
 * `.css` previos en `src/` (los que tenian un `.scss` hermano, todos) se
 * BORRAN al final de un build exitoso. `build.mjs` lee desde el staging,
 * asi que no cambia nada para él.
 *
 * Regla del contrato:
 *   - source  : `src/<ruta>/<nombre>.scss`           (versionado en git)
 *   - salida  : `.tmp-scss/src/<ruta>/<nombre>.css`  (gitignored; regenerado)
 *   - limpieza: `src/<ruta>/<nombre>.css`            (se borra si existe)
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
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const srcDir = join(root, 'src');
const stagingDir = join(root, '.tmp-scss', 'src');

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

/** Recorre `dir` recursivamente y devuelve paths absolutos de `.css`. */
function walkCss(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name.startsWith('.')) continue;
      walkCss(join(dir, name.name), out);
    } else if (name.isFile() && name.name.endsWith('.css')) {
      out.push(join(dir, name.name));
    }
  }
  return out;
}

function stagingPathFor(scssAbs) {
  const rel = relative(srcDir, scssAbs).split(sep).join('/');
  return join(stagingDir, rel.replace(/\.scss$/, '.css'));
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

  // Limpiar el staging por completo: cada build es full-regen, igual que
  // `dist/cdn/` en build.mjs. Si un `.scss` se renombra o se borra, su
  // `.css` previo no se queda colgado.
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  const scssFiles = walkScss(srcDir).sort();
  if (!scssFiles.length) {
    throw new Error(`build-scss: no hay .scss bajo ${srcDir}`);
  }
  console.log(`build-scss — Dart Sass (${scssFiles.length} fuentes → .tmp-scss/src/)`);

  let compiled = 0;
  let failed = 0;
  const failures = [];
  for (const scssAbs of scssFiles) {
    const scssRel = relative(root, scssAbs).split(sep).join('/');
    const cssOut = stagingPathFor(scssAbs);
    try {
      const { css, bytes } = compileOne(scssAbs);
      await mkdir(dirname(cssOut), { recursive: true });
      await writeFile(cssOut, css, 'utf8');
      compiled += 1;
      const outRel = relative(root, cssOut).split(sep).join('/');
      console.log(`  ${scssRel.padEnd(48)} -> ${outRel}  (${bytes} B)`);
    } catch (err) {
      failed += 1;
      const msg = err && err.message ? err.message : String(err);
      failures.push({ scssRel, msg });
      console.error(`  FAIL ${scssRel}: ${msg}`);
    }
  }

  // Si sass falló, NO borramos los `.css` viejos de `src/`: es importante
  // que el proximo build del usuario tenga algo con lo que trabajar aunque
  // sea la copia obsoleta. Solo limpiamos cuando todo compila.
  if (failed) {
    const dt = Date.now() - t0;
    console.error(`build-scss: FAIL — ${failed} de ${scssFiles.length} fallaron en ${dt} ms`);
    for (const f of failures) console.error(`  - ${f.scssRel}: ${f.msg}`);
    console.error('build-scss: staging parcial conservado; los .css viejos de src/ NO se borran.');
    process.exit(1);
  }

  // Limpiar los `.css` en `src/` que tienen un `.scss` hermano. Como el
  // inventario (198 .css ↔ 198 .scss) lo confirma, son todos generados;
  // ninguno es hand-written. Si algun dia alguien añade un .css a mano
  // acompanado de un .scss, esta lógica lo borraría sin avisar — pero
  // entonces el `.scss` es lo que cuenta como fuente y el `.css` se
  // regenera del staging. Si quieren que ese .css no se borre, quitan
  // el `.scss` hermano.
  const cssInTree = walkCss(srcDir);
  let removed = 0;
  for (const cssAbs of cssInTree) {
    const scssSibling = cssAbs.replace(/\.css$/, '.scss');
    if (!existsSync(scssSibling)) continue;
    await rm(cssAbs, { force: true });
    removed += 1;
  }

  const dt = Date.now() - t0;
  console.log(`OK ${compiled} scss -> css en .tmp-scss/src/ en ${dt} ms`);
  console.log(`Limpiados ${removed} .css de src/ (todos con .scss hermano, son artefactos del pipeline).`);
}

main().catch((err) => {
  console.error('build-scss: FAIL');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
