// S-H1: requisito de specs/herramientas/spec.md (WHAT-first, ver specs/testing.md S-T6)
// pin-update.test.ts — QUÉ reporta el inventario de pines del kit (src/vendor-distributions/shared/tools/pin-update.mjs), como caja
// negra: una app en disco → salida y código de salida. Sin red (el inventario no la usa).
//   P1 un único SHA de 40 hex en todas sus formas (@sha y raw por SHA) → verde.
//   P2 refs mutables del KIT (rama, @latest, SHA corto, GitHub Pages del kit) → rojo y se listan.
//   P3 el sitio propio de la app (`iswc.host` en github.io) no es un pin del kit → no alerta.
//   P4 dos SHA distintos → rojo (heterogéneo).
//   P5 `verificarLocal` (protocolo --nuevo=ultimo --local): el checkout local se omite con motivo, nunca falla.
//   P6 scripts ONLINE por raw@main con --reload → no alertan. P7 cabecera @vendor @main → no alerta.
//   P8 ida y vuelta: lo que el vendor escribe (`conCabecera`, cada estilo: ts, md, html, css, json) nunca alerta.
//   P9 una ref @main del kit en una línea que NO es la cabecera (aunque lleve un comentario `@vendor` al final) → rojo.
//   P10 la entrada del alias `@jeff-aporta/iswc-base/` (deno.json e importmap de los HTML) se fija a la URL canónica del SHA.
//   P11 `vendorizarDeps` baja `dist/cdn/deps.json` del SHA a `src/vendor/iswc-base/deps.json` (solo si la carpeta existe;
//       `--sin-deps` lo apaga; un cuerpo que no es deps.json es error y no se escribe).
//   P12 al re-pinear, `.min.js` → `.min.mjs` solo en URL de módulos del kit (core/, lib/, <cat>/<tag>, jsDelivr, githack,
//       Pages y el alias); terceros, `*.classic.js`, `*.preview.min.js`, `vendor-distributions/` y `skills/` no se tocan.
//   P13 la carpeta vendor con el nombre histórico se avisa (inventario en rojo) y no se renombra.
//   P14 un SHA anterior a F3 (sin `.min.mjs`) da un mensaje que lo dice.
//   P15 una ruta `.min.js` del kit armada en runtime (selfBase, cdnUrl, L.host…) se avisa con archivo:línea; no se reescribe.
//   P16 sin falso positivo: URL estática ya reescrita, `.min.js` sin base runtime o base sin `.min.js`.
//   P17 grafo partido (F7): índice `deps.json` + `deps/<cat>.json` → el vendor recibe el deps.json completo unido.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { conCabecera } from '../../src/vendor-distributions/shared/tools/vendor.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


const TOOL = join(Deno.cwd(), 'src/vendor-distributions/shared/tools/pin-update.mjs');
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

function inventario(archivos: Record<string, string>): { code: number; out: string } {
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-' });
  mkdirSync(join(raiz, 'src'), { recursive: true });
  for (const [rel, txt] of Object.entries(archivos)) {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true });
    writeFileSync(join(raiz, rel), txt);
  }
  const r = new Deno.Command(Deno.execPath(), {
    args: ['run', '-A', TOOL, '--repo=Jeff-Aporta/iswc-base', '--raices=src,deno.json'],
    cwd: raiz, stdout: 'piped', stderr: 'piped',
  }).outputSync();
  const dec = new TextDecoder();
  return { code: r.code, out: dec.decode(r.stdout) + dec.decode(r.stderr) };
}

const SANO = {
  'src/a.ts': `import 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@${A}/dist/cdn/loader.min.mjs';`,
  'deno.json': JSON.stringify({
    iswc: { host: 'https://jeff-aporta.github.io/mi-app/' },
    imports: { '@iswc/x': `https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/${A}/src/cdn/schemas/loader.schemas.ts` },
  }),
};

denoTest('pin-update: P1/P3 un SHA en @sha y raw, con el host propio de la app en github.io → verde', () => {
  const r = inventario(SANO);
  assertEquals(r.code, 0, r.out);
  assert(r.out.includes(A));
  assert(!/ALERTA/.test(r.out), r.out);
});

