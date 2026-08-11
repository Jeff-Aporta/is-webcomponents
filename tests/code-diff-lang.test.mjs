// tests/code-diff-lang.test.mjs
//
// Guardián de `lang="diff"` / `lang="commit"` en <is-code>.
//
// El fallo que motivó el modo: pintar un diff con un modo de lenguaje real
// (javascript) lee el `+` de la primera columna como operador y descoloca el
// resto de la línea. Las reglas de abajo fijan lo que NO puede volver a pasar:
//
//   1. `+`/`-` de primera columna = línea añadida/quitada, no operador.
//   2. `--- a/x` y `+++ b/x` son CABECERAS DE ARCHIVO, aunque empiecen por -/+.
//      (esta es la que se rompe sola si alguien reordena las comprobaciones)
//   3. `+// nota` es una línea añadida, no un comentario suelto.
//   4. Las líneas de `--stat` se tokenizan por dentro: la barra `++--` lleva
//      verde y rojo en el mismo renglón.
//   5. `format()` deja el bloque `--stat` en rejilla alineada.
//   6. Cada estilo que emite el modo tiene su regla CSS y su token de tema.
//
// Uso:  node tests/code-diff-lang.test.mjs

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const {
  classifyDiffLine, diffLineClass, parseStatLine, formatDiff,
  DIFF_LINE_CLASS, DIFF_LINE_CLASSES, defineDiffMode,
} = await import(`file:///${join(root, 'src/components/_shared/code-diff.js').replace(/\\/g, '/')}`);

const failures = [];
let checks = 0;

function eq(actual, expected, msg) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${msg}\n      esperado: ${e}\n      obtenido: ${a}`);
}

function ok(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
}

// —— 1 y 2. Clasificación por línea ——
eq(classifyDiffLine('+const a = 1;'), 'add', '`+linea` debe ser add');
eq(classifyDiffLine('-const a = 0;'), 'del', '`-linea` debe ser del');
eq(classifyDiffLine('--- a/src/app.js'), 'file', '`--- a/x` es cabecera de archivo, no borrado');
eq(classifyDiffLine('+++ b/src/app.js'), 'file', '`+++ b/x` es cabecera de archivo, no adicion');
eq(classifyDiffLine('@@ -1,4 +1,6 @@'), 'hunk', '`@@ … @@` es hunk');
eq(classifyDiffLine('diff --git a/x b/x'), 'file', '`diff --git` es cabecera de archivo');
eq(classifyDiffLine('commit 7839bd7f0a1b2c3'), 'commit', '`commit <sha>` es cabecera de commit');
eq(classifyDiffLine('Author: alguien'), 'header', '`Author:` es cabecera');
eq(classifyDiffLine('  const rest = { ...eq };'), 'context', 'linea sin marca es contexto');

// —— 3. Marca de línea gana al comentario ——
eq(classifyDiffLine('+// nota dentro del cambio'), 'add', '`+//` es linea añadida, no comentario');
eq(classifyDiffLine('// src/lib/filter/x.ts . commit 7839bd7 (extracto)'), 'comment', '`//` suelto es comentario');
eq(classifyDiffLine('# Resultado: el lote toca 12 archivos'), 'comment', '`#` suelto es comentario');
eq(classifyDiffLine('(commit 8936adb)'), 'note', 'anotacion suelta entre parentesis');

// —— 4. Líneas de --stat ——
eq(classifyDiffLine(' src/app.js | 12 ++++----'), 'stat', 'linea de --stat');
eq(classifyDiffLine('| 2 +-'), 'stat', 'barra huerfana sigue siendo --stat');
eq(classifyDiffLine(' 2 files changed, 8 insertions(+), 4 deletions(-)'), 'total', 'linea de total');

eq(parseStatLine(' src/health/x.test.ts | 4 ++ -- (commit dcd0b2a)'), {
  path: 'src/health/x.test.ts', count: '4', bar: '++--', note: '(commit dcd0b2a)',
}, 'parseStatLine separa ruta / contador / barra / anotacion y junta la barra');

// —— Bandas de línea ——
eq(diffLineClass('+x'), DIFF_LINE_CLASS.add, 'banda verde para añadido');
eq(diffLineClass('-x'), DIFF_LINE_CLASS.del, 'banda roja para borrado');
eq(diffLineClass('   contexto'), null, 'el contexto no lleva banda');
ok(DIFF_LINE_CLASSES.length >= 5, 'DIFF_LINE_CLASSES expone todas las clases para poder limpiarlas');

