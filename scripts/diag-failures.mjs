#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const tests = [
  'src/utils/health/meta/nav-home-item.test.ts',
  'src/utils/health/domain/icon-currentcolor.test.ts',
  'src/utils/health/meta/deps-snippet.test.ts',
];

for (const rel of tests) {
  const abs = join(root, rel);
  const r = spawnSync(process.execPath, ['--import', './scripts/ts-resolve-hook.ts', '--test', abs], {
    encoding: 'utf8', cwd: root, timeout: 30000,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  console.log(`\n=== ${rel} ===`);
  const lines = out.split('\n');
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    if (lines[i].match(/FAIL|failing|faltan|esperaba|expected|AssertionError|expected:|actual:|ENOENT|fallo/i)) {
      console.log(lines[i]);
    }
  }
}