denoTest('pin-update: P2 refs mutables del kit → rojo y listadas', () => {
  for (const mala of [
    'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@main/x.js',
    'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@latest/x.js',
    'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@abc1234/x.js',
    'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/x.ts',
    'https://jeff-aporta.github.io/iswc-base/dist/cdn/x.js',
  ]) {
    const r = inventario({ ...SANO, 'src/b.ts': `const u = '${mala}';` });
    assertEquals(r.code, 1, `${mala}\n${r.out}`);
    assert(r.out.includes('src/b.ts'), r.out);
  }
});

denoTest('pin-update: P4 dos SHA distintos → rojo', () => {
  const r = inventario({ ...SANO, 'src/b.ts': `import 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@${B}/x.js';` });
  assertEquals(r.code, 1, r.out);
  assert(r.out.includes(A) && r.out.includes(B));
});

// P5 PROTOCOLO (`--nuevo=ultimo --local=<ruta>`, lo corre vendor.ts al terminar): el checkout local es solo
//    información y NUNCA falla: ruta inexistente o sin git → `accesible: false` con motivo; un repo real → su HEAD
//    y si tiene (o no) el SHA pedido. Sin red aquí: se importa la función (importar el .mjs no barre nada).
denoTest('pin-update: P5 verificarLocal nunca falla: sin ruta, ruta inexistente, sin git y repo real', async () => {
  const { verificarLocal, SHA } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  assertEquals(verificarLocal('').accesible, false);
  const noExiste = verificarLocal(join(Deno.makeTempDirSync(), 'nada'));
  assert(!noExiste.accesible && /no accesible|no existe/.test(noExiste.motivo), JSON.stringify(noExiste));
  const sinGit = verificarLocal(Deno.makeTempDirSync({ prefix: 'singit-' }));
  assert(!sinGit.accesible && /repo git/.test(sinGit.motivo), JSON.stringify(sinGit));
  const real = verificarLocal(Deno.cwd(), A);
  assert(real.accesible && SHA.test(real.head), JSON.stringify(real));
  assertEquals(real.tieneSha, false, 'un SHA inventado no está en el checkout');
  assertEquals(verificarLocal(Deno.cwd(), real.head).tieneSha, true, 'su propio HEAD sí');
});

// P6 Los scripts ONLINE del kit se citan desde raw@main con --reload (forma canónica, Jeff 2026-10-13): no son refs mutables.
denoTest('pin-update: P6 las URL raw@main de los scripts online (vendor, pin-update, download-iconify, render-lote) y el --reload no alertan', () => {
  const r = inventario({
    ...SANO,
    'src/c.ts': [
      "import { descargarIconos } from 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs';",
      '// deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/ https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs x.json',
      "const lote = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/dist/cdn/vendor-distributions/client/tools/render-lote.mjs';",
      "const app = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs';",
    ].join('\n'),
  });
  assertEquals(r.code, 0, r.out);
  const malo = inventario({ ...SANO, 'src/d.ts': "import 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/src/vendor-distributions/shared/testing/pruebas.ts';" });
  assertEquals(malo.code, 1, 'lo que se vendoriza (pruebas.ts) sigue sin poder ir por main');
  const fuente = inventario({ ...SANO, 'src/e.ts': "const u = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/src/vendor-distributions/shared/tools/vendor.ts';" });
  assertEquals(fuente.code, 1, 'la FUENTE .ts por main tampoco: online va el bundle de dist/cdn');
});

// P7 La cabecera `@vendor … @main …` de lo vendorizado (ts, md, html) no es ref mutable; un import @main en el cuerpo sí.
denoTest('pin-update: P7 la cabecera @vendor @main no alerta; el mismo repo@main en el cuerpo sí', () => {
  const r = inventario({
    ...SANO,
    'src/v.ts': '// @vendor 2026-10-13T19:09:09.250Z Jeff-Aporta/iswc-base@main dist/cdn/vendor-distributions/shared/testing/pruebas.ts\nexport const x = 1;',
    'src/v.md': '<!-- @vendor 2026-10-13T19:09:09.250Z Jeff-Aporta/iswc-base@main dist/cdn/skills/x/SKILL.md -->\n# x',
  });
  assertEquals(r.code, 0, r.out);
  const malo = inventario({ ...SANO, 'src/w.ts': "// @vendor 2026-10-13T19:09:09.250Z Jeff-Aporta/iswc-base@main x.ts\nimport 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@main/dist/cdn/core/loader.min.mjs';" });
  assertEquals(malo.code, 1, 'un import @main bajo la cabecera sigue siendo mutable');
});

