/**
 * Guardián WHAT de `tools/vendor.ts` (vendor strategy por pin de fecha ISO).
 *   V1 trae el archivo a `hacia` con cabecera `// @vendor <ISO> <repo>@<sha|local> <desde>` y `@doc` por CDN (nunca ruta local).
 *   V2 si la copia ya es la más reciente, no la toca (al día); un cambio más nuevo en la fuente
 *      (sin commitear cuenta como «ahora») la actualiza: gana siempre el más reciente.
 *   V3 la configuración se valida (repo dueño/repo, al menos un archivo).
 *   V4 un import relativo no vendorizado se reporta en `faltan`.
 *   V5 sin `doc` en la config, la `// @doc` por CDN que trae la fuente se conserva (una sola vez).
 *   V9 la cabecera completa se lee por su fecha (primer campo) y al re-vendorizar se reescribe entera, sin restos.
 *   V10 CALIBRACIÓN DE LA PODA: para cada módulo de `vendor-distributions/`, la config que trae solo ese módulo (y
 *      sus relativos) deja un `schemas.ts` podado que compila junto al módulo (`deno check`), y el resultado dice
 *      qué secciones quedaron; una copia de `schemas.ts` en otra carpeta se poda a lo que ESA carpeta usa.
 */
import { assert, assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { bloqueoDePerfil, dependenciasDeNavegador, vendorizar } from '../../../vendor-distributions/shared/tools/vendor.ts';
import { ZConfigVendor } from '../../../vendor-distributions/shared/schemas.ts';

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
  assert(/^\/\/ @vendor \d{4}-\d\d-\d\dT\S+ nadie\/no-existe-iswc-test@local dist\/cdn\/vendor-distributions\/shared\/lib\/obj\.ts\n\/\/ @doc /.test(t1), `cabecera «// @vendor <ISO> <repo>@<sha|local> <desde>»: ${t1.slice(0, 160)}`);
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
  await Deno.writeTextFile(join(kit, 'b/a.ts'), '/** } from "./doc.js" */\nimport type { T } from "./schemas.js";\nexport const a: T = 1;\n');
  await Deno.writeTextFile(join(kit, 'b/schemas.ts'), 'export type T = number;\n');
  git(kit, 'add', '.'); git(kit, 'commit', '-q', '-m', 'v1');
  const solo = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'b/a.ts', hacia: 'v/a.ts' }] };
  const [r1] = await vendorizar(solo);
  assertEquals(r1!.faltan, ['./schemas.js'], 'falta el schemas.ts; el import en comentario no cuenta');
  const res = await vendorizar({ ...solo, archivos: [...solo.archivos, { desde: 'b/schemas.ts', hacia: 'v/schemas.ts' }] });
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

Deno.test('vendor: V9 la cabecera se lee por su fecha (primer campo) y al re-vendorizar se reescribe entera', async () => {
  const kit = await kitCon({ 'a.ts': '// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/x.md\nexport const a = 1;\n' });
  const app = await Deno.makeTempDir();
  await Deno.mkdir(join(app, 'ISU'), { recursive: true });
  // Copia con otro origen y fechada en el futuro: debe contar como más reciente (al día).
  const futuro = new Date(Date.now() + 365 * 24 * 3600_000).toISOString();
  await Deno.writeTextFile(join(app, 'ISU/a.ts'), `// @vendor ${futuro} nadie/no-existe-iswc-test@abc a.ts\n// @doc https://x/y.md\nexport const a = 0;\n`);
  const cfg = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, archivos: [{ desde: 'a.ts', hacia: 'ISU/a.ts' }] };
  const [r1] = await vendorizar(cfg);
  assertEquals(r1!.estado, 'al-dia', 'la fecha de la cabecera vieja se entiende');
  assertEquals(r1!.previa, futuro);
  // Fechada en el pasado: se actualiza y la cabecera se reescribe entera (sin restos de la vieja).
  await Deno.writeTextFile(join(app, 'ISU/a.ts'), `// @vendor 2020-01-01T00:00:00.000Z nadie/no-existe-iswc-test@abc a.ts\n// @doc https://x/y.md\nexport const a = 0;\n`);
  const [r2] = await vendorizar(cfg);
  assertEquals(r2!.estado, 'actualizado');
  const t = await Deno.readTextFile(join(app, 'ISU/a.ts'));
  const lineas = t.split('\n');
  assert(/^\/\/ @vendor \d{4}-\d\d-\d\dT[\d:.]+Z nadie\/no-existe-iswc-test@local a\.ts$/.test(lineas[0]!), `primera línea: ${lineas[0]}`);
  assert(lineas[1]!.startsWith('// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/'), lineas[1]);
  assertEquals(lineas[2], 'export const a = 1;');
  assert(!t.includes('@abc') && !t.includes('https://x/y.md'), 'sin restos de la cabecera vieja');
});

