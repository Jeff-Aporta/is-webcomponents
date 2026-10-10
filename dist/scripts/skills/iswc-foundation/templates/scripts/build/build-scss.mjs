// build-scss.mjs — compila cada `src/**/*.scss` y `view/**/*.scss` a `.tmp-scss/<misma ruta>.css`.
//
// La fuente canonica es el `.scss` hermano; el `.css` es artefacto (staging gitignored) y el build lo
// minifica a `dist/cdn/`. Los parciales (`_tokens`, `_mixins`) solo se importan. CSS expandido:
// esbuild minifica despues y la salida legible ayuda a depurar.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import * as sass from 'sass';

const ROOT = join(import.meta.dirname, '..', '..');
const STAGING = join(ROOT, '.tmp-scss');

const listar = (dir) => !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  if (e.isDirectory()) return e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'vendor' ? [] : listar(p);
  return e.name.endsWith('.scss') && !e.name.startsWith('_') ? [p] : [];
});

rmSync(STAGING, { recursive: true, force: true });
let n = 0;
for (const scss of [...listar(join(ROOT, 'src')), ...listar(join(ROOT, 'view'))]) {
  const { css } = sass.compile(scss, {
    style: 'expanded',
    loadPaths: [dirname(scss), join(ROOT, 'src', 'styles'), join(ROOT, 'src'), join(ROOT, 'view')],
  });
  const salida = join(STAGING, relative(ROOT, scss)).replace(/\.scss$/, '.css');
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, css);
  n++;
}
console.log(`[build:scss] ${n} hojas -> .tmp-scss/ (${basename(ROOT)})`);
