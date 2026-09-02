/**
 * code-diff.js — clasificador y alineador de diffs unificados y resúmenes de
 * commit para el motor nativo de `<is-code>`.
 *
 * Por qué existe: pintar un diff con el tokenizador de lenguaje (javascript u
 * otro) sale mal siempre, y de forma engañosa. El `+` y el `-` de la primera
 * columna no son parte del código: son marcas de línea. Un tokenizador de JS los
 * lee como operadores, arrastra el resto de la línea a un estado sintáctico que
 * no existe, y el resultado es un bloque coloreado casi al azar donde lo único
 * que el lector necesita —qué se añadió y qué se quitó— es justo lo que no se ve.
 *
 * Este módulo trabaja por LÍNEA, no por expresión: clasifica cada línea entera por
 * su primer carácter y no intenta entender el lenguaje de dentro (de eso se
 * encarga `code-highlight` al pintar). Cubre las tres formas en que git presenta
 * un cambio:
 *
 *   1. diff unificado      `@@ -1,4 +1,6 @@`, `+añadido`, `-quitado`
 *   2. cabecera de commit  `commit <sha>`, `Author:`, `Merge:`
 *   3. resumen (`--stat`)  ` src/app.js | 12 ++++++----` y el total de abajo
 *
 * El resumen es el caso que da nombre a `lang="commit"`: ahí los `+` y `-` no
 * encabezan la línea sino que forman una barra proporcional al final, y hay que
 * colorearlos por tramos dentro de la línea, no de una pieza.
 */

/** Clases de línea (fondo) que expone el modo. */
export const DIFF_LINE_CLASS = Object.freeze({
  add: 'is-diff-line-add',
  del: 'is-diff-line-del',
  hunk: 'is-diff-line-hunk',
  file: 'is-diff-line-file',
  commit: 'is-diff-line-commit',
});

/** Todas las clases de línea, para poder limpiarlas sin saber cuál había. */
export const DIFF_LINE_CLASSES = Object.freeze(Object.values(DIFF_LINE_CLASS));

/**
 * Clasifica una línea suelta de diff / resumen de commit.
 *
 * El orden de las comprobaciones es la parte delicada: `--- a/file` y `+++
 * b/file` empiezan por `-` y `+`, así que si se prueba la regla de
 * añadido/borrado primero, las cabeceras de archivo se pintan como si fueran
 * contenido cambiado. Van antes, siempre.
 *
 * @param {string} line
 * @returns {'commit'|'header'|'file'|'hunk'|'add'|'del'|'stat'|'total'|'context'}
 */
export function classifyDiffLine(line: string) {
  const s = String(line ?? '');
  if (/^commit\s+[0-9a-f]{7,40}\b/i.test(s)) return 'commit';
  if (/^(Author|Date|Merge|AuthorDate|CommitDate|Committer)\s*:/i.test(s)) return 'header';
  if (/^diff --git\s/.test(s)) return 'file';
  if (/^index\s+[0-9a-f]+\.\.[0-9a-f]+/i.test(s)) return 'header';
  if (/^(new file mode|deleted file mode|old mode|new mode|similarity index|rename (from|to)|copy (from|to))\b/.test(s)) return 'header';
  // Cabeceras de archivo antes que add/del: empiezan por - y + pero no lo son.
  if (/^(---|\+\+\+)(\s|$)/.test(s)) return 'file';
  if (/^@@[^@]*@@/.test(s)) return 'hunk';
  // Marca de línea antes que comentario: `+// nota` es una línea añadida que
  // resulta ser un comentario, no un comentario suelto del narrador.
  if (/^\+/.test(s)) return 'add';
  if (/^-/.test(s)) return 'del';
  // Comentario de contexto: el que escribe el extracto lo usa para situar el
  // archivo o explicar el recorte. No es parte del cambio.
  if (/^\s*(\/\/|#(?!\d)|\/\*|\*)/.test(s)) return 'comment';
  // Anotación suelta: `(commit 8936adb)` en su propia línea.
  if (/^\s*\([^)]*\)\s*$/.test(s)) return 'note';
  // ` src/app.js | 12 ++++----`  (barra proporcional del `--stat`)
  if (/^\s*\S.*\|\s*\d+\s*[+\-\s]*(\([^)]*\)\s*)?$/.test(s)) return 'stat';
  // Barra huérfana, sin ruta: pasa cuando el `--stat` se copia desalineado.
  if (/^\s*\|\s*\d+\s*[+\-\s]*(\([^)]*\)\s*)?$/.test(s)) return 'stat';
  // ` 2 files changed, 8 insertions(+), 4 deletions(-)`
  if (/\b\d+\s+files?\s+changed\b/i.test(s)) return 'total';
  return 'context';
}

