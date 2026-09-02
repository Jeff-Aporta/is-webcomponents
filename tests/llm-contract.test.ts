// tests/llm-contract.test.ts
//
// LLM.md es la carta de leyes del kit. Si alguien borra secciones DO/DON'T,
// la bitácora de errores o deja de citar guardianes que sí existen (o cita
// archivos fantasma), este test falla.
//
// Extensión canónica: *.test.ts. El kit migró a TypeScript el 31-ago-2026 y
// Node 22 ejecuta .ts sin compilar, así que ya no hay motivo para .mjs.
// tests/ NO está gitignoreado completo — solo *.tmp / coverage / .cache.
//
// Uso: node tests/llm-contract.test.ts

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docPath = join(root, 'LLM.md');
const failures = [];

if (!existsSync(docPath)) {
  console.error('llm-contract.test.ts: FAIL — falta LLM.md en la raíz');
  process.exit(1);
}

const llm = readFileSync(docPath, 'utf8');

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
  ['Anti-redundancia', 'loader anti-redundancia'],
  ['No volver a pintar «HTML puro equivalente»', "DON'T demo-equiv"],
  ['No marcar `data-cm=\"1\"`', "DON'T data-cm prematuro"],
  ['inferLanguage', 'is-code infer lang'],
  ['No reimportar `src/components/layout/preview-component.js`', "DON'T src preview-component en Pages"],
  ['Galería boot:', 'carta: boot galería anti-FOUC'],
  ['setHostPreview', 'own-property preview'],
  ['gallery-boot', 'guardián gallery-boot'],
  ['refreshEditor', 'visor fuentes: refresh CM'],
  ['GALLERY_CHROME_TAGS', 'chrome galería incluye tabs'],
  ['specs/README.md', 'contrato SDD specs'],
];

for (const [needle, label] of requiredPhrases) {
  if (!llm.includes(needle)) failures.push(`falta frase clave (${label}): "${needle}"`);
}

/** Guardianes que la Carta / Testing deben citar y que deben existir en disco. */
const guardians = [
  'src-layout.test.ts',
  'robots-sitemap.test.ts',
  'helpers-homogeneity.test.ts',
  'preview-json-contract.test.ts',
  'preview-controller.test.ts',
  'preview-paths.test.ts',
  'dist-cdn-layout.test.ts',
  'attr-enums.test.ts',
  'token-vocabulary.test.ts',
  'button-events.test.ts',
  'button-color-appearance.test.ts',
  'em-scale-font-inherit.test.ts',
  'palette-and-snippet-contract.test.ts',
  'llm-contract.test.ts',
  'prefs-contract.test.ts',
  'url-nav.test.ts',
  'format-bytes-autofit.test.ts',
  'ux-gallery-invariants.test.ts',
  'cdn-loader.test.ts',
  'load-plan.test.ts',
  'code-infer-lang.test.ts',
  'demo-equiv.test.ts',
  'gallery-boot.test.ts',
  'gallery-sources-meta.test.ts',
  'cdn-folders.test.ts',
  'specs-sdd.test.ts',
];

for (const file of guardians) {
  const onDisk = existsSync(join(root, 'tests', file));
  if (!onDisk) failures.push(`guardián citado no existe en disco: tests/${file}`);
  const short = file.replace('.test.mjs', '');
  if (file !== 'llm-contract.test.ts' && !llm.includes(short) && !llm.includes(file)) {
    failures.push(`LLM.md no cita el guardián ${file}`);
  }
}

// Errores 24–44 = preview / dist / color / em / url / toast / pesos / ux /
// file-meta / is-code / snippets / demo-equiv / loader / Pages icons / FOUC /
// visor CM vacío
for (const n of [
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
  44,
]) {
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
  console.error(`llm-contract.test.ts: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `llm-contract.test.ts: PASS — LLM.md con carta/DO/DON'T/errores + ${guardians.length} guardianes en disco`,
);
