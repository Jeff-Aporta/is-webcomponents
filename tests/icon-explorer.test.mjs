// tests/icon-explorer.test.mjs
//
// Invariantes de previews/media/icon-explorer.html.
//
// Los tres bugs que este test congela:
//   1. SIN SCROLL. presentation.css deja `html, body { overflow: hidden }`
//      porque el shell de docs scrollea dentro de `.main`. El explorador no usa
//      ese shell: si no declara su propio contenedor scrollable, la lista de
//      iconos se corta y no hay forma de bajar.
//   2. BUSCADOR SOLO DE FAMILIAS. El buscador tiene que poder buscar iconos en
//      todas las colecciones, no solo prefijos.
//   3. FORMULARIO INCOMPLETO. El panel de personalizacion debe exponer todos
//      los controles del contrato (formato, tamano+unidad, color, opciones de
//      codigo, codigo generado y acciones de copiar/descargar).
//
// Uso:  node tests/icon-explorer.test.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const html = [
  await readFile(join(root, 'src/previews/media/icon-explorer.json'), 'utf8'),
  await readFile(join(root, 'src/previews/behaviors/icon-explorer.js'), 'utf8'),
].join('\n');

// --- 1. Scroll propio ------------------------------------------------------

assert.ok(
  /\.xp\s*\{[^}]*overflow-y:\s*auto/s.test(html),
  '.xp debe ser el contenedor scrollable (presentation.css bloquea el scroll de html/body)',
);
assert.ok(
  /is-main\s*\{[^}]*height:\s*100%/s.test(html) && /is-main\s*\{[^}]*min-height:\s*0/s.test(html),
  'is-main necesita `height:100%` + `min-height:0` para que el hijo flex pueda scrollear',
);

// --- 2. Busqueda global de iconos y filtros --------------------------------

assert.ok(
  /<is-button-group id="scope"[\s\S]{0,220}value="icon"/.test(html),
  'debe existir el ámbito de búsqueda "Iconos" dentro del <is-button-group>',
);
assert.ok(
  /function\s+paintIcons|paintIcons\s*=/.test(html),
  'debe existir una rutina que pinte resultados de iconos (no solo familias)',
);
assert.ok(
  /ensureIcons/.test(html),
  'la búsqueda global debe indexar los nombres de todas las familias bajo demanda',
);

// Los filtros se emiten con un helper (`sel('fltCategory', …)`), así que el
// id puede aparecer como atributo literal o como argumento del generador.
for (const id of ['fltCategory', 'fltAuthor', 'fltGrid', 'fltPalette', 'fltLicense']) {
  assert.ok(
    html.includes(`id="${id}"`) || html.includes(`'${id}'`),
    `falta el filtro ${id}`,
  );
}
assert.ok(
  /collections\.json/.test(html),
  'los filtros deben leer collections.json (metadatos offline, no la API de Iconify en runtime)',
);
assert.ok(
  !/api\.iconify\.design/.test(html),
  'el explorador no debe pegarle a api.iconify.design en runtime: todo se sirve local',
);

// --- 3. Formulario de personalizacion --------------------------------------

const controls = [
  'fId', 'fCollection', 'fSize', 'fAlt', 'fCopyId', 'fPrev', 'fNext', 'fMore',
  'fPreview', 'fFormat', 'fSizeVal', 'fUnit', 'fColor', 'fColorPick',
  'fPretty', 'fRect', 'fCode',
  'fCopyCode', 'fCopyUrl', 'fDownload',
];
for (const id of controls) {
  assert.ok(
    html.includes(`id="${id}"`) || html.includes(`'${id}'`) || html.includes(`"${id}"`),
    `el formulario de icono no expone #${id}`,
  );
}

