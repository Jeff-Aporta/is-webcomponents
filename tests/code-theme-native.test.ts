// tests/code-theme-native.test.ts
//
// Guardián de la migración a motor nativo: el resaltado de los
// `<pre class="code">` (scripts/highlight-pre.js → _shared/highlight-code.ts)
// monta `<is-code readonly compact>`, y el TEMA lo resuelve el propio
// `<is-code>` con su motor nativo:
//
//   - No queda NINGÚN cargador de CodeMirror ni CDN de CM en el highlighter.
//   - paint() delega el color en `<is-code>` (createElement('is-code')).
//   - `<is-code>` (code.ts) lee data-theme del documento y reacciona a
//     'is-theme-change' (custom properties --is-code-*, sin clases cm-s-*).
//   - <is-theme-toggle> emite el evento 'is-theme-change' en document con
//     bubbles+composed (el contrato que escucha <is-code>).
//
// Uso:  node tests/code-theme-native.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

// La lógica del highlighter vive en components/_shared/highlight-code.ts
// (para que <is-cdn-snippet> pueda importarla sin depender de scripts/);
// scripts/highlight-pre.js es solo el arranque en las paginas del docs.
// El contrato se verifica sobre los dos juntos + el motor en code.ts.
const highlight = [
  await readFile(join(root, 'src', 'components', '_shared', 'highlight-code.ts'), 'utf8'),
  await readFile(join(root, 'scripts', 'highlight-pre.js'), 'utf8'),
].join(String.fromCharCode(10));
const isCode = await readFile(join(root, 'src', 'components', 'code', 'code.ts'), 'utf8');
const themeToggle = await readFile(join(root, 'src', 'components', 'feedback', 'theme-toggle.ts'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// ─── Sin CodeMirror: ni cargadores, ni CDN, ni temas cm-s-* ───────────────────

check(!/codemirror@|lib\/codemirror|runmode\.min|CodeMirror\.runMode\(/.test(highlight),
  'highlight-code.ts/highlight-pre.js: no debe quedar carga de CodeMirror (CDN/runMode)');
check(!/ensureCodeMirror|watchTheme|reapplyTheme|CODEMIRROR_READY/.test(highlight),
  'highlight-code.ts: no deben quedar exportaciones de la era CodeMirror');
check(!/theme\/material-darker\.min\.css|theme\/mdn-like\.min\.css/.test(highlight),
  'highlight-pre.js: no debe cargar CSS de themes de CodeMirror');
check(!/cm-s-|classList\.add\(['"]cm-s-/.test(highlight),
  'highlight-code.ts: paint() no debe aplicar clases cm-s-* (el tema lo pone <is-code>)');
check(!/window\.__is/.test(highlight),
  'highlight-pre.js/highlight-code.ts: no deben quedar puentes window.__is*');

// ─── paint() monta <is-code> (delegación del color al motor nativo) ──────────

check(/createElement\(['"]is-code['"]\)/.test(highlight),
  'highlight-code.ts: paint() debe crear <is-code> para colorear un pre.code');
check(/setAttribute\(['"]readonly['"]/.test(highlight),
  'highlight-code.ts: el <is-code> montado debe ser readonly');
check(/setAttribute\(['"]compact['"]/.test(highlight),
  'highlight-code.ts: el <is-code> montado debe ser compact');

// ─── <is-code> resuelve el tema de página por sí mismo (code.ts) ─────────────

check(/#pageTheme\(\)/.test(isCode) && /data-theme/.test(isCode),
  'code.ts: #pageTheme() debe leer document.documentElement.dataset.theme');
check(/#syncThemeFromPage/.test(isCode),
  'code.ts: debe existir #syncThemeFromPage() que aplica el tema');
check(/addEventListener\(['"]is-theme-change['"]/.test(isCode),
  'code.ts: <is-code> debe escuchar document "is-theme-change" (re-aplica su tema)');
check(!/cm-s-is-code/.test(isCode),
  'code.ts: no debe referenciar el theme cm-s-is-code de CodeMirror');

// ─── is-theme-toggle: emite el evento que <is-code> escucha ───────────────────

// `emit()` sale con bubbles+composed: el evento del host llega a los listeners
// de `document` sin dispararlo también a mano (eso los invocaba dos veces).
check(/emit\(this,\s*['"]is-theme-change['"]/.test(themeToggle),
  'theme-toggle.ts: debe emitir is-theme-change (llega a document por bubbles+composed)');

// `emit()` de core/element.ts aplica bubbles+composed por defecto, así que
// tanto el literal como el helper valen.
check(/composed:\s*true/.test(themeToggle) || /emit\(this,\s*['"]is-theme-change['"]/.test(themeToggle),
  'theme-toggle.ts: el evento debe salir con composed: true (literal o vía emit())');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('code-theme-native.test.ts: PASS — sin CodeMirror; <is-code> nativo reacciona a data-theme/is-theme-change');
process.exit(0);
