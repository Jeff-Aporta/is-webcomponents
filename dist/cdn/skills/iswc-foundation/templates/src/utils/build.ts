// @vendor 2026-10-14T16:13:19.844Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/src/utils/build.ts
/**
 * build.ts — `src/js/**` y `view/**` → `dist/cdn/` (estándar iswc-foundation). Lo corre `deno task build`
 * DESPUÉS de `build:scss`.
 *
 *   src/js/<ruta>.ts         → dist/cdn/js/<ruta>.js          (esbuild por archivo, sin bundle, minify)
 *   view/<v>/<ruta>.ts       → dist/cdn/view/<v>/<ruta>.js
 *   .tmp-scss/<ruta>.css     → dist/cdn/<ruta sin src/>.css   (hojas de página, p. ej. styles/app.css)
 *
 * Componentes (molde del kit): `import css from 'iswc:css'` se sustituye por el texto del `.css` compilado hermano
 * (`.tmp-scss/<misma ruta>.css`): la hoja viaja dentro del módulo y el molde la adopta, sin `fetch` ni `<link>`.
 * Los imports del kit (`@jeff-aporta/iswc-base/…`) quedan tal cual: los resuelve el import map de cada HTML.
 *
 * Excepciones explícitas:
 *   - `js/boot.ts` → `dist/cdn/boot.js` (IIFE, síncrono en <head>).
 *   - `js/base/zod.ts` → empaquetado con zod (el navegador no resuelve `import "zod"`).
 *   - barriles `all.ts` → `all.min.js` (bundle de compatibilidad; app y cada vista; el kit queda externo).
 *   - imports de vistas `../../../src/js/` → `../../../js/` en dist; y del shell hacia `view/`, un `../` menos.
 *
 * Después: cache busting `?v=<hash de contenido>` con las tools vendorizadas del kit (una URL por
 * módulo), `asset-hashes.json`, el registrador `__PREFIJO__Loader.min.js` (tag → `{ href, type: 'module' }` vía
 * `L.registerApp`; además declara `<html data-icons>` = `deno.json` → `iswc.host` + `assets/iconify/`,
 * la web publicada de la app, para que `<iswc-icon>` busque ahí antes que en la API), `build-stamp.json` y el
 * bootstrap de cada HTML (ver `bootstrap()`).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import esbuild from 'esbuild';
import { hashPorRuta } from '../vendor/iswc-base/build/hash.ts';
import { withAssetHash } from '../vendor/iswc-base/build/asset-url.ts';
import { hashesJson, stampDirectory } from '../vendor/iswc-base/build/stamp-hashes.ts';
import { mapaRutas, PREFIJO, SHELL_CRITICO } from '../js/kit-tags.ts';
import { ISWC_LOADER_HREF } from '../js/iswc.ts';

const ROOT = join(import.meta.dirname!, '..', '..');
const SRC_JS = join(ROOT, 'src', 'js');
const VIEW = join(ROOT, 'view');
const STAGING = join(ROOT, '.tmp-scss');
const OUT = join(ROOT, 'dist', 'cdn');
const ZOD = join(SRC_JS, 'base', 'zod.ts');
const DEPS = join(ROOT, 'src', 'vendor', 'iswc-base', 'deps.json');
const PLANOS = new Set([join(SRC_JS, 'boot.ts')]);
const SELLO = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const DEFINE = { __APP_BUILD__: JSON.stringify(SELLO) };
/** Especificador del kit: externo en los bundles (lo resuelve el import map del HTML). */
const KIT_ALIAS = '@jeff-aporta/iswc-base/*';
/** `import css from 'iswc:css';` (una línea, como lo escribe el molde). */
const IMPORT_CSS = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]iswc:css['"];?[ \t]*$/m;

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

/** Texto del `.css` compilado hermano de un módulo (`.tmp-scss/<misma ruta>.css`), minificado; `''` si no tiene. */
async function cssHermano(fuente: string): Promise<string> {
  const css = join(STAGING, relative(ROOT, fuente)).replace(/\.ts$/, '.css');
  if (!existsSync(css)) return '';
  const r = await esbuild.transform(readFileSync(css, 'utf8'), { loader: 'css', minify: true });
  // `@charset` no aplica a una hoja construida (el texto ya es una cadena JS).
  return r.code.replace(/^@charset "[^"]*";/i, '').trim();
}

/** Plugin de los bundles (barriles): `iswc:css` → el `.css` hermano del módulo que lo importa. */
const cssVirtual: esbuild.Plugin = {
  name: 'iswc-css',
  setup(b) {
    b.onResolve({ filter: /^iswc:css$/ }, (a) => ({ path: a.importer, namespace: 'iswc-css' }));
    b.onLoad({ filter: /.*/, namespace: 'iswc-css' }, async (a) => ({ contents: `export default ${JSON.stringify(await cssHermano(a.path))};`, loader: 'js' }));
  },
};

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
    const destino = barril && f.startsWith(SRC_JS) ? join(OUT, 'all.min.js') : publicada(f, barril ? '.min.js' : '.js');
    if (barril || f === ZOD) {
      const r = await esbuild.build({
        entryPoints: [f], bundle: true, write: false, format: 'esm', target: 'es2022', minify: true, define: DEFINE,
        external: [KIT_ALIAS], plugins: [cssVirtual],
      });
      writeFileSync(destino, reescribir(f, r.outputFiles![0]!.text));
      continue;
    }
    // Sin bundle: el `import css from 'iswc:css'` se vuelve una constante con el texto de la hoja hermana.
    let codigo = readFileSync(f, 'utf8');
    const conCss = codigo.match(IMPORT_CSS);
    if (conCss) codigo = codigo.replace(IMPORT_CSS, `const ${conCss[1]} = ${JSON.stringify(await cssHermano(f))};`);
    const r = await esbuild.transform(codigo, { loader: 'ts', format: 'esm', target: 'es2022', minify: true, define: DEFINE, sourcefile: f });
    writeFileSync(destino, reescribir(f, r.code));
  }
  for (const css of listar(STAGING, '.css')) {
    const r = await esbuild.build({ entryPoints: [css], bundle: true, write: false, minify: true, loader: { '.css': 'css' } });
    writeFileSync(publicada(css, '.css'), r.outputFiles![0]!.text);
  }
  return fuentes.length;
}

