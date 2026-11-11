// scss-mixin.mjs — sustituye los bloques repetidos por un @include del kit.
//
//   deno run -A scripts/codemods/scss-mixin.mjs [--carpeta=src] [--check]
//
// Cada fila de la tabla es un bloque de declaraciones que se repite tal cual en varios
// archivos. El codemod lo cambia por el @include que emite EXACTAMENTE el mismo CSS (lo
// comprueba scripts/sondas/css-equivalente.mjs).
//
// Las filas con `re` traen un patron: el texto que se captura se copia al @include.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();

/** La tabla: bloques de declaraciones que se repiten tal cual. */
const TABLA = [
  { de: ['display: none !important;'], include: 'oculto;' },
  { de: ['background: transparent;', 'color: inherit;', 'font: inherit;'], include: 'reset-boton;' },
  { de: ['opacity: 0.6;', 'pointer-events: none;'], include: 'deshabilitado(.6);' },
  { de: ['opacity: 0.55;', 'pointer-events: none;'], include: 'deshabilitado(.55);' },
  { de: ['cursor: not-allowed;', 'opacity: 0.55;'], include: 'no-permitido(.55);' },
  { de: ['overflow: hidden;', 'text-overflow: ellipsis;', 'white-space: nowrap;'], include: 'truncar;' },
  { de: ['inset: 0;', 'inline-size: 100%;', 'block-size: 100%;'], include: 'llenar-host;' },
  { de: ['outline: 2px solid var(--iswc-accent);', 'outline-offset: -2px;'], include: 'foco-visible(var(--iswc-accent), 2px, -2px);' },
  { de: ['transition: opacity 0.18s ease;'], include: 'transicion(opacity 0.18s ease);' },
  { de: ['transition: filter 0.12s ease-out;'], include: 'transicion(filter 0.12s ease-out);' },
  { de: ['transition: stroke-width 0.12s ease-out;'], include: 'transicion(stroke-width 0.12s ease-out);' },
  { de: ['width: 100%;', 'border-collapse: collapse;', 'font: 0.85em/1.35 system-ui, sans-serif;'], include: 'tabla-base();' },
  { de: ['display: flex;', 'flex-direction: column;', 'gap: 0.4em;'], include: 'columna-flex(.4em);' },
  { de: ['display: block;', 'font: inherit;', 'color: var(--iswc-text);'], include: 'texto-base();' },
  { de: ['outline: 2px solid var(--iswc-focus);', 'outline-offset: 1px;'], include: 'foco-visible(var(--iswc-focus), 2px, 1px);' },
  { de: ['outline: 2px solid var(--iswc-focus, var(--iswc-focus-fallback));', 'outline-offset: var(--iswc-focus-offset);'], include: 'foco-visible(var(--iswc-focus, var(--iswc-focus-fallback)), 2px, var(--iswc-focus-offset));' },
];
/**
 * Los bloques con parametros: se buscan con una expresion regular.
 *
 * Solo se sustituyen cuando son el CUERPO COMPLETO de la regla (y no una parte): si la regla
 * tiene mas declaraciones despues, el mixin cambiaria el ORDEN dentro del mismo selector, y
 * ahi el orden si importa (si dos declaran la misma propiedad, gana la ultima).
 */
const TABLA_REGEX = [
  {
    re: /^(\s*)display: flex;\n\1align-items: center;\n\1gap: ([^;\s][^;]*);\n\1\}$/gm,
    include: (m) => 'flex(' + m[2] + ');',
  },
  {
    re: /^(\s*)display: inline-flex;\n\1align-items: center;\n\1justify-content: center;\n\1\}$/gm,
    include: () => 'flex-centro();',
  },
  {
    re: /^(\s*)display: flex;\n\1align-items: center;\n\1justify-content: space-between;\n\1\}$/gm,
    include: () => 'flex-extremos();',
  },
];

/** El patron de un bloque de la tabla, con la sangria libre. */
const patronDe = (lineas) => {
  const partes = lineas.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp('^(\\s*)' + partes.join('\\n\\1') + '$', 'gm');
};

const terminadorDe = (t) => (t.includes('\r\n') ? '\r\n' : /\r(?![\n])/.test(t) ? '\r' : '\n');

/** Sustituye los bloques repetidos por su @include. Devuelve el texto nuevo y el numero. */
export function sustituir(textoOriginal) {
  let texto = textoOriginal.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  let n = 0;
  for (const fila of TABLA) {
    const re = patronDe(fila.de);
    texto = texto.replace(re, (m, sangria) => {
      n++;
      return sangria + '@include ' + fila.include;
    });
  }
  for (const fila of TABLA_REGEX) {
    texto = texto.replace(fila.re, (m, sangria, ...resto) => {
      n++;
      return sangria + '@include ' + fila.include(m, sangria, ...resto);
    });
  }
  if (texto === textoOriginal) return { texto, n };
  // El @include deja la linea en blanco de antes colgando: se quita.
  texto = texto.replace(/\n[ \t]*\n(\s*@include )/g, '\n$1');
  // El archivo que usa los mixins del kit tiene que cargarlo. El @use va DESPUES de
  // @charset (que tiene que ser lo primero) y antes de cualquier otra regla.
  if (!/@use\s+'kit'/.test(texto)) {
    const lineas = texto.split('\n');
    let i = 0;
    if (lineas[0]?.trim().startsWith('@charset')) i = 1;
    lineas.splice(i, 0, "@use 'kit' as *;");
    texto = lineas.join('\n');
  }
  return { texto, n };
}

function scssFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scssFiles(p, out);
    else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

function ejecutar() {
  const args = process.argv.slice(2);
  const valor = (k, def) => args.find((a) => a.startsWith('--' + k + '='))?.slice(k.length + 3) ?? def;
  const CHECK = args.includes('--check');
  const CARPETA = valor('carpeta', 'src');
  let cambios = 0;
  const porArchivo = [];
  for (const abs of scssFiles(join(RAIZ, CARPETA))) {
    const rel = relative(RAIZ, abs).replaceAll('\\', '/');
    if (rel === 'src/styles/palettes.scss' || rel.startsWith('src/styles/kit/')) continue;
    const antes = readFileSync(abs, 'utf8');
    const { texto, n } = sustituir(antes);
    if (!n) continue;
    if (!CHECK) writeFileSync(abs, texto.replaceAll('\n', terminadorDe(antes)), 'utf8');
    cambios += n;
    porArchivo.push({ rel, n });
  }
  porArchivo.sort((a, b) => b.n - a.n);
  console.log('sustituciones: ' + cambios + ' en ' + porArchivo.length + ' archivos');
  for (const p of porArchivo.slice(0, 15)) console.log('  ' + String(p.n).padStart(3) + '  ' + p.rel);
}

if (import.meta.main) ejecutar();
