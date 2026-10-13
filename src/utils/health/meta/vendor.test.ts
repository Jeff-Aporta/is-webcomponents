/**
 * Guardián WHAT de `tools/vendor.ts` (vendor strategy por pin de fecha ISO).
 *   V1 trae el archivo a `hacia` con cabecera `// @vendor <ISO> <repo>@<sha|local> <desde>` y `@doc` por CDN (nunca ruta local).
 *   V2 si la copia ya es la más reciente, no la toca (al día); un cambio más nuevo en la fuente
 *      (sin commitear cuenta como «ahora») la actualiza: gana siempre el más reciente.
 *   V3 la configuración se valida (repo dueño/repo; `archivos` opcional: solo bootstrap).
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
  assertEquals(ZConfigVendor.parse({ repo: 'a/b' }).archivos, [], 'sin altas: solo barrido (vendor.json es bootstrap)');
  assertThrows(() => ZConfigVendor.parse({ repo: 'a/b', pin: { sha: 'abc' } }), undefined, undefined, 'pin.sha debe ser sha40');
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
  assert(obj.includes('from "./schemas.js"'), 'obj importa la copia de SU carpeta (.js: tsc de Node)');
  await Deno.remove(app, { recursive: true });
});

// ── Fase 2 (2026-10-13): barrido por cabecera, formatos por tipo, pin estático como fuente web, skills ──
//   V12 el barrido encuentra cabeceras en las 8 extensiones (ts js mjs cjs md css html json con `$vendor`) y un .md con
//       front matter lleva la cabecera después del `---`; un archivo sin cabecera no se toca.
//   V13 un archivo barrido más viejo que el checkout se actualiza (sin estar en vendor.json) y uno al día no; el perfil
//       bloquea client en un server también en el barrido.
//   V14 fuente web = pin estático del proyecto: se baja de `cdn.jsdelivr.net/gh/<repo>@<pin>/<desde>` (nunca del HEAD) con
//       la fecha del archivo en ese pin; lo que aún no está publicado (404) se copia del local con aviso.
//   V15 una skill (carpeta) se da de alta con `carpeta: true`, nunca se pisa una skill propia (sin cabecera) y
//       skills/README.md se genera con propias y comunes.
//   V16 `Skill:` del docblock se reescribe a la ruta local si el consumidor tiene la skill, o a la URL del pin si no.
//   V17 el hook del kit (scripts/vendor-stamp.mjs) estampa `@vendor <ISO> <repo>@local <ruta>` en todos los formatos.

const F = 'nadie/no-existe-iswc-test';

Deno.test('vendor: V12 el barrido lee cabeceras en las 8 extensiones y no toca lo que no tiene', async () => {
  const app = await Deno.makeTempDir({ prefix: 'barrido-' });
  const viejo = '2020-01-01T00:00:00.000Z';
  const archivos: Record<string, string> = {
    'a/x.ts': `// @vendor ${viejo} ${F}@local k/x.ts\n// @doc https://x/d.md\nexport const x = 1;\n`,
    'a/x.js': `// @vendor ${viejo} ${F}@local k/x.js\nexport const x = 1;\n`,
    'a/x.mjs': `// @vendor ${viejo} ${F}@local k/x.mjs\nexport const x = 1;\n`,
    'a/x.cjs': `// @vendor ${viejo} ${F}@local k/x.cjs\nmodule.exports = 1;\n`,
    'a/x.md': `<!-- @vendor ${viejo} ${F}@local k/x.md -->\n<!-- @doc https://x/d.md -->\n# x\n`,
    'a/fm.md': `---\nname: fm\n---\n<!-- @vendor ${viejo} ${F}@local k/fm.md -->\n# fm\n`,
    'a/x.css': `/* @vendor ${viejo} ${F}@local k/x.css */\n/* @doc https://x/d.md */\nbody{}\n`,
    'a/x.html': `<!-- @vendor ${viejo} ${F}@local k/x.html -->\n<p>x</p>\n`,
    'a/x.json': `{\n  "$vendor": "${viejo} ${F}@local k/x.json",\n  "$doc": "https://x/d.md",\n  "a": 1\n}\n`,
    'a/propio.ts': 'export const propio = 1;\n',
    'a/corto.ts': `// @vendor ${viejo}\nexport const c = 1;\n`,
    'node_modules/m/x.ts': `// @vendor ${viejo} ${F}@local k/x.ts\n`,
  };
  for (const [r, t] of Object.entries(archivos)) { await Deno.mkdir(join(app, r, '..'), { recursive: true }); await Deno.writeTextFile(join(app, r), t); }
  const { barrer, inventariar, leerCabecera } = await import('../../../vendor-distributions/shared/tools/vendor.ts');
  const lista = barrer(app);
  assert(!lista.some((f) => f.startsWith('node_modules/')), 'node_modules no se barre');
  const inv = inventariar(app, lista, F);
  const vistos = inv.vendorizados.map((v) => v.hacia).sort();
  assertEquals(vistos, ['a/corto.ts', 'a/fm.md', 'a/x.cjs', 'a/x.css', 'a/x.html', 'a/x.js', 'a/x.json', 'a/x.md', 'a/x.mjs', 'a/x.ts'], 'las 8 extensiones + front matter; propio.ts no tiene cabecera');
  const json = inv.vendorizados.find((v) => v.hacia === 'a/x.json')!.cabecera;
  assertEquals([json.fecha, json.repo, json.sha, json.desde, json.doc], [viejo, F, 'local', 'k/x.json', 'https://x/d.md']);
  assertEquals(leerCabecera(archivos['a/fm.md']!, 'fm.md')?.desde, 'k/fm.md', 'la cabecera va después del front matter');
  assertEquals(leerCabecera(archivos['a/corto.ts']!, 'corto.ts')?.desde, null, 'forma corta: solo fecha');
  // Barrido real sin fuentes (ni local ni red): todo se conserva, el corto avisa, el propio ni aparece.
  const res = await vendorizar({ repo: F, raiz: app, archivos: [] }, { raiz: app });
  assertEquals(res.length, 10);
  assert(res.every((r) => r.estado !== 'actualizado'), JSON.stringify(res));
  assert(res.find((r) => r.hacia === 'a/corto.ts')?.error?.includes('sin <repo>@<sha> <desde>'));
  assertEquals(await Deno.readTextFile(join(app, 'a/propio.ts')), 'export const propio = 1;\n');
  await Deno.remove(app, { recursive: true });
});

