// token-vocabulary.test.ts — el kit habla UN solo vocabulario de color.
//
// Nace de un fallo que costo caro y que no dio ni un error: un refactor renombro la
// escala de color de numerica a relativa
//
//     --is-color-danger-600  ->  --is-color-danger-strong
//     --is-color-danger-50   ->  --is-color-danger-paler
//
// y un rebase lo dejo a medias: `styles/is-base.css` y `styles/palettes.css` quedaron
// con los nombres nuevos y 48 CSS de componente con los viejos.
//
// NADA fallo. Ni el build, ni el navegador, ni la vista. Porque cada componente trae
// en su `:host` un bloque de fallbacks con los hex numerados, asi que al no encontrar
// `--is-color-danger-600` en el tema, resolvia contra su propia copia y seguia
// pintando. El sintoma real era mudo: `color="danger"` se quedaba en el rojo viejo y
// **cambiar de paleta dejaba de afectar al componente**. Eso se ve mirando, no
// ejecutando, y solo si sabes que tienes que mirar.
//
// La invariante que lo cierra: todo `--is-color-*` que un componente CONSUME tiene que
// estar definido por la capa de tema. Si no lo esta, o el token murio o el componente
// se quedo hablando el idioma antiguo — en ambos casos el tema ya no manda.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMA = ['is-base.css', 'palettes.css'].map(f => join(root, 'src', 'styles', f));
const COMPONENTES = join(root, 'src', 'components');

const cssBajo = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return cssBajo(p);
  return n.endsWith('.css') ? [p] : [];
});

/** Nombres que un CSS DEFINE: `--is-color-x: …` al principio de declaracion. */
const definidos = (txt) =>
  [...txt.matchAll(/(--is-color-[\w-]+)\s*:/g)].map(m => m[1]);

/** Nombres que un CSS CONSUME: `var(--is-color-x …)`. */
const consumidos = (txt) =>
  [...txt.matchAll(/var\(\s*(--is-color-[\w-]+)/g)].map(m => m[1]);

const tema = new Set(TEMA.flatMap(f => definidos(readFileSync(f, 'utf8'))));

test('la capa de tema define algun --is-color-*', () => {
  // Red de seguridad del propio test: si un move de carpetas deja los paths
  // apuntando a la nada, `tema` sale vacio y las demas comprobaciones pasarian
  // triunfalmente sin haber mirado nada.
  assert.ok(tema.size > 0, `no encontre tokens en ${TEMA.join(', ')} — ¿cambiaron de sitio?`);
});

test('ningun componente consume un --is-color-* que el tema no defina', () => {
  const huerfanos = new Map();          // token -> [archivos]
  for (const f of cssBajo(COMPONENTES)) {
    for (const tk of new Set(consumidos(readFileSync(f, 'utf8')))) {
      if (tema.has(tk)) continue;
      if (!huerfanos.has(tk)) huerfanos.set(tk, []);
      huerfanos.get(tk).push(relative(root, f));
    }
  }
  if (huerfanos.size === 0) return;

  const detalle = [...huerfanos.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .map(([tk, fs]) => `  ${tk}  (${fs.length} archivos, p.ej. ${fs[0]})`)
    .join('\n');
  assert.fail(
    `${huerfanos.size} tokens de color que ningun archivo de tema define.\n` +
    `El componente cae a su fallback de :host y el tema deja de alcanzarlo — sin ` +
    `error visible.\n${detalle}`,
  );
});

test('el vocabulario de color no mezcla escala numerica con modificadores', () => {
  // Las dos convenciones a la vez significan refactor a medias. Da igual cual gane;
  // lo que no puede es haber dos.
  const num = [...tema].filter(t => /^--is-color-[a-z]+-\d+$/.test(t));
  const rel = [...tema].filter(t => /-(paler|pale|strong|stronger|strongest)$/.test(t));
  assert.ok(
    num.length === 0 || rel.length === 0,
    `la capa de tema define ${num.length} tokens numerados y ${rel.length} relativos ` +
    `a la vez: ${num.slice(0, 3).join(', ')} vs ${rel.slice(0, 3).join(', ')}`,
  );
});
