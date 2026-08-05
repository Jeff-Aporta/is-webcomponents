// tests/preview-blocks.test.mjs
//
// Los bloques de un preview guardan TEXTO donde el render pinta texto:
//   - `kind: 'code'`  → `pre.textContent = block.code`, y colorea CodeMirror.
//   - `kind: 'table'` → `th.textContent = columna`.
// Cualquier markup en esos campos se lee literal en pantalla.
//
// La migración de HTML a JSON los sacó con `innerHTML`, y por ahí entraron
// cuatro regresiones visibles: el coloreado a mano de las páginas viejas
// (`<span class="tag">`) quedó como texto del código, el `<tr><th>` de la
// cabecera se pegó al nombre de la primera columna, `lang: "html"` acabó en
// TODOS los bloques —los de JavaScript y CSS se tokenizaban como htmlmixed, que
// no produce ni un token, o sea código sin color— y algunos acentos quedaron
// como `\uXXXX` literal.
//
// Uso: node tests/preview-blocks.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const previews = join(root, 'src', 'previews');
const failures = [];

/** Clases del coloreado a mano de las páginas pre-migración. */
const MARKUP_DE_COLOR = /<span\s+class="(?:tag|attr|val|str|com|kw|at|c)"\s*>/i;

/** Lenguajes que entiende `resolveMode` en highlight-code.js. */
const LANGS = new Set(['html', 'htm', 'htmlmixed', 'xml', 'svg', 'js', 'javascript', 'ts', 'typescript', 'css']);
const esHtml = (lang) => ['html', 'htm', 'htmlmixed', 'xml', 'svg'].includes(String(lang).toLowerCase());

/** Señales de JS/CSS en las primeras líneas, sin ambigüedad con HTML. */
const pareceJs = (t) => /^\s*(?:\/\/|\/\*|const |let |var |function |import |export |class |document\.|window\.)/.test(t)
  || /=>|addEventListener\(|querySelector\(/.test(t.slice(0, 200));
const pareceCss = (t) => /^\s*(?:[.#:@][\w-]|[a-z][\w-]*\s*\{)/.test(t) && /\{[^}]*:[^}]*;/.test(t);
/** Un `<script>` dentro de un ejemplo HTML: ahí htmlmixed es el modo correcto. */
const traeMarkup = (t) => /^\s*</.test(t) || /<\/[a-z][\w-]*>/i.test(t);

function jsons(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) jsons(p, acc);
    else if (name.endsWith('.json')) acc.push(p);
  }
  return acc;
}

/** Un `\uXXXX` sin resolver se lee tal cual: "categor\u00eda" en pantalla. */
const ESCAPE_LITERAL = /\\u[0-9a-fA-F]{4}/;
function textosLiterales(valor, ruta, salida) {
  if (typeof valor === 'string') {
    if (ESCAPE_LITERAL.test(valor)) salida.push(ruta);
    return;
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => textosLiterales(v, `${ruta}[${i}]`, salida));
    return;
  }
  if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) textosLiterales(v, ruta ? `${ruta}.${k}` : k, salida);
  }
}

let codigo = 0;
let tablas = 0;
for (const archivo of jsons(previews)) {
  const rel = relative(root, archivo).replace(/\\/g, '/');
  let def;
  try {
    def = JSON.parse(readFileSync(archivo, 'utf8'));
  } catch (err) {
    failures.push(`${rel}: JSON inválido — ${err.message}`);
    continue;
  }

  const escapes = [];
  textosLiterales(def, '', escapes);
  for (const ruta of escapes) failures.push(`${rel}: ${ruta} trae un \\uXXXX literal en vez del carácter`);

  for (const sec of def.sections ?? []) {
    for (const b of sec.blocks ?? []) {
      const donde = `${rel}#${sec.id}`;

      if (b.kind === 'code') {
        codigo++;
        const texto = String(b.code ?? '');
        if (MARKUP_DE_COLOR.test(texto)) {
          failures.push(`${donde}: markup de coloreado dentro del código (colorea CodeMirror, no el JSON)`);
        }
        if (texto.includes('\r')) {
          failures.push(`${donde}: el código trae CR; los saltos van con \\n`);
        }
        if (b.lang !== undefined && !LANGS.has(String(b.lang).toLowerCase())) {
          failures.push(`${donde}: lang="${b.lang}" no lo reconoce el highlighter`);
        }
        if (esHtml(b.lang) && !traeMarkup(texto) && (pareceJs(texto) || pareceCss(texto))) {
          failures.push(`${donde}: lang="${b.lang}" sobre código ${pareceJs(texto) ? 'JavaScript' : 'CSS'} — htmlmixed no lo tokeniza y sale sin color`);
        }
      }

      if (b.kind === 'table') {
        tablas++;
        for (const col of b.columns ?? []) {
          if (/[<>]/.test(String(col))) {
            failures.push(`${donde}: encabezado con markup ${JSON.stringify(col)} — el <th> se pinta con textContent`);
          }
        }
      }
    }
  }
}

if (!codigo || !tablas) failures.push('no se encontraron bloques de código y tabla: ¿cambió la estructura de los previews?');

if (failures.length) {
  console.error(`preview-blocks.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  … y ${failures.length - 40} más`);
  process.exit(1);
}

console.log(`preview-blocks.test.mjs: PASS — ${codigo} bloques de código con lang coherente y ${tablas} tablas con encabezados de texto`);
