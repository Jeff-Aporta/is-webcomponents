/**
 * build.ts — `src/js/**` y `view/**` → `dist/cdn/` (estándar iswc-foundation). Lo corre `deno task build`
 * DESPUÉS de `build:scss`.
 *
 *   src/js/<ruta>.ts         → dist/cdn/js/<ruta>.js          (esbuild por archivo, sin bundle, minify)
 *   view/<v>/<ruta>.ts       → dist/cdn/view/<v>/<ruta>.js
 *   .tmp-scss/<ruta>.css     → dist/cdn/<ruta sin src/>.css   (hoja hermana de su módulo)
 *
 * Excepciones explícitas:
 *   - `js/boot.ts` → `dist/cdn/boot.js` (IIFE, síncrono en <head>).
 *   - `js/base/zod.ts` → empaquetado con zod (el navegador no resuelve `import "zod"`).
 *   - barriles `all.ts` → `all.min.js` (bundle de compatibilidad; app y cada vista).
 *   - imports de vistas `../../../src/js/` → `../../../js/` en dist; y del shell hacia `view/`, un `../` menos.
 *
 * Después: cache busting `?v=<hash de contenido>` con las tools vendorizadas del kit (una URL por
 * módulo), `asset-hashes.json`, el registrador `__PREFIJO__Loader.min.js` (tag → URL hasheada vía
 * `L.registerApp`; además encadena `assets/iconify.json` en `globalThis.__ISWC_ICONS__` para que
 * `<iswc-icon>` busque primero los íconos de la app) y `build-stamp.json`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import esbuild from 'esbuild';
import { contentHash, hashesJson, stampDirectory, withAssetHash } from '../vendor/iswc-root/build/index.ts';
import { mapaRutas, PREFIJO } from '../js/kit-tags.ts';

const ROOT = join(import.meta.dirname!, '..', '..');
const SRC_JS = join(ROOT, 'src', 'js');
const VIEW = join(ROOT, 'view');
const STAGING = join(ROOT, '.tmp-scss');
const OUT = join(ROOT, 'dist', 'cdn');
const ZOD = join(SRC_JS, 'base', 'zod.ts');
const PLANOS = new Set([join(SRC_JS, 'boot.ts')]);
const SELLO = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const DEFINE = { __APP_BUILD__: JSON.stringify(SELLO) };

const listar = (dir: string, ext: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true }).flatMap((e): string[] => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name.startsWith('.') || e.name === 'tests' || e.name === 'stagehand' ? [] : listar(p, ext);
    return e.name.endsWith(ext) && !e.name.endsWith('.d.ts') && !e.name.endsWith('.test.ts') ? [p] : [];
  });

/** Ruta publicada: `src/js/x` → `js/x`, `view/v/x` → `view/v/x`, `.tmp-scss/src/js/x` → `js/x`. */
function publicada(fuente: string, ext: string): string {
  let rel = relative(ROOT, fuente).split(sep).join('/');
  rel = rel.replace(/^\.tmp-scss\//, '').replace(/^src\//, '');
  const salida = join(OUT, rel.replace(/\.[^.]+$/, ext));
  mkdirSync(dirname(salida), { recursive: true });
  return salida;
}

const reescribir = (fuente: string, codigo: string): string => fuente.startsWith(VIEW)
  ? codigo.replace(/(['"`])((?:\.\.\/)+)src\/js\//g, '$1$2js/')
  : codigo.replace(/(['"`])\.\.\/((?:\.\.\/)+)view\//g, '$1$2view/');

async function compilar(): Promise<number> {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const fuentes = [...listar(SRC_JS, '.ts'), ...listar(VIEW, '.ts')];
  for (const f of fuentes) {
    if (PLANOS.has(f)) {
      const r = await esbuild.transform(readFileSync(f, 'utf8'), { loader: 'ts', format: 'iife', target: 'es2019', minify: true });
      writeFileSync(join(OUT, basename(f).replace(/\.ts$/, '.js')), r.code);
      continue;
    }
    const barril = basename(f) === 'all.ts';
    const r = await esbuild.build({
      entryPoints: [f], bundle: barril || f === ZOD, write: false, format: 'esm', target: 'es2022', minify: true, define: DEFINE,
    });
    const destino = barril && f.startsWith(SRC_JS) ? join(OUT, 'all.min.js') : publicada(f, barril ? '.min.js' : '.js');
    writeFileSync(destino, reescribir(f, r.outputFiles![0]!.text));
  }
  for (const css of listar(STAGING, '.css')) {
    const r = await esbuild.build({ entryPoints: [css], bundle: true, write: false, minify: true, loader: { '.css': 'css' } });
    writeFileSync(publicada(css, '.css'), r.outputFiles![0]!.text);
  }
  return fuentes.length;
}

/**
 * Mapa de íconos de la app (`assets/iconify.json`, lo escribe `deno task icons`): el registrador lo empuja
 * a la cola global de `<iswc-icon>` con su `?v=<hash>`. dist/cdn/ → ../../assets/.
 */
function iconos(): string[] {
  const mapa = join(ROOT, 'assets', 'iconify.json');
  if (!existsSync(mapa)) return [];
  const href = withAssetHash('../../assets/iconify.json', contentHash(readFileSync(mapa, 'utf8')));
  return [`(globalThis.__ISWC_ICONS__??=[]).push(new URL(${JSON.stringify(href)},raiz).href);`];
}

/** `?v=<hash>` en todos los imports propios + registrador de componentes + metadatos. */
async function sellar(): Promise<void> {
  const hashes = await stampDirectory(OUT);
  const pares = Object.entries(mapaRutas()).sort(([a], [b]) => a.localeCompare(b)).map(([tag, rel]) => {
    const href = hashes[rel] ? withAssetHash(rel, hashes[rel]!) : rel;
    return `${JSON.stringify(tag)}:new URL(${JSON.stringify(href)},raiz).href`;
  });
  const fuente = [
    'const L=globalThis.ISWebComponentsLoader;',
    `if(!L)throw new Error("${PREFIJO}Loader: falta ISWebComponentsLoader (carga antes el loader del kit)");`,
    'const raiz=new URL("./",import.meta.url);',
    `L.registerApp({${pares.join(',')}},{installSheets:false});`,
    ...iconos(),
  ].join('');
  const loader = (await esbuild.transform(fuente, { minify: true, format: 'esm', target: 'es2022' })).code;
  writeFileSync(join(OUT, `${PREFIJO}Loader.min.js`), loader);
  hashes[`${PREFIJO}Loader.min.js`] = contentHash(loader);
  writeFileSync(join(OUT, 'asset-hashes.json'), hashesJson(hashes));
  const git = (args: string[]) => {
    try {
      return new TextDecoder().decode(new Deno.Command('git', { args, cwd: ROOT }).outputSync().stdout).trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  };
  writeFileSync(join(OUT, 'build-stamp.json'), `${JSON.stringify({
    build: SELLO, lastbuild: Date.now(), gitCommit: git(['rev-parse', 'HEAD']), gitBranch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
  }, null, 2)}\n`);
}

const n = await compilar();
await sellar();
console.log(`[build] dist/cdn: ${n} módulos · ${PREFIJO}Loader.min.js · build ${SELLO}`);

if (!Deno.args.includes('--watch')) await esbuild.stop();
else {
  const { watch } = await import('node:fs');
  let t: ReturnType<typeof setTimeout> | undefined;
  let corriendo = false;
  const rehacer = async () => {
    if (corriendo) return;
    corriendo = true;
    try {
      await new Deno.Command(Deno.execPath(), { args: ['run', '-A', 'scripts/build/build-scss.mjs'], cwd: ROOT }).output();
      await compilar();
      await sellar();
      console.log('[watch] build al día');
    } catch (e) {
      console.error('[watch]', e instanceof Error ? e.message : e);
    } finally {
      corriendo = false;
    }
  };
  for (const dir of [join(ROOT, 'src'), VIEW]) {
    watch(dir, { recursive: true }, (_e, f) => {
      if (!f || !/\.(ts|scss|json|md)$/.test(f) || String(f).includes('vendor')) return;
      clearTimeout(t);
      t = setTimeout(rehacer, 80);
    });
  }
  console.log('[watch] esperando cambios en src/ y view/…');
}
