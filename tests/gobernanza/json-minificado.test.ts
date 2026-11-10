// json-minificado.test.ts — guardián de B.3: lo que se publica, minificado.
//
// En `dist/` todo .json es exactamente `JSON.stringify(JSON.parse(x))`: sin espacios, sin sangría,
// sin salto de línea final. Un .json con sangría pesa lo mismo de útil y el navegador lo paga en
// cada petición (las 225 fichas de la galería son casi 2 MB).
//
// En `src/` el JSON se queda LEGIBLE: la fuente la edita una persona. El build copia a `dist/`
// la versión minificada.
//
// Este guardián mira las dos caras: nada publicado con sangría, y la fuente sin perderla.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const DIST = join(RAIZ, 'dist');

/** Todos los .json de una carpeta (y sus subcarpetas). */
function jsonsDe(dir: string, out: string[] = []): string[] {
  let entradas;
  try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entradas) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) jsonsDe(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

test('gobernanza/json-minificado: todo .json de dist/ va minificado', () => {
  if (!existsSync(DIST)) {
    console.log('  dist/ no existe: se salta (corre `deno task build` antes del gate)');
    return;
  }
  const archivos = jsonsDe(DIST);
  assert.ok(archivos.length > 100, `solo ${archivos.length} .json en dist/`);
  const ofensores = [];
  for (const abs of archivos) {
    const x = readFileSync(abs, 'utf8');
    if (x === '') continue;
    let min;
    try {
      min = JSON.stringify(JSON.parse(x));
    } catch {
      continue; // no es JSON válido: lo comprueba otro guardián
    }
    if (x !== min) ofensores.push(abs.slice(RAIZ.length + 1).replaceAll('\\', '/'));
  }
  assert.deepEqual(ofensores, [], 'estos .json de dist/ no van minificados (x === JSON.stringify(JSON.parse(x)))');
});

test('gobernanza/json-minificado: la fuente de las fichas sigue legible', () => {
  const comp = join(RAIZ, 'src', 'components');
  const cat = readdirSync(comp, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('_'));
  let leidas = 0;
  for (const c of cat) {
    for (const f of readdirSync(join(comp, c.name), { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith('.json')) continue;
      const x = readFileSync(join(comp, c.name, f.name), 'utf8');
      leidas++;
      // La fuente conserva el salto de línea final y (casi) siempre la sangría.
      assert.ok(x.includes('\n'), `${c.name}/${f.name}: la fuente debe seguir legible`);
    }
  }
  assert.ok(leidas > 200, `solo ${leidas} fichas en src/components`);
});

export default lista();
