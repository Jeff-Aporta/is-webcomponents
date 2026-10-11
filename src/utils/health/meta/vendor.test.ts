/**
 * Guardián WHAT de `tools/vendor.ts` (vendor strategy por pin de fecha ISO).
 *   V1 trae el archivo a `hacia` con cabecera `@vendor <ISO>` y `@doc` por CDN (nunca ruta local).
 *   V2 si la copia ya es la más reciente, no la toca (al día); un cambio más nuevo en la fuente
 *      (sin commitear cuenta como «ahora») la actualiza: gana siempre el más reciente.
 *   V3 la configuración se valida (repo dueño/repo, al menos un archivo).
 *   V4 un import relativo no vendorizado se reporta en `faltan`.
 *   V5 sin `doc` en la config, la `// @doc` por CDN que trae la fuente se conserva (una sola vez).
 */
import { assert, assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { vendorizar } from '../../../vendor-distributions/tools/vendor.ts';
import { ZConfigVendor } from '../../../vendor-distributions/tools/vendor.schemas.ts';

const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });

Deno.test('vendor: V1-V2 trae con cabecera ISO, queda al día y gana siempre lo más reciente', async () => {
  const kit = await Deno.makeTempDir();
  const app = await Deno.makeTempDir();
  git(kit, 'init', '-q');
  git(kit, 'config', 'user.email', 't@t'); git(kit, 'config', 'user.name', 't');
  await Deno.mkdir(join(kit, 'dist/cdn/vendor-distributions/lib'), { recursive: true });
  await Deno.writeTextFile(join(kit, 'dist/cdn/vendor-distributions/lib/obj.ts'), 'export const v = 1;\n');
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  // Repo remoto inexistente: compite solo el checkout local (como sin red).
  const cfg = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'dist/cdn/vendor-distributions/lib/obj.ts', hacia: 'ISU/obj.ts', doc: 'dist/cdn/vendor-distributions/lib/obj.md' }] };
  const [r1] = await vendorizar(cfg);
  assertEquals(r1!.estado, 'actualizado');
  const t1 = await Deno.readTextFile(join(app, 'ISU/obj.ts'));
  assert(/^\/\/ @vendor \d{4}-\d\d-\d\dT/.test(t1), t1);
  assert(t1.includes('// @doc https://cdn.jsdelivr.net/gh/nadie/no-existe-iswc-test@main/dist/cdn/vendor-distributions/lib/obj.md') && t1.endsWith('export const v = 1;\n'), t1);
  const [r2] = await vendorizar(cfg);
  assertEquals(r2!.estado, 'al-dia', 'la copia ya es la más reciente');
  await Deno.writeTextFile(join(kit, 'dist/cdn/vendor-distributions/lib/obj.ts'), 'export const v = 2;\n');
  const [r3] = await vendorizar(cfg);
  assertEquals(r3!.estado, 'actualizado', 'cambio sin commitear = más reciente');
  assert((await Deno.readTextFile(join(app, 'ISU/obj.ts'))).endsWith('export const v = 2;\n'));
});

Deno.test('vendor: V3 la configuración se valida', () => {
  assertThrows(() => ZConfigVendor.parse({ repo: 'sin-barra', archivos: [{ desde: 'a', hacia: 'b' }] }));
  assertThrows(() => ZConfigVendor.parse({ repo: 'a/b', archivos: [] }));
  assertEquals(ZConfigVendor.parse({ repo: 'a/b', archivos: [{ desde: 'a', hacia: 'b' }], extra: 1 }).rama, 'main');
});

Deno.test('vendor: V4 un archivo vendorizado que importa algo no vendorizado se reporta en `faltan`', async () => {
  const kit = await Deno.makeTempDir();
  const app = await Deno.makeTempDir();
  git(kit, 'init', '-q');
  git(kit, 'config', 'user.email', 't@t'); git(kit, 'config', 'user.name', 't');
  await Deno.mkdir(join(kit, 'b'), { recursive: true });
  await Deno.writeTextFile(join(kit, 'b/a.ts'), '/** } from "./doc.js" */\nimport type { T } from "./a.schemas.js";\nexport const a: T = 1;\n');
  await Deno.writeTextFile(join(kit, 'b/a.schemas.ts'), 'export type T = number;\n');
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  const solo = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'b/a.ts', hacia: 'v/a.ts' }] };
  const [r1] = await vendorizar(solo);
  assertEquals(r1!.faltan, ['./a.schemas.js'], 'falta el hermano .schemas; el import en comentario no cuenta');
  const res = await vendorizar({ ...solo, archivos: [...solo.archivos, { desde: 'b/a.schemas.ts', hacia: 'v/a.schemas.ts' }] });
  assert(res.every((r) => !r.faltan), JSON.stringify(res));
});

Deno.test('vendor: V5 sin doc en la config se conserva la @doc por CDN de la fuente, sin duplicar', async () => {
  const kit = await Deno.makeTempDir();
  const app = await Deno.makeTempDir();
  git(kit, 'init', '-q');
  git(kit, 'config', 'user.email', 't@t'); git(kit, 'config', 'user.name', 't');
  const url = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/x.md';
  await Deno.writeTextFile(join(kit, 'a.ts'), `// @doc ${url}\nexport const a = 1;\n`);
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  await vendorizar({ repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'a.ts', hacia: 'ISU/a.ts' }] });
  const t = await Deno.readTextFile(join(app, 'ISU/a.ts'));
  assert(/^\/\/ @vendor \S+ nadie\/no-existe-iswc-test@local a\.ts\n\/\/ @doc https:\/\/cdn\.jsdelivr\.net\//.test(t), t);
  assertEquals(t.split('// @doc ').length, 2, 'una sola @doc');
  assert(t.endsWith('export const a = 1;\n'), t);
});
