// @contexto INDICE.md · src/cdn/build/README.md
/**
 * construir-app.ts — el conversor TS → `.mjs` de las apps del kit (F10; ADR «conversor construirApp, 2026-11-05»).
 * Una app Deno lo ejecuta desde el pin, la MISMA herramienta en todos los proyectos:
 *
 *   deno run -A https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha>/dist/cdn/build/construir-app.ts --config=build.json [--watch]
 *   import { construirApp } from '<misma URL>';   await construirApp({ raiz, prefijo: 'av', … });
 *
 *   construirApp(opts)            UN build de esbuild con splitting de `src/js/**` y `view/**` → `<salida>/` y lo que lo rodea.
 *   vigilarApp(opts, antes?)      reconstruye al cambiar `src/` o `view/` (`antes`: p. ej. compilar el SCSS).
 *   rutaPublicada(raiz, fuente)   `src/js/x.ts` → `js/x.min.mjs`, `view/v/x.ts` → `view/v/x.min.mjs`.
 *
 * Pasos de `construirApp` (contrato en specs/cdn.md §Conversor construirApp):
 *   1. Entradas: cada `.ts` de `entradas` (sin `.d.ts`/`.test.ts`, ni `tests/`, `stagehand/`, carpetas con punto) se
 *      publica como `.min.mjs`. Raíces = fuentes de `tags`, `app` de cada página y módulos que los HTML citan: van al
 *      build con splitting; el resto sale suelto y autónomo (tests, barriles). Los `planos` aparte en IIFE
 *      (`boot.ts` → `<salida>/boot.js`, clásico: tema antes del primer pintado).
 *   2. esbuild `splitting`, `format: 'esm'`, `minify`, `.min.mjs` y `_chunks/[name]-[hash].mjs` propios de la app. El alias
 *      `@jeff-aporta/iswc-base/<ruta>` queda externo y se reescribe a `<cdn><ruta>` (la URL del pin, la misma que usa el
 *      loader: una instancia por módulo). `zod` y `externos` los resuelve el import map. `iswc:css` incrusta la hoja del
 *      staging (`css-virtual.ts`). `import.meta.url` de cada fuente vale lo que valdría publicada sola (su ruta en
 *      `<salida>`), aunque su código acabe en un chunk: así `new URL('./x.css', import.meta.url)` sigue funcionando.
 *   3. Hojas: cada `.css` del staging (espejo de la raíz, `.tmp-scss/`) → `<salida>/<ruta sin src/>.css`, minificada.
 *   4. Lote opcional del armazón (`lote-kit.ts`), desde el pin publicado.
 *   5. Sellado `?v=` solo en origen mutable (`stamp-hashes.ts`, `sellarMjs: false`: ningún `.mjs` lleva `?v=` dentro).
 *   6. `deps.json` de la app (`graph.ts`: cierre por tag) y registrador `<prefijo>Loader.min.mjs`
 *      (`registerApp({ tag: { href, type: 'module' } })`, `deps` compactos en `<prefijo>Loader.deps.json` que pide con la
 *      primera interacción y pasa con `configure({ deps })`, y `<html data-icons>` desde `deno.json` → `iswc.host`).
 *   7. HTML: entre `<!-- iswc:precarga:inicio -->` y `<!-- iswc:precarga:fin -->`, import map (alias y `zod` del pin),
 *      `modulepreload` del cierre del kit y del de la app, hojas base del kit sin bloquear, loader y registrador. Fuera del
 *      bloque solo pone o quita el `?v=` de las referencias a `<salida>`. Idempotente.
 * Sigue siendo de cada app: sus entradas y vistas, el SCSS (`build:scss`), sus íconos, su despliegue y sus tests.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import process from 'node:process';
import { build, stop, transform, type Metafile, type Plugin } from 'esbuild';
import type { ConstruirAppOpts, InformeBuild, PaginaApp } from './construir-app.schemas.js';
import type { DepsJson } from './graph.schemas.js';
import { ALIAS_KIT } from './alias.js';
import { cssVirtual } from './css-virtual.js';
import { CARPETA_CHUNKS, EXT_MODULO } from './bundle-kit.js';
import { cierreDe, conVersiones, depsJson, unirDeps } from './graph.js';
import { ASSET_HASHES_NAME, esChunk, hashFile, hashesJson, mjsReferenciadosEn, sinSelloUrl, stampDirectory } from './stamp-hashes.js';
import { esUrlInmutable, withAssetHash } from './asset-url.js';
import { construirLoteKit } from './lote-kit.js';

const REPO_KIT = 'Jeff-Aporta/is-webcomponents';
const MARCA_INICIO = '<!-- iswc:precarga:inicio -->';
const MARCA_FIN = '<!-- iswc:precarga:fin -->';
/** Marca de la raíz de `<salida>` relativa a cada archivo publicado; se sustituye tras el build (paso 2). */
const RAIZ_APP = '@@iswc-raiz-app@@';
const CARPETAS_FUERA = new Set(['tests', 'stagehand', 'node_modules', 'vendor']);
/** Recursos de `url()` en las hojas de la app: quedan relativos (no se empaquetan). */
const RECURSOS_CSS = ['*.otf', '*.woff', '*.woff2', '*.ttf', '*.svg', '*.png', '*.jpg', '*.jpeg', '*.webp', '*.gif', '*.avif'];
/** Fuente que se incrusta su hoja con `import css from 'iswc:css'` (no necesita la `.css` hermana por red). */
const USA_ISWC_CSS = /from\s*['"]iswc:css['"]/;

const barras = (p: string) => p.replaceAll('\\', '/');

function listar(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e): string[] => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name.startsWith('.') || CARPETAS_FUERA.has(e.name) ? [] : listar(p, ext);
    return e.name.endsWith(ext) && !e.name.endsWith('.d.ts') && !e.name.endsWith('.test.ts') ? [p] : [];
  });
}

