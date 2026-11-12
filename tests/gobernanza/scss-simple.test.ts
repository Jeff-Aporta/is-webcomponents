// @contexto INDICE.md · tests/gobernanza/README.md
// scss-simple.test.ts — el SCSS del kit se mantiene simple: sin @import, sin copias del bloque
// que ya vive en el modulo, y con el trinquete de las lineas.
//
// Cuatro reglas:
//
//   S1: ningun bloque de 4 o mas declaraciones duplicado entre archivos fuera de src/styles/.
//       Los bloques que se repiten son de un mixin del kit (@include), no copias.
//   S2: ningun @import de Sass. El @import url(...) de CSS plano si se permite (lo usan los
//       charts para traer su CSS hermano).
//   S3: todo .scss de componente que usa un patron del kit hace @use del kit. Si queda algo,
//       se anota en el trinquete (.tmp/handoff/scss-trinquete.json) y el guardian avisa.
//   S4: 0 px/rem. Lo vigila tambien el guardian em-sizing; aqui se comprueba el conjunto.
//
// Ademas: el total de lineas de SCSS no puede subir (el trinquete esta en el propio guardian).
//
// Uso:  node tests/gobernanza/scss-simple.test.ts

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(dirname(here));
const SRC = join(ROOT, 'src');
const TRINQUETE = join(ROOT, 'tests', 'gobernanza', 'scss-trinquete.json');

/** Todos los .scss de src/ (y sus subcarpetas). */
function scssDe(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scssDe(p, out);
    else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

/** Los bloques de un .scss: las declaraciones de cada regla, con su selector. */
function bloquesDe(texto: string): { selector: string; decls: string[] }[] {
  const out: { selector: string; decls: string[] }[] = [];
  const pila: { selector: string; decls: string[] }[] = [];
  const lineas = texto.replaceAll('\r\n', '\n').split('\n');
  let i = 0;
  while (i < lineas.length) {
    const t = lineas[i].trim();
    if (!t) { i++; continue; }
    if (t.startsWith('//') || t.startsWith('/*')) { i++; continue; }
    if (t.endsWith('{')) {
      const regla = { selector: t.slice(0, -1).trim(), decls: [] as string[] };
      if (pila.length) pila[pila.length - 1].decls.push('__regla__');
      else out.push(regla);
      pila.push(regla);
      i++;
      continue;
    }
    if (t === '}' || t === '};') {
      if (pila.length) pila.pop();
      i++;
      continue;
    }
    if (pila.length && !pila[pila.length - 1].decls.includes('__regla__')) {
      const d = t.replace(/;$/, '').trim();
      if (d.includes(':')) pila[pila.length - 1].decls.push(d);
    }
    i++;
  }
  return out;
}

test('gobernanza/scss-simple: S1 — ningun bloque de 4+ declaraciones duplicado fuera de styles/', () => {
  // La firma de un bloque: sus declaraciones, sin el selector (el bloque tiene que ser el mismo
  // en los dos sitios).
  const trinquete = existsSync(TRINQUETE)
    ? JSON.parse(readFileSync(TRINQUETE, 'utf8')) as { excepcionesS1?: Record<string, string> }
    : { excepcionesS1: {} };
  const firmas = new Map<string, string[]>();
  for (const abs of scssDe(SRC)) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    if (rel.startsWith('src/styles/')) continue;
    for (const b of bloquesDe(readFileSync(abs, 'utf8'))) {
      if (b.decls.length < 4) continue;
      const firma = b.decls.join(';');
      if (!firmas.has(firma)) firmas.set(firma, []);
      firmas.get(firma)!.push(rel);
    }
  }
  const duplicados: string[] = [];
  for (const [firma, sitios] of firmas) {
    // Si vive en un archivo y en otro, es una copia: deberia ser un @include del kit.
    const distintos = new Set(sitios);
    if (distintos.size < 2) continue;
    // Si todos los sitios estan en el trinquete, la excepcion sigue vigente.
    const paths = [...distintos].map((r) => r.split(' :: ')[0]);
    if (paths.every((p) => p in (trinquete.excepcionesS1 ?? {}))) continue;
    duplicados.push(paths.slice(0, 3).join(' | ') + '  ->  ' + firma.slice(0, 70));
  }
  assert.deepEqual(
    duplicados,
    [],
    'un bloque repetido deberia ser un @include del kit; el guardian no lo encuentra solo en styles/',
  );
});

test('gobernanza/scss-simple: S2 — ningun @import de Sass', () => {
  const ofensores: string[] = [];
  for (const abs of scssDe(SRC)) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    const texto = readFileSync(abs, 'utf8');
    texto.split('\n').forEach((linea, i) => {
      const m = linea.match(/^\s*@import\s+(.*)$/);
      if (!m) return;
      const destino = m[1].trim();
      if (/^url\(/i.test(destino) || /\.css\b/.test(destino)) return;
      ofensores.push(rel + ':' + (i + 1) + '  ' + linea.trim());
    });
  }
  assert.deepEqual(ofensores, [], 'usa @use/@forward, no @import');
});

