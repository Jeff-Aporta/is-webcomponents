/**
 * fix-private-fields.mjs — Añade declaraciones de campos privados #foo que
 * se usan pero no se declaran (ES2022 requiere declaración explícita).
 *
 * Por archivo JS en components/ (excepto _shared/ y datagrid-core/), busca
 * el cuerpo de la primera `class X extends HTMLElement`. Encuentra todas
 * las referencias `#foo` dentro y, para las que no estén declaradas como
 * `#foo;` o `#foo = ...`, añade una declaración al inicio del cuerpo
 * de la clase.
 *
 * Uso:  node scripts/fix-private-fields.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPONENTS = path.join(ROOT, 'components');

function listJs(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '_shared' || ent.name === 'datagrid-core' || ent.name === 'node_modules') continue;
      out.push(...listJs(p));
    } else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const DRY = process.argv.includes('--dry');
const files = listJs(COMPONENTS);
let fixedFiles = 0;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf-8');
  // Busca primer bloque class … extends HTMLElement { … } (una sola anidación)
  // El cuerpo es la primera secuencia tras `{` hasta el `}` que cierre al mismo nivel.
  const re = /class\s+(\w+)\s+extends\s+(HTMLElement|ElementBase|MixinFormControl|ModalBase)\s*\{/g;
  const m = re.exec(src);
  if (!m) continue;
  const startBrace = m.index + m[0].length;
  let depth = 1, i = startBrace, end = -1;
  while (i < src.length) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
    i++;
  }
  if (end < 0) continue;
  const body = src.slice(startBrace, end);
  // Recoge declaraciones ya presentes
  const declared = new Set([...body.matchAll(/#(\w+)\s*[=;]/g)].map((x) => x[1]));
  // Usos (incluyendo el de declaraciones, así que filtramos)
  const usedNames = new Set([...body.matchAll(/this\.#(\w+)/g)].map((x) => x[1]));
  const missing = [...usedNames].filter((n) => !declared.has(n));
  if (!missing.length) continue;

  // Inyecta al inicio del cuerpo, antes del primer campo declarado, o antes de constructor()
  const newDeps = missing.map((n) => `      #${n};`).join('\n');
  let newBody = body;
  // Encuentra un buen sitio: tras el último campo ya declarado del bloque, o antes de constructor()
  const lastDecl = body.lastIndexOf('#');
  let insertAt;
  if (lastDecl !== -1) {
    // inserta tras la línea del último match
    const after = body.indexOf('\n', lastDecl);
    insertAt = after !== -1 ? after + 1 : 0;
  } else {
    insertAt = 0;
  }
  newBody = newBody.slice(0, insertAt) + newDeps + '\n' + newBody.slice(insertAt);
  const newSrc = src.slice(0, startBrace) + newBody + src.slice(end);
  if (DRY) {
    console.log(`[dry] ${path.relative(ROOT, f)}: +${missing.join(', ')}`);
  } else {
    fs.writeFileSync(f, newSrc);
    console.log(`[fix] ${path.relative(ROOT, f)}: +${missing.join(', ')}`);
    fixedFiles++;
  }
}

console.log(DRY ? `[dry] archivos a tocar: ${fixedFiles}` : `archivos arreglados: ${fixedFiles}`);