Deno.test('vendor: V13 el barrido actualiza lo más viejo que el checkout (sin vendor.json) y el perfil bloquea client en server', async () => {
  const kit = await kitCon({
    [`${VD}/shared/lib/a.ts`]: 'export const a = 2;\n',
    [`${VD}/client/tools/c.ts`]: 'export const c = 2;\n',
    'skills/s/SKILL.md': '---\nname: s\n---\n# s v2\n',
  });
  const app = await Deno.makeTempDir({ prefix: 'barrido2-' });
  const futuro = new Date(Date.now() + 365 * 24 * 3600_000).toISOString();
  await Deno.mkdir(join(app, 'ISU'), { recursive: true });
  await Deno.mkdir(join(app, 'skills/s'), { recursive: true });
  await Deno.writeTextFile(join(app, 'ISU/a.ts'), `// @vendor 2020-01-01T00:00:00.000Z ${F}@local ${VD}/shared/lib/a.ts\nexport const a = 1;\n`);
  await Deno.writeTextFile(join(app, 'ISU/b.ts'), `// @vendor ${futuro} ${F}@local ${VD}/shared/lib/a.ts\nexport const a = 0;\n`);
  await Deno.writeTextFile(join(app, 'ISU/c.ts'), `// @vendor 2020-01-01T00:00:00.000Z ${F}@local ${VD}/client/tools/c.ts\nexport const c = 1;\n`);
  await Deno.writeTextFile(join(app, 'skills/s/SKILL.md'), `---\nname: s\n---\n<!-- @vendor 2020-01-01T00:00:00.000Z ${F}@local skills/s/SKILL.md -->\n# s v1\n`);
  const res = await vendorizar({ repo: F, local: kit, raiz: app, perfil: 'server' }, { raiz: app });
  const por = Object.fromEntries(res.map((r) => [r.hacia, r]));
  assertEquals(por['ISU/a.ts']!.estado, 'actualizado', 'más viejo que el checkout: se actualiza');
  assert((await Deno.readTextFile(join(app, 'ISU/a.ts'))).endsWith('export const a = 2;\n'));
  assertEquals(por['ISU/b.ts']!.estado, 'al-dia', 'más nuevo: no se toca');
  assert(por['ISU/c.ts']!.bloqueado, 'client en server: bloqueado también en el barrido');
  assertEquals(por['skills/s/SKILL.md']!.estado, 'actualizado');
  const skill = await Deno.readTextFile(join(app, 'skills/s/SKILL.md'));
  assert(skill.startsWith('---\nname: s\n---\n<!-- @vendor ') && skill.endsWith('# s v2\n'), `front matter intacto y cabecera después:\n${skill}`);
  await Deno.remove(app, { recursive: true });
});