/** Clase de fondo para una línea, o `null` si la línea no lleva banda.
 * La usa `<is-code>` vía `CodeLangDef.lineClass`.
 * @param {string} line
 */
export function diffLineClass(line: string) {
  const kind = classifyDiffLine(line);
  if (kind === 'add') return DIFF_LINE_CLASS.add;
  if (kind === 'del') return DIFF_LINE_CLASS.del;
  if (kind === 'hunk') return DIFF_LINE_CLASS.hunk;
  if (kind === 'file') return DIFF_LINE_CLASS.file;
  if (kind === 'commit') return DIFF_LINE_CLASS.commit;
  return null;
}

/**
 * Descompone una línea de `--stat` en sus cuatro piezas.
 * Devuelve `null` si la línea no es un `--stat`.
 * @param {string} line
 */
export function parseStatLine(line: string) {
  const s = String(line ?? '');
  const m = s.match(/^\s*(.*?)\s*\|\s*(\d+)\s*([+\-\s]*?)\s*(\([^)]*\))?\s*$/);
  if (!m) return null;
  return {
    path: m[1] || '',
    count: m[2],
    // Los espacios dentro de la barra (`++ --`) son basura de copiado: la barra
    // es una sola tirada de signos, y separada deja de leerse como proporción.
    bar: (m[3] || '').replace(/\s+/g, ''),
    note: m[4] || '',
  };
}

/**
 * Alinea en columnas el bloque `--stat` de un resumen de commit.
 *
 * Un `--stat` recién salido de git ya viene alineado, pero en cuanto pasa por
 * un copiado, un PDF o un guion de vídeo pierde el padding y queda como una
 * lista irregular donde no se puede comparar el tamaño de un cambio con el de
 * al lado. Esto lo devuelve a rejilla: ruta, contador y barra en columnas
 * fijas, calculadas sobre el bloque contiguo (no sobre el archivo entero, para
 * que dos tablas separadas por prosa no se contaminen entre sí).
 *
 * Las líneas que no son `--stat` se devuelven intactas.
 *
 * @param {string} text
 * @param {{ eol?: string }} [cfg]
 */
export function formatDiff(text: string, cfg = {}) {
  const eol = cfg.eol === 'crlf' ? '\r\n' : '\n';
  const lines = String(text ?? '').split(/\r?\n/);
  /** @type {Array<{ i: number, parts: ReturnType<typeof parseStatLine> }>} */
  let bloque = [];
  const out = lines.slice();

  const volcar = () => {
    if (!bloque.length) return;
    const anchoRuta = Math.max(...bloque.map((b) => b.parts.path.length));
    const anchoNum = Math.max(...bloque.map((b) => b.parts.count.length));
    for (const { i, parts } of bloque) {
      const ruta = parts.path.padEnd(anchoRuta);
      const num = parts.count.padStart(anchoNum);
      const cola = [parts.bar, parts.note].filter(Boolean).join(' ');
      out[i] = `${ruta} | ${num}${cola ? ` ${cola}` : ''}`.trimEnd();
    }
    bloque = [];
  };

  lines.forEach((line, i) => {
    const parts = classifyDiffLine(line) === 'stat' ? parseStatLine(line) : null;
    if (parts) bloque.push({ i, parts });
    else volcar();
  });
  volcar();

  return out.join(eol);
}