// P8 Contrato entre el vendor y el inventario: la cabecera PORTABLE `<ISO> <repo>@main <desde>` que `vendor.ts` escribe en
//    cualquier estilo que soporta no es una ref mutable. Casos en JSON: archivo destino y contenido original.
const CABECERA = `2026-10-13T19:09:09.250Z Jeff-Aporta/iswc-base@main dist/cdn/vendor-distributions/shared/x`;
const DOC = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@${A}/skills/iswc-foundation/references/07-pruebas-y-gate.md`;
const P8 = [
  { estilo: 'ts', archivo: 'src/v.ts', texto: 'export const x = 1;\n' },
  { estilo: 'mjs', archivo: 'src/v.mjs', texto: 'export const x = 1;\n' },
  { estilo: 'md', archivo: 'src/v.md', texto: '# Título\n' },
  { estilo: 'md con front matter', archivo: 'src/s.md', texto: '---\nname: x\n---\n# Skill\n' },
  { estilo: 'html', archivo: 'src/v.html', texto: '<!doctype html>\n<p>x</p>\n' },
  { estilo: 'css', archivo: 'src/v.css', texto: ':root { --x: 1; }\n' },
  { estilo: 'json', archivo: 'src/v.json', texto: '{ "a": 1 }\n' },
] as const;

for (const c of P8) {
  for (const doc of [null, DOC]) {
    denoTest(`pin-update: P8 la cabecera que escribe el vendor en ${c.estilo}${doc ? ' (con @doc al pin)' : ''} no alerta`, () => {
      const vendorizado = conCabecera(c.texto, c.archivo, CABECERA, doc);
      assert(vendorizado.includes('@vendor') || vendorizado.includes('$vendor'), vendorizado);
      const r = inventario({ ...SANO, [c.archivo]: vendorizado });
      assertEquals(r.code, 0, `${vendorizado}\n${r.out}`);
    });
  }
}

// P9 La exención es de la CABECERA (línea que empieza con el comentario `@vendor`), no de cualquier línea que lo mencione.
const P9 = [
  { caso: 'import @main con comentario @vendor al final', linea: "import 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@main/x.js'; // @vendor" },
  { caso: 'raw por rama dentro de un objeto $vendor que no es cabecera', linea: "const o = { u: 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-base/main/x.ts', k: '$vendor' };" },
  { caso: 'GitHub Pages del kit tras un @vendor en medio de la línea', linea: "const p = 'x @vendor y'; fetch('https://jeff-aporta.github.io/iswc-base/dist/cdn/x.js');" },
] as const;

for (const c of P9) {
  denoTest(`pin-update: P9 ${c.caso} → rojo`, () => {
    const r = inventario({ ...SANO, 'src/z.ts': `export const a = 1;\n${c.linea}\n` });
    assertEquals(r.code, 1, r.out);
    assert(r.out.includes('src/z.ts'), r.out);
  });
}

// P10 Alias del kit (specs/cdn.md §Alias): `actualizarPines` fija la entrada `"@jeff-aporta/iswc-base/"` de `deno.json` y del
//     `<script type="importmap">` de los HTML a `https://cdn.jsdelivr.net/gh/<repo>@<sha>/dist/cdn/`, venga por SHA viejo,
//     por rama, por raw o con el nombre anterior del repo. Una ruta local no se toca. `deno.json` entra en las raíces
//     por defecto. Sin red: se importa la función.
const ALIAS_URL = (sha: string) => `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@${sha}/dist/cdn/`;

