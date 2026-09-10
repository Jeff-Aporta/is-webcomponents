import { readFileSync, writeFileSync } from 'node:fs';

// Detecta tests con el bug "m![1].replace()" (regex.exec sin match).
// Lo arregla extrayendo los attrs del motor.
const files = [
  'helpers/format-date.test.ts',
  'helpers/relative-time.test.ts',
  'helpers/md-editor.test.ts',
  'helpers/md-render.test.ts',
  'helpers/observer.test.ts',
  'helpers/intersection-observer.test.ts',
  'helpers/mutation-observer.test.ts',
  'helpers/resize-observer.test.ts',
  'isp/block-layout.test.ts',
  'isp/tree-view.test.ts',
  'isp/heading.test.ts',
  'layout/split-panel.test.ts',
  'layout/dialog.test.ts',
  'media/media-recorder.test.ts',
  'media/video.test.ts',
  'navigation/tab-group.test.ts',
  'feedback/badge.test.ts',
  'feedback/toast.test.ts',
];

let count = 0;
for (const rel of files) {
  const path = `src/utils/health/exhaustive/${rel}`;
  let src;
  try { src = readFileSync(path, 'utf8'); } catch { continue; }
  if (!src.includes('m![1].replace')) continue;
  // Reemplazar el patrón problemático con extracción desde el motor.
  // El patrón típico:
  //   const m = src.match(/observedAttributes\(\)\s*\{[^}]*return\s*\[([^\]]+)\]/.exec(src));
  //   assert.ok(m);
  //   const list = m![1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  // Lo cambiamos por una llamada al motor.
  src = src.replace(
    /const m = src\.match\(\/observedAttributes[^\)]*\/\.exec\(src\)\);\s*assert\.ok\(m\);\s*const list = m!\[1\]\.replace\(\/\[.*\]\/g, ''\)\.split\(','\)\.filter\(Boolean\);/g,
    `// Extraer observados vía motor (incluye extends, factories, styleAttrs).
    const { extraerObservados } = await import('../_helpers.js');
    const list = extraerObservados(TS);`,
  );
  // Si el test usa callbacks síncronos, lo cambio a async.
  src = src.replace(/^test\('([^']+)', \(\) => \{$/gm, "test('$1', async () => {");
  src = src.replace(/^test\("([^"]+)", \(\) => \{$/gm, 'test("$1", async () => {');
  writeFileSync(path, src, 'utf8');
  count++;
  console.log('Fixed:', path);
}
console.log(`Total fixed: ${count}`);