import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();
const outFile = join(cwd, '.audit-results.txt');

try {
  execSync(`node --import ./scripts/ts-resolve-hook.ts --test "src/utils/health/exhaustive/**/*.test.ts"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  writeFileSync(outFile, (e.stdout ?? '') + '\n' + (e.stderr ?? ''));
}

const output = readFileSync(outFile, 'utf8');
const okCount = (output.match(/^ok /gm) ?? []).length;
const notOkCount = (output.match(/^not ok /gm) ?? []).length;
console.log(`Resultados:`);
console.log(`  Total:    ${okCount + notOkCount}`);
console.log(`  Pasando:  ${okCount}`);
console.log(`  Fallando: ${notOkCount}`);
console.log(`  Porcentaje: ${((okCount / (okCount + notOkCount)) * 100).toFixed(2)}%`);
if (notOkCount > 0) {
  console.log();
  console.log(`Primeros 20 fallando:`);
  let count = 0;
  for (const m of output.matchAll(/^not ok [^\n]+/gm)) {
    console.log(`  ${m[0]}`);
    count++;
    if (count >= 20) break;
  }
}