function appConAlias(valorDeno: string, valorHtml: string): string {
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-alias-' });
  mkdirSync(join(raiz, 'src'), { recursive: true });
  writeFileSync(join(raiz, 'deno.json'), JSON.stringify({ imports: { '@jeff-aporta/iswc-base/': valorDeno, zod: 'npm:zod@^4' } }, null, 2));
  writeFileSync(join(raiz, 'index.html'), `<!doctype html>\n<script type="importmap">\n{ "imports": { "@jeff-aporta/iswc-base/": "${valorHtml}" } }\n</script>\n`);
  return raiz;
}

const leerAlias = (raiz: string) => ({
  deno: JSON.parse(Deno.readTextFileSync(join(raiz, 'deno.json'))).imports['@jeff-aporta/iswc-base/'],
  html: Deno.readTextFileSync(join(raiz, 'index.html')).match(/"@jeff-aporta\/iswc-base\/":\s*"([^"]*)"/)?.[1],
});

denoTest('pin-update: P10 el alias del kit en deno.json y en el importmap queda en la URL canónica del SHA nuevo', async () => {
  const { actualizarPines, opciones, urlAlias, ALIAS_KIT } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  assertEquals(ALIAS_KIT, '@jeff-aporta/iswc-base/');
  for (const [deno, html] of [
    [ALIAS_URL(B), ALIAS_URL(B)],
    ['https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/', 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@main/dist/cdn/'],
    [`https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/${B}/dist/cdn/`, `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@${B}/dist/cdn/`],
  ]) {
    const raiz = appConAlias(deno, html);
    const op = opciones({ root: raiz });
    assertEquals(urlAlias(A, op), ALIAS_URL(A));
    const r = actualizarPines(A, op);
    assert(r.tocados.includes('deno.json') && r.tocados.includes('index.html'), JSON.stringify(r));
    assertEquals(leerAlias(raiz), { deno: ALIAS_URL(A), html: ALIAS_URL(A) }, `${deno} · ${html}`);
  }
});

denoTest('pin-update: P10 un alias a una carpeta local no se toca; ya canónico no cuenta reemplazos', async () => {
  const { actualizarPines, opciones } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const local = appConAlias('./vendor/iswc/', '/vendor/iswc/');
  const r = actualizarPines(A, opciones({ root: local }));
  assertEquals(r.n, 0, JSON.stringify(r));
  assertEquals(leerAlias(local), { deno: './vendor/iswc/', html: '/vendor/iswc/' });
  const alDia = appConAlias(ALIAS_URL(A), ALIAS_URL(A));
  assertEquals(actualizarPines(A, opciones({ root: alDia })).n, 0);
});

// P11 deps.json del SHA destino en el vendor del consumidor (su build emite los modulepreload sin red). Sin red: `traer`
//     es un fetch falso que registra la URL pedida.
const DEPS = JSON.stringify({ sha: A, tags: { 'iswc-button': ['_chunks/chunk-X.mjs', 'actions/button.min.mjs'] } });

function traerFalso(cuerpo: string, status = 200) {
  const pedidas: string[] = [];
  const traer = (u: string) => {
    pedidas.push(u);
    return Promise.resolve(new Response(cuerpo, { status }));
  };
  return { traer, pedidas };
}

denoTest('pin-update: P11 deps.json del SHA nuevo en src/vendor/iswc-base/ (si la carpeta existe; --sin-deps lo apaga)', async () => {
  const { vendorizarDeps, opciones } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-deps-' });
  const sinCarpeta = traerFalso(DEPS);
  assertEquals((await vendorizarDeps(A, opciones({ root: raiz }), sinCarpeta.traer)).estado, 'sin-carpeta');
  assertEquals(sinCarpeta.pedidas, [], 'sin carpeta vendor no se pide nada');
  mkdirSync(join(raiz, 'src', 'vendor', 'iswc-base'), { recursive: true });
  const ok = traerFalso(DEPS);
  const r = await vendorizarDeps(A, opciones({ root: raiz }), ok.traer);
  assertEquals(r.estado, 'escrito', JSON.stringify(r));
  assertEquals(ok.pedidas, [`https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@${A}/dist/cdn/deps.json`]);
  assertEquals(JSON.parse(Deno.readTextFileSync(join(raiz, 'src/vendor/iswc-base/deps.json'))), JSON.parse(DEPS));
  const apagado = traerFalso(DEPS);
  assertEquals((await vendorizarDeps(B, opciones({ root: raiz, 'sin-deps': true }), apagado.traer)).estado, 'omitido');
  assertEquals(apagado.pedidas, []);
  const malo = await vendorizarDeps(B, opciones({ root: raiz }), traerFalso('<html>404</html>').traer);
  assertEquals(malo.estado, 'error', JSON.stringify(malo));
  const caido = await vendorizarDeps(B, opciones({ root: raiz }), traerFalso('', 404).traer);
  assertEquals(caido.estado, 'error', JSON.stringify(caido));
  assertEquals(JSON.parse(Deno.readTextFileSync(join(raiz, 'src/vendor/iswc-base/deps.json'))).sha, A, 'un error no pisa el deps.json vigente');
});

// P17 grafo partido (F7): `deps.json` es un índice (tag → categoría) y el cierre va en `deps/<cat>.json`; el vendor
//     del consumidor recibe el deps.json COMPLETO (`tags`, `core`, `v`) unido de las partes. Una parte caída es error.
denoTest('pin-update: P17 deps.json partido por categoría → vendor con el grafo unido', async () => {
  const { vendorizarDeps, opciones } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-deps2-' });
  mkdirSync(join(raiz, 'src', 'vendor', 'iswc-base'), { recursive: true });
  const base = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@${A}/dist/cdn/`;
  const cuerpos: Record<string, string> = {
    'deps.json': JSON.stringify({ sha: B, categorias: { 'iswc-button': 'actions', 'iswc-dialog': 'layout' } }),
    'deps/actions.json': JSON.stringify({ sha: B, tags: { 'iswc-button': ['_chunks/chunk-X.mjs', 'actions/button.min.mjs'] }, core: {}, v: { 'actions/button.min.mjs': 'aaaaaa' } }),
    'deps/layout.json': JSON.stringify({ sha: B, tags: { 'iswc-dialog': ['_chunks/chunk-X.mjs', 'layout/dialog.min.mjs'] }, core: {}, v: {} }),
    'deps/core.json': JSON.stringify({ sha: B, tags: {}, core: { loader: ['core/loader.min.mjs'] }, v: {} }),
  };
  const pedidas: string[] = [];
  const traer = (u: string) => {
    pedidas.push(u.slice(base.length));
    const c = cuerpos[u.slice(base.length)];
    return Promise.resolve(new Response(c ?? '', { status: c ? 200 : 404 }));
  };
  const r = await vendorizarDeps(A, opciones({ root: raiz }), traer);
  assertEquals(r.estado, 'escrito', JSON.stringify(r));
  assertEquals(pedidas, ['deps.json', 'deps/actions.json', 'deps/core.json', 'deps/layout.json']);
  const escrito = JSON.parse(Deno.readTextFileSync(join(raiz, 'src/vendor/iswc-base/deps.json')));
  assertEquals(Object.keys(escrito.tags).sort(), ['iswc-button', 'iswc-dialog']);
  assertEquals(escrito.core.loader, ['core/loader.min.mjs']);
  assertEquals(escrito.v, { 'actions/button.min.mjs': 'aaaaaa' });
  assertEquals(escrito.sha, B, 'sha = SHA base del build (informativo), no el pin');
  delete cuerpos['deps/layout.json'];
  const caido = await vendorizarDeps(A, opciones({ root: raiz }), traer);
  assertEquals(caido.estado, 'error', JSON.stringify(caido));
});

// P12 Extensión de los módulos del kit (plan D2, F3): al re-pinear, `.min.js` → `.min.mjs` solo en rutas del kit.
const KIT = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents';
const P12 = [
  { caso: 'loader por jsDelivr', antes: `${KIT}@${B}/dist/cdn/core/loader.min.js`, despues: `${KIT}@${A}/dist/cdn/core/loader.min.mjs` },
  { caso: 'componente <cat>/<tag>', antes: `${KIT}@${B}/dist/cdn/actions/button.min.js`, despues: `${KIT}@${A}/dist/cdn/actions/button.min.mjs` },
  { caso: 'lib/', antes: `${KIT}@${B}/dist/cdn/lib/obj.min.js`, despues: `${KIT}@${A}/dist/cdn/lib/obj.min.mjs` },
  { caso: 'subcarpeta de categoría', antes: `${KIT}@${B}/dist/cdn/data/ag-grid/celda.min.js`, despues: `${KIT}@${A}/dist/cdn/data/ag-grid/celda.min.mjs` },
  { caso: 'nombre canónico del repo', antes: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@${B}/dist/cdn/forms/input.min.js`, despues: `${KIT}@${A}/dist/cdn/forms/input.min.mjs` },
  { caso: 'githack', antes: `https://raw.githack.com/Jeff-Aporta/is-webcomponents/${B}/dist/cdn/core/loader.min.js`, despues: `https://raw.githack.com/Jeff-Aporta/is-webcomponents/${A}/dist/cdn/core/loader.min.mjs` },
  { caso: 'alias del kit', antes: '@jeff-aporta/iswc-base/navigation/tabs.min.js', despues: '@jeff-aporta/iswc-base/navigation/tabs.min.mjs' },
  { caso: 'tercero por jsDelivr npm', antes: 'https://cdn.jsdelivr.net/npm/marked@12.0.0/lib/marked.min.js', despues: 'https://cdn.jsdelivr.net/npm/marked@12.0.0/lib/marked.min.js' },
  { caso: 'otro repo de GitHub', antes: `https://cdn.jsdelivr.net/gh/otro/repo@${B}/dist/cdn/core/x.min.js`, despues: `https://cdn.jsdelivr.net/gh/otro/repo@${B}/dist/cdn/core/x.min.js` },
  { caso: 'artefacto clásico', antes: `${KIT}@${B}/dist/cdn/actions/button.classic.js`, despues: `${KIT}@${A}/dist/cdn/actions/button.classic.js` },
  { caso: 'preview de la galería', antes: `${KIT}@${B}/dist/cdn/actions/button.preview.min.js`, despues: `${KIT}@${A}/dist/cdn/actions/button.preview.min.js` },
  { caso: 'vendor-distributions', antes: `${KIT}@${B}/dist/cdn/vendor-distributions/shared/x.min.js`, despues: `${KIT}@${A}/dist/cdn/vendor-distributions/shared/x.min.js` },
  { caso: 'skills', antes: `${KIT}@${B}/dist/cdn/skills/x/tools/y.min.js`, despues: `${KIT}@${A}/dist/cdn/skills/x/tools/y.min.js` },
  { caso: 'CSS del kit', antes: `${KIT}@${B}/dist/cdn/is-base.min.css`, despues: `${KIT}@${A}/dist/cdn/is-base.min.css` },
] as const;

for (const c of P12) {
  denoTest(`pin-update: P12 ${c.caso}: ${c.antes.endsWith('.min.js') && c.despues.endsWith('.min.mjs') ? '.min.js → .min.mjs' : 'sin cambio de extensión'}`, async () => {
    const { actualizarPines, opciones } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
    const raiz = Deno.makeTempDirSync({ prefix: 'pin-mjs-' });
    mkdirSync(join(raiz, 'src'), { recursive: true });
    writeFileSync(join(raiz, 'src', 'a.ts'), `import '${c.antes}';\n`);
    actualizarPines(A, opciones({ root: raiz }));
    assertEquals(Deno.readTextFileSync(join(raiz, 'src', 'a.ts')), `import '${c.despues}';\n`);
  });
}

denoTest('pin-update: P12 aMinMjs es idempotente y cuenta los cambios', async () => {
  const { aMinMjs } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const texto = `<script type="module" src="${KIT}@${A}/dist/cdn/core/loader.min.js"></script>\n<link rel="modulepreload" href="${KIT}@${A}/dist/cdn/layout/app-shell.min.js">`;
  const una = aMinMjs(texto);
  assertEquals(una.n, 2);
  assertEquals(aMinMjs(una.salida), { salida: una.salida, n: 0 });
});

// P13 Carpeta vendor con el nombre histórico (F1b la renombró a src/vendor/iswc-base/): se avisa, nunca se renombra sola.
denoTest('pin-update: P13 src/vendor/iswc-root se avisa (inventario en rojo) y no se renombra', async () => {
  const { avisoVendorLegado, opciones, VENDOR_LEGADO } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-legado-' });
  assertEquals(avisoVendorLegado(opciones({ root: raiz })), '');
  mkdirSync(join(raiz, VENDOR_LEGADO), { recursive: true });
  const aviso = avisoVendorLegado(opciones({ root: raiz }));
  assert(aviso.includes('git mv src/vendor/iswc-root src/vendor/iswc-base') && aviso.includes('--raiz'), aviso);
  assert(Deno.statSync(join(raiz, VENDOR_LEGADO)).isDirectory, 'la carpeta sigue donde estaba');
  const r = inventario({ ...SANO, 'src/vendor/iswc-root/x.ts': 'export {};' });
  assertEquals(r.code, 1, r.out);
  assert(r.out.includes('src/vendor/iswc-root'), r.out);
});

// P14 Un SHA anterior a F3 publica `core/loader.min.js` y no `core/loader.min.mjs`: el mensaje lo dice (sin red: función pura).
denoTest('pin-update: P14 el mensaje de no publicado dice si el SHA es anterior a F3', async () => {
  const { mensajeNoPublicado, opciones } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const op = opciones();
  assert(/anterior a F3/.test(mensajeNoPublicado(A, op, true)) && mensajeNoPublicado(A, op, true).includes('--nuevo=ultimo'));
  assert(mensajeNoPublicado(A, op, true).includes('dist/cdn/core/loader.min.js'));
  assert(!/anterior a F3/.test(mensajeNoPublicado(A, op, false)) && /publícalo/.test(mensajeNoPublicado(A, op, false)));
});

// P15 Ruta `.min.js` del kit armada en runtime (no es URL estática: pin-update no la reescribe y daría 404): se AVISA con
//     archivo:línea y la sugerencia `.min.mjs`, sin tocar el archivo ni cambiar el código de salida.
denoTest('pin-update: P15 una ruta .min.js construida en runtime se avisa con archivo:línea', () => {
  for (const linea of [
    "const u = new URL('preview/x.min.js', L.selfBase);",
    'const u = `${cdnUrl}actions/button.min.js`;',
    'const u = baseUrl + "core/loader.min.js";',
    "const u = new URL('x.min.js', iswcLoader.host);",
  ]) {
    const r = inventario({ ...SANO, 'src/r.ts': `export const a = 1;\n${linea}\n` });
    assertEquals(r.code, 0, `${linea}\n${r.out}`);
    assert(r.out.includes('src/r.ts:2'), `${linea}\n${r.out}`);
    assert(r.out.includes('.min.mjs'), r.out);
  }
});

// P16 Sin falso positivo: una URL estática (ya reescrita a `.min.mjs` o que `aMinMjs` reescribe), un `.min.js` sin base de
//     runtime en la línea y una base sin literal `.min.js` no avisan.
denoTest('pin-update: P16 URL estática ya reescrita, .min.js sin base runtime o base sin .min.js no avisan', async () => {
  const sano = inventario({
    ...SANO,
    'src/r.ts': [
      `const a = baseUrl + 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@${A}/dist/cdn/core/loader.min.mjs';`,
      `const b = baseUrl + 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-base@${A}/dist/cdn/core/loader.min.js';`,
      "const c = 'https://cdn.jsdelivr.net/npm/marked@12.0.0/lib/marked.min.js';",
      "const d = new URL('preview/x.min.mjs', L.selfBase);",
    ].join('\n'),
  });
  assertEquals(sano.code, 0, sano.out);
  assert(!/AVISO/.test(sano.out), sano.out);
  const { actualizarPines, opciones } = await import('../../src/vendor-distributions/shared/tools/pin-update.mjs');
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-runtime-' });
  mkdirSync(join(raiz, 'src'), { recursive: true });
  writeFileSync(join(raiz, 'src', 'a.ts'), `const u = new URL('preview/x.min.js', L.selfBase);\n`);
  actualizarPines(A, opciones({ root: raiz }));
  assertEquals(Deno.readTextFileSync(join(raiz, 'src', 'a.ts')), `const u = new URL('preview/x.min.js', L.selfBase);\n`, 'solo se avisa: no se reescribe');
});

export default lista();
