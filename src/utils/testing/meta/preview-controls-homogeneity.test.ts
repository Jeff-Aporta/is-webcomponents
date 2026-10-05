/**
 * Guardián: controles de demos alineados al API del CE
 * (shape vs pill, enums VALID_*, options).
 *
 * Fuente: `node scripts/audits/preview-controls.mjs` (sin --fix).
 */
import { assertEquals } from 'jsr:@std/assert@1';
import { dirname, fromFileUrl, join } from 'jsr:@std/path@1';

const root = join(dirname(fromFileUrl(import.meta.url)), '../../../..');

Deno.test('preview controls: auditoría homogénea sin hallazgos', async () => {
  const script = join(root, 'scripts/audits/preview-controls.mjs');
  const cmd = new Deno.Command('node', {
    args: [script],
    cwd: root,
    stdout: 'piped',
    stderr: 'piped',
  });
  const { code, stdout, stderr } = await cmd.output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);
  assertEquals(code, 0, err || out);
  const report = JSON.parse(out);
  assertEquals(report.total, 0, JSON.stringify(report.findings?.slice(0, 20), null, 2));
});
