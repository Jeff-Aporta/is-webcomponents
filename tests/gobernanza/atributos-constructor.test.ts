// @contexto INDICE.md · tests/gobernanza/README.md
// atributos-constructor.test.ts — guardián del defecto latente de los atributos escritos en el
// constructor de un custom element.
//
//   A1 ninguna fuente de `src/components` escribe atributos (`setAttribute`, `toggleAttribute` o
//      `removeAttribute`) dentro de un `constructor`. Un elemento creado por script
//      (`document.createElement('iswc-x')`, que es como la galería y el consumidor montan las
//      piezas) no puede traer atributos cuando su constructor termina: Blink los descarta y
//      avisa con un NotSupportedError sin capturar ('The result must not have attributes'). El
//      parser sí pone los atributos DESPUÉS del constructor, por eso con innerHTML no se nota.
//      Los atributos se escriben al conectar (`connectedCallback` / `onConnected`) o en el punto
//      donde el elemento ya está en el DOM.
//
//   A2 el detector es preciso: ignora comentarios y cadenas, y no confunde un método con un
//      constructor (los casos de prueba están al final del archivo).
//
// Comando: deno task test -- --solo=atributos-constructor
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const KIT = join(import.meta.dirname!, '..', '..');
const COMPONENTES = join(KIT, 'src', 'components');

const rel = (abs: string) => relative(KIT, abs).split(sep).join('/');

/** Las fuentes del kit que pueden escribir atributos (sin schemas, previews ni tests). */
function fuentes(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { fuentes(p, out); continue; }
    if (n.endsWith('.ts') && !n.endsWith('.d.ts') && !/\.(schemas|preview|selfcheck|test)\.ts$/.test(n)) out.push(p);
  }
  return out;
}

/** Caracteres tras los que una `/` abre una expresión regular (y no una división). */
const ANTES_DE_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>']);
/** Palabras tras las que una `/` abre una expresión regular. */
const PALABRAS_ANTES_DE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'case', 'do', 'else', 'yield', 'await', 'new', 'delete', 'void']);

/**
 * Copia del código sin comentarios ni contenido de cadenas: conserva la longitud y los saltos
 * de línea (para leer la línea de cada hallazgo) y deja las llaves de las cadenas como huecos.
 * Con esa copia se emparejan llaves sin trampas: un `}` de un string no cierra un bloque.
 */
function sinRuido(codigo: string): string {
  const out = codigo.split('');
  const n = codigo.length;
  let i = 0;
  let previo = '';
  let palabra = '';
  while (i < n) {
    const c = codigo[i]!;
    const d = codigo[i + 1] ?? '';
    if (c === '/' && d === '/') {
      while (i < n && codigo[i] !== '\n') { out[i] = ' '; i++; }
      continue;
    }
    if (c === '/' && d === '*') {
      out[i] = ' '; out[i + 1] = ' '; i += 2;
      while (i < n && !(codigo[i] === '*' && codigo[i + 1] === '/')) { if (codigo[i] !== '\n') out[i] = ' '; i++; }
      if (i < n) { out[i] = ' '; out[i + 1] = ' '; i += 2; }
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      out[i] = ' '; i++;
      while (i < n && codigo[i] !== q) {
        if (codigo[i] === '\\') { out[i] = ' '; if (codigo[i + 1] !== undefined && codigo[i + 1] !== '\n') out[i + 1] = ' '; i += 2; continue; }
        if (codigo[i] !== '\n') out[i] = ' ';
        i++;
      }
      if (i < n) { out[i] = ' '; i++; }
      previo = q;
      palabra = '';
      continue;
    }
    if (c === '`') {
      out[i] = ' '; i++;
      while (i < n && codigo[i] !== '`') {
        if (codigo[i] === '\\') { out[i] = ' '; if (codigo[i + 1] !== undefined && codigo[i + 1] !== '\n') out[i + 1] = ' '; i += 2; continue; }
        if (codigo[i] === '$' && codigo[i + 1] === '{') {
          // La expresión del template se deja entera: puede traer llaves y llamadas.
          out[i] = '$'; out[i + 1] = '{'; i += 2;
          let nivel = 1;
          while (i < n && nivel > 0) {
            const ch = codigo[i]!;
            if (ch === '{') nivel++;
            else if (ch === '}') nivel--;
            if (nivel === 0) { out[i] = '}'; i++; break; }
            i++;
          }
          continue;
        }
        if (codigo[i] !== '\n') out[i] = ' ';
        i++;
      }
      if (i < n) { out[i] = ' '; i++; }
      previo = '`';
      palabra = '';
      continue;
    }
    if (c === '/' && (previo === '' || ANTES_DE_REGEX.has(previo) || PALABRAS_ANTES_DE_REGEX.has(palabra))) {
      out[i] = ' '; i++;
      let enClase = false;
      while (i < n) {
        const ch = codigo[i]!;
        if (ch === '\\') { out[i] = ' '; if (codigo[i + 1] !== undefined) out[i + 1] = ' '; i += 2; continue; }
        if (ch === '[') enClase = true;
        else if (ch === ']') enClase = false;
        else if (ch === '/' && !enClase) { out[i] = ' '; i++; break; }
        else if (ch === '\n') break;
        if (ch !== '\n') out[i] = ' ';
        i++;
      }
      previo = '/';
      palabra = '';
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[\w$]/.test(codigo[j]!)) j++;
      palabra = codigo.slice(i, j);
      previo = palabra.slice(-1);
      i = j;
      continue;
    }
    if (!/\s/.test(c)) { previo = c; palabra = ''; }
    i++;
  }
  return out.join('');
}

