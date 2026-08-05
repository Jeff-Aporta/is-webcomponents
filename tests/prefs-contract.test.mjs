// tests/prefs-contract.test.mjs
//
// Contrato de persistencia compartida de Web Components.
//
// Errores ya cometidos (no repetir):
//   1. Keys planas: localStorage.setItem('demo-density', …)
//   2. sessionStorage como almacén canónico del grid
//   3. Root legacy `is-components` tratado como canónico (ahora solo migración)
//   4. Sidebar de columnas en el template de is-ag-grid pero siempre hidden
//      y sin handlers — el consumidor pedía checks show/hide y no había UI
//
// Reglas:
//   - Un solo JSON: localStorage['is-webcomponents'][tag][storage-key]
//   - API en components/_shared/prefs.js
//   - Consumidores (ag-grid, main, split-panel) importan prefs y no setItem directo
//
// Uso:  node tests/prefs-contract.test.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

const prefsPath = join(root, 'src', 'components', '_shared', 'prefs.js');
const agGridPath = join(root, 'src', 'components', 'data', 'ag-grid.js');
const agGridMdPath = join(root, 'src', 'components', 'data', 'ag-grid.md');
const mainPath = join(root, 'src', 'components', 'layout', 'main.js');
const splitPath = join(root, 'src', 'components', 'layout', 'split-panel.js');
const dataLlm = join(root, 'src', 'components', 'data', 'LLM.md');

check(existsSync(prefsPath), 'falta components/_shared/prefs.js');
check(existsSync(agGridPath), 'falta components/data/ag-grid.js');
check(existsSync(agGridMdPath), 'falta components/data/ag-grid.md — documentar el tag para LLM');

const prefs = readFileSync(prefsPath, 'utf8');
const agGrid = readFileSync(agGridPath, 'utf8');
const mainSrc = readFileSync(mainPath, 'utf8');
const splitSrc = readFileSync(splitPath, 'utf8');

