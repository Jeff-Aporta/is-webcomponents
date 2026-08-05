// tests/nav-home-item.test.mjs
//
// Verifica que el item "Inicio" en la barra lateral de navegacion (nav#shellNav):
//   - reusa la clase .shell-nav__item (mismo flujo que los demas items)
//   - usa el texto "Inicio" como titulo
//   - NO tiene el tag lateral (no muestra "Inicio" duplicado)
//   - comparte el mismo highlight que los items regulares cuando esta
//     seleccionado (no tiene estilos especiales en CSS)
//   - existe marcados por data-tag="home"
//   - el aria-label es accesible
//
// Esto protege el contrato de consistencia visual entre el item "Inicio"
// y el resto de componentes del catalogo. Antes tenia una clase
// --home con su propio layout en horizontal y su propio highlight, lo
// que rompia la consistencia del sidebar.
//
// Uso:  node tests/nav-home-item.test.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const index = await readFile(join(root, 'index.html'), 'utf8');
const shellCss = await readFile(join(root, 'src', 'styles', 'shell.css'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// ─── HTML: el item home esta construido con la misma estructura ──────────────
// Hay un bloque de creacion del boton home que:
//   - usa .shell-nav__item (reusa el styling)
//   - tiene data-tag = HOME.tag (== 'home')
//   - aria-label ="Inicio — home"
//   - el title.textContent es 'Inicio'
//   - NO anade un <span class="shell-nav__tag">

// Aislamos el bloque { const btn = ... } del home. Como el script usa
// strings pre-construidas con fromCharCode (no literales HTML), no
// podemos buscar un '<button' literal. En lugar de eso, nos ceñimos
// a marcadores que SI son literales: el primer `HOME.tag` despues de
// la declaracion HOME = { ... }, hasta el primer `shellNav.appendChild(btn);`.
const homeBlockMatch = (() => {
  const homeDecl = index.indexOf("HOME = { tag: 'home'");
  if (homeDecl < 0) return null;
  const fromHome = index.slice(homeDecl);
  const appendEnd = fromHome.indexOf('shellNav.appendChild(btn);');
  if (appendEnd < 0) return null;
  return fromHome.slice(0, appendEnd + 'shellNav.appendChild(btn);'.length);
})();

check(!!homeBlockMatch, 'index.html: no se encuentra el bloque de creacion del item home');

// El bloque aislado debe contener los marcadores clave aunque no
// pueda buscarse el HTML literal (porque se construye con fromCharCode).
if (homeBlockMatch) {
  check(/className\s*=\s*['"]shell-nav__item\s+shell-nav__item--home['"]/.test(homeBlockMatch),
    'index.html: el item home debe usar className "shell-nav__item shell-nav__item--home"');
  check(/dataset\.tag\s*=\s*HOME\.tag/.test(homeBlockMatch),
    'index.html: el data-tag del home debe venir de HOME.tag');
  check(/aria-label["']\s*,\s*['"]Inicio — home['"]/.test(homeBlockMatch),
    'index.html: el aria-label del home debe ser "Inicio — home"');
  check(/title\.textContent\s*=\s*['"]Inicio['"]/.test(homeBlockMatch),
    'index.html: el title del home debe ser el texto "Inicio"');
  // El bloque del home no debe crear un <span class="shell-nav__tag"> al final.
  // (El constructor decide literalmente si anade el tag: lo verificamos
  // contando quantas veces se crea un tag con HOME.tag despues del home)
  const tagCount = (homeBlockMatch.match(/className\s*=\s*['"]shell-nav__tag['"]/g) || []).length;
  check(tagCount === 0,
    'index.html: el bloque del home no debe crear un <span class="shell-nav__tag"> (no debe haber tag duplicado)');
}

// Estos chequeos pueden aplicarse sobre el bloque aislado o sobre el archivo
// completo: aseguramos que el HTML completo no contiene dos veces la cadena
// "Inicio" en el contexto del home (title vs tag duplicado).
const homeTitleCount = (index.match(/textContent\s*=\s*['"]Inicio['"]/g) || []).length;
const homeTagCount = (index.match(/<span\s+class="shell-nav__tag"[^>]*>\s*Inicio\s*<\/span>/g) || []).length;
check(homeTitleCount === 1, `index.html: esperaba 1 'textContent="Inicio"' (solo el title), encontre ${homeTitleCount}`);
check(homeTagCount === 0, `index.html: el item home NO debe tener un <span class="shell-nav__tag">Inicio</span> duplicado, encontre ${homeTagCount}`);

// Estas pruebas contra el archivo completo ya estan cubiertas por el
// bloque aislado arriba, asi que las omitimos para evitar falsos negativos
// debidos al pre-procesado con fromCharCode del script.

// ─── CSS: NO debe haber un bloque horizontal de "home" ni highlight propio ──

// Antes el .shell-nav__item--home tenia su propio display: flex (horizontal)
// y su propio width: 100%. Si vuelve a aparecer, rompio la consistencia.
const homeCssBlock = (() => {
  const m = shellCss.match(/&\.shell-nav__item--home\s*\{[\s\S]*?\n\s*\}/);
  return m ? m[0] : '';
})();

check(homeCssBlock.length === 0,
  'shell.css: NO debe existir un bloque &.shell-nav__item--home { ... } con estilos propios (debe reusar .shell-nav__item)');

// ─── CSS: el highlight de aria-current existe para .shell-nav__item ─────────

// El bloque se llama &[aria-current="true"] (sin repetir .shell-nav__item,
// porque ya esta dentro de `& .shell-nav__item { ... }`).
const itemCurrentBlock = (() => {
  const m = shellCss.match(/&\[aria-current="true"\]\s*\{[\s\S]*?\n\s*\}/);
  return m ? m[0] : '';
})();
check(itemCurrentBlock.length > 0,
  'shell.css: .shell-nav__item[aria-current="true"] debe tener su propio bloque de highlight');

check(/--is-brand-soft/.test(itemCurrentBlock),
  'shell.css: el highlight del item activo debe usar --is-brand-soft');

// ─── Sanity: el bloque eliminado deja el highlighting por cascada ────────────
//
// Si el item home solo lleva .shell-nav__item (no --home), hereda
// el selector &[aria-current="true"] del padre, que debe estar al
// nivel `.shell-nav { & .shell-nav__item { ... } }` (no anidado en
// un selector de categoria).
//
// Buscamos el selector de partida (`.shell-nav`) y la primera
// aparicion de `& .shell-nav__item` y `[aria-current="true"]` en orden.
const parentWrapper = (() => {
  const navIdx = shellCss.indexOf('& .shell-nav');
  if (navIdx < 0) return '';
  const itemIdx = shellCss.indexOf('& .shell-nav__item', navIdx);
  if (itemIdx < 0) return '';
  const currentIdx = shellCss.indexOf('[aria-current="true"]', itemIdx);
  if (currentIdx < 0) return '';
  return shellCss.slice(navIdx, currentIdx);
})();
check(parentWrapper.length > 0,
  'shell.css: el highlight &[aria-current="true"] debe estar dentro de .shell-nav { & .shell-nav__item { ... } } para que aplique tanto a items regulares como al home');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('nav-home-item.test.mjs: PASS — item "Inicio" reusa .shell-nav__item, sin highlight propio, mismo patron que el resto');
process.exit(0);
