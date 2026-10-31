// tests/gobernanza/em-sizing-guardian.test.ts
//
// Estándar del kit: todo tamaño de componente va en `em`, de modo que cambiar `font-size` en el
// host escale el componente completo. Este guardián falla si reaparece px/rem en
// src/components/**/*.scss, o si un token global de espaciado vuelve a una unidad absoluta
// (con `--iswc-space-*` en rem el componente no escala aunque use var()).
//
// Permitido, y nada más:
//   - `1px`/`2px` en bordes finos y outlines (propiedades border-* / outline-*);
//   - `rem` dentro de @media (también `em`; px no);
//   - `0`, valores sin unidad, %, unidades de viewport;
//   - lo listado en EXCEPCIONES_CUSTOM.
//
// Deuda abierta: PENDIENTES son las rutas que otros agentes estaban editando durante la migración.
// Se excluyen hasta cerrarlas; al migrarlas hay que borrarlas de la lista.
//
// Uso: deno run -A --no-check tests/gobernanza/em-sizing-guardian.test.ts
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPONENTES = join(ROOT, 'src', 'components');

/** Deuda: rutas fuera de la migración a em. Cerrarlas una por una. */
const PENDIENTES: RegExp[] = [
  /^src\/components\/data\/ag-grid\.[^/]+$/,
  /^src\/components\/data\/data-grid\.[^/]+$/,
  /^src\/components\/data\/spreadsheet\.[^/]+$/,
  /^src\/components\/data\/utils\/ag-grid\//,
  /^src\/components\/data\/utils\/spreadsheet\//,
  /\/datagrid-core\//,
];

/**
 * Custom properties que guardan el grosor de un borde o outline: su valor llega a `border-*` /
 * `outline-*` por var(), así que valen lo mismo que el borde literal. Formato: `archivo :: --prop`.
 */
const EXCEPCIONES_CUSTOM = new Set<string>([
  'src/components/actions/button.scss :: --iswc-button-border-width',
  'src/components/navigation/tab-group.scss :: --iswc-tab-group-track-width',
]);

const ES_BORDE = /^(border|outline)(?!.*(radius|spacing|image))/;
const LONGITUD = /(?:^|[\s,(/*+-])(-?(?:\d*\.)?\d+)(px|rem)\b/g;

function scssDe(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scssDe(p, out);
    else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

const sinComentarios = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const linea = (s: string, i: number): number => s.slice(0, i).split('\n').length;

/** Infracciones de un archivo: px/rem fuera de lo permitido. */
function infracciones(rel: string, fuente: string): string[] {
  const css = sinComentarios(fuente);
  const malas: string[] = [];
  for (const m of css.matchAll(/@(media|container)\b([^{]*)\{/g)) {
    for (const v of m[2].matchAll(LONGITUD)) {
      if (v[2] === 'px' || m[1] === 'container') malas.push(`${rel}:${linea(css, m.index)} @${m[1]} ${v[0].trim()}`);
    }
  }
  for (const m of css.matchAll(/([$\w-]+)\s*:\s*([^;{}]+)(?=[;}])/g)) {
    const [, prop, valor] = m;
    for (const v of valor.matchAll(LONGITUD)) {
      const n = Math.abs(parseFloat(v[1]));
      if (n === 0 && v[2] === 'px') {
        malas.push(`${rel}:${linea(css, m.index)} ${prop}: 0px (usa 0, o 0em dentro de calc/var)`);
        continue;
      }
      if (v[2] === 'px' && (n === 1 || n === 2)) {
        if (ES_BORDE.test(prop)) continue;
        if (EXCEPCIONES_CUSTOM.has(`${rel} :: ${prop}`)) continue;
      }
      malas.push(`${rel}:${linea(css, m.index)} ${prop}: ${v[0].trim()}`);
    }
  }
  return malas;
}

const rutas = scssDe(COMPONENTES).map((p) => relative(ROOT, p).split(sep).join('/'));
const enDeuda = (r: string): boolean => PENDIENTES.some((re) => re.test(r));

test('gobernanza/em-sizing: sin px/rem en src/components/**/*.scss salvo excepciones', () => {
  const malas = rutas.filter((r) => !enDeuda(r)).flatMap((r) => infracciones(r, readFileSync(join(ROOT, r), 'utf8')));
  assert.equal(malas.length, 0, `Tamaños fuera de em (recalcula contra el font-size del selector):\n${malas.slice(0, 60).join('\n')}`);
});

test('gobernanza/em-sizing: el detector reconoce lo prohibido y deja pasar lo permitido', () => {
  const malo = `:host { padding: 8px; gap: .5rem; margin: 0px; box-shadow: 0 1px 2px red; }\n@media (max-width: 480px) { :host { color: red; } }`;
  assert.equal(infracciones('x.scss', malo).length, 6);
  const bueno = `/* padding: 8px */\n:host { border: 1px solid; outline-offset: -2px; padding: .5em; width: 100%; height: 50vh; margin: 0; }\n@media (max-width: 40rem) { :host { gap: 1em; } }`;
  assert.deepEqual(infracciones('x.scss', bueno), []);
});

test('gobernanza/em-sizing: los tokens globales escalan por contexto', () => {
  const base = sinComentarios(readFileSync(join(ROOT, 'src', 'styles', 'is-base.scss'), 'utf8'));
  const malos = [...base.matchAll(/(--iswc-(?:space-[\w-]+|radius[\w-]*|scrollbar-[\w-]+))\s*:\s*([^;]+);/g)]
    .filter((m) => /\d(px|rem)\b/.test(m[2]))
    .map((m) => `${m[1]}: ${m[2]}`);
  assert.deepEqual(malos, [], 'Un token en px/rem rompe el escalado aunque el componente use var()');
});

export default lista();
