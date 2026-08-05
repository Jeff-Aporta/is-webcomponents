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
for (const file of walkHtml(previewRoot)) {
  const rel = relative(previewRoot, file).replace(/\\/g, '/');
  const depth = rel.split('/').length; // 1 = home.html, 2 = cat/page.html
  const body = readFileSync(file, 'utf8');
  const scriptsDepth = depth >= 2 ? '../../../scripts/' : '../../scripts/';
  const distDepth = depth >= 2 ? '../../../dist/' : '../../dist/';
  if (body.includes('src="../../scripts/') && depth >= 2) {
    failures.push(`${rel}: scripts/ debe ser ${scriptsDepth} (preview bajo categoría)`);
  }
  if (body.includes('src="../scripts/') && depth === 1) {
    failures.push(`${rel}: scripts/ debe ser ${distDepth.replace('dist', 'scripts')}`);
  }
  if (/src=["']\.\.\/\.\.\/dist\//.test(body) && depth >= 2) {
    failures.push(`${rel}: dist/ debe ser ${distDepth} (no ../../dist desde categoría)`);
  }
  if (/src=["']\.\.\/dist\//.test(body) && depth === 1) {
    failures.push(`${rel}: dist/ debe ser ../../dist/ desde src/previews/`);
  }
  // styles siguen en src/ → ../../styles desde categoría, ../styles desde home
  if (depth >= 2 && /href=["']\.\.\/\.\.\/\.\.\/styles\//.test(body)) {
    failures.push(`${rel}: styles/ no debe subir a raíz (usa ../../styles/ → src/styles)`);
  }
}

if (failures.length) {
  console.error(`src-layout.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  ... y ${failures.length - 40} más`);
  process.exit(1);
}

console.log('src-layout.test.mjs: PASS — layout src/ + profundidad de previews OK');
