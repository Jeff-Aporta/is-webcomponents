// tests/llm-contract.test.mjs
//
// El LLM.md es la carta de leyes del kit. Si alguien borra secciones DO/DON'T,
// la bitácora de errores o deja de citar guardianes que sí existen (o cita
// archivos fantasma), este test falla.
//
// Extensión canónica: *.test.mjs (no .ts mientras el kit sea ESM vanilla).
// tests/ NO está gitignoreado completo — solo *.tmp / coverage / .cache.
//
// Uso: node tests/llm-contract.test.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const llmPath = join(root, 'LLM.md');
const failures = [];

if (!existsSync(llmPath)) {
  console.error('llm-contract.test.mjs: FAIL — falta LLM.md en la raíz');
  process.exit(1);
}

const llm = readFileSync(llmPath, 'utf8');

const requiredHeadings = [
  '## Carta de leyes',
  '## Proyecto',
  '## DO',
  "## DON'T",
  '## Errores aprendidos',
  '## Testing',
];

for (const h of requiredHeadings) {
  if (!llm.includes(h)) failures.push(`falta sección "${h}"`);
}

const requiredPhrases = [
  ['Reusar antes de inventar', 'carta de leyes: reuso'],
  ['src/', 'fuente bajo src/'],
  ['is-preview/v1', 'schema JSON previews'],
  ['is-preview-component', 'previews controlados'],
  ['Utilerías', 'nav helpers'],
  ['No meter lógica de preview en strings', "DON'T eval/strings"],
  ['No recrear HTML por componente', "DON'T HTML por tag"],
  ['No dejar bundles sueltos en `dist/`', "DON'T dist huérfanos"],
  ['No reinventar botones', "DON'T reinventar is-*"],
  ['No confiar en que `<button>`/`<input>` hereden', "DON'T font inherit en controles nativos"],
  ['em-scale-font-inherit', 'guardián escala em'],
  ['Un solo query de estado: `s`', 'estado URL solo ?s='],
  ['No crear query params sueltos', "DON'T params sueltos"],
  ['is-format-bytes autofit', 'pesos autofit'],
];

for (const [needle, label] of requiredPhrases) {
  if (!llm.includes(needle)) failures.push(`falta frase clave (${label}): "${needle}"`);
}

/** Guardianes que la Carta / Testing deben citar y que deben existir en disco. */
const guardians = [
  'src-layout.test.mjs',
  'helpers-homogeneity.test.mjs',
  'preview-json-contract.test.mjs',
  'preview-controller.test.mjs',
  'preview-paths.test.mjs',
  'dist-cdn-layout.test.mjs',
  'attr-enums.test.mjs',
  'token-vocabulary.test.mjs',
  'button-events.test.mjs',
  'button-color-appearance.test.mjs',
  'em-scale-font-inherit.test.mjs',
  'palette-and-snippet-contract.test.mjs',
  'llm-contract.test.mjs',
  'prefs-contract.test.mjs',
  'url-nav.test.mjs',
  'format-bytes-autofit.test.mjs',
  'ux-gallery-invariants.test.mjs',
];

for (const file of guardians) {
  const onDisk = existsSync(join(root, 'tests', file));
  if (!onDisk) failures.push(`guardián citado no existe en disco: tests/${file}`);
  const short = file.replace('.test.mjs', '');
  if (file !== 'llm-contract.test.mjs' && !llm.includes(short) && !llm.includes(file)) {
    failures.push(`LLM.md no cita el guardián ${file}`);
  }
}

// Errores 24–36 = preview JSON / dist / PowerShell / color×appearance / em-scale /
// url-nav ?s= / toast host / pesos CDN / ux-audit / on(null)
for (const n of [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]) {
  if (!llm.includes(`${n}. **`)) {
    failures.push(`bitácora de errores: falta entrada ${n}`);
  }
}

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
if (/^tests\/\s*$/m.test(gitignore) || /^\/tests\/?\s*$/m.test(gitignore)) {
  failures.push(
    '.gitignore ignora tests/ entero — solo deben ignorarse *.tmp / coverage / .cache (los *.test.mjs se commitean)',
  );
}
if (!/tests\/\*\.tmp/.test(gitignore)) {
  failures.push('.gitignore debería ignorar tests/*.tmp (artefactos), no el directorio entero');
}

if (failures.length) {
  console.error(`llm-contract.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `llm-contract.test.mjs: PASS — LLM.md con carta/DO/DON'T/errores + ${guardians.length} guardianes en disco`,
);
