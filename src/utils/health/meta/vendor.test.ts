/**
 * Guardián WHAT de `tools/vendor.ts` (vendor strategy por pin de fecha ISO).
 *   V1 trae el archivo a `hacia` con cabecera `@vendor <ISO>` y `@doc`.
 *   V2 si la copia ya es la más reciente, no la toca (al día); un cambio más nuevo en la fuente
 *      (sin commitear cuenta como «ahora») la actualiza: gana siempre el más reciente.
 *   V3 la configuración se valida (repo dueño/repo, al menos un archivo).
 */
import { assert, assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { vendorizar } from '../../../cdn/tools/vendor.ts';
import { ZConfigVendor } from '../../../cdn/tools/vendor.schemas.ts';

const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });

Deno.test('vendor: V1-V2 trae con cabecera ISO, queda al día y gana siempre lo más reciente', async () => {
  const kit = await Deno.makeTempDir();
  const app = await Deno.makeTempDir();
  git(kit, 'init', '-q');
  git(kit, 'config', 'user.email', 't@t'); git(kit, 'config', 'user.name', 't');
  await Deno.mkdir(join(kit, 'dist/cdn/lib'), { recursive: true });
  await Deno.writeTextFile(join(kit, 'dist/cdn/lib/obj.ts'), 'export const v = 1;\n');
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  // Repo remoto inexistente: compite solo el checkout local (como sin red).
  const cfg = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'dist/cdn/lib/obj.ts', hacia: 'ISU/obj.ts', doc: 'dist/cdn/lib/obj.md' }] };
  const [r1] = await vendorizar(cfg);
  assertEquals(r1!.estado, 'actualizado');
  const t1 = await Deno.readTextFile(join(app, 'ISU/obj.ts'));
  assert(/^\/\/ @vendor \d{4}-\d\d-\d\dT/.test(t1), t1);
  assert(t1.includes('// @doc dist/cdn/lib/obj.md') && t1.endsWith('export const v = 1;\n'), t1);
  const [r2] = await vendorizar(cfg);
  assertEquals(r2!.estado, 'al-dia', 'la copia ya es la más reciente');
  await Deno.writeTextFile(join(kit, 'dist/cdn/lib/obj.ts'), 'export const v = 2;\n');
  const [r3] = await vendorizar(cfg);
  assertEquals(r3!.estado, 'actualizado', 'cambio sin commitear = más reciente');
  assert((await Deno.readTextFile(join(app, 'ISU/obj.ts'))).endsWith('export const v = 2;\n'));
});

Deno.test('vendor: V3 la configuración se valida', () => {
  assertThrows(() => ZConfigVendor.parse({ repo: 'sin-barra', archivos: [{ desde: 'a', hacia: 'b' }] }));
  assertThrows(() => ZConfigVendor.parse({ repo: 'a/b', archivos: [] }));
  assertEquals(ZConfigVendor.parse({ repo: 'a/b', archivos: [{ desde: 'a', hacia: 'b' }], extra: 1 }).rama, 'main');
});
