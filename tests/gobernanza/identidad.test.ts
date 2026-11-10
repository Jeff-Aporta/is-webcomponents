// identidad.test.ts — guardián de la identidad del kit (FASE B.2, decisión del dueño del 7-nov).
//
// El kit ya no tiene la marca anterior: la suya es `iswc` (ISWC en prosa). Este guardián lo hace cumplir:
//
//   I1  Ningún archivo versionado fuera de `labs/` menciona la marca que el kit ya no tiene.
//   I2  Ningún archivo versionado fuera de `labs/` se LLAMA con esa marca.
//   I3  Los cinco estilos de diagrama son `iswc*` y su `id` coincide con el archivo.
//   I4  El paquete se sigue llamando `@jeff-aporta/iswc-base` y el alias del import.
//   I5  La marca, en prosa, va en MAYÚSCULAS (`ISWC`); en los identificadores, en minúsculas.
//   I6  Los datos de muestra usan el dominio ficticio (Acme/Beta), no nombres de marca viejos.
//
// Excepciones (las únicas): `labs/**` (los labs son ejemplos del dueño y conservan su nombre
// a propósito) y las rutas que APUNTAN a un lab de nombre histórico.
//
// Los patrones viven en `_identidad.mjs` porque están armados con trozos: si aquí se
// escribiera la marca vieja completa, este archivo se marcaría a sí mismo.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MARCA_VIEJA, rutasVersionadas, sinCarpetasLabs, traeMarcaVieja } from './_identidad.mjs';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname, '..', '..');
const TEMAS = join(RAIZ, 'src', 'components', 'diagrams', 'utils', 'themes');

/** Lo que no se barre: los labs (son de otro dueño). */
const FUERA = [/^labs\//];

/** Extensiones que no son texto: no se escanean. */
const BINARIOS = /\.(?:pdf|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|eot|mp4|webm|zip|gz|mp3|wav)$/i;

/** Rutas versionadas que este guardián lee (texto UTF-8). Los binarios se saltan. */
function leer(ruta) {
  if (BINARIOS.test(ruta)) return null;
  try {
    const buf = readFileSync(join(RAIZ, ruta));
    if (buf.subarray(0, 8000).includes(0)) return null; // binario sin extensión
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

test('identidad: I1 ninguna marca vieja fuera de labs', () => {
  const ofensores = [];
  for (const ruta of rutasVersionadas(RAIZ)) {
    if (FUERA.some((r) => r.test(ruta))) continue;
    const texto = leer(ruta);
    if (texto === null || !traeMarcaVieja(texto)) continue;
    const linea = texto.split('\n').findIndex((l) => MARCA_VIEJA.test(sinCarpetasLabs(l))) + 1;
    ofensores.push(`${ruta}:${linea}`);
  }
  assert.equal(
    ofensores.length,
    0,
    'la marca del kit es «iswc»: quedan usos de la marca vieja en:\n  ' +
      ofensores.slice(0, 25).join('\n  ') +
      (ofensores.length > 25 ? `\n  ...y ${ofensores.length - 25} más` : ''),
  );
});

test('identidad: I2 ningún archivo se llama con la marca vieja', () => {
  const ofensores = rutasVersionadas(RAIZ).filter(
    (r) => !FUERA.some((x) => x.test(r)) && MARCA_VIEJA.test(r),
  );
  assert.deepEqual(ofensores, [], 'archivos con la marca vieja en el nombre');
});

test('identidad: I3 los estilos de diagrama son iswc* y su id coincide', () => {
  const esperados = ['iswc', 'iswc-cd', 'iswc-class', 'iswc-flow', 'iswc-seq'];
  const nombres = readdirSync(TEMAS).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, ''));
  assert.deepEqual(nombres.sort(), esperados.sort(), 'los estilos de diagrama son los cinco de la marca del kit');
  for (const nombre of esperados) {
    const tema = JSON.parse(readFileSync(join(TEMAS, `${nombre}.json`), 'utf8'));
    assert.equal(tema.id, nombre, `${nombre}.json declara su propio id`);
    assert.equal(tema.$schema, 'iswc-diagram-theme/v1', `${nombre}.json conserva su $schema`);
  }
});

test('identidad: I4 el paquete y el alias son los del kit', () => {
  const pkg = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  assert.equal(pkg.name, '@jeff-aporta/iswc-base');
  const deno = leer('deno.json') ?? '';
  assert.ok(deno.includes('"@jeff-aporta/iswc-base/"'), 'deno.json mantiene el alias del kit');
});

test('identidad: I5 la marca en prosa se escribe ISWC (mayúsculas)', () => {
  // En prosa la marca va en mayúsculas, como ya hacían README.md, index.html, specs/constitution.md
  // y package.json. En los identificadores va en minúscula (iswc-button, --iswc-*, iswc-base).
  const ofensores = [];
  for (const ruta of rutasVersionadas(RAIZ)) {
    if (FUERA.some((r) => r.test(ruta))) continue;
    if (!/\.(md|html|json|scss|css|svg)$/.test(ruta)) continue; // en .ts puede ser una constante
    const texto = leer(ruta);
    if (texto === null) continue;
    // «Iswc» (grafía mixta) y la marca suelta en minúscula. Se exceptúan los identificadores
    // con sufijo o prefijo propio: iswc-button, --iswc-*, iswc:css (alias del import map),
    // iswc:app-cfg (prefijo de localStorage), @jeff-aporta/iswc-base.
    for (const m of texto.matchAll(/\bIswc\b|(?<![\w\-_./@#"'])iswc(?![\w\-_./@\-:])/g)) {
      const linea = texto.slice(0, m.index).split('\n').length;
      ofensores.push(`${ruta}:${linea}`);
    }
  }
  assert.deepEqual(ofensores, [], 'en prosa la marca se escribe «ISWC» (en identificadores, «iswc»)');
});

test('identidad: I6 el fixture de ejemplo ya no se llama con la marca vieja', () => {
  const fixtures = readdirSync(join(RAIZ, 'tests', 'fixtures'));
  assert.ok(fixtures.includes('ayudas-ejemplo'), 'el fixture de ejemplo tiene nombre neutro');
  assert.ok(!fixtures.some((f) => MARCA_VIEJA.test(f)), 'ningún fixture con la marca vieja');
});

export default lista();
