import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');

test('W54: src/ no debe contener archivos .css (solo .scss)', async () => {
  // Recursive walk src/ and find any .css files
  async function* walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
        yield* walk(p);
      } else {
        yield p;
      }
    }
  }
  const cssFiles: string[] = [];
  for await (const p of walk(join(RAIZ, 'src'))) {
    if (p.endsWith('.css')) cssFiles.push(p);
  }
  assert.equal(cssFiles.length, 0,
    `src/ debe tener solo .scss, pero hay ${cssFiles.length} .css:\n  ${cssFiles.slice(0, 5).join('\n  ')}`);
});
