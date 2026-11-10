// override.mjs — añade el modificador `override` a todo miembro que sobreescribe uno de la base.
//
//   deno run -A scripts/codemods/override.mjs [--dry] [--iterar=N]
//
// Por qué: el gate (scripts/typecheck.mjs) corre tsc SIN `noImplicitOverride`, pero el editor (Deno LSP)
// sí lo aplica —por eso el dueño veía TS4114 que el gate no veía—. Esta fase alinea ambos: el codemod
// deja el código con `override`, tsconfig.json activa `noImplicitOverride` y deno.json hace lo mismo
// para el LSP. Con eso, un error de TS4114 es un error de verdad en los dos lados.
//
// Cómo funciona:
//   1. Genera `.tmp/tsconfig.override.json` (extiende `tsconfig.json` con `noImplicitOverride: true`).
//   2. Corre tsc con ella y lee `ruta(línea,col): error TS4114|TS4115|TS4116`.
//   3. Inserta `override ` delante del miembro, respetando el orden de modificadores de TypeScript:
//      decoradores → `public/protected/private` → `static` → `override` → `readonly/accessor/async/get/set`.
//   4. Antes de escribir, comprueba que el punto de inserción cae en una declaración de miembro: si no,
//      lo deja como está y lo reporta (un error de sintaxis es peor que un TS4114 sin resolver).
//
// OJO con los finales de línea: TypeScript cuenta `\r\n`, `\r` y `\n` como un salto cada uno, y en este
// repo hay 22 archivos .ts con `\r` sueltos. Si el texto se parte solo por `\n`, los números de línea de
// tsc y los del script NO coinciden y el `override` acaba en la línea de al lado. Por eso aquí se parte
// igual que TypeScript y se vuelven a unir los finales tal cual.
//
// Idempotente: si el miembro ya lleva `override`, no lo duplica. `--dry` solo lista lo que haría.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG = join(RAIZ, '.tmp', 'tsconfig.override.json');
const TSC = ['run', '-A', '--no-check', 'npm:typescript@5.9.3/lib/tsc.js', '-p', '.tmp/tsconfig.override.json', '--pretty', 'false'];

/** Modificadores que van ANTES de `override`. */
const ANTES = new Set(['public', 'private', 'protected', 'static']);
/** Modificadores que van DESPUÉS de `override`. */
const DESPUES = new Set(['readonly', 'abstract', 'async', 'get', 'set', 'accessor']);
/** Todos los modificadores que un miembro puede llevar. */
const MODIFICADORES = [...ANTES, ...DESPUES, 'override', 'declare'];
const RE_MODIFICADOR = new RegExp('(?:^|\\s)(' + MODIFICADORES.join('|') + ')$');

