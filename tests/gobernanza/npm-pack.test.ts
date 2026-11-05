/**
 * npm-pack.test.ts — el paquete de npm del kit, preparado y NO publicado (plan D9, fase F6).
 *
 *   (a) `package.json` (lo escribe `deno task build`) tiene `exports` para `./loader` y para todo tag del catálogo, y
 *       `sideEffects` con cada uno de esos módulos;
 *   (b) cada destino de `exports` existe en disco (los comodines, con su carpeta y algún archivo que casa);
 *   (c) `npm pack` + `npm i <tarball>` en `.tmp/npm-test/` y, con Node, los subpaths del alias resuelven al archivo
 *       del paquete instalado (con y sin extensión, como en el import map del CDN) e `import()` del loader evalúa.
 *
 * Limitación de (c): sin DOM, Node no tiene `customElements`/`HTMLElement`; el módulo de un tag lanza al evaluarse
 * y solo se comprueba su resolución (el objetivo es el subpath, no el runtime en Node). Nada se publica: no hay
 * cuenta ni token y aquí no se corre `npm publish`.
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { empaquetar } from '../../scripts/npm-pack.mjs';
import { leerDeps } from '../_shared/deps.ts';

const { test, prueba, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const PKG = join(RAIZ, 'package.json');
const PRUEBA = join(RAIZ, '.tmp', 'npm-test');

type Pkg = { name: string; version: string; exports: Record<string, string>; sideEffects: string[]; files: string[] };
const leerPkg = (): Pkg => JSON.parse(readFileSync(PKG, 'utf8'));

/** Tags del catálogo: los del manifest con fuente propia en src/components (igual que `catalogoLoader`). */
async function tagsDelCatalogo(): Promise<string[]> {
  const { default: manifest } = await import(new URL('../../src/manifest.ts', import.meta.url).href) as { default: { tag: string }[] };
  const fuentes = new Set<string>();
  const recorrer = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (n.endsWith('.ts')) fuentes.add(basename(n, '.ts'));
    }
  };
  recorrer(join(RAIZ, 'src', 'components'));
  return manifest.map((m) => m.tag).filter((t) => fuentes.has(t.replace(/^iswc-/, '')));
}

test('gobernanza/npm-pack: (a) exports cubre ./loader y todo tag del catálogo', async () => {
  if (!existsSync(PKG)) return;
  const pkg = leerPkg();
  assert.equal(pkg.name, '@jeff-aporta/iswc-base');
  assert.match(pkg.version, /^0\.0\.0-\d{8}\.[0-9a-z]+$/, 'version provisional 0.0.0-<yyyymmdd>.<sha7>');
  assert.deepEqual(pkg.files, ['dist/cdn', 'README.md']);
  assert.equal(pkg.exports['./loader'], './dist/cdn/core/loader.min.mjs');
  assert.equal(pkg.exports['./core/*'], './dist/cdn/core/*.min.mjs');
  assert.equal(pkg.exports['./package.json'], './package.json');
  const efectos = new Set(pkg.sideEffects);
  assert.ok(efectos.has('./dist/cdn/core/loader.min.mjs'), 'sideEffects: falta el loader');
  const deps = leerDeps(join(RAIZ, 'dist', 'cdn'))!;
  const valores = new Set(Object.values(pkg.exports));
  for (const tag of await tagsDelCatalogo()) {
    const propia = (deps.tags[tag] ?? []).find((r) => !r.startsWith('_chunks/') && r.endsWith(`/${tag.replace(/^iswc-/, '')}.min.mjs`));
    assert.ok(propia, `${tag}: sin módulo propio en deps.json`);
    const destino = `./dist/cdn/${propia}`;
    assert.ok(valores.has(destino), `${tag}: falta en exports (${destino})`);
    assert.ok(efectos.has(destino), `${tag}: falta en sideEffects (${destino})`);
  }
});

test('gobernanza/npm-pack: (b) cada destino de exports existe en disco', () => {
  if (!existsSync(PKG)) return;
  for (const [clave, destino] of Object.entries(leerPkg().exports)) {
    if (!destino.includes('*')) {
      assert.ok(existsSync(join(RAIZ, destino)), `exports["${clave}"]: ${destino} no existe`);
      continue;
    }
    const carpeta = join(RAIZ, dirname(destino));
    const sufijo = basename(destino).slice(1);
    assert.ok(existsSync(carpeta), `exports["${clave}"]: carpeta ${dirname(destino)} no existe`);
    // `*.min.css` en carpetas sin CSS (core/ trae los suyos; lib/ no) es un comodín vacío: se acepta.
    if (sufijo === '.min.css') continue;
    assert.ok(readdirSync(carpeta).some((n) => n.endsWith(sufijo)), `exports["${clave}"]: ningún archivo casa con ${destino}`);
  }
});

