import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';

const cwd = process.cwd();
mkdirSync('.audit', { recursive: true });
const outFile = '.audit/exhaustive-results.txt';

try {
  execSync(`node --import ./scripts/ts-resolve-hook.ts --test "src/utils/health/exhaustive/**/*.test.ts"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  writeFileSync(outFile, (e.stdout ?? '') + '\n' + (e.stderr ?? ''));
}

const output = readFileSync(outFile, 'utf8');
const ok = (output.match(/^ok /gm) ?? []).length;
const no = (output.match(/^not ok /gm) ?? []).length;
console.log(`Total: ${ok + no} | OK: ${ok} | FAIL: ${no} | ${((ok/(ok+no))*100).toFixed(2)}%`);