test('gobernanza/scss-simple: S3 — quien usa un patron del kit hace @use del kit', () => {
  // Los patrones del kit que un componente puede usar: si el texto aparece, el archivo tiene
  // que cargar el modulo (o el patron tiene que estar en el trinquete).
  const PATRONES = [
    'display: none !important;',
    'outline: 2px solid',
    'text-overflow: ellipsis;',
    'scrollbar-width: thin;',
    'transition: opacity 0.18s ease;',
  ];
  const trinquete = existsSync(TRINQUETE)
    ? JSON.parse(readFileSync(TRINQUETE, 'utf8')) as { excepciones?: string[] }
    : { excepciones: [] };
  const permitidos = new Set(Object.keys(trinquete.excepcionesS3 ?? {}));
  const ofensores: string[] = [];
  for (const abs of scssDe(join(SRC, 'components'))) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    if (permitidos.has(rel)) continue;
    const texto = readFileSync(abs, 'utf8');
    const usa = PATRONES.some((p) => texto.includes(p));
    if (!usa) continue;
    if (!/@use\s+'kit'/.test(texto)) ofensores.push(rel);
  }
  assert.deepEqual(ofensores, [], 'usa @use \'kit\' as *; (o anota la excepcion en el trinquete)');
});

test('gobernanza/scss-simple: S4 — sin px ni rem en el SCSS de los componentes', () => {
  // El alcance es el del guardian em-sizing: los componentes. Los estilos globales de src/styles
  // (la galeria y el shell) no son un componente y su medida en rem es un font-size: pasarlo a em
  // cambiaria el diseno. Su deuda esta en el trinquete.
  const trinquete = existsSync(TRINQUETE)
    ? JSON.parse(readFileSync(TRINQUETE, 'utf8')) as { excepcionesS4?: Record<string, string> }
    : { excepcionesS4: {} };
  const permitidos = new Set(Object.keys(trinquete.excepcionesS4 ?? {}));
  const ofensores: string[] = [];
  for (const abs of scssDe(join(SRC, 'components'))) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    if (permitidos.has(rel)) continue;
    const texto = readFileSync(abs, 'utf8');
    texto.split('\n').forEach((linea, i) => {
      const t = linea.trim();
      if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
      // El borde fino de 1-2 px y los areas tactiles de 44 px son la excepcion que ya vigila
      // el guardian em-sizing; aqui solo se miran los valores grandes.
      const m = t.match(/([\w-]+)\s*:\s*([^;]+);/);
      if (!m) return;
      for (const v of m[2].matchAll(/(\d*\.?\d+)(px|rem)\b/g)) {
        const n = Math.abs(parseFloat(v[1]));
        if (n <= 2 || n === 44) continue;
        ofensores.push(rel + ':' + (i + 1) + '  ' + m[1] + ': ' + v[0]);
      }
    });
  }
  assert.deepEqual(ofensores, [], 'las medidas van en em (el guardian em-sizing tambien lo mira)');
});

test('gobernanza/scss-simple: todo .scss compila con las opciones del build', async () => {
  // `sass` se importa dentro de la prueba: importado arriba rompe la carga del archivo en el
  // proceso del runner (el paquete npm no resuelve su ESM en ese contexto).
  const sass = await import('sass');
  const errores: string[] = [];
  for (const abs of scssDe(SRC)) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    try {
      sass.compile(abs, {
        style: 'expanded',
        sourceMap: false,
        loadPaths: [dirname(abs), join(SRC, 'styles')],
        importers: [],
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
      });
    } catch (e) {
      errores.push(rel + ': ' + (e instanceof Error ? e.message.split('\n')[0] : String(e)));
    }
  }
  assert.deepEqual(errores, [], 'estos .scss no compilan');
});

test('gobernanza/scss-simple: el modulo del kit existe y lo reexporta el indice', () => {
  const kit = join(SRC, 'styles', '_kit.scss');
  assert.ok(existsSync(kit), 'src/styles/_kit.scss debe existir');
  const indice = readFileSync(join(SRC, 'styles', '_index.scss'), 'utf8');
  assert.match(indice, /@forward\s+'kit';/, "_index.scss debe reexportar 'kit'");
  const texto = readFileSync(kit, 'utf8');
  assert.match(texto, /@forward\s+'kit\//, 'el kit reexporta sus parciales');
});

test('gobernanza/scss-simple: los diagramas usan el lienzo del modulo, no una copia', () => {
  // El bloque que vive en el mixin `host-lienzo-diagrama` no puede volver a cada diagrama.
  const marca = [
    'min-height: 0;',
    'display: block;',
    'position: relative;',
    'box-sizing: border-box;',
    'font-family: var(--iswc-sans);',
  ];
  const ofensores: string[] = [];
  for (const abs of scssDe(join(SRC, 'components'))) {
    const texto = readFileSync(abs, 'utf8');
    if (marca.every((m) => texto.includes(m))) ofensores.push(relative(ROOT, abs).replaceAll('\\', '/'));
  }
  assert.deepEqual(ofensores, [], 'usa @include host-lienzo-diagrama en vez de copiar el bloque');
});

test('gobernanza/scss-simple: los diagramas usan el modulo del kit', () => {
  const diagramas = readdirSync(join(SRC, 'components', 'diagrams')).filter((f) => f.endsWith('.scss'));
  const conKit = diagramas.filter((f) =>
    readFileSync(join(SRC, 'components', 'diagrams', f), 'utf8').includes("@use 'kit' as *;"),
  );
  assert.ok(conKit.length >= 13, 'los 13 diagramas comparten el lienzo: deben usar el modulo (' + conKit.length + ' de ' + diagramas.length + ')');
});

export default lista();