// —— 5. format() alinea la rejilla ——
const desalineado = [
  'src/health/perms-open.test.ts | 4 ++ --',
  'src/lib/storage/UlChatMode.ts | 62 +++++',
  'src/models-controllers/_Types.ts | 2 +-',
].join('\n');
const alineado = formatDiff(desalineado).split('\n');
const anchos = alineado.map((l) => l.indexOf('|'));
ok(new Set(anchos).size === 1, `format() debe dejar la barra en la misma columna (obtenido: ${anchos})`);
ok(alineado.every((l) => !/\+\s+-/.test(l)), 'format() junta la barra `++ --` en `++--`');

const conProsa = ['a.ts | 2 +-', '', 'texto suelto', 'bbbbbbbbbb.ts | 4 ++'].join('\n');
const conProsaOut = formatDiff(conProsa).split('\n');
eq(conProsaOut[2], 'texto suelto', 'format() no toca las lineas que no son --stat');
ok(
  conProsaOut[0].indexOf('|') !== conProsaOut[3].indexOf('|'),
  'dos tablas separadas por prosa se alinean por separado, no entre si',
);

// —— 6. Estilos emitidos ⇄ CSS ⇄ tema ——
const css = await readFile(join(root, 'src/components/code/code.css'), 'utf8');
const theme = await readFile(join(root, 'src/components/_shared/code-theme.js'), 'utf8');
const src = await readFile(join(root, 'src/components/_shared/code-diff.js'), 'utf8');

const estilos = [...src.matchAll(/'(is-diff-[a-z-]+)'/g)].map((m) => m[1]);
const tokens = [...new Set(estilos)].filter((s) => !DIFF_LINE_CLASSES.includes(s));
for (const t of tokens) {
  ok(css.includes(`.cm-${t}`), `falta regla CSS para el token \`.cm-${t}\``);
}
for (const cls of DIFF_LINE_CLASSES) {
  ok(css.includes(`.${cls}`), `falta regla CSS para la banda \`.${cls}\``);
}
for (const varName of ['--is-code-diff-added', '--is-code-diff-removed', '--is-code-diff-added-band', '--is-code-diff-removed-band']) {
  ok(theme.includes(varName), `falta el token de tema ${varName} en code-theme.js`);
  ok(css.includes(varName), `el CSS no usa el token de tema ${varName}`);
}
ok(/diffAdded:\s*'#/.test(theme) && /light:[\s\S]*diffAdded:\s*'#/.test(theme),
  'los presets dark y light deben definir los colores de diff');

// —— El modo se registra sin CodeMirror real ——
const fake = { modes: {}, defineMode(name, fn) { this.modes[name] = fn; }, defineMIME() {} };
defineDiffMode(fake);
ok(typeof fake.modes['is-diff'] === 'function', 'defineDiffMode registra el modo `is-diff`');
const antes = fake.modes['is-diff'];
defineDiffMode(fake);
ok(fake.modes['is-diff'] === antes, 'defineDiffMode es idempotente (no redefine el modo)');

// —— Tokenización real dentro de una línea de --stat ——
const mode = fake.modes['is-diff']();
function tokenize(line) {
  const state = mode.startState();
  const salida = [];
  let pos = 0;
  const stream = {
    string: line,
    get pos() { return pos; },
    set pos(v) { pos = v; },
    sol: () => pos === 0,
    eol: () => pos >= line.length,
    peek: () => line[pos],
    next: () => line[pos++],
    skipToEnd() { pos = line.length; },
    current: () => line.slice(inicio, pos),
    eatSpace() { const p = pos; while (/\s/.test(line[pos])) pos++; return pos > p; },
    eatWhile(m) {
      const p = pos;
      const test = typeof m === 'string' ? (c) => c === m : (c) => m.test(c);
      while (pos < line.length && test(line[pos])) pos++;
      return pos > p;
    },
    match(re) {
      const m2 = line.slice(pos).match(re);
      if (m2) { pos += m2[0].length; return m2; }
      return null;
    },
  };
  let inicio = 0;
  let guard = 0;
  while (pos < line.length && guard++ < 200) {
    inicio = pos;
    const style = mode.token(stream, state);
    if (pos === inicio) pos++;
    salida.push(style);
  }
  return salida;
}

const estilosStat = tokenize(' src/app.js | 12 ++++----');
ok(estilosStat.includes('is-diff-add'), 'la barra `++++` de un --stat lleva el estilo de añadido');
ok(estilosStat.includes('is-diff-del'), 'la barra `----` de un --stat lleva el estilo de borrado');
ok(estilosStat.includes('is-diff-path'), 'la ruta de un --stat lleva su propio estilo');

const estilosTotal = tokenize(' 2 files changed, 8 insertions(+), 4 deletions(-)');
ok(estilosTotal.includes('is-diff-add'), '`insertions(+)` lleva el estilo de añadido');
ok(estilosTotal.includes('is-diff-del'), '`deletions(-)` lleva el estilo de borrado');

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`code-diff-lang.test.mjs: PASS — ${checks} comprobaciones, diff/commit coloreado y alineado`);