/**
 * Base de íconos de la app (una sola declaración: `deno.json` → `iswc.host`): el registrador la deja en
 * `<html data-icons>` si la página no trae otra. Siempre URL absoluta: la del sitio publicado o, si la página
 * se sirve desde otro origen (dev, e2e), la de su propio servidor.
 */
function iconos(): string[] {
  const deno: { iswc?: { host?: unknown } } = JSON.parse(readFileSync(join(ROOT, 'deno.json'), 'utf8'));
  const host = deno.iswc?.host;
  if (typeof host !== 'string' || !/^https?:\/\//.test(host)) return [];
  const base = new URL('assets/iconify/', host.endsWith('/') ? host : `${host}/`).href;
  // En el sitio publicado, esa base; servida desde otro origen (dev, e2e) la carpeta de ESTE mismo servidor
  // (absoluta, junto al registrador: dist/cdn/ → ../../assets/iconify/), sin CORS contra el publicado.
  return [`{const h=document.documentElement,p=${JSON.stringify(base)};if(!h.dataset.icons)h.dataset.icons=location.origin===new URL(p).origin?p:new URL("../../assets/iconify/",raiz).href;}`];
}

/** `?v=<hash>` en todos los imports propios + registrador de componentes + metadatos. */
async function sellar(): Promise<void> {
  const hashes = await stampDirectory(OUT);
  const pares = Object.entries(mapaRutas()).sort(([a], [b]) => a.localeCompare(b)).map(([tag, rel]) => {
    const href = hashes[rel] ? withAssetHash(rel, hashes[rel]!) : rel;
    // `type:"module"`: los componentes de la app son módulos ES con extensión `.js`; el loader del kit infiere el tipo
    // por extensión (D2: `.js` = clásico, `.mjs` = módulo) y este override lo deja explícito.
    return `${JSON.stringify(tag)}:{href:new URL(${JSON.stringify(href)},raiz).href,type:"module"}`;
  });
  const fuente = [
    'const L=globalThis.iswcLoader;',
    `if(!L)throw new Error("${PREFIJO}Loader: falta iswcLoader (carga antes el loader del kit)");`,
    'const raiz=new URL("./",import.meta.url);',
    `L.registerApp({${pares.join(',')}},{installSheets:false});`,
    ...iconos(),
  ].join('');
  const loader = (await esbuild.transform(fuente, { minify: true, format: 'esm', target: 'es2022' })).code;
  writeFileSync(join(OUT, `${PREFIJO}Loader.min.js`), loader);
  hashes[`${PREFIJO}Loader.min.js`] = hashPorRuta(`${PREFIJO}Loader.min.js`, loader);
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

/* ── Bootstrap de los HTML (plan de carga del kit, F4) ───────────────────── */

/** `dist/cdn/` del kit al pin: la URL del loader de `src/js/iswc.ts` sin `core/loader.min.mjs`. */
const CDN_KIT = ISWC_LOADER_HREF.replace(/core\/loader\.min\.mjs$/, '');
const MARCA_INICIO = '<!-- iswc:precarga:inicio -->';
const MARCA_FIN = '<!-- iswc:precarga:fin -->';

/**
 * Rutas (relativas a `dist/cdn/` del kit) del cierre del shell crítico: `deps.json` → `tags[tag]` de cada tag de
 * `SHELL_CRITICO`, chunks tal cual, sin duplicados y en orden estable. Sin `deps.json` vendorizado, ninguna (el
 * loader precarga igual en su primer `load()`, con una petición más).
 */
function cierreShell(): string[] {
  if (!existsSync(DEPS)) {
    console.warn(`[build] falta ${relative(ROOT, DEPS)} (deno task vendor:iswc): HTML sin modulepreload del shell`);
    return [];
  }
  const deps = JSON.parse(readFileSync(DEPS, 'utf8')) as { tags?: Record<string, string[]> };
  const rutas = new Set<string>();
  for (const tag of SHELL_CRITICO) {
    const cierre = deps.tags?.[tag];
    if (!cierre) throw new Error(`[build] ${tag} (SHELL_CRITICO) no está en deps.json del pin`);
    for (const r of cierre) rutas.add(r);
  }
  return [...rutas].sort();
}

/**
 * Bloque entre las marcas de cada HTML: `<link rel="modulepreload">` del loader y del cierre del shell crítico y
 * `<link rel="stylesheet">` de las hojas base del kit. Todo sobre el pin SHA (inmutable): sin `?v=`.
 */
function bloquePrecarga(sangria: string): string {
  const lineas = [
    `<link rel="modulepreload" href="${CDN_KIT}core/loader.min.mjs">`,
    ...cierreShell().map((r) => `<link rel="modulepreload" href="${CDN_KIT}${r}">`),
    `<link rel="stylesheet" href="${CDN_KIT}is-base.min.css">`,
    `<link rel="stylesheet" href="${CDN_KIT}palettes.min.css">`,
  ];
  return [MARCA_INICIO, ...lineas, MARCA_FIN].join(`\n${sangria}`);
}

/**
 * Reescribe, en cada HTML de la app (raíz y `view/**`), el bloque entre `<!-- iswc:precarga:inicio -->` y
 * `<!-- iswc:precarga:fin -->` con `bloquePrecarga()`. Idempotente: con el mismo pin y el mismo deps.json no cambia
 * nada. El resto del bootstrap (import map, loader `.min.mjs`, registrador) está escrito en el HTML.
 */
function bootstrap(): number {
  const htmls = [join(ROOT, 'index.html'), ...listar(VIEW, '.html')].filter((f) => existsSync(f));
  const re = new RegExp(`([ \\t]*)${MARCA_INICIO}[\\s\\S]*?${MARCA_FIN}`);
  let n = 0;
  for (const f of htmls) {
    const texto = readFileSync(f, 'utf8');
    const nuevo = texto.replace(re, (_m, sangria: string) => `${sangria}${bloquePrecarga(sangria)}`);
    if (nuevo === texto) continue;
    writeFileSync(f, nuevo);
    n++;
  }
  return n;
}

const n = await compilar();
await sellar();
const htmls = bootstrap();
console.log(`[build] dist/cdn: ${n} módulos · ${PREFIJO}Loader.min.js · ${htmls} HTML con precarga al día · build ${SELLO}`);

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