// El aviso de validación NO es un <p> propio: se delega en el estado
// `error` / `error-text` de <is-input>. Y el cierre lo resuelve el drawer.
assert.ok(
  /error-text/.test(html) && /toggleAttribute\('error'/.test(html),
  'la validación debe usar el estado error/error-text de <is-input>, no un aviso propio',
);
assert.ok(
  /data-drawer=\\?"close\\?"/.test(html) || html.includes('data-drawer'),
  'cerrar el panel debe delegarse en <is-drawer> vía data-drawer="close"',
);

for (const unit of ['value="auto"', 'value="px"', 'value="em"', 'value="none"']) {
  const esc = unit.replace(/"/g, '\\"');
  assert.ok(html.includes(unit) || html.includes(esc), `el selector de unidad debe ofrecer ${unit}`);
}
for (const fmt of ['value="svg"', 'value="css"', 'value="png"']) {
  const esc = fmt.replace(/"/g, '\\"');
  assert.ok(html.includes(fmt) || html.includes(esc), `el selector de formato debe ofrecer ${fmt}`);
}

assert.ok(/currentColor/.test(html), 'el color por defecto debe ser currentColor');
assert.ok(/function\s+validate\b/.test(html), 'debe validar tamaño y color antes de generar el código');
assert.ok(
  /function\s+sync\b/.test(html),
  'debe haber un único punto de sincronización preview + código',
);
assert.ok(/toBlob\(|image\/png/.test(html), 'debe poder rasterizar a PNG');
assert.ok(
  /xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^`]*viewBox=/.test(html),
  'el SVG generado debe incluir xmlns, width/height y viewBox',
);

// --- 3b. Se usan los componentes del proyecto, no controles a mano ---------
// El explorador es la vitrina del design system: reimplementar a mano lo que ya
// existe como <is-*> es la redundancia que este bloque impide. El drawer es el
// caso de libro: antes era un <aside> que reinventaba backdrop, foco y cierre.

const USAR = {
  'is-drawer': 'el panel de personalización debe ser <is-drawer>, no un <aside> propio',
  'is-select': 'los desplegables deben ser <is-select> + <is-option>',
  'is-input': 'los campos de texto/número/búsqueda deben ser <is-input>',
  'is-checkbox': 'las casillas deben ser <is-checkbox>',
  'is-color-picker': 'el selector de color debe ser <is-color-picker>',
  'is-slider': 'el control de tamaño debe ser <is-slider>',
  'is-copy-button': 'copiar al portapapeles ya lo resuelve <is-copy-button>',
  'is-toast': 'las notificaciones deben usar <is-toast>, no un div .toast propio',
  'is-tag': 'las etiquetas de metadatos deben ser <is-tag>',
  'is-card': 'las tarjetas de familia deben ser <is-card>',
  'is-button-group': 'el conmutador Familias/Iconos debe ser <is-button-group>',
  'is-callout': 'los estados vacíos y de error deben ser <is-callout>',
  'is-progress-bar': 'el progreso de indexado debe ser <is-progress-bar>',
  'is-breadcrumb': 'la vuelta al índice debe ser <is-breadcrumb>',
};
for (const [tag, motivo] of Object.entries(USAR)) {
  assert.ok(html.includes(`<${tag}`), motivo);
}

// Controles nativos que ya tienen equivalente propio.
const NATIVOS = [
  ['<select', 'is-select'],
  ['<input type="color"', 'is-color-picker'],
  ['<input type="range"', 'is-slider'],
  ['<input type="checkbox"', 'is-checkbox'],
  ['<input type="search"', 'is-input'],
  ['<input type="number"', 'is-input'],
  ['<input type="text"', 'is-input'],
];
for (const [nativo, reemplazo] of NATIVOS) {
  assert.ok(!html.includes(nativo), `\`${nativo}\` debe reemplazarse por <${reemplazo}>`);
}

// Un `.toast` a mano vuelve a duplicar <is-toast>.
assert.ok(!/class="toast"/.test(html), 'no reimplementar el toast: usar <is-toast>');
// Copiar a mano cuando existe <is-copy-button>.
assert.ok(
  !/navigator\.clipboard\.writeText/.test(html),
  'no llamar a navigator.clipboard directamente: <is-copy-button> ya lo hace con feedback',
);

// --- 4. Custom elements inyectados por JS ----------------------------------
// Regla del proyecto (LLM.md): los <is-icon> que se generan en bucle se crean
// con createElement + setAttribute. Markup estatico del template es aceptable
// (el parser los upgradea porque all.min.js ya registro la definicion); lo que
// rompe es construir listas grandes concatenando strings de custom elements.
assert.ok(
  !/\.map\([^)]*`[^`]*<is-icon/s.test(html),
  'no construir listas de <is-icon> con .map + template string: usar createElement + setAttribute',
);
assert.equal(
  (html.match(/createElement\('is-icon'\)/g) || []).length >= 3,
  true,
  'las celdas y muestras de iconos deben crearse con createElement(\'is-icon\')',
);

// --- 5. Embebido al final del demo de is-icon ------------------------------
// El explorador vive al final de previews/media/is-icon.html, EMBEBIDO, no
// copiado: duplicar su markup significaria mantener dos buscadores.

const iconHtml = await readFile(join(root, 'src/previews/media/is-icon.json'), 'utf8');

assert.ok(/id":\s*"explorer"/.test(iconHtml) || /"id": "explorer"/.test(iconHtml), 'is-icon.json debe tener la sección explorer');
assert.ok(/xpFrame/.test(iconHtml), 'el explorador debe embeberse por iframe (fuente única)');
assert.ok(
  /_shell\.html\?tag=icon-explorer|tag=icon-explorer/.test(iconHtml) ||
    /icon-explorer/.test(iconHtml),
  'el iframe debe apuntar al preview controlado icon-explorer',
);
for (const marca of ['fltCategory', 'id="fFormat"', 'class="icon-grid"']) {
  assert.ok(
    !iconHtml.includes(marca),
    `is-icon.json contiene "${marca}": el explorador se está duplicando en vez de embeberse`,
  );
}
assert.ok(
  /height:\s*min\(/.test(iconHtml),
  'el contenedor del iframe necesita alto explícito: el explorador scrollea por dentro y con alto auto colapsa a 0',
);

console.log('OK icon-explorer — scroll, búsqueda global, filtros, formulario y embed en is-icon');
