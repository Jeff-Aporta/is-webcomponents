import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'isp/block-layout.test.ts',
  'isp/tree-view.test.ts',
  'layout/dialog.test.ts',
  'media/media-recorder.test.ts',
  'media/video.test.ts',
  'navigation/tab-group.test.ts',
];

let count = 0;
for (const rel of files) {
  const path = `src/utils/health/exhaustive/${rel}`;
  let src;
  try { src = readFileSync(path, 'utf8'); } catch { continue; }
  // Reemplazar patrón problemático de m![1].replace() con extracción del motor.
  const antes = src;
  // Patrón más amplio: cualquier `m![N].replace` debe ser extraído del motor.
  src = src.replace(
    /const\s+\w+\s*=\s*src\.match\(\/[^/]+\/\.exec\(src\)\);[\s\S]*?\.replace\([^)]+\)\.split\(','\)[\s\S]*?\.filter\(Boolean\)/,
    `// Reemplazado por extracción del motor
    const { extraerObservados } = await import('../_helpers.js');
    const list = extraerObservados(TS);`,
  );
  // Si el test usa callbacks síncronos, lo cambio a async.
  src = src.replace(/^test\('([^']+)', \(\) => \{$/gm, "test('$1', async () => {");
  if (src !== antes) {
    writeFileSync(path, src, 'utf8');
    count++;
    console.log('Fixed:', path);
  }
}
console.log(`Total fixed: ${count}`);