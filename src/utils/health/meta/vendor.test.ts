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
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { bloqueoDePerfil, dependenciasDeNavegador, vendorizar } from '../../../vendor-distributions/shared/tools/vendor.ts';
import { ZConfigVendor } from '../../../vendor-distributions/shared/tools/vendor.schemas.ts';

const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });

Deno.test('vendor: V1-V2 trae con cabecera ISO, queda al día y gana siempre lo más reciente', async () => {
  const kit = await Deno.makeTempDir();
  const app = await Deno.makeTempDir();
  git(kit, 'init', '-q');
  git(kit, 'config', 'user.email', 't@t'); git(kit, 'config', 'user.name', 't');
  await Deno.mkdir(join(kit, 'dist/cdn/vendor-distributions/shared/lib'), { recursive: true });
  await Deno.writeTextFile(join(kit, 'dist/cdn/vendor-distributions/shared/lib/obj.ts'), 'export const v = 1;\n');
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  // Repo remoto inexistente: compite solo el checkout local (como sin red).
  const cfg = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'dist/cdn/vendor-distributions/shared/lib/obj.ts', hacia: 'ISU/obj.ts', doc: 'dist/cdn/vendor-distributions/shared/lib/obj.md' }] };
  const [r1] = await vendorizar(cfg);
  assertEquals(r1!.estado, 'actualizado');
  const t1 = await Deno.readTextFile(join(app, 'ISU/obj.ts'));
  assert(/^\/\/ @vendor \d{4}-\d\d-\d\dT/.test(t1), t1);
  assert(t1.includes('// @doc https://cdn.jsdelivr.net/gh/nadie/no-existe-iswc-test@main/dist/cdn/vendor-distributions/shared/lib/obj.md') && t1.endsWith('export const v = 1;\n'), t1);
  const [r2] = await vendorizar(cfg);
  assertEquals(r2!.estado, 'al-dia', 'la copia ya es la más reciente');
  await Deno.writeTextFile(join(kit, 'dist/cdn/vendor-distributions/shared/lib/obj.ts'), 'export const v = 2;\n');
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

/** Kit temporal con git y los archivos dados (ruta → contenido), commiteados. */
async function kitCon(archivos: Record<string, string>): Promise<string> {
  const kit = await Deno.makeTempDir();
  git(kit, 'init', '-q');
  git(kit, 'config', 'user.email', 't@t'); git(kit, 'config', 'user.name', 't');
  for (const [ruta, texto] of Object.entries(archivos)) {
    await Deno.mkdir(join(kit, ruta, '..'), { recursive: true });
    await Deno.writeTextFile(join(kit, ruta), texto);
  }
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  return kit;
}
const VD = 'dist/cdn/vendor-distributions';

Deno.test('vendor: V6 el perfil filtra: server baja shared/server, nunca client ni rutas sin perfil', async () => {
  const kit = await kitCon({
    [`${VD}/shared/lib/a.ts`]: 'export const a = 1;\n',
    [`${VD}/server/tools/s.ts`]: 'export const s = 1;\n',
    [`${VD}/client/tools/c.ts`]: 'export const c = 1;\n',
    [`${VD}/testing/viejo.ts`]: 'export const v = 1;\n',
  });
  const app = await Deno.makeTempDir();
  const archivos = ['shared/lib/a.ts', 'server/tools/s.ts', 'client/tools/c.ts', 'testing/viejo.ts']
    .map((r) => ({ desde: `${VD}/${r}`, hacia: `ISU/${r.split('/').pop()}` }));
  const res = await vendorizar({ repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, perfil: 'server', archivos });
  assertEquals(res.map((r) => [r.hacia, r.estado, !!r.bloqueado]), [
    ['ISU/a.ts', 'actualizado', false],
    ['ISU/s.ts', 'actualizado', false],
    ['ISU/c.ts', 'error', true],
    ['ISU/viejo.ts', 'error', true],
  ]);
  assert(!existsSync(join(app, 'ISU/c.ts')) && !existsSync(join(app, 'ISU/viejo.ts')), 'lo bloqueado no se escribe');
  assertEquals(bloqueoDePerfil(`${VD}/client/tools/c.ts`, 'client'), null, 'client baja client/');
  assert(bloqueoDePerfil(`${VD}/server/tools/s.ts`, 'client'), 'client no baja server/');
  assertEquals(bloqueoDePerfil('dist/cdn/build/bundle-min.ts', 'server'), null, 'fuera de vendor-distributions no se filtra por ruta');
});

Deno.test('vendor: V7 un consumidor server nunca recibe un archivo con dependencias de navegador', async () => {
  const kit = await kitCon({ [`${VD}/shared/testing/x.ts`]: "import { chromium } from 'npm:playwright@1';\nexport const x = chromium;\n" });
  const app = await Deno.makeTempDir();
  const archivos = [{ desde: `${VD}/shared/testing/x.ts`, hacia: 'ISU/x.ts' }];
  const [r] = await vendorizar({ repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, perfil: 'server', archivos });
  assert(r!.bloqueado?.includes('playwright'), JSON.stringify(r));
  assert(!existsSync(join(app, 'ISU/x.ts')));
  const [c] = await vendorizar({ repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, perfil: 'client', archivos });
  assertEquals(c!.estado, 'actualizado', 'un client sí lo recibe');
  assertEquals(dependenciasDeNavegador("/* import 'playwright' */\nimport { z } from 'zod';\nconst m = createRequire(u)('@browserbasehq/stagehand');"), ['@browserbasehq/stagehand']);
});

Deno.test('vendor: V8 al aplanar se reescriben los relativos entre perfiles', async () => {
  const kit = await kitCon({
    [`${VD}/shared/testing/p.ts`]: 'export const p = 1;\n',
    [`${VD}/client/testing/c.ts`]: "import { p } from '../../shared/testing/p.ts';\nexport type * from '../../shared/testing/p.js';\nexport const c = p;\n",
  });
  const app = await Deno.makeTempDir();
  const res = await vendorizar({
    repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, perfil: 'client',
    archivos: [{ desde: `${VD}/client/testing/c.ts`, hacia: 'ISU/c.ts' }, { desde: `${VD}/shared/testing/p.ts`, hacia: 'ISU/p.ts' }],
  });
  assert(res.every((r) => r.estado === 'actualizado' && !r.faltan), JSON.stringify(res));
  const t = await Deno.readTextFile(join(app, 'ISU/c.ts'));
  assert(t.includes("from './p.ts'") && t.includes("from './p.js'") && !t.includes('shared/'), t);
});