/** Escribe la config temporal con `noImplicitOverride`. */
function escribirConfig() {
  mkdirSync(join(RAIZ, '.tmp'), { recursive: true });
  const cfg = { extends: '../tsconfig.json', compilerOptions: { noImplicitOverride: true } };
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

/** Corre tsc y devuelve los errores de override y los de sintaxis. */
function leerErrores() {
  let salida = '';
  try {
    salida = execFileSync('deno', TSC, { encoding: 'utf8', cwd: RAIZ, maxBuffer: 1 << 28 });
  } catch (e) {
    salida = String(e.stdout ?? '');
  }
  const override = [];
  const sintaxis = [];
  for (const linea of salida.split('\n')) {
    const m = linea.match(/^(.+?)\((\d+),(\d+)\): error (TS4114|TS4115|TS4116):/);
    if (m) { override.push({ archivo: m[1], linea: Number(m[2]), col: Number(m[3]), codigo: m[4] }); continue; }
    const s = linea.match(/^(.+?)\((\d+),(\d+)\): error (TS1434|TS1442|TS1128|TS1110|TS1005):/);
    if (s) sintaxis.push({ archivo: s[1], linea: Number(s[2]), col: Number(s[3]), codigo: s[4] });
  }
  return { override, sintaxis };
}

/** Parte el texto como TypeScript: `\r\n`, `\r` y `\n` son un salto cada uno. */
function dividirLineas(texto) {
  const partes = texto.split(/(\r\n|\r|\n)/);
  const n = (partes.length - 1) >> 1;
  const lineas = [];
  const terminos = [];
  for (let i = 0; i < n; i++) {
    lineas.push(partes[2 * i]);
    terminos.push(partes[2 * i + 1]);
  }
  lineas.push(partes[2 * n]);
  terminos.push('');
  return { lineas, terminos };
}

/** Vuelve a unir conservando los finales de línea tal como estaban. */
function unirLineas(lineas, terminos) {
  return lineas.map((l, i) => l + (terminos[i] ?? '')).join('');
}

/** Modificadores que preceden al nombre del miembro, con su posición (en orden de fuente). */
function cadenaDeModificadores(linea, hasta) {
  const cadena = [];
  let fin = hasta;
  for (;;) {
    const prefijo = linea.slice(0, fin);
    const m = prefijo.match(new RegExp('(?:^|\\s)(' + MODIFICADORES.join('|') + ')\\s*$'));
    if (!m) break;
    const palabra = m[1];
    const inicio = prefijo.length - m[0].length + (m[0].startsWith(' ') ? 1 : 0);
    cadena.unshift({ palabra, inicio, fin: inicio + palabra.length });
    fin = inicio;
  }
  return cadena;
}

/**
 * Punto donde insertar `override `: antes del primer modificador que va detrás (`get`, `readonly`…),
 * o justo delante del nombre si no hay ninguno. `null` si el miembro ya lo lleva.
 */
function puntoDeInsercion(linea, col) {
  const nombre = col - 1;
  const cadena = cadenaDeModificadores(linea, nombre);
  if (cadena.some((m) => m.palabra === 'override')) return null;
  const despues = cadena.find((m) => DESPUES.has(m.palabra));
  return despues ? despues.inicio : nombre;
}

/**
 * `true` si el punto cae en una declaración de miembro y no dentro de una sentencia.
 * `false` significa «no tocar»: mejor un TS4114 sin resolver que un error de sintaxis.
 */
function pareceMiembro(linea, punto) {
  const antes = linea.slice(0, punto).trimEnd();
  if (!antes) return true;
  if (/[{}();]$/.test(antes)) return true;
  if (RE_MODIFICADOR.test(antes)) return true;
  return false;
}

/** Aplica los cambios de un archivo (errores ya ordenados de abajo hacia arriba). */
function aplicarEnArchivo(archivo, errores, seco, saltados) {
  const ruta = join(RAIZ, archivo);
  const texto = readFileSync(ruta, 'utf8');
  const { lineas, terminos } = dividirLineas(texto);
  const cambios = [];
  for (const e of errores) {
    const linea = lineas[e.linea - 1];
    if (linea === undefined) continue;
    const punto = puntoDeInsercion(linea, e.col);
    if (punto === null) continue;
    if (!pareceMiembro(linea, punto)) {
      saltados.push(`${archivo}:${e.linea} (${e.codigo})`);
      continue;
    }
    cambios.push({ linea: e.linea, punto });
  }
  if (!cambios.length) return 0;
  // De abajo hacia arriba: los puntos de inserción de una misma línea no se pisan.
  cambios.sort((a, b) => b.linea - a.linea || b.punto - a.punto);
  for (const c of cambios) {
    const linea = lineas[c.linea - 1];
    lineas[c.linea - 1] = linea.slice(0, c.punto) + 'override ' + linea.slice(c.punto);
  }
  if (!seco) writeFileSync(ruta, unirLineas(lineas, terminos), 'utf8');
  return cambios.length;
}

const seco = process.argv.includes('--dry');
const iteraciones = Number(process.argv.find((a) => a.startsWith('--iterar='))?.slice(9) ?? '1') || 1;

escribirConfig();
let totalCambios = 0;
const saltados = [];
for (let vuelta = 1; vuelta <= iteraciones; vuelta++) {
  const { override, sintaxis } = leerErrores();
  if (sintaxis.length) {
    console.error(`vuelta ${vuelta}: ${sintaxis.length} errores de SINTAXIS en el árbol — no se sigue:`);
    for (const s of sintaxis.slice(0, 10)) console.error(`  ${s.archivo}:${s.linea}:${s.col} ${s.codigo}`);
    process.exit(1);
  }
  if (!override.length) {
    console.log(`vuelta ${vuelta}: 0 errores de override (TS4114/TS4115/TS4116) — nada que hacer`);
    break;
  }
  const porArchivo = new Map();
  for (const e of override) {
    if (!porArchivo.has(e.archivo)) porArchivo.set(e.archivo, []);
    porArchivo.get(e.archivo).push(e);
  }
  let cambios = 0;
  const archivos = [...porArchivo.keys()].sort();
  for (const archivo of archivos) {
    const lista = porArchivo.get(archivo).sort((a, b) => b.linea - a.linea || b.col - a.col);
    cambios += aplicarEnArchivo(archivo, lista, seco, saltados);
  }
  totalCambios += cambios;
  console.log(`vuelta ${vuelta}: ${override.length} errores de override en ${archivos.length} archivos → ${cambios} miembros marcados${seco ? ' (--dry: no se escribió nada)' : ''}`);
}
if (saltados.length) {
  console.log(`${saltados.length} casos NO tocados (el punto no parecía una declaración de miembro):`);
  for (const s of saltados.slice(0, 20)) console.log('  ' + s);
}
console.log('total: ' + totalCambios + ' miembros con `override`');
