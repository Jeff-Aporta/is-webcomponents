/**
 * ts-jsdoc-a-tipos.ts — Convierte las anotaciones JSDoc ya escritas en tipos.
 *
 * POR QUÉ. En `_shared/` el 61% de los errores del modo estricto son parámetros
 * sin tipo, y en 31 ficheros el tipo **ya está escrito** justo encima, en un
 * `@param {HTMLElement} host`. Anotarlo a mano sería copiar a mano lo que el
 * autor ya documentó, con el riesgo de escribir algo distinto de lo que él dijo.
 *
 * Este script lee el bloque JSDoc que precede a cada función y traslada sus
 * `@param` a la firma. El tipo lo eligió quien escribió la función; aquí solo
 * cambia de sitio.
 *
 * LO QUE NO HACE:
 *   - No inventa tipos: un parámetro sin `@param` se queda como está y se
 *     anota a mano.
 *   - No toca funciones que ya tengan algún parámetro anotado, para no mezclar
 *     dos criterios en la misma firma.
 *   - No borra el JSDoc. El texto de cada `@param` suele explicar el parámetro,
 *     no solo tiparlo, y eso se pierde si se elimina el bloque.
 *
 *   node scripts/ts-jsdoc-a-tipos.ts src/components/_shared
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** `{string=}` y `{string|null}` son JSDoc; en TS se escriben distinto. */
function aTipoTs(jsdoc) {
  let t = jsdoc.trim();
  let opcional = false;
  if (t.endsWith('=')) { opcional = true; t = t.slice(0, -1); }
  if (t.startsWith('?')) { t = `${t.slice(1)} | null`; }
  t = t.replace(/^\*$/, 'unknown').replace(/\bObject\b/g, 'object').replace(/\bfunction\b/g, '(...args: unknown[]) => unknown');
  return { tipo: t, opcional };
}

/** Lee los `@param` del bloque JSDoc inmediatamente anterior a `indice`. */
function paramsDelBloque(texto, indice) {
  const antes = texto.slice(0, indice);
  const fin = antes.lastIndexOf('*/');
  if (fin < 0) return null;
  // Solo cuenta si el bloque está pegado a la firma (una línea de separación).
  if (antes.slice(fin + 2).replace(/[\s]/g, '') !== '') return null;
  const ini = antes.lastIndexOf('/**', fin);
  if (ini < 0) return null;
  const bloque = antes.slice(ini, fin);
  const params = new Map();
  const RE = /@param\s+\{([^}]+)\}\s+(?:\[)?([A-Za-z_$][\w$]*)/g;
  for (const m of bloque.matchAll(RE)) params.set(m[2], aTipoTs(m[1]));
  return params.size ? params : null;
}

function anotar(texto) {
  // `function nombre(a, b)` y `nombre(a, b) {` de método/clase.
  const RE_FN = /(^|\n)(\s*)(?:export\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(([^)]*)\)/g;
  let salida = texto;
  let delta = 0;
  for (const m of [...texto.matchAll(RE_FN)]) {
    const args = m[4];
    if (!args.trim() || args.includes(':')) continue;
    const params = paramsDelBloque(texto, m.index);
    if (!params) continue;
    const nuevos = args.split(',').map((crudo) => {
      const nombre = crudo.trim().replace(/\s*=.*$/, '').replace(/^\.\.\./, '');
      const info = params.get(nombre);
      if (!info) return crudo;
      const tieneDefecto = /=/.test(crudo);
      const marca = info.opcional && !tieneDefecto && !crudo.trim().startsWith('...') ? '?' : '';
      return crudo.replace(nombre, `${nombre}${marca}: ${info.tipo}`);
    });
    const antes = `(${args})`;
    const despues = `(${nuevos.join(',')})`;
    if (antes === despues) continue;
    const pos = m.index + m[0].length - antes.length + delta;
    salida = salida.slice(0, pos) + despues + salida.slice(pos + antes.length);
    delta += despues.length - antes.length;
  }
  return salida;
}

function ficheros(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...ficheros(p));
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const objetivo = process.argv[2];
if (!objetivo) { console.error('uso: node scripts/ts-jsdoc-a-tipos.ts <carpeta>'); process.exit(2); }
const lista = statSync(objetivo).isDirectory() ? ficheros(objetivo) : [objetivo];

let tocados = 0;
for (const p of lista) {
  const antes = readFileSync(p, 'utf8');
  const despues = anotar(antes);
  if (despues !== antes) { writeFileSync(p, despues, 'utf8'); tocados++; }
}
console.log(`jsdoc→tipos: ${tocados} de ${lista.length} ficheros anotados`);
