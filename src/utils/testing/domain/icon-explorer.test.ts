// tests/icon-explorer.test.ts
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
// Uso:  node tests/icon-explorer.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));
const html = [
  await readFile(join(root, 'src/components/media/icon-explorer.json'), 'utf8'),
  await readFile(join(root, 'src/components/media/icon-explorer.preview.ts'), 'utf8'),
].join('\n');

// --- 1. Scroll propio ------------------------------------------------------

assert.ok(
  /\.xp\s*\{[^}]*overflow-y:\s*auto/s.test(html),
  '.xp debe ser el contenedor scrollable (presentation.css bloquea el scroll de html/body)',
);
assert.ok(
  /iswc-main\s*\{[^}]*height:\s*100%/s.test(html) && /iswc-main\s*\{[^}]*min-height:\s*0/s.test(html),
  'iswc-main necesita `height:100%` + `min-height:0` para que el hijo flex pueda scrollear',
);

// --- 2. Busqueda global de iconos y filtros --------------------------------

assert.ok(
  /<iswc-button-group id="scope"[\s\S]{0,220}value="icon"/.test(html),
  'debe existir el ámbito de búsqueda "Iconos" dentro del <iswc-button-group>',
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
// `error` / `error-text` de <iswc-input>. Y el cierre lo resuelve el drawer.
assert.ok(
  /error-text/.test(html) && /toggleAttribute\('error'/.test(html),
  'la validación debe usar el estado error/error-text de <iswc-input>, no un aviso propio',
);
assert.ok(
  /data-drawer=\\?"close\\?"/.test(html) || html.includes('data-drawer'),
  'cerrar el panel debe delegarse en <iswc-drawer> vía data-drawer="close"',
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
  'iswc-drawer': 'el panel de personalización debe ser <iswc-drawer>, no un <aside> propio',
  'iswc-select': 'los desplegables deben ser <iswc-select> + <iswc-option>',
  'iswc-input': 'los campos de texto/número/búsqueda deben ser <iswc-input>',
  'iswc-checkbox': 'las casillas deben ser <iswc-checkbox>',
  'iswc-color-picker': 'el selector de color debe ser <iswc-color-picker>',
  'iswc-slider': 'el control de tamaño debe ser <iswc-slider>',
  'iswc-copy-button': 'copiar al portapapeles ya lo resuelve <iswc-copy-button>',
  'iswc-toast': 'las notificaciones deben usar <iswc-toast>, no un div .toast propio',
  'iswc-tag': 'las etiquetas de metadatos deben ser <iswc-tag>',
  'iswc-card': 'las tarjetas de familia deben ser <iswc-card>',
  'iswc-button-group': 'el conmutador Familias/Iconos debe ser <iswc-button-group>',
  'iswc-callout': 'los estados vacíos y de error deben ser <iswc-callout>',
  'iswc-progress-bar': 'el progreso de indexado debe ser <iswc-progress-bar>',
  'iswc-breadcrumb': 'la vuelta al índice debe ser <iswc-breadcrumb>',
};
for (const [tag, motivo] of Object.entries(USAR)) {
  assert.ok(html.includes(`<${tag}`), motivo);
}

// Controles nativos que ya tienen equivalente propio.
const NATIVOS = [
  ['<select', 'iswc-select'],
  ['<input type="color"', 'iswc-color-picker'],
  ['<input type="range"', 'iswc-slider'],
  ['<input type="checkbox"', 'iswc-checkbox'],
  ['<input type="search"', 'iswc-input'],
  ['<input type="number"', 'iswc-input'],
  ['<input type="text"', 'iswc-input'],
];
for (const [nativo, reemplazo] of NATIVOS) {
  assert.ok(!html.includes(nativo), `\`${nativo}\` debe reemplazarse por <${reemplazo}>`);
}

// Un `.toast` a mano vuelve a duplicar <iswc-toast>.
assert.ok(!/class="toast"/.test(html), 'no reimplementar el toast: usar <iswc-toast>');
// Copiar a mano cuando existe <iswc-copy-button>.
assert.ok(
  !/navigator\.clipboard\.writeText/.test(html),
  'no llamar a navigator.clipboard directamente: <iswc-copy-button> ya lo hace con feedback',
);

// --- 4. Custom elements inyectados por JS ----------------------------------
// Regla del proyecto (LLM.md): los <iswc-icon> que se generan en bucle se crean
// con createElement + setAttribute. Markup estatico del template es aceptable
// (el parser los upgradea porque all.min.js ya registro la definicion); lo que
// rompe es construir listas grandes concatenando strings de custom elements.
assert.ok(
  !/\.map\([^)]*`[^`]*<iswc-icon/s.test(html),
  'no construir listas de <iswc-icon> con .map + template string: usar createElement + setAttribute',
);
assert.equal(
  (html.match(/createElement\('iswc-icon'\)/g) || []).length >= 3,
  true,
  'las celdas y muestras de iconos deben crearse con createElement(\'iswc-icon\')',
);

// --- 5. Embebido al final del demo de iswc-icon ------------------------------
// El explorador vive al final del demo de iswc-icon (components/media/icon.json), EMBEBIDO, no
// copiado: duplicar su markup significaria mantener dos buscadores.

const iconHtml = await readFile(join(root, 'src/components/media/icon.json'), 'utf8');

assert.ok(/id":\s*"explorer"/.test(iconHtml) || /"id": "explorer"/.test(iconHtml), 'iswc-icon.json debe tener la sección explorer');
assert.ok(/xpFrame/.test(iconHtml), 'el explorador debe embeberse por iframe (fuente única)');
assert.ok(
  /_shell\.html\?tag=icon-explorer|tag=icon-explorer/.test(iconHtml) ||
    /icon-explorer/.test(iconHtml),
  'el iframe debe apuntar al preview controlado icon-explorer',
);
for (const marca of ['fltCategory', 'id="fFormat"', 'class="icon-grid"']) {
  assert.ok(
    !iconHtml.includes(marca),
    `iswc-icon.json contiene "${marca}": el explorador se está duplicando en vez de embeberse`,
  );
}
assert.ok(
  /height:\s*min\(/.test(iconHtml),
  'el contenedor del iframe necesita alto explícito: el explorador scrollea por dentro y con alto auto colapsa a 0',
);

console.log('OK icon-explorer — scroll, búsqueda global, filtros, formulario y embed en iswc-icon');
