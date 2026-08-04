// tests/codemirror-theme.test.mjs
//
// Verifica que el highlighter de <pre class="code"> (scripts/highlight-pre.js)
// reacciona al data-theme de <html> y escoge el theme de CodeMirror adecuado:
//
//   dark  -> cm-s-material-darker
//   light -> cm-s-mdn-like
//
// Tambien verifica que <is-theme-toggle> emite el evento 'is-theme-change'
// en document, que es el contrato que consumers globales como
// highlight-pre.js escuchan para re-pintar.
//
// Esto protege el contrato de accesibilidad/contraste:
//   - el codigo en previews debe ser legible en ambos temas
//   - al cambiar el theme deben re-pintarse los <pre> ya pintados
//
// Uso:  node tests/codemirror-theme.test.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

// La logica del highlighter vive en components/_shared/highlight-code.js
// (para que <is-cdn-snippet> pueda importarla sin depender de scripts/);
// scripts/highlight-pre.js es solo el arranque en las paginas del docs.
// El contrato se verifica sobre los dos juntos.
const highlight = [
  await readFile(join(root, 'components', '_shared', 'highlight-code.js'), 'utf8'),
  await readFile(join(root, 'scripts', 'highlight-pre.js'), 'utf8'),
].join(String.fromCharCode(10));
const themeToggle = await readFile(join(root, 'components', 'feedback', 'theme-toggle.js'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// ─── highlight-pre.js: resuelve theme a partir de data-theme ─────────────────

check(/THEMES\s*=\s*\{[\s\S]*?dark\s*:[\s\S]*?material-darker[\s\S]*?light\s*:[\s\S]*?mdn-like/.test(highlight),
  'highlight-pre.js: el mapa THEMES debe mapear dark -> material-darker y light -> mdn-like');

check(/(?:function\s+resolveThemeId\s*\(|const\s+resolveThemeId\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>)/.test(highlight),
  'highlight-pre.js: falta la funcion resolveThemeId()');

check(/documentElement\.dataset\.theme/.test(highlight),
  'highlight-pre.js: resolveThemeId() debe leer document.documentElement.dataset.theme');

// ─── highlight-pre.js: paintOne usa el theme resuelto ────────────────────────

check(/paintOne[\s\S]*?resolveThemeId\s*\(\)/m.test(highlight),
  'highlight-pre.js: paintOne() debe llamar a resolveThemeId() en cada repintado');

// ─── highlight-pre.js: re-pinta los <pre> ya pintados al cambiar el theme ───

check(/(?:function\s+reapplyTheme\s*\(|const\s+reapplyTheme\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>)/.test(highlight),
  'highlight-pre.js: falta la funcion reapplyTheme()');

check(/querySelectorAll\(['"]pre\.code\[data-cm\]['"]\)/.test(highlight),
  'highlight-pre.js: reapplyTheme() debe re-pintar los pre.code[data-cm]');

check(/CustomEvent\(['"]is-codemirror-theme-changed['"]/.test(highlight),
  'highlight-pre.js: reapplyTheme() debe emitir is-codemirror-theme-changed en document');

// ─── highlight-pre.js: escucha cambios de tema ───────────────────────────────

check(/addEventListener\(['"]is-theme-change['"]/.test(highlight),
  'highlight-pre.js: debe escuchar document.addEventListener("is-theme-change")');

check(/MutationObserver[\s\S]*?attributeFilter:\s*\[[\s\S]*?['"]data-theme['"]/.test(highlight),
  'highlight-pre.js: debe observar data-theme en <html> via MutationObserver');

// ─── highlight-pre.js: limpia la clase cm-s-* anterior ───────────────────────

check(/Object\.values\(THEMES\)[\s\S]*?classList\.remove/m.test(highlight),
  'highlight-pre.js: paintOne() debe limpiar cualquier CM theme previo antes de aplicar el nuevo');

// ─── highlight-pre.js: expone la API como exports ESM (sin puentes window) ───

check(/export\s+const\s+reapplyTheme/.test(highlight),
  'highlight-code.js: debe exportar reapplyTheme');
check(/export\s*\{[^}]*reapplyTheme/.test(highlight),
  'highlight-pre.js: debe re-exportar reapplyTheme');
check(!/window\.__is/.test(highlight),
  'highlight-pre.js/highlight-code.js: no deben quedar puentes window.__is*');

// ─── highlight-pre.js: las CSS de ambos themes se cargan ─────────────────────

check(/theme\/material-darker\.min\.css/.test(highlight),
  'highlight-pre.js: debe cargar CSS de material-darker.min.css');
check(/theme\/mdn-like\.min\.css/.test(highlight),
  'highlight-pre.js: debe cargar CSS de mdn-like.min.css');

// ─── is-theme-toggle: emite el evento que el highlighter escucha ─────────────

check(/document\.dispatchEvent\([\s\S]*?['"]is-theme-change['"]/.test(themeToggle),
  'theme-toggle.js: debe emitir document.dispatchEvent(new CustomEvent("is-theme-change"))');

check(/composed:\s*true/.test(themeToggle),
  'theme-toggle.js: el evento theme-toggle debe tener composed: true');

// ─── Sanity: NO debe quedar el theme hardcoded a material-darker ─────────────

// Antes del fix, paintOne() siempre ponia '.cm-s-material-darker' sin
// condicion. Ahora la clase debe provenir del mapa THEMES.
check(!/el\.classList\.add\(['"]cm-s-material-darker['"]\)/.test(highlight),
  'highlight-pre.js: paintOne() NO debe hardcodear cm-s-material-darker (debe venir de THEMES)');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('codemirror-theme.test.mjs: PASS — CodeMirror theme reactivo a data-theme, re-pinta en vivo, expone API');
process.exit(0);
