import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'feedback/badge.test.ts',
  'feedback/toast.test.ts',
  'isp/block-layout.test.ts',
  'isp/tree-view.test.ts',
  'layout/dialog.test.ts',
  'layout/split-panel.test.ts',
  'media/video.test.ts',
  'navigation/tab-group.test.ts',
];

for (const rel of files) {
  const path = `src/utils/health/exhaustive/${rel}`;
  let src = readFileSync(path, 'utf8');
  // Si ya usa leerConBase, skip.
  if (src.includes('leerConBase')) {
    console.log('Already migrated:', path);
    continue;
  }
  // Reemplaza `read(WRAPPER)` o `read(TS)` con `leerConBase(WRAPPER)`.
  // Estos tests suelen usar una const con el path al módulo.
  src = src.replace(/\bread\((TS|WRAPPER|MOD|SRC)\)/g, 'leerConBase($1)');
  writeFileSync(path, src, 'utf8');
  console.log('Updated:', path);
}