// tests/deps-snippet.test.ts
//
// <iswc-cdn-snippet>: deps van EN EL MISMO snippet (tras el loader), no en
// filas "Dependencia · …" sueltas.
//
// Uso:  node tests/deps-snippet.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

const csJs = await readFile(join(root, 'src', 'components', 'feedback', 'cdn-snippet.ts'), 'utf8');
const prevJson = await readFile(join(root, 'src', 'components', 'feedback', 'cdn-snippet.json'), 'utf8');
const manifest = await readFile(join(root, 'src', 'manifest.ts'), 'utf8');

const textos = [];
(function recorre(v) {
  if (typeof v === 'string') textos.push(v);
  else if (Array.isArray(v)) v.forEach(recorre);
  else if (v && typeof v === 'object') Object.values(v).forEach(recorre);
})(JSON.parse(prevJson));
const prev = textos.join('\n');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(/tag:\s*['"]iswc-cdn-snippet['"]/.test(manifest),
  'manifest.ts: iswc-cdn-snippet no está registrado');

check(/observedAttributes[\s\S]*?dependencies/.test(csJs),
  'cdn-snippet.ts: dependencies debe estar en observedAttributes');

check(/#parseDeps|#deps/.test(csJs),
  'cdn-snippet.ts: debe tener un parser/almacén de deps');

check(/script\[type=["']application\/json["']\]\[slot=["']deps["']\]/.test(csJs) ||
      /slot=["']deps["']/.test(csJs),
  'cdn-snippet.ts: debe leer el slot "deps"');

check(/getAttribute\(['"]dependencies['"]\)/.test(csJs),
  'cdn-snippet.ts: debe leer el atributo dependencies');

check(/#buildDepLines/.test(csJs) && /#buildLoaderSnippet/.test(csJs),
  'cdn-snippet.ts: deps se construyen con #buildDepLines');

check(/\.\.\.depLines/.test(csJs) || /depLines/.test(csJs),
  'cdn-snippet.ts: deps deben intercalarse en #buildLoaderSnippet');

check(/data-slot="deps-note"/.test(csJs),
  'cdn-snippet.ts: notas de deps bajo el snippet único');

check(!/data-kind="dep"/.test(csJs) && !/data-copy="dep"/.test(csJs),
  'cdn-snippet.ts: no debe haber filas Dependencia sueltas');

check(/patyLoader/i.test(csJs),
  'cdn-snippet.ts: patyLoader se detecta como ES module');

check(/<iswc-cdn-snippet/.test(prev),
  'preview: debe usar <iswc-cdn-snippet>');

check(/slot=["']deps["']/.test(prev),
  'preview: debe demostrar el slot="deps"');

check(/dayjs/.test(prev),
  'preview: debe demostrar una dependencia externa real (dayjs)');

check(!/CodeMirror|material-darker|jsdelivr\.net\/npm\/codemirror/.test(prev),
  'preview: no debe mostrar CodeMirror como dependencia');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('deps-snippet.test.ts: PASS — deps embebidas en el snippet loader');
process.exit(0);
