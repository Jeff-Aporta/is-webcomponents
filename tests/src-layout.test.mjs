// tests/src-layout.test.mjs
//
// Guardián del layout post-move: fuente bajo src/, dist/ y scripts/ en raíz.
// Si alguien vuelve a crear components/ o styles/ en la raíz, o rompe la
// profundidad de scripts/dist en previews, este test falla.
//
// Uso: node tests/src-layout.test.mjs

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const failures = [];

const mustExist = [
  'src/components',
  'src/styles',
  'src/previews',
  'src/skills',
  'src/assets',
  'src/docs',
  'src/components/LLM.md',
  'src/styles/is-base.css',
  'scripts/build.mjs',
  'dist/cdn',
  'manifest.js',
  'index.html',
];

for (const rel of mustExist) {
  if (!existsSync(join(root, rel))) failures.push(`falta ${rel}`);
}

const forbiddenAtRoot = ['components', 'styles', 'previews', 'skills', 'docs'];
for (const name of forbiddenAtRoot) {
  if (existsSync(join(root, name))) {
    failures.push(`NO debe existir ${name}/ en la raíz — vive en src/${name}/`);
  }
}

// assets/ en raíz solo se tolera si es symlink vacío residual; si tiene icons → error
if (existsSync(join(root, 'assets'))) {
  const icons = join(root, 'assets', 'icons');
  if (existsSync(icons)) {
    failures.push('NO debe existir assets/icons/ en la raíz — usa src/assets/icons/');
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
if (!existsSync(shell)) failures.push('falta src/previews/_shell.html (único HTML permitido)');
const shellBody = readFileSync(shell, 'utf8');
// _shell vive en src/previews/ (depth 1) → ../../scripts y ../../dist
if (!/src=["']\.\.\/\.\.\/scripts\//.test(shellBody)) {
  failures.push('_shell.html: scripts debe ser ../../scripts/');
}
if (!/src=["']\.\.\/\.\.\/dist\//.test(shellBody)) {
  failures.push('_shell.html: dist debe ser ../../dist/');
}
if (!/href=["']\.\.\/styles\//.test(shellBody)) {
  failures.push('_shell.html: styles debe ser ../styles/ (src/styles)');
}

if (failures.length) {
  console.error(`src-layout.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  ... y ${failures.length - 40} más`);
  process.exit(1);
}

console.log('src-layout.test.mjs: PASS — layout src/ + profundidad de previews OK');
