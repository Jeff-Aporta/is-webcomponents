import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');

test('W54: src/**/*.ts no debe tener type/interface top-level (deben vivir en *.schemas.ts)', async () => {
  // Recursive walk
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
  const offenders: { file: string; types: number; ifs: number }[] = [];
  for await (const p of walk(join(RAIZ, 'src'))) {
    if (!p.endsWith('.ts')) continue;
    if (p.endsWith('.schemas.ts') || p.endsWith('.d.ts')) continue;
    if (p.includes('/_testing/') || p.includes('.test.')) continue;
    const content = await readFile(p, 'utf-8');
    // Top-level type/interface (not indented)
    const types = content.match(/^(?:export\s+)?type\s+\w+/gm) || [];
    const ifs = content.match(/^(?:export\s+)?interface\s+\w+/gm) || [];
    if (types.length > 0 || ifs.length > 0) {
      offenders.push({ file: p, types: types.length, ifs: ifs.length });
    }
  }
  if (offenders.length > 0) {
    const summary = offenders.slice(0, 5).map(o => `  ${o.file}: ${o.types} type, ${o.ifs} interface`).join('\n');
    assert.fail(`src/**/*.ts debe tener 0 type/interface top-level, pero hay ${offenders.length} ofenders:\n${summary}\n\nMigrar a *.schemas.ts con Zod.`);
  }
});