/** Subpath del alias → archivo esperado bajo `dist/cdn/` del paquete instalado. */
const RESOLUCIONES: Record<string, string> = {
  'loader': 'core/loader.min.mjs',
  'loader.min.mjs': 'loader.min.mjs',
  'core/loader': 'core/loader.min.mjs',
  'core/loader.min.mjs': 'core/loader.min.mjs',
  'core/app-cfg': 'core/app-cfg.min.mjs',
  'actions/button': 'actions/button.min.mjs',
  'actions/button.min.mjs': 'actions/button.min.mjs',
  'actions/button.min.css': 'actions/button.min.css',
  'lib/zod': 'lib/zod.min.mjs',
  'is-base.css': 'is-base.min.css',
  'palettes.css': 'palettes.min.css',
  'deps.json': 'deps.json',
  'deps/actions.json': 'deps/actions.json',
  'importmap.json': 'importmap.json',
};

/** Script de Node que corre dentro de `.tmp/npm-test/`: resuelve cada subpath e intenta `import()` del loader y de un tag. */
const RESOLVER = `
const subpaths = ${JSON.stringify(Object.keys(RESOLUCIONES))};
const out = { resuelto: {}, importLoader: null, importButton: null };
for (const s of subpaths) {
  try { out.resuelto[s] = new URL(import.meta.resolve('@jeff-aporta/iswc-base/' + s)).pathname; }
  catch (e) { out.resuelto[s] = 'ERROR ' + e.code; }
}
try { const m = await import('@jeff-aporta/iswc-base/loader'); out.importLoader = 'ok: ' + Object.keys(m).join(','); }
catch (e) { out.importLoader = 'lanza: ' + String(e && e.message || e).slice(0, 200); }
try { await import('@jeff-aporta/iswc-base/actions/button'); out.importButton = 'ok'; }
catch (e) { out.importButton = 'lanza: ' + String(e && e.message || e).slice(0, 200); }
console.log(JSON.stringify(out));
`;

prueba({
  nombre: 'gobernanza/npm-pack: (c) el tarball se instala y los subpaths resuelven desde node_modules',
  categoria: 'how',
  timeoutMs: 240_000,
  // Empaqueta e instala (~1 min en este equipo): cooldown largo.
  factorCooldown: 3,
  correr(ctx) {
    if (!existsSync(PKG)) ctx.saltar('falta package.json (corre `deno task build`)');
    rmSync(PRUEBA, { recursive: true, force: true });
    mkdirSync(PRUEBA, { recursive: true });
    const r = empaquetar({ raiz: RAIZ, destino: '.tmp/npm-test/pack' });
    ctx.diag(`tarball ${basename(r.tarball)}: ${r.bytes} B, ${r.archivos.length} archivos`);
    ctx.expect('tarball < 5 MB', r.bytes < 5 * 1024 * 1024, `${r.bytes} B`);
    ctx.expect('tarball sin labs/demos/tests/.tmp', !r.archivos.some((f: string) => /^(labs|demos|tests|\.tmp)/.test(f)), r.archivos.filter((f: string) => !f.startsWith('dist/cdn/')).join(', '));
    ctx.expect('tarball solo dist/cdn + README + package.json', r.archivos.every((f: string) => f.startsWith('dist/cdn/') || f === 'README.md' || f === 'package.json'));
    const app = join(PRUEBA, 'app');
    mkdirSync(app, { recursive: true });
    const sh = (cmd: string, cwd: string) => execSync(cmd, { cwd, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
    sh('npm init -y', app);
    // Sin red (`--offline`: el paquete no trae dependencias; zod es peer opcional) y con caché propia en .tmp/: la
    // global de npm en este equipo vuelve lento el desempaquetado (~70 s → ~40 s).
    sh(`npm i --no-audit --no-fund --offline --ignore-scripts --cache "${join(PRUEBA, 'npm-cache')}" "${r.tarball}"`, app);
    const instalado = join(app, 'node_modules', '@jeff-aporta', 'iswc-base');
    ctx.expect('instalado en node_modules/@jeff-aporta/iswc-base', existsSync(join(instalado, 'package.json')));
    writeFileSync(join(app, 'resolver.mjs'), RESOLVER, 'utf8');
    const salida = sh('node resolver.mjs', app);
    const res = JSON.parse(salida.trim().split('\n').pop()!) as { resuelto: Record<string, string>; importLoader: string; importButton: string };
    const base = new URL(`file:///${join(instalado, 'dist', 'cdn').replaceAll('\\', '/')}/`).pathname;
    for (const [sub, archivo] of Object.entries(RESOLUCIONES)) {
      const visto = decodeURIComponent(res.resuelto[sub] ?? '');
      ctx.expect(`resuelve ${sub}`, visto.toLowerCase() === decodeURIComponent(base + archivo).toLowerCase(), `${visto} ≠ …/dist/cdn/${archivo}`);
    }
    ctx.diag(`import('…/loader'): ${res.importLoader}`);
    ctx.diag(`import('…/actions/button'): ${res.importButton}`);
    ctx.expect('import() del loader evalúa sin DOM', res.importLoader.startsWith('ok'), res.importLoader);
  },
});

export default lista();
