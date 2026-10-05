/**
 * examples-carousel-reuse-guardian.test.ts — Guardian del contrato W19.
 *
 * Estandar W19: <iswc-examples-carousel> reusa componentes del kit para
 * construir toda su UI:
 *   - <iswc-card>     para cada card del carrusel
 *   - <iswc-button>   para la navegacion prev/next
 *   - <iswc-icon>     para chevrons y meta de cada card
 *   - <iswc-tab-group> + <iswc-tab> + <iswc-tab-panel> como filtro opcional
 *                     por categoria cuando los ejemplos las declaran.
 *
 * Si reimplementas alguno de estos bloques con un <button>/<div> nativo o
 * pierdes la importacion del modulo del kit, el guardian falla con un
 * mensaje claro.
 *
 * Tambien verifica que el click aplica props al target (comportamiento W15
 * que W19 hereda) y que el prev/next existe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const RUTA_TS = join(root, 'src/components/preview/examples-carousel.ts');
const RUTA_CSS = join(root, 'src/components/preview/examples-carousel.scss');
const RUTA_JSON = join(root, 'src/components/preview/examples-carousel.json');
const RUTA_MD = join(root, 'src/components/preview/examples-carousel.md');

const ts = readFileSync(RUTA_TS, 'utf8');
const css = readFileSync(RUTA_CSS, 'utf8');
const json = JSON.parse(readFileSync(RUTA_JSON, 'utf8'));

test('W19 fuentes existen (ts/css/json/md)', () => {
  assert.ok(existsSync(RUTA_TS), 'falta examples-carousel.ts');
  assert.ok(existsSync(RUTA_CSS), 'falta examples-carousel.scss');
  assert.ok(existsSync(RUTA_JSON), 'falta examples-carousel.json');
  assert.ok(existsSync(RUTA_MD), 'falta examples-carousel.md');
});

test('W19: importa los modulos de los componentes reusados', () => {
  // Cada import es side-effect: registra el CE si el bundle lo necesita.
  // Si reescribes a mano el shadow y borras el import, esto falla.
  // Acepta tanto `import '...'` (side-effect) como `import ... from '...'`.
  const sideEffect = (rel: string) =>
    new RegExp(`import\\s+['"][^'"]*${rel.replace(/\//g, '\\/')}['"]`);
  assert.match(ts, sideEffect('layout/card.js'),
    'examples-carousel.ts debe importar el modulo de <iswc-card>');
  assert.match(ts, sideEffect('actions/button.js'),
    'examples-carousel.ts debe importar el modulo de <iswc-button>');
  assert.match(ts, sideEffect('media/icon.js'),
    'examples-carousel.ts debe importar el modulo de <iswc-icon>');
  assert.match(ts, sideEffect('navigation/tab-group.js'),
    'examples-carousel.ts debe importar el modulo de <iswc-tab-group>');
});

test('W19: shadow template usa <iswc-card> para cada card', () => {
  // El shadow debe construir las cards con `document.createElement('iswc-card')`,
  // no con un <button>/<div> nativo.
  assert.match(ts, /createElement\(['"]iswc-card['"]\)/,
    'examples-carousel.ts debe crear cada card con createElement(\'iswc-card\')');
  // El slot media debe llevar la instancia real escalada.
  assert.match(ts, /setAttribute\(['"]slot['"],\s*['"]media['"]\)/,
    'examples-carousel.ts debe usar slot="media" para el preview del componente target');
});

test('W19: shadow template usa <iswc-button> para prev/next', () => {
  // El shadow debe declarar los nav como <iswc-button>, no <button> nativos.
  assert.match(ts, /<iswc-button[^>]*class="nav nav--prev"/,
    'examples-carousel.ts debe usar <iswc-button> para el boton prev');
  assert.match(ts, /<iswc-button[^>]*class="nav nav--next"/,
    'examples-carousel.ts debe usar <iswc-button> para el boton next');
  // Ningun <button class="nav ..."> nativo en el shadow.
  assert.ok(
    !/<button[^>]*class="nav nav--(prev|next)"/.test(ts),
    'examples-carousel.ts no debe usar <button> nativo para prev/next (usar <iswc-button>)',
  );
});

test('W19: shadow template usa <iswc-icon> para chevrons y meta', () => {
  assert.match(ts, /icon\s*=\s*['"]mdi:chevron-(left|right)['"]/,
    'examples-carousel.ts debe usar <iswc-icon icon="mdi:chevron-*"> para la navegacion');
  // Construccion dinamica de <iswc-icon> para la meta de cada card.
  assert.match(ts, /createElement\(['"]iswc-icon['"]\)/,
    'examples-carousel.ts debe crear iconos con createElement(\'iswc-icon\')');
});

test('W19: filtro por categoria usa <iswc-tab-group> + <iswc-tab> + <iswc-tab-panel>', () => {
  // El shadow debe montar el filtro con <iswc-tab-group> y poblar hijos dinamicos.
  assert.match(ts, /<iswc-tab-group[^>]*class="tabs__group"/,
    'examples-carousel.ts debe declarar <iswc-tab-group> en su shadow template');
  assert.match(ts, /createElement\(['"]iswc-tab['"]\)/,
    'examples-carousel.ts debe poblar tabs con createElement(\'iswc-tab\')');
  assert.match(ts, /createElement\(['"]iswc-tab-panel['"]\)/,
    'examples-carousel.ts debe poblar paneles con createElement(\'iswc-tab-panel\')');
});

test('W19: click en una card aplica props al target (W15 heredado)', () => {
  // El listener del track debe llamar a applyExample, que resuelve target y
  // escribe props+text/html.
  assert.match(ts, /applyExample\s*\(\s*i\s*\)/,
    'examples-carousel.ts debe llamar a applyExample(i) desde el handler de click');
  assert.match(ts, /#resolveTarget/,
    'examples-carousel.ts debe resolver el target via #resolveTarget');
  assert.match(ts, /#applyProps/,
    'examples-carousel.ts debe aplicar props/text/html via #applyProps');
  // Emite el evento de pick con el flag applied.
  assert.match(ts, /emit\s*\(\s*this\s*,\s*['"]iswc-examples-pick['"]/,
    'examples-carousel.ts debe emitir iswc-examples-pick al aplicar el ejemplo');
});

test('W19: prev/next navega entre cards', () => {
  assert.match(ts, /#scrollBy/,
    'examples-carousel.ts debe tener el metodo privado #scrollBy');
  assert.match(ts, /scrollIntoView/,
    'examples-carousel.ts debe usar scrollIntoView para centrar la card activa');
  // Ambos botones deben tener listeners de click.
  const navListo = /this\.#prevBtn\.addEventListener\(\s*['"]click['"]/.test(ts)
    && /this\.#nextBtn\.addEventListener\(\s*['"]click['"]/.test(ts);
  assert.ok(navListo,
    'examples-carousel.ts debe cablear click en los <iswc-button> prev y next');
});

test('W19: CSS maquilla la composicion con ::part (no reimplementa <iswc-card>)', () => {
  // El CSS debe trabajar via ::part del <iswc-card>, no redefinir un .card
  // nativo con border/background propios.
  assert.match(css, /\.card::part\(base\)/,
    'examples-carousel.scss debe maquillar <iswc-card> via ::part(base)');
  assert.match(css, /\.card::part\(body\)/,
    'examples-carousel.scss debe maquillar <iswc-card> via ::part(body)');
  assert.match(css, /\.card::part\(media\)/,
    'examples-carousel.scss debe maquillar <iswc-card> via ::part(media)');
});

test('W19: JSON declara seccion de tabs con categoria (3 categorias) y de reuse', () => {
  const tabsSec = json.sections.find((s: { id: string }) => s.id === 'tabs');
  assert.ok(tabsSec, 'examples-carousel.json debe tener una seccion "tabs"');
  // El JSON embebe el HTML como string con comillas escapadas; basta con
  // buscar el nombre de la categoria (sin exigir comillas literales).
  const tabsJson = JSON.stringify(tabsSec.blocks);
  for (const cat of ['Estados', 'Alertas', 'Iconos']) {
    assert.ok(tabsJson.includes(cat),
      `demo de tabs debe tener categoria "${cat}"`);
  }

  const reuseSec = json.sections.find((s: { id: string }) => s.id === 'reuse');
  assert.ok(reuseSec, 'examples-carousel.json debe tener una seccion "reuse"');
  const reuseText = JSON.stringify(reuseSec.blocks);
  for (const comp of ['<iswc-card>', '<iswc-button>', '<iswc-icon>', '<iswc-tab-group>']) {
    assert.ok(reuseText.includes(comp),
      `seccion "reuse" debe documentar el reuso de ${comp}`);
  }
});
