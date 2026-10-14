// tests/src-layout.test.ts
//
// GuardiÃ¡n del layout post-move: fuente bajo src/, dist/ y scripts/ en raÃ­z.
// Si alguien vuelve a crear components/ o styles/ en la raÃ­z, o rompe la
// profundidad de scripts/dist en previews, este test falla.
//
// Uso: node tests/src-layout.test.ts

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));
const failures = [];

const mustExist = [
  'src/components',
  'src/styles',
  'src/previews',
  'src/utils/health/e2e',
  // 'skills/' en la raíz es la fuente canónica (consolidada desde src/skills/).
  'skills',
  // `src/assets/` se consolidÃ³ en `dist/assets/` (fuera de dist/cdn/).
  'dist/assets/icons',
  // ConsolidaciÃ³n 2026-09-07: LLM.md (root + per-componente) eliminado;
  // el contenido vive en specs/lessons.md + specs/constraints.md +
  // specs/componentes.md.
  'specs/lessons.md',
  'src/styles/is-base.scss',
  'scripts/build.mjs',
  'dist/cdn',
  'src/manifest.ts',
  'index.html',
  'robots.txt',
  // `sitemap.xml` se retiro el 31-ago-2026 junto con `docs/`: con una sola URL
  // no aporta nada que el enlace raiz no de ya.
];

for (const rel of mustExist) {
  if (!existsSync(join(root, rel))) failures.push(`falta ${rel}`);
}

const forbiddenAtRoot = ['components', 'styles', 'previews'];
for (const name of forbiddenAtRoot) {
  if (existsSync(join(root, name))) {
    failures.push(`NO debe existir ${name}/ en la raÃ­z â€” vive en src/${name}/`);
  }
}

// assets/ en raiz solo se tolera si es symlink vacio residual; si tiene icons -> error
if (existsSync(join(root, 'assets'))) {
  const icons = join(root, 'assets', 'icons');
  if (existsSync(icons)) {
    failures.push('NO debe existir assets/icons/ en la raiz â€” usa dist/assets/icons/');
  }
}

const build = readFileSync(join(root, 'scripts', 'build.mjs'), 'utf8');
if (!/join\(root,\s*'src',\s*'components'\)/.test(build) && !/join\(root,\s*"src",\s*"components"\)/.test(build)) {
  failures.push("scripts/build.mjs: compRoot debe ser join(root, 'src', 'components')");
}

function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkHtml(p, out);
    else if (name.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const previewRoot = join(root, 'src', 'previews');
const shell = join(previewRoot, '_shell.html');
if (!existsSync(shell)) failures.push('falta src/previews/_shell.html (Ãºnico HTML permitido)');
const shellBody = readFileSync(shell, 'utf8');
// _shell vive en src/previews/ (depth 1) â†’ ../../scripts y ../../dist
if (!/src=["']\.\.\/\.\.\/scripts\//.test(shellBody)) {
  failures.push('_shell.html: scripts debe ser ../../scripts/');
}
if (!/from\s+['"]\.\.\/\.\.\/dist\//.test(shellBody) && !/src=["']\.\.\/\.\.\/dist\//.test(shellBody)) {
  failures.push('_shell.html: dist debe ser ../../dist/');
}
if (!/\.\.\/styles\//.test(shellBody)) {
  failures.push('_shell.html: styles debe ser ../styles/ (src/styles)');
}

if (failures.length) {
  console.error(`src-layout.test.ts: FAIL â€” ${failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  ... y ${failures.length - 40} mÃ¡s`);
  process.exit(1);
}

console.log('src-layout.test.ts: PASS â€” layout src/ + profundidad de previews OK');