/** Módulos de `src/vendor-distributions/` (código, sin barrels ni el schemas) con sus relativos transitivos dentro de la carpeta. */
function modulosDelKit(): { modulo: string; archivos: string[] }[] {
  const VDS = 'src/vendor-distributions';
  const listar = (dir: string, out: string[] = []): string[] => {
    for (const e of Deno.readDirSync(dir)) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory) listar(p, out);
      else if (/\.(ts|mjs)$/.test(e.name) && e.name !== 'index.ts' && e.name !== 'schemas.ts' && (p.includes('/shared/') || p.includes('/client/'))) out.push(p);
    }
    return out;
  };
  const existe = (p: string) => { try { Deno.statSync(p); return true; } catch { return false; } };
  const relativos = (f: string): string[] => {
    const t = Deno.readTextFileSync(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const out: string[] = [];
    for (const m of t.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.\.?\/[^"']+)["']/g)) {
      const r = join(f, '..', m[1]!).replaceAll('\\', '/');
      const real = [r, r.replace(/\.js$/, '.ts')].find(existe);
      if (real) out.push(real);
    }
    return out;
  };
  return listar(VDS).map((f) => {
    const vistos = new Set<string>([f]);
    const pend = [f];
    while (pend.length) for (const d of relativos(pend.pop()!)) if (!vistos.has(d)) { vistos.add(d); pend.push(d); }
    return { modulo: f.split('/').pop()!.replace(/\.(m?[jt]s)$/, ''), archivos: [...vistos] };
  });
}

Deno.test('vendor: V10 calibración de la poda: cada módulo compila con su schemas.ts podado y el resultado dice las secciones', async () => {
  const kit = Deno.cwd();
  const app = await Deno.makeTempDir({ prefix: 'poda-' });
  const modulos = modulosDelKit();
  assert(modulos.length >= 15, `pocos módulos: ${modulos.length}`);
  const entradas: string[] = [];
  const resumen: string[] = [];
  for (const { modulo, archivos } of modulos) {
    const raiz = join(app, modulo);
    const cfg = { repo: 'nadie/no-existe-iswc-test', local: kit, raiz, perfil: 'client', archivos: archivos.map((a) => ({ desde: a, hacia: `ISU/${a.split('/').pop()}` })) };
    const res = await vendorizar(cfg);
    const malos = res.filter((r) => r.estado !== 'actualizado' || r.faltan || r.bloqueado);
    assertEquals(malos, [], `${modulo}: ${JSON.stringify(malos)}`);
    const schemas = res.find((r) => r.desde.endsWith('/schemas.ts'));
    if (schemas) {
      assert(schemas.secciones?.includes('comun'), `${modulo}: la poda conserva comun (${schemas.secciones})`);
      const texto = await Deno.readTextFile(join(raiz, 'ISU/schemas.ts'));
      assert(texto.startsWith('// @vendor '), 'cabecera');
      const presentes = [...texto.matchAll(/^\/\/ ===== @seccion (\S+)/gm)].map((m) => m[1]);
      assertEquals(presentes, schemas.secciones, `${modulo}: las secciones del archivo son las anunciadas`);
      resumen.push(`${modulo}: ${schemas.secciones!.join(', ')}`);
    }
    const entrada = join(raiz, `ISU/${modulo}.${archivos[0]!.endsWith('.mjs') ? 'mjs' : 'ts'}`);
    if (entrada.endsWith('.ts')) entradas.push(entrada);
  }
  // Un solo `deno check` con la config del kit (zod y demás por el import map), sobre TODAS las copias podadas.
  const r = new Deno.Command(Deno.execPath(), { args: ['check', '--config', join(kit, 'deno.json'), ...entradas], stdout: 'piped', stderr: 'piped' }).outputSync();
  const salida = new TextDecoder().decode(r.stderr) + new TextDecoder().decode(r.stdout);
  assertEquals(r.code, 0, `la poda deja un schemas.ts que no compila con su módulo:\n${salida}\n\nsecciones por módulo:\n${resumen.join('\n')}`);
  // Un módulo con sección propia la conserva; `obj` solo trae comun + obj.
  const obj = resumen.find((l) => l.startsWith('obj:'));
  assertEquals(obj, 'obj: comun, obj', 'obj se poda a lo mínimo');
  assert(resumen.some((l) => l.startsWith('render-lote:') && l.includes('render-diagram') && l.includes('static-server')), `requiere transitivo (render-lote → render-diagram → static-server): ${resumen.join(' | ')}`);
  await Deno.remove(app, { recursive: true });
});

Deno.test('vendor: V11 el mismo schemas.ts en dos carpetas se poda a lo que cada carpeta usa', async () => {
  const kit = Deno.cwd();
  const app = await Deno.makeTempDir({ prefix: 'poda2-' });
  const VDS = 'src/vendor-distributions/shared';
  const res = await vendorizar({
    repo: 'nadie/no-existe-iswc-test', local: kit, raiz: app, perfil: 'server',
    archivos: [
      { desde: `${VDS}/lib/obj.ts`, hacia: 'base/ISU/obj.ts' },
      { desde: `${VDS}/schemas.ts`, hacia: 'base/ISU/schemas.ts' },
      { desde: `${VDS}/testing/test-cooldown.ts`, hacia: 'tests/ISU/test-cooldown.ts' },
      { desde: `${VDS}/testing/deno-test.ts`, hacia: 'tests/ISU/deno-test.ts' },
      { desde: `${VDS}/schemas.ts`, hacia: 'tests/ISU/schemas.ts' },
    ],
  });
  assert(res.every((r) => r.estado === 'actualizado' && !r.faltan), JSON.stringify(res));
  assertEquals(res[1]!.secciones, ['comun', 'obj']);
  assertEquals(res[4]!.secciones, ['comun', 'test-cooldown', 'deno-test']);
  const obj = await Deno.readTextFile(join(app, 'base/ISU/obj.ts'));
  assert(obj.includes('from "./schemas.ts"'), 'obj importa la copia de SU carpeta');
  await Deno.remove(app, { recursive: true });
});
