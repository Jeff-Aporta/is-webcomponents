// tests/code-diff-lang.test.ts
//
// Guardián de `lang="diff"` / `lang="commit"` en <is-code>.
//
// El fallo que motivó el módulo: pintar un diff con un modo de lenguaje real
// (javascript) lee el `+` de la primera columna como operador y descoloca el
// resto de la línea. Las reglas de abajo fijan lo que NO puede volver a pasar:
//
//   1. `+`/`-` de primera columna = línea añadida/quitada, no operador.
//   2. `--- a/x` y `+++ b/x` son CABECERAS DE ARCHIVO, aunque empiecen por -/+.
//      (esta es la que se rompe sola si alguien reordena las comprobaciones)
//   3. `+// nota` es una línea añadida, no un comentario suelto.
//   4. Las líneas `--stat`/`total` se reconocen (para `format()`) aunque no se
//      tokenicen por tramos: el motor nativo banda la línea y `format()` alinea.
//   5. `format()` deja el bloque `--stat` en rejilla alineada.
//   6. Cada banda que emite el clasificador tiene su regla CSS nativa
//      (`.is-diff-line-*`) y su token de tema; NO se registran modos de
//      CodeMirror (`defineMode`/`defineDiffMode` desaparecieron).
//
// Uso:  node tests/code-diff-lang.test.ts

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const {
  classifyDiffLine, diffLineClass, parseStatLine, formatDiff,
  DIFF_LINE_CLASS, DIFF_LINE_CLASSES,
} = await import(`file:///${join(root, 'src/components/_shared/code-diff.ts').replace(/\\/g, '/')}`);

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

// —— 4. Líneas de --stat (reconocidas para alinear; sin tokenizado CM) ——
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

// —— 6. Bandas nativas ⇄ CSS ⇄ tema (sin modos de CodeMirror) ——
const css = await readFile(join(root, 'src/components/code/code.css'), 'utf8');
const theme = await readFile(join(root, 'src/components/_shared/code-theme.ts'), 'utf8');
const src = await readFile(join(root, 'src/components/_shared/code-diff.ts'), 'utf8');

for (const cls of DIFF_LINE_CLASSES) {
  ok(css.includes(`.${cls}`), `falta regla CSS para la banda \`.${cls}\``);
}
for (const varName of ['--is-code-diff-added', '--is-code-diff-removed', '--is-code-diff-added-band', '--is-code-diff-removed-band']) {
  ok(theme.includes(varName), `falta el token de tema ${varName} en code-theme.ts`);
  ok(css.includes(varName), `el CSS no usa el token de tema ${varName}`);
}
ok(/diffAdded:\s*'#/.test(theme) && /light:[\s\S]*diffAdded:\s*'#/.test(theme),
  'los presets dark y light deben definir los colores de diff');

// El motor nativo banda por línea (tokenizeCode → lineClass) y no registra
// modos en CodeMirror: no debe quedar API CM en el módulo.
ok(!/defineMode|defineDiffMode|globalThis\.CodeMirror/.test(src),
  'code-diff.ts no debe registrar modos de CodeMirror (defineDiffMode eliminado)');

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`code-diff-lang.test.ts: PASS — ${checks} comprobaciones, diff/commit clasificado, bandeado y alineado (nativo)`);