/** `fetch` falso: API de GitHub y jsDelivr para un pin fijo; cuenta las URL pedidas. */
function webFalsa(pin: string, archivos: Record<string, string>, fechaPin = '2030-01-01T00:00:00.000Z') {
  const pedidas: string[] = [];
  const fetchFn = ((entrada: string | URL | Request) => {
    const url = String(entrada);
    pedidas.push(url);
    const json = (v: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } }));
    if (url.includes('api.github.com') && url.includes('/commits?')) {
      const path = decodeURIComponent(url.match(/path=([^&]+)/)![1]!);
      return json(path in archivos ? [{ commit: { committer: { date: fechaPin } } }] : []);
    }
    if (url.includes('api.github.com') && url.includes('/commits/')) return json({ sha: pin, commit: { committer: { date: fechaPin } } });
    const m = url.match(/cdn\.jsdelivr\.net\/gh\/[^@]+@([0-9a-f]+)\/(.+)$/);
    if (m) return Promise.resolve(new Response(m[1] === pin && m[2]! in archivos ? archivos[m[2]!] : 'no', { status: m[1] === pin && m[2]! in archivos ? 200 : 404 }));
    return json({}, 404);
  }) as unknown as typeof fetch;
  return { fetchFn, pedidas };
}

Deno.test('vendor: V14 la web es el pin estático del proyecto (nunca el HEAD); lo no publicado se copia del local con aviso', async () => {
  const pin = 'c'.repeat(40);
  const kit = await kitCon({ [`${VD}/shared/lib/a.ts`]: 'export const a = "local";\n', 'skills/nueva/SKILL.md': '# nueva\n' });
  const app = await Deno.makeTempDir({ prefix: 'pin-' });
  await Deno.mkdir(join(app, 'src'), { recursive: true });
  await Deno.writeTextFile(join(app, 'src/pin.ts'), `import 'https://cdn.jsdelivr.net/gh/${F}@${pin}/dist/cdn/loader.min.js';\n`);
  const { fetchFn, pedidas } = webFalsa(pin, { [`${VD}/shared/lib/a.ts`]: `/** Doc: https://cdn.jsdelivr.net/gh/${F}@main/x.md */\nexport const a = "web";\n` });
  // Sin local: baja del pin (fecha del archivo en el pin = 2030, más nueva que cualquier copia).
  const res = await vendorizar({ repo: F, raiz: app, archivos: [{ desde: `${VD}/shared/lib/a.ts`, hacia: 'ISU/a.ts' }] }, { raiz: app, fetchFn });
  assertEquals([res[0]!.estado, res[0]!.fuente, res[0]!.sha], ['actualizado', 'remoto', pin]);
  const t = await Deno.readTextFile(join(app, 'ISU/a.ts'));
  assert(t.startsWith(`// @vendor 2030-01-01T00:00:00.000Z ${F}@${pin} ${VD}/shared/lib/a.ts\n`) && t.endsWith('export const a = "web";\n'), t);
  assert(t.includes(`Doc: https://cdn.jsdelivr.net/gh/${F}@${pin}/x.md`) && !t.includes('@main/'), 'toda URL jsDelivr @main queda fijada al pin');
  assert(pedidas.some((u) => u.includes(`@${pin}/${VD}/shared/lib/a.ts`)) && !pedidas.some((u) => u.includes('/commits/main')), `solo el pin: ${pedidas.join('\n')}`);
  // Con local y una skill que la web aún no tiene (404): se copia del checkout con el aviso.
  const res2 = await vendorizar({ repo: F, local: kit, raiz: app, archivos: [{ desde: 'skills/nueva', hacia: 'skills/nueva', carpeta: true }] }, { raiz: app, fetchFn });
  const s = res2.find((r) => r.hacia === 'skills/nueva/SKILL.md')!;
  assertEquals(s.estado, 'actualizado');
  assert(s.fuente === 'local' || s.aviso?.includes('aún no publicado'), JSON.stringify(s));
  assert((await Deno.readTextFile(join(app, 'skills/nueva/SKILL.md'))).includes('<!-- @vendor '), 'cabecera HTML en el .md');
  assert(existsSync(join(app, '.tmp/vendor-fechas.json')), 'las fechas por pin se cachean (un pin es inmutable)');
  await Deno.remove(app, { recursive: true });
});