type Rango = { ini: number; fin: number };

/** Los cuerpos de los `constructor` del código (ya sin comentarios ni cadenas). */
function cuerposDeConstructor(limpio: string): Rango[] {
  const out: Rango[] = [];
  const re = /\bconstructor\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(limpio))) {
    let i = m.index + m[0].length - 1;
    let nivel = 0;
    while (i < limpio.length) {
      const c = limpio[i]!;
      if (c === '(') nivel++;
      else if (c === ')') { nivel--; if (nivel === 0) { i++; break; } }
      i++;
    }
    while (i < limpio.length && limpio[i] !== '{') i++;
    if (i >= limpio.length) continue;
    const ini = i;
    nivel = 0;
    while (i < limpio.length) {
      const c = limpio[i]!;
      if (c === '{') nivel++;
      else if (c === '}') { nivel--; if (nivel === 0) break; }
      i++;
    }
    out.push({ ini, fin: i });
  }
  return out;
}

const RE_ESCRITURA = /(?:\.\s*|\b)(?:set|toggle|remove)Attribute\s*\(/g;

/**
 * Las escrituras de atributos de un rango: se buscan en la copia sin ruido (para no contar
 * lo que solo aparece en un comentario o en una cadena) y el nombre del atributo se lee del
 * código original, en la misma posición.
 */
function escrituras(codigo: string, limpio: string, rango: Rango): { linea: number; atributo: string }[] {
  const out: { linea: number; atributo: string }[] = [];
  const cuerpo = limpio.slice(rango.ini, rango.fin);
  for (const m of cuerpo.matchAll(RE_ESCRITURA)) {
    const absoluto = rango.ini + m.index;
    const cola = codigo.slice(absoluto, absoluto + 160);
    const atributo = /Attribute\s*\(\s*(['"`])([^'"`]*)\1/.exec(cola)?.[2] ?? '?';
    out.push({ linea: codigo.slice(0, absoluto).split('\n').length, atributo });
  }
  return out;
}

/** Los hallazgos de un archivo: línea y atributo de cada escritura dentro de un constructor. */
function hallazgos(codigo: string): { linea: number; atributo: string }[] {
  const limpio = sinRuido(codigo);
  return cuerposDeConstructor(limpio).flatMap((rango) => escrituras(codigo, limpio, rango));
}

test('atributos-constructor: A1 ningún constructor de src/components escribe atributos', () => {
  const malos: string[] = [];
  for (const p of fuentes(COMPONENTES)) {
    for (const h of hallazgos(readFileSync(p, 'utf8'))) {
      malos.push(`${rel(p)}:${h.linea}: ${h.atributo}`);
    }
  }
  assert.deepEqual(malos, [],
    'los atributos se escriben al conectar (connectedCallback / onConnected) o cuando el elemento ya está en el DOM, nunca en el constructor');
  console.log(`  constructores sin escrituras de atributos: ${fuentes(COMPONENTES).length} archivos`);
});

test('atributos-constructor: A2 el detector distingue el constructor de lo demás', () => {
  const casos: { codigo: string; esperado: number; nota: string }[] = [
    { codigo: `class A { constructor() { this.setAttribute('role', 'dialog'); } }`, esperado: 1, nota: 'escritura directa' },
    { codigo: `class A { constructor() { this.toggleAttribute('checked', true); } }`, esperado: 1, nota: 'toggleAttribute' },
    { codigo: `class A { constructor() { this.removeAttribute('open'); } }`, esperado: 1, nota: 'removeAttribute' },
    { codigo: `class A { constructor() { el.addEventListener('x', () => { this.setAttribute('role', 'dialog'); }); } }`, esperado: 1, nota: 'dentro de una callback del constructor' },
    { codigo: `class A { #sync() { this.setAttribute('role', 'dialog'); } }`, esperado: 0, nota: 'un método no es un constructor' },
    { codigo: `class A { constructor() { /* this.setAttribute('role', 'dialog') */ } }`, esperado: 0, nota: 'un comentario no cuenta' },
    { codigo: `class A { constructor() { const t = "this.setAttribute('role', 'dialog')"; } }`, esperado: 0, nota: 'una cadena no cuenta' },
    { codigo: `// constructor() { this.setAttribute('role', 'dialog'); }\nclass A { metodo() { this.setAttribute('role', 'dialog'); } }`, esperado: 0, nota: 'la palabra constructor en un comentario no abre un bloque' },
    { codigo: `class A { constructor() { this.setAttribute('role', 'dialog'); } }`, esperado: 1, nota: 'el rol se lee del original' },
  ];
  const fallos: string[] = [];
  for (const c of casos) {
    const n = hallazgos(c.codigo).length;
    if (n !== c.esperado) fallos.push(`${c.nota}: esperaba ${c.esperado} y encontró ${n}`);
  }
  assert.deepEqual(fallos, []);
});

test('atributos-constructor: A3 el guardián ve el atributo que se escribe', () => {
  const h = hallazgos(`class A { constructor() {\n  this.setAttribute('role', 'dialog');\n} }`);
  assert.equal(h.length, 1);
  assert.equal(h[0]!.atributo, 'role');
  assert.equal(h[0]!.linea, 2);
});

export default lista();
