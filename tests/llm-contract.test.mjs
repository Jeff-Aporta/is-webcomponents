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
  ['is-preview-component', 'previews controlados'],
  ['ISComponentPreview', 'clase base de preview'],
  ['Utilerías', 'nav helpers'],
  ['No meter lógica de preview en strings', "DON'T eval/strings"],
  ['No recrear HTML gordo', "DON'T HTML gordo"],
  ['No usar la misma profundidad', "DON'T paths styles vs dist"],
  ['No reinventar botones', "DON'T reinventar is-*"],
  ['*.test.mjs', 'extensión canónica de tests'],
  ['gitignoreado', 'tests trackeados (no ignore completo)'],
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
  'attr-enums.test.mjs',
  'token-vocabulary.test.mjs',
  'button-events.test.mjs',
  'palette-and-snippet-contract.test.mjs',
  'llm-contract.test.mjs',
  'prefs-contract.test.mjs',
];

for (const file of guardians) {
  const onDisk = existsSync(join(root, 'tests', file));
  if (!onDisk) failures.push(`guardián citado no existe en disco: tests/${file}`);
  // llm-contract se auto-cita en Testing; el resto deben aparecer por nombre corto o completo
  const short = file.replace('.test.mjs', '');
  if (file !== 'llm-contract.test.mjs' && !llm.includes(short) && !llm.includes(file)) {
    failures.push(`LLM.md no cita el guardián ${file}`);
  }
}

// Errores 24–26 = lecciones recientes (preview / utilerías / strings)
for (const n of [24, 25, 26]) {
  if (!new RegExp(`^${n}\\.`, 'm').test(llm) && !llm.includes(`${n}. **`)) {
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