Deno.test('vendor: V15 skills por carpeta, nunca se pisa una skill propia y skills/README.md se genera', async () => {
  const kit = await kitCon({
    'skills/comun/SKILL.md': '---\nname: comun\n---\n# común\n',
    'skills/comun/references/01.md': '# ref\n',
    'skills/comun/templates/x.json': '{ "a": 1 }\n',
  });
  const app = await Deno.makeTempDir({ prefix: 'skills-' });
  await Deno.mkdir(join(app, 'skills/propia'), { recursive: true });
  await Deno.writeTextFile(join(app, 'skills/propia/SKILL.md'), '# propia del proyecto\n');
  const cfg = { repo: F, local: kit, raiz: app, archivos: [{ desde: 'skills/comun', hacia: 'skills/comun', carpeta: true }] };
  const res = await vendorizar(cfg, { raiz: app });
  assertEquals(res.map((r) => [r.hacia, r.estado]).sort(), [['skills/comun/SKILL.md', 'actualizado'], ['skills/comun/references/01.md', 'actualizado'], ['skills/comun/templates/x.json', 'actualizado']]);
  const j = JSON.parse(await Deno.readTextFile(join(app, 'skills/comun/templates/x.json')));
  assert(String(j.$vendor).includes(`${F}@local skills/comun/templates/x.json`) && j.a === 1 && Object.keys(j)[0] === '$vendor', JSON.stringify(j));
  const readme = await Deno.readTextFile(join(app, 'skills/README.md'));
  assert(readme.includes('[propia](propia/SKILL.md)') && readme.includes('[comun](comun/SKILL.md)') && readme.includes('skills/comun/SKILL.md'), readme);
  // Alta sobre una skill propia (sin cabecera): error claro, no se pisa.
  const choque = await vendorizar({ ...cfg, archivos: [{ desde: 'skills/comun/SKILL.md', hacia: 'skills/propia/SKILL.md' }] }, { raiz: app });
  assert(choque[0]!.estado === 'error' && choque[0]!.error?.includes('no se pisa'), JSON.stringify(choque));
  assertEquals(await Deno.readTextFile(join(app, 'skills/propia/SKILL.md')), '# propia del proyecto\n');
  // Un README propio (sin la marca) tampoco se toca.
  await Deno.writeTextFile(join(app, 'skills/README.md'), '# mío\n');
  await vendorizar(cfg, { raiz: app });
  assertEquals(await Deno.readTextFile(join(app, 'skills/README.md')), '# mío\n');
  await Deno.remove(app, { recursive: true });
});

Deno.test('vendor: V16 la línea Skill: del docblock apunta a la copia local si el consumidor tiene la skill, o a la URL del pin', async () => {
  const kit = await kitCon({
    [`${VD}/shared/lib/a.ts`]: '/**\n * a\n * Skill: skills/k/references/01.md\n */\nexport const a = 1;\n',
    'skills/k/references/01.md': '# 01\n',
  });
  const app = await Deno.makeTempDir({ prefix: 'skill-' });
  const archivos = [{ desde: `${VD}/shared/lib/a.ts`, hacia: 'x/ISU/a.ts' }];
  await vendorizar({ repo: F, local: kit, raiz: app, archivos }, { raiz: app });
  assert((await Deno.readTextFile(join(app, 'x/ISU/a.ts'))).includes(` * Skill: https://cdn.jsdelivr.net/gh/${F}@main/skills/k/references/01.md`), 'sin la skill: URL');
  await Deno.remove(join(app, 'x'), { recursive: true });
  await vendorizar({ repo: F, local: kit, raiz: app, archivos: [...archivos, { desde: 'skills/k', hacia: 'skills/k', carpeta: true }] }, { raiz: app });
  assert((await Deno.readTextFile(join(app, 'x/ISU/a.ts'))).includes(' * Skill: ../../skills/k/references/01.md'), 'con la skill: ruta local');
  await Deno.remove(app, { recursive: true });
});