/** Ruta publicada (relativa a `<salida>`) de una fuente: sin `src/` delante y con `.min.mjs`. */
export function rutaPublicada(raiz: string, fuente: string): string {
  return barras(relative(raiz, resolve(raiz, fuente))).replace(/^src\//, '').replace(/\.(?:ts|js|mjs)$/, `.min${EXT_MODULO}`);
}

/** `../` hasta la raíz de `<salida>` desde un archivo publicado (`./` en la raíz). */
const subirA = (rel: string) => '../'.repeat(rel.split('/').length - 1) || './';

/** SHA del pin desde `src/js/iswc.ts` (la URL del loader). */
function pinDeLaApp(raiz: string): string | null {
  const iswc = join(raiz, 'src', 'js', 'iswc.ts');
  return existsSync(iswc) ? readFileSync(iswc, 'utf8').match(/@([0-9a-f]{40})\//)?.[1] ?? null : null;
}

function leerDenoJson(raiz: string): { iswc?: { host?: unknown } } {
  const f = join(raiz, 'deno.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
}

function git(raiz: string, args: string): string {
  try {
    return execSync(`git ${args}`, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** `@jeff-aporta/iswc-base/<ruta>` → `<cdn><ruta>`, externo (la app lo escribe con la ruta publicada, `core/x.min.mjs`). */
function aliasAlPin(cdn: string): Plugin {
  return {
    name: 'alias-al-pin',
    setup(b) {
      b.onResolve({ filter: /^@jeff-aporta\/iswc-base\// }, (a) => ({ path: cdn + a.path.slice(ALIAS_KIT.length), external: true }));
    },
  };
}

/** `import.meta.url` de cada fuente de la app → su URL publicada, resuelta desde la raíz de `<salida>` (paso 2). */
function metaUrlPublicada(raiz: string): Plugin {
  return {
    name: 'meta-url-publicada',
    setup(b) {
      b.onLoad({ filter: /\.(?:ts|js|mjs)$/ }, (a) => {
        if (a.namespace !== 'file' || /[\\/]node_modules[\\/]/.test(a.path) || relative(raiz, a.path).startsWith('..')) return undefined;
        const texto = readFileSync(a.path, 'utf8');
        if (!/\bimport\.meta\.url\b/.test(texto)) return undefined;
        const url = `new URL(${JSON.stringify(rutaPublicada(raiz, a.path))},new URL(${JSON.stringify(RAIZ_APP)},import.meta.url)).href`;
        return { contents: texto.replace(/\bimport\.meta\.url\b/g, url), loader: a.path.endsWith('.ts') ? 'ts' : 'js' };
      });
    },
  };
}

/** Grafo del kit al pin: el vendorizado (`deps.json` unido) o el publicado (índice + `deps/<cat>.json`). */
async function depsDelKit(raiz: string, cdn: string, pin: string, ruta: string): Promise<DepsJson> {
  const local = join(raiz, ruta);
  if (existsSync(local)) return JSON.parse(readFileSync(local, 'utf8'));
  const bajar = async (rel: string) => {
    const r = await fetch(cdn + rel, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`construirApp: ${cdn}${rel} → ${r.status} (¿pin anterior a F7? vendoriza deps.json)`);
    return r.json();
  };
  const indice = await bajar('deps.json');
  if (!indice?.categorias) return indice;
  const partes: Record<string, DepsJson> = {};
  for (const cat of [...new Set([...Object.values(indice.categorias as Record<string, string>), 'core'])].sort()) partes[cat] = await bajar(`deps/${cat}.json`);
  return unirDeps(partes, pin);
}

/** Snippet del registrador: `<html data-icons>` = `deno.json` → `iswc.host` + `assets/iconify/` (o el propio servidor). */
function iconos(host: unknown): string[] {
  if (typeof host !== 'string' || !/^https?:\/\//.test(host)) return [];
  const base = new URL('assets/iconify/', host.endsWith('/') ? host : `${host}/`).href;
  return [`{const h=document.documentElement,p=${JSON.stringify(base)};if(!h.dataset.icons)h.dataset.icons=location.origin===new URL(p).origin?p:new URL("../../assets/iconify/",raiz).href;}`];
}

/** Hoja del kit que no bloquea: `preload` que pasa a `stylesheet` al llegar, con `<noscript>` de respaldo. */
const hojaNoBloqueante = (href: string) => [
  `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">`,
  `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
];

/** Páginas por defecto: `index.html` y los `view/**\/*.html` que llevan las marcas. */
function paginasPorDefecto(raiz: string): PaginaApp[] {
  const todas = [join(raiz, 'index.html'), ...listar(join(raiz, 'view'), '.html')].filter((f) => existsSync(f));
  return todas.filter((f) => readFileSync(f, 'utf8').includes(MARCA_INICIO)).map((f) => ({ archivo: barras(relative(raiz, f)) }));
}

/** `href`/`src`, `import('…')` y `from '…'` de un HTML. */
const URLS_HTML = [/(\s(?:href|src)\s*=\s*["'])([^"']+)(["'])/gi, /(\bimport\s*\(\s*["'])([^"']+)(["'])/g, /(\bfrom\s*["'])([^"']+)(["'])/g];

function reescribirUrlsHtml(texto: string, fn: (url: string) => string): string {
  return URLS_HTML.reduce((t, re) => t.replace(re, (_w, a: string, u: string, b: string) => `${a}${fn(u)}${b}`), texto);
}

/** Ni esquema (`https:`, `data:`), ni `//`, ni `#`, ni ruta absoluta: una URL relativa al documento (o a su `<base>`). */
const esRelativa = (u: string) => !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(u);

/** URLs relativas del HTML fuera del bloque de precarga. */
function urlsDelHtml(texto: string): string[] {
  const ini = texto.indexOf(MARCA_INICIO);
  const fin = texto.indexOf(MARCA_FIN);
  const fuera = ini < 0 || fin < ini ? texto : texto.slice(0, ini) + texto.slice(fin + MARCA_FIN.length);
  const out: string[] = [];
  reescribirUrlsHtml(fuera, (u) => {
    if (esRelativa(u)) out.push(u);
    return u;
  });
  return out;
}

/** Carpeta contra la que resuelve un HTML sus URLs relativas: la de `<base href>` (una base absoluta = la raíz de la app). */
function baseDelHtml(raiz: string, archivo: string, html: string): string {
  const base = html.match(/<base\s[^>]*href\s*=\s*["']([^"']*)["']/i)?.[1];
  if (base === undefined) return dirname(archivo);
  if (base.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(base)) return raiz;
  return resolve(dirname(archivo), base);
}

/** Construye la app. Ver la cabecera: entradas → bundle → hojas → lote → `?v=` → deps y registrador → HTML. */
export async function construirApp(opts: ConstruirAppOpts): Promise<InformeBuild> {
  const raiz = resolve(opts.raiz);
  const OUT = join(raiz, opts.salida ?? join('dist', 'cdn'));
  const staging = join(raiz, opts.staging ?? '.tmp-scss');
  const pin = opts.pin ?? pinDeLaApp(raiz);
  if (!pin) throw new Error('construirApp: falta `pin` (ni src/js/iswc.ts declara un SHA de 40 hex)');
  const cdn = opts.cdn ?? `https://cdn.jsdelivr.net/gh/${opts.repo ?? REPO_KIT}@${pin}/dist/cdn/`;
  if (!cdn.endsWith('/')) throw new Error(`construirApp: \`cdn\` debe terminar en «/» (${cdn})`);
  const deno = leerDenoJson(raiz);
  const mutable = opts.origenMutable ?? !esUrlInmutable(String(deno.iswc?.host ?? ''));
  const externos = [...new Set(['zod', ...(opts.externos ?? [])])];
  const define = opts.define ?? {};

  // 1. Entradas. Raíces (las que carga el navegador): las fuentes de `tags`, las `app` de cada página y los módulos que
  // los HTML citan fuera del bloque. Solo ellas entran al build con splitting: si cada archivo fuese entrada, cada
  // módulo saldría en su propio chunk (un chunk por conjunto de entradas que lo alcanzan) y la página pediría más
  // archivos que el build por archivo. El resto de fuentes se publica suelto y autónomo (tests, hosts, barriles).
  const planos = new Set((opts.planos ?? []).map((p) => resolve(raiz, p)));
  const fuentes = (opts.entradas ?? ['src/js', 'view']).flatMap((d) => listar(join(raiz, d), '.ts')).filter((f) => !planos.has(f)).sort();
  const fuentePorSalida = new Map(fuentes.map((f) => [rutaPublicada(raiz, f), f]));
  const paginas = (opts.html ?? paginasPorDefecto(raiz)).map((p) => (typeof p === 'string' ? { archivo: p } : p));
  const raices = new Set<string>();
  const tags = opts.tags ?? {};
  for (const f of Object.values(tags)) raices.add(resolve(raiz, f));
  for (const p of paginas) {
    for (const item of p.app ?? []) if (!tags[item]) raices.add(resolve(raiz, item));
    const archivo = join(raiz, p.archivo);
    if (!existsSync(archivo)) continue;
    const texto = readFileSync(archivo, 'utf8');
    const baseDir = baseDelHtml(raiz, archivo, texto);
    for (const u of urlsDelHtml(texto)) {
      const rel = barras(relative(OUT, resolve(baseDir, u.split(/[?#]/)[0]!)));
      const f = fuentePorSalida.get(rel);
      if (f) raices.add(f);
    }
  }
  const conRaices = raices.size > 0;
  const aEntrada = (f: string) => ({ in: f, out: rutaPublicada(raiz, f).replace(/\.mjs$/, '') });
  const entradas = fuentes.filter((f) => !conRaices || raices.has(f)).map(aEntrada);
  const sueltas = conRaices ? fuentes.filter((f) => !raices.has(f)).map(aEntrada) : [];

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // 2. Un build con splitting (raíces) y, aparte, las fuentes sueltas, cada una autónoma
  const comun = {
    outdir: OUT,
    absWorkingDir: raiz,
    bundle: true,
    format: 'esm' as const,
    target: 'es2022',
    minify: true,
    write: false as const,
    legalComments: 'none' as const,
    outExtension: { '.js': EXT_MODULO },
    define,
    external: externos,
    logLevel: 'warning' as const,
    plugins: [aliasAlPin(cdn), cssVirtual({ staging, fuentes: raiz }), metaUrlPublicada(raiz)],
  };
  const r = await build({ ...comun, entryPoints: entradas, splitting: true, metafile: true, chunkNames: `${CARPETA_CHUNKS}/[name]-[hash]` });
  const metafile: Metafile = r.metafile;
  const salidasSueltas = sueltas.length ? (await build({ ...comun, entryPoints: sueltas })).outputFiles : [];
  const archivos: string[] = [];
  let bytes = 0;
  const marca = new RegExp(`(["'\`])${RAIZ_APP}\\1`, 'g');
  for (const f of [...r.outputFiles, ...salidasSueltas]) {
    const rel = barras(relative(OUT, f.path));
    mkdirSync(dirname(f.path), { recursive: true });
    if (/\.m?js$/.test(rel)) {
      const texto = f.text.replace(marca, JSON.stringify(subirA(rel)));
      writeFileSync(f.path, texto);
      bytes += texto.length;
    } else writeFileSync(f.path, f.contents);
    archivos.push(rel);
  }
  for (const p of planos) {
    const salida = join(OUT, p.split(/[\\/]/).pop()!.replace(/\.ts$/, '.js'));
    const rp = await build({ entryPoints: [p], absWorkingDir: raiz, bundle: true, format: 'iife', target: 'es2019', minify: true, write: false, legalComments: 'none', define, external: externos });
    writeFileSync(salida, rp.outputFiles[0]!.text);
    bytes += rp.outputFiles[0]!.text.length;
    archivos.push(barras(relative(OUT, salida)));
  }

  // 3. Hojas del staging
  for (const css of listar(staging, '.css')) {
    const rel = barras(relative(staging, css)).replace(/^src\//, '');
    const rc = await build({ entryPoints: [css], bundle: true, minify: true, write: false, logLevel: 'error', external: RECURSOS_CSS });
    mkdirSync(dirname(join(OUT, rel)), { recursive: true });
    writeFileSync(join(OUT, rel), rc.outputFiles[0]!.text);
    archivos.push(rel);
  }

  // 4. Lote del armazón
  const necesitaDepsKit = !!opts.lote || (opts.html ?? []).some((p) => typeof p !== 'string' && p.kit?.length) || !opts.html;
  const depsKit = necesitaDepsKit ? await depsDelKit(raiz, cdn, pin, opts.depsKit ?? join('src', 'vendor', 'iswc-base', 'deps.json')) : { sha: pin, tags: {}, core: {} };
  const loteRel = opts.lote ? (opts.lote.archivo ?? 'kit-lote.min.mjs') : null;
  const enLote = new Set<string>();
  if (opts.lote && loteRel) {
    const l = await construirLoteKit({ cdn, deps: depsKit, tags: opts.lote.tags, salida: join(OUT, loteRel), cache: join(raiz, '.tmp', 'kit-lote', pin) });
    for (const t of l.tags) enLote.add(t);
    archivos.push(loteRel);
    console.log(`[construirApp] ${loteRel}: ${l.tags.length} tags del kit · ${l.modulos} módulos · ${l.bytes} B`);
  }

  // 5. ?v= solo en origen mutable; un `.mjs` que otro importa por ruta relativa no lo lleva (una URL para todos).
  const hashes: Record<string, string> = mutable ? await stampDirectory(OUT, undefined, { sellarMjs: false }) : {};
  const compartidos = mutable ? await mjsReferenciadosEn(OUT) : new Set<string>();
  // Los chunks ya llevan el hash en el nombre: su URL es una sola, sin `?v=`.
  for (const rel of Object.keys(hashes)) if (compartidos.has(rel) || esChunk(rel)) delete hashes[rel];
  const conV = (rel: string) => (hashes[rel] ? withAssetHash(rel, hashes[rel]!) : rel);

  // 6. deps.json de la app y registrador
  const pubTag: Record<string, string> = {};
  for (const [tag, fuente] of Object.entries(tags)) {
    const pub = rutaPublicada(raiz, fuente);
    if (!fuentePorSalida.has(pub)) throw new Error(`construirApp: ${tag} → ${fuente} no es una entrada del build`);
    pubTag[tag] = pub;
  }
  const deps = conVersiones(depsJson({ metafile, outdir: OUT, cwd: raiz, sha: pin, tags: pubTag, core: {} }), hashes, compartidos);
  writeFileSync(join(OUT, 'deps.json'), `${JSON.stringify(deps)}\n`);
  const rutas: string[] = [];
  const indice = new Map<string, number>();
  const i = (rel: string) => {
    if (!indice.has(rel)) indice.set(rel, rutas.push(conV(rel)) - 1);
    return indice.get(rel)!;
  };
  const pares = Object.keys(pubTag).sort().map((t) => `${JSON.stringify(t)}:{href:u(${i(pubTag[t]!)}),type:"module"}`);
  if (loteRel) for (const t of [...enLote].sort()) pares.push(`${JSON.stringify(t)}:{href:u(${i(loteRel)}),type:"module"}`);
  const registrador = `${opts.prefijo}Loader.min${EXT_MODULO}`;
  // Los cierres (`deps`) no viajan en el registrador, que está en la ruta crítica de cada página, ni se piden al cargar:
  // solo sirven para precargar de una vez lo que se pida DESPUÉS (cada página ya precarga su arranque desde el HTML).
  // Van compactos en `<prefijo>Loader.deps.json` (chunks del cierre de cada tag; la entrada es el `href` registrado) y
  // el registrador los pide con la primera interacción (`pointerover`, `keydown`, `touchstart`), antes de navegar, y
  // se los pasa al loader con `configure({ deps })`.
  const depsRegistro = `${opts.prefijo}Loader.deps.json`;
  const chunks: string[] = [];
  const indiceChunk = new Map<string, number>();
  const compacto: Record<string, number[]> = {};
  for (const t of Object.keys(pubTag).sort()) {
    const propios = deps.tags[t]!.filter((m) => esChunk(m));
    if (!propios.length) continue;
    compacto[t] = propios.map((m) => {
      if (!indiceChunk.has(m)) indiceChunk.set(m, chunks.push(m.slice(CARPETA_CHUNKS.length + 1, -EXT_MODULO.length)) - 1);
      return indiceChunk.get(m)!;
    });
  }
  writeFileSync(join(OUT, depsRegistro), `${JSON.stringify({ c: chunks, t: compacto })}\n`);
  const hrefDeps = mutable ? withAssetHash(depsRegistro, await hashFile(join(OUT, depsRegistro), depsRegistro)) : depsRegistro;
  const fuenteRegistrador = [
    'const L=globalThis.iswcLoader;',
    `if(!L)throw new Error("${opts.prefijo}Loader: falta iswcLoader (carga antes el loader del kit)");`,
    `const raiz=new URL("./",import.meta.url),c=${JSON.stringify(rutas)},u=i=>new URL(c[i],raiz).href;`,
    `L.registerApp({${pares.join(',')}},{installSheets:false});`,
    Object.keys(compacto).length
      ? `{let p=0;const d=()=>{if(p++)return;fetch(new URL(${JSON.stringify(hrefDeps)},raiz)).then(r=>r.ok?r.json():null).then(j=>{if(!j)return;const o={};for(const[t,a]of Object.entries(j.t))o[t]=a.map(i=>new URL("${CARPETA_CHUNKS}/"+j.c[i]+"${EXT_MODULO}",raiz).href);L.configure({deps:o})}).catch(()=>{})};if(typeof addEventListener==="function")for(const e of["pointerover","keydown","touchstart"])addEventListener(e,d,{once:true,passive:true});}`
      : '',
    ...iconos(deno.iswc?.host),
  ].join('');
  writeFileSync(join(OUT, registrador), (await transform(fuenteRegistrador, { minify: true, format: 'esm', target: 'es2022' })).code);
  archivos.push(registrador, 'deps.json', depsRegistro);
  if (mutable) {
    hashes[registrador] = await hashFile(join(OUT, registrador), registrador);
    writeFileSync(join(OUT, ASSET_HASHES_NAME), hashesJson(hashes));
    archivos.push(ASSET_HASHES_NAME);
  }
  writeFileSync(join(OUT, 'build-stamp.json'), JSON.stringify({
    build: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), lastbuild: Date.now(), gitCommit: git(raiz, 'rev-parse HEAD'), gitBranch: git(raiz, 'rev-parse --abbrev-ref HEAD'), kit: pin,
  }));
  archivos.push('build-stamp.json');

  // 7. HTML
  const salidas = new Map(Object.entries(metafile.outputs).map(([p, o]) => [barras(relative(OUT, resolve(raiz, p))), o]));
  const cierre = (rel: string) => cierreDe(metafile, rel, raiz, OUT);
  const tocados: string[] = [];
  for (const pagina of paginas) {
    const archivo = join(raiz, pagina.archivo);
    const texto = readFileSync(archivo, 'utf8');
    const ini = texto.indexOf(MARCA_INICIO);
    const fin = texto.indexOf(MARCA_FIN);
    if (ini < 0 || fin < ini) throw new Error(`construirApp: ${pagina.archivo} no tiene las marcas ${MARCA_INICIO} … ${MARCA_FIN}`);
    const fuera = texto.slice(0, ini) + texto.slice(fin);
    if (/<script[^>]*type\s*=\s*["']importmap["']/i.test(fuera)) throw new Error(`construirApp: ${pagina.archivo} trae un import map fuera del bloque (lo escribe el conversor)`);
    const baseDir = baseDelHtml(raiz, archivo, texto);
    const url = (rel: string) => {
      const r2 = barras(relative(baseDir, join(OUT, rel)));
      return r2.startsWith('.') ? r2 : `./${r2}`;
    };
    // Cierre de la app (entradas + chunks) y lo del kit que esos módulos importan por alias.
    const app = new Set<string>();
    for (const item of pagina.app ?? []) {
      const pub = pubTag[item] ?? (existsSync(join(raiz, item)) ? rutaPublicada(raiz, item) : null);
      if (!pub || !salidas.has(pub)) throw new Error(`construirApp: ${pagina.archivo}: «${item}» no es un tag ni una entrada de la app`);
      for (const m of cierre(pub)) app.add(m);
    }
    const kit = new Set<string>(depsKit.core['loader'] ?? ['core/loader.min.mjs']);
    for (const tag of pagina.kit ?? []) {
      if (enLote.has(tag)) continue;
      const c = depsKit.tags[tag];
      if (!c) throw new Error(`construirApp: ${pagina.archivo}: ${tag} no está en el deps.json del pin`);
      for (const m of c) kit.add(m);
    }
    for (const m of app) {
      for (const imp of salidas.get(m)?.imports ?? []) {
        if (!imp.external || imp.kind !== 'import-statement' || !imp.path.startsWith(cdn)) continue;
        const rel = imp.path.slice(cdn.length);
        const core = rel.match(/^core\/(.+)\.min\.mjs$/)?.[1];
        for (const k of (core && depsKit.core[core]) || [rel]) kit.add(k);
      }
    }
    const hojas = [...app].filter((m) => {
      const f = fuentePorSalida.get(m);
      return f && existsSync(join(OUT, m.replace(/\.min\.mjs$/, '.css'))) && !USA_ISWC_CSS.test(readFileSync(f, 'utf8'));
    });
    const zod = `${cdn}lib/zod.min.mjs`;
    const mapa = { imports: { [ALIAS_KIT]: cdn, zod, ...(opts.importMap ?? {}) } };
    const lineas = [
      `<script type="importmap">${JSON.stringify(mapa)}</script>`,
      ...(/^[0-9a-f]{40}$/.test(pin) ? [`<meta name="iswc-precargado" content="${pin}">`] : []),
      ...[...kit].sort().map((m) => `<link rel="modulepreload" href="${cdn}${m}">`),
      ...(kit.has('lib/zod.min.mjs') ? [] : [`<link rel="modulepreload" href="${zod}">`]),
      ...(opts.precargas ?? []).map((h) => `<link rel="modulepreload" href="${h}">`),
      ...(loteRel ? [`<link rel="modulepreload" href="${url(conV(loteRel))}">`] : []),
      ...[...app].sort().map((m) => `<link rel="modulepreload" href="${url(conV(m))}">`),
      ...hojas.sort().map((m) => `<link rel="preload" as="fetch" crossorigin href="${url(m.replace(/\.min\.mjs$/, '.css'))}">`),
      ...hojaNoBloqueante(`${cdn}is-base.min.css`),
      ...hojaNoBloqueante(`${cdn}palettes.min.css`),
      `<script type="module" src="${cdn}core/loader.min.mjs"></script>`,
      `<script type="module" src="${url(conV(registrador))}"></script>`,
    ];
    const sangria = texto.slice(texto.lastIndexOf('\n', ini) + 1, ini).match(/^[ \t]*/)?.[0] ?? '';
    const bloque = [MARCA_INICIO, ...lineas, MARCA_FIN].join(`\n${sangria}`);
    // Fuera del bloque: `?v=` en las referencias a <salida> (o se quita si no toca).
    const sellar = (u: string) => {
      if (!esRelativa(u)) return u;
      const abs = resolve(baseDir, u.split(/[?#]/)[0]!);
      const rel = barras(relative(OUT, abs));
      if (rel.startsWith('..') || isAbsolute(rel) || !existsSync(abs) || !statSync(abs).isFile()) return u;
      const limpio = sinSelloUrl(u);
      return hashes[rel] ? withAssetHash(limpio, hashes[rel]!) : limpio;
    };
    const nuevo = reescribirUrlsHtml(texto.slice(0, ini), sellar) + bloque + reescribirUrlsHtml(texto.slice(fin + MARCA_FIN.length), sellar);
    if (nuevo === texto) continue;
    writeFileSync(archivo, nuevo);
    tocados.push(pagina.archivo);
  }

  const informe: InformeBuild = {
    entradas: entradas.length + sueltas.length + planos.size,
    chunks: archivos.filter((a) => a.startsWith(`${CARPETA_CHUNKS}/`)).length,
    bytes,
    archivos: archivos.sort(),
    html: tocados,
    tags: [...Object.keys(pubTag), ...enLote].sort(),
    tagsSinMd: Object.entries(tags).filter(([, f]) => !existsSync(join(raiz, f).replace(/\.ts$/, '.md'))).map(([t]) => t).sort(),
    origenMutable: mutable,
  };
  console.log(`[construirApp] ${informe.entradas} entradas + ${informe.chunks} chunks · ${Math.round(bytes / 1024)} KB · ${registrador} · ${informe.tags.length} tags · ${tocados.length} HTML reescritos · ?v= ${mutable ? 'sí' : 'no'} · kit @${pin.slice(0, 12)}`);
  return informe;
}

/** Reconstruye al cambiar `src/` o `view/` (salvo vendor). `antes` corre antes de cada reconstrucción (p. ej. el SCSS). */
export async function vigilarApp(opts: ConstruirAppOpts, antes?: () => unknown): Promise<void> {
  const raiz = resolve(opts.raiz);
  let t: ReturnType<typeof setTimeout> | undefined;
  let corriendo = false;
  const rehacer = async () => {
    if (corriendo) return;
    corriendo = true;
    try {
      await antes?.();
      await construirApp(opts);
    } catch (e) {
      console.error('[watch]', e instanceof Error ? e.message : e);
    } finally {
      corriendo = false;
    }
  };
  for (const dir of ['src', 'view'].map((d) => join(raiz, d)).filter((d) => existsSync(d))) {
    watch(dir, { recursive: true }, (_e, f) => {
      if (!f || !/\.(?:ts|scss|json|md|html)$/.test(String(f)) || /vendor/.test(String(f))) return;
      clearTimeout(t);
      t = setTimeout(rehacer, 80);
    });
  }
  console.log('[watch] esperando cambios en src/ y view/…');
  await new Promise(() => {});
}

// CLI: `deno run -A <url>/construir-app.ts --config=build.json [--watch]` (raiz = carpeta del build.json salvo `raiz`).
if ((import.meta as { main?: boolean }).main) {
  const arg = process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length) ?? 'build.json';
  const config = resolve(arg);
  const opts = JSON.parse(readFileSync(config, 'utf8')) as ConstruirAppOpts;
  opts.raiz = resolve(dirname(config), opts.raiz ?? '.');
  await construirApp(opts);
  if (process.argv.includes('--watch')) await vigilarApp(opts);
  else await stop();
}
