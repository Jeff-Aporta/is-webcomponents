import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const exec = promisify(execFile);
const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');

/**
 * W54 (migracion CSS→SCSS): el codigo fuente de `src/` debe ser solo `.scss`
 * (los `.css` que `deno task build:scss` regenera son artefactos
 * gitignored; la fuente canonica es la `.scss` hermana).
 *
 * El test consulta `git ls-files` en vez de recorrer el filesystem porque
 * los `.css` generados por `build:scss` viven temporalmente en `src/` y no
 * deben contarse: la regla es "no `.css` versionado en `src/`".
 */
test('W54: src/ no debe contener archivos .css versionados (solo .scss)', async () => {
  const { stdout } = await exec('git', ['ls-files', 'src/'], { cwd: RAIZ });
  const tracked = stdout.split('\n').filter(Boolean);
  const trackedCss = tracked.filter((p) => p.endsWith('.css'));
  assert.equal(
    trackedCss.length,
    0,
    `src/ no debe contener .css versionados, pero hay ${trackedCss.length}:\n  ` +
      trackedCss.slice(0, 5).join('\n  '),
  );
});