Deno.test('vendor: V17 el hook del kit estampa @vendor <ISO> <repo>@local <ruta> en todos los formatos (y respeta el front matter)', async () => {
  const { estampar } = await import('../../../../scripts/vendor-stamp.mjs');
  const c = '2026-10-13T00:00:00.000Z Jeff-Aporta/is-webcomponents@local skills/x/SKILL.md';
  assertEquals(estampar('---\nname: x\n---\n# x\n', 'skills/x/SKILL.md', c), `---\nname: x\n---\n<!-- @vendor ${c} -->\n# x\n`);
  assertEquals(estampar(`<!-- @vendor viejo -->\n# x\n`, 'a.md', c), `<!-- @vendor ${c} -->\n# x\n`, 'reemplaza la anterior');
  assertEquals(estampar('// @doc https://x\nexport const a = 1;\n', 'a.ts', c), `// @vendor ${c}\n// @doc https://x\nexport const a = 1;\n`);
  assertEquals(estampar('body{}\n', 'a.css', c), `/* @vendor ${c} */\nbody{}\n`);
  assertEquals(estampar('<p>x</p>\n', 'a.html', c), `<!-- @vendor ${c} -->\n<p>x</p>\n`);
  assertEquals(estampar('{ "a": 1 }\n', 'a.json', c), `{\n  "$vendor": "${c}",\n  "a": 1\n}\n`);
  assertEquals(estampar('{ "a": 1 }\n', 'skills/k/templates/deno.json', c), null, 'los .json de templates/ no se estampan');
  assertEquals(estampar('x', 'a.scss', c), null);
  // El hook real sobre un repo temporal: estampa lo staged y lo re-añade.
  const kit = await kitCon({ 'src/vendor-distributions/shared/lib/a.ts': 'export const a = 1;\n', 'skills/s/SKILL.md': '# s\n', 'otro.ts': 'export const o = 1;\n' });
  await Deno.writeTextFile(join(kit, 'src/vendor-distributions/shared/lib/a.ts'), 'export const a = 2;\n');
  await Deno.writeTextFile(join(kit, 'skills/s/SKILL.md'), '# s2\n');
  await Deno.writeTextFile(join(kit, 'otro.ts'), 'export const o = 2;\n');
  git(kit, 'add', '.');
  const script = await Deno.readTextFile(join(Deno.cwd(), 'scripts/vendor-stamp.mjs'));
  await Deno.mkdir(join(kit, 'scripts'), { recursive: true });
  await Deno.writeTextFile(join(kit, 'scripts/vendor-stamp.mjs'), script);
  const r = new Deno.Command(Deno.execPath(), { args: ['run', '-A', join(kit, 'scripts/vendor-stamp.mjs'), '--fecha=2026-10-13T00:00:00.000Z'], cwd: kit, stdout: 'piped', stderr: 'piped' }).outputSync();
  const salida = new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr);
  assertEquals(r.code, 0, salida);
  const a = await Deno.readTextFile(join(kit, 'src/vendor-distributions/shared/lib/a.ts'));
  assert(a.startsWith('// @vendor 2026-10-13T00:00:00.000Z Jeff-Aporta/is-webcomponents@local src/vendor-distributions/shared/lib/a.ts\n'), `${a}\n--- salida del hook:\n${salida}`);
  assert((await Deno.readTextFile(join(kit, 'skills/s/SKILL.md'))).startsWith('<!-- @vendor 2026-10-13T00:00:00.000Z Jeff-Aporta/is-webcomponents@local skills/s/SKILL.md -->\n'));
  assertEquals(await Deno.readTextFile(join(kit, 'otro.ts')), 'export const o = 2;\n', 'fuera de las carpetas no se toca');
  assert(git(kit, 'diff', '--cached', '--', 'skills/s/SKILL.md').includes('@vendor'), 're-añadido al stage');
  // Y `fechaLocal` prefiere esa cabecera (sin git log) cuando el archivo está limpio.
  git(kit, 'commit', '-q', '-m', 'v2');
  const { fechaLocal } = await import('../../../vendor-distributions/shared/tools/vendor.ts');
  assertEquals(fechaLocal(kit, 'skills/s/SKILL.md'), '2026-10-13T00:00:00.000Z');
});