// ── 1. prefs.js: raíz y API ─────────────────────────────────────────────
check(
  /const\s+ROOT_KEY\s*=\s*['"]is-webcomponents['"]/.test(prefs),
  'prefs.js: ROOT_KEY debe ser exactamente "is-webcomponents"',
);
check(
  /LEGACY_ROOT_KEY\s*=\s*['"]is-components['"]/.test(prefs),
  'prefs.js: debe migrar desde legacy "is-components"',
);
for (const fn of [
  'getComponentPrefs',
  'setComponentPrefs',
  'replaceComponentPrefs',
  'removeComponentPrefs',
  'getPrefsRootKey',
]) {
  check(prefs.includes(`export function ${fn}`), `prefs.js: falta export function ${fn}`);
}
check(
  !/localStorage\.setItem\(\s*['"]is-components['"]/.test(prefs),
  'prefs.js: no debe escribir el root legacy is-components (solo leer/migrar)',
);

// ── 2. Consumidores importan prefs ──────────────────────────────────────
for (const [label, src] of [
  ['ag-grid.js', agGrid],
  ['main.js', mainSrc],
  ['split-panel.js', splitSrc],
]) {
  check(
    /from\s+['"][^'"]*prefs\.js['"]/.test(src),
    `${label}: debe importar _shared/prefs.js (no reinventar store)`,
  );
}

// ── 3. ag-grid: API de persistencia + UI columnas ───────────────────────
check(agGrid.includes('replaceComponentPrefs'), 'ag-grid.js: guardar snapshot con replaceComponentPrefs');
check(agGrid.includes('removeComponentPrefs'), 'ag-grid.js: reset debe usar removeComponentPrefs');
check(agGrid.includes('getComponentPrefs'), 'ag-grid.js: load debe usar getComponentPrefs');
check(agGrid.includes('resetPersistedState'), 'ag-grid.js: falta api.resetPersistedState');
check(agGrid.includes('remember-state'), 'ag-grid.js: falta atributo remember-state');
check(agGrid.includes('storage-key'), 'ag-grid.js: falta atributo storage-key');
check(agGrid.includes('mim-dg__sidebar'), 'ag-grid.js: falta sidebar de columnas');
check(agGrid.includes('mim-dg__col-check') || agGrid.includes('data-col-id'), 'ag-grid.js: faltan checks de visibilidad de columnas');
check(agGrid.includes('mim-dg__reset-btn') || /Reiniciar/.test(agGrid), 'ag-grid.js: falta botón Reiniciar persistencia');
check(/#renderColumnsPanel|#toggleSidePanel/.test(agGrid), 'ag-grid.js: sidebar sin cablear (#renderColumnsPanel / #toggleSidePanel)');

// No escribir estado canónico en keys planas ni sessionStorage (migración OK)
const agGridNoComments = agGrid
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const flatSetItem = [...agGridNoComments.matchAll(/localStorage\.setItem\(\s*([^,]+)/g)];
for (const m of flatSetItem) {
  const arg = m[1].trim();
  // Solo se permite si el primer arg es claramente getPrefsRootKey / ROOT / 'is-webcomponents'
  // ag-grid no debería llamar setItem en absoluto (delegado a prefs).
  if (!/getPrefsRootKey|ROOT_KEY|['"]is-webcomponents['"]/.test(arg)) {
    failures.push(
      `ag-grid.js: localStorage.setItem(${arg}, …) — estado debe ir vía prefs.js (root is-webcomponents)`,
    );
  }
}

// sessionStorage.setItem solo permitido en migración hacia prefs (no como destino final de save)
if (/#savePersistedState[\s\S]*?sessionStorage\.setItem/.test(agGridNoComments)) {
  failures.push('ag-grid.js: #savePersistedState no debe escribir en sessionStorage');
}

// ── 4. Docs coherentes ──────────────────────────────────────────────────
const md = existsSync(agGridMdPath) ? readFileSync(agGridMdPath, 'utf8') : '';
check(md.includes('is-webcomponents'), 'ag-grid.md: debe documentar localStorage is-webcomponents');
check(md.includes('replaceComponentPrefs') || md.includes('prefs.js'), 'ag-grid.md: debe apuntar a prefs.js');
check(/Qué no hacer|no hacer/i.test(md), 'ag-grid.md: debe tener sección de anti-patrones');

if (existsSync(dataLlm)) {
  const llm = readFileSync(dataLlm, 'utf8');
  check(llm.includes('is-ag-grid') || llm.includes('ag-grid.md'), 'data/LLM.md: debe listar is-ag-grid');
  check(llm.includes('is-webcomponents'), 'data/LLM.md: debe mencionar root is-webcomponents');
}

const inventory = readFileSync(join(root, 'src', 'components', 'LLM.md'), 'utf8');
check(
  inventory.includes('data/ag-grid.md'),
  'components/LLM.md: falta fila data/ag-grid.md en inventario',
);

// Docs canónicas no deben decir que el root actual ES is-components
// (mencionar legacy/migración sí está bien).
const docsToScan = [
  join(root, 'src', 'components', 'data', 'LLM.md'),
  join(root, 'src', 'components', 'layout', 'LLM.md'),
  join(root, 'src', 'components', 'data', 'ag-grid.md'),
  join(root, 'src', 'previews', 'data', 'is-ag-grid.json'),
].filter(existsSync);

for (const f of docsToScan) {
  const text = readFileSync(f, 'utf8');
  // Frases que afirman canonicidad del legacy
  if (/ROOT_KEY\s*=\s*["']is-components["']/.test(text)) {
    failures.push(`${f.replace(root, '').slice(1)}: declara ROOT_KEY=is-components como canónico`);
  }
  if (/localStorage\[['"]is-components['"]\]\s*=/.test(text) && !/legacy|migr/i.test(text)) {
    failures.push(`${f.replace(root, '').slice(1)}: documenta is-components como store activo sin marcar legacy`);
  }
}

// ── Resultado ───────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`prefs-contract: ${failures.length} fallo(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('prefs-contract: ok');
