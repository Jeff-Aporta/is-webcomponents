// @contexto INDICE.md · tests/navegador/README.md
/**
 * loader-rafagas.test.ts — precarga del cierre y arranque sin IndexedDB (plan carga modular D7, fase F4).
 *
 * Sirve `dist/cdn` estático (con `page.route`, latencia fija mayor que el umbral de ráfaga) a una página mínima que
 * importa `core/loader.min.mjs` y pide `load('iswc-app-shell', 'iswc-button', 'iswc-dialog', 'iswc-icon')`. En Edge
 * headless (nunca el Chrome del usuario), en frío y por dos orígenes:
 *
 *   - `self` (mutable, como Pages o una carpeta local): el loader espera `deps/<cat>.json` y lo precarga todo junto;
 *   - pin SHA de jsDelivr (inmutable, como las apps): `deps/<cat>.json` va en paralelo con el primer `import()`;
 *   - pin SHA con el cierre ya precargado en el HTML (`<link rel=modulepreload>` + `<meta name="iswc-precargado">`,
 *     lo que emite el build de una app, F7 0.1): el loader no pide ningún `deps`.
 *
 * Afirma, por cada origen: el cierre del lote (de `deps/<cat>.json`) llega entero y en ≤ 2 ráfagas; ninguna URL se pide
 * dos veces (ni la misma ruta con dos `?v=`); el índice `deps.json` (grafo entero hasta F7) nunca se pide; cero
 * peticiones a `api.github.com`; y cero `indexedDB.open` / `caches.open` hasta `data-app-ready` (is-base va por
 * `<link>`, sin fetch ni IndexedDB). Las ráfagas salen del reloj: se mide hasta 3 veces y vale la primera que cumple
 * (el tope no cambia); lo demás se exige en cada medida.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { REPO_GITHUB } from '../../src/core/cdn-ref.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { cerrarChromium } from '../_shared/navegador.ts';
import { duplicadas, rafagasEncadenadas, rutasDuplicadas, type Peticion } from '../_shared/rafagas.ts';
import { leerDeps as grafo } from '../_shared/deps.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const DIST = join(RAIZ, 'dist', 'cdn');
const LOTE = ['iswc-app-shell', 'iswc-button', 'iswc-dialog', 'iswc-icon'];
/** Latencia de cada respuesta: mayor que el umbral de ráfaga (50 ms) para que una cascada se vea como tal. */
const LATENCIA_MS = 120;
const MAX_RAFAGAS = 2;
const ORIGEN = 'http://iswc-rafagas.test';
const MIME: Record<string, string> = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

type Medida = { peticiones: Peticion[]; cierre: Set<string>; base: string; idb: number; caches: number; github: number; definidos: boolean[]; errores: string[]; tLoad: number };

const leerDeps = () => grafo(DIST)!;

async function medir(browser: Browser, base: string, precargaHtml = false): Promise<Medida> {
  const deps = leerDeps();
  const cierre = new Set(LOTE.flatMap((t) => deps.tags[t] ?? []));
  // Lo que emite el build de una app: el cierre del lote por `modulepreload` y la marca con el pin de la precarga.
  const cabeza = precargaHtml
    ? `<meta name="iswc-precargado" content="${deps.sha}">${[...cierre].map((r) => `<link rel="modulepreload" href="${base}${r}">`).join('')}`
    : '';
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    const w = window as unknown as Record<string, number>;
    w.__idb = 0;
    w.__caches = 0;
    try {
      const abrir = indexedDB.open.bind(indexedDB);
      indexedDB.open = ((...a: Parameters<IDBFactory['open']>) => { w.__idb++; return abrir(...a); }) as IDBFactory['open'];
    } catch { /* sin IndexedDB */ }
    try {
      const abrir = caches.open.bind(caches);
      caches.open = ((...a: Parameters<CacheStorage['open']>) => { w.__caches++; return abrir(...a); }) as CacheStorage['open'];
    } catch { /* sin Cache Storage */ }
  });
  let github = 0;
  await ctx.route('https://api.github.com/**', (r) => { github++; return r.abort(); });
  await ctx.route(`${base}**`, async (r) => {
    const ruta = r.request().url().slice(base.length).split(/[?#]/)[0]!;
    const archivo = join(DIST, ...ruta.split('/'));
    await new Promise((ok) => setTimeout(ok, LATENCIA_MS));
    if (!ruta || !existsSync(archivo)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ body: readFileSync(archivo), headers: { 'content-type': MIME[extname(archivo)] ?? 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  await ctx.route(`${ORIGEN}/`, (r) => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><title>ráfagas</title>${cabeza}<script type="module">
import { iswcLoader as L } from '${base}core/loader.min.mjs';
const lote = ${JSON.stringify(LOTE)};
window.__tLoad = Date.now();
await L.load(...lote);
await Promise.all(lote.map((t) => L.ensure(t)));
window.__definidos = lote.map((t) => !!customElements.get(t));
document.documentElement.setAttribute('data-app-ready', '');
</script>`,
  }));
  const page = await ctx.newPage();
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  const peticiones: Peticion[] = [];
  // Tiempos absolutos (mismo reloj que `Date.now()` de la página): así se comparan con el instante del `load()`.
  page.on('request', (r) => { if (r.url().startsWith(base)) peticiones.push({ url: r.url(), inicio: Date.now(), fin: null }); });
  page.on('requestfinished', (r) => {
    const p = peticiones.find((x) => x.url === r.url() && x.fin == null);
    if (p) p.fin = Date.now();
  });
  try {
    await page.goto(`${ORIGEN}/`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-app-ready'), null, { timeout: 30_000 });
    const [idb, cachesN, definidos, tLoad] = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      return [w.__idb as number, w.__caches as number, w.__definidos as boolean[], w.__tLoad as number];
    });
    return { peticiones, cierre, base, idb, caches: cachesN, github, definidos, errores, tLoad };
  } finally {
    await ctx.close();
  }
}

/** Medidas como máximo por origen: las ráfagas salen del reloj y con el equipo cargado un nivel puede verse partido. */
const MEDIDAS = 3;

/**
 * Mide hasta `MEDIDAS` veces (contexto nuevo cada una) y se queda con la primera cuyo cierre llegue en ≤ `MAX_RAFAGAS`.
 * Todo lo que no depende del reloj (deps pedidos, cierre entero, duplicados, IndexedDB, Cache Storage, GitHub, errores,
 * tags definidos) se exige en CADA medida; el tope de ráfagas no cambia: si ninguna lo cumple, rojo con la mejor.
 */
async function medirYAfirmar(browser: Browser, base: string, origen: string, precargaHtml = false): Promise<void> {
  let mejor: { n: number; detalle: string } | null = null;
  for (let i = 1; i <= MEDIDAS; i++) {
    const r = afirmar(await medir(browser, base, precargaHtml), `${origen} (medida ${i})`, precargaHtml);
    if (r.n <= MAX_RAFAGAS) return;
    if (!mejor || r.n < mejor.n) mejor = r;
  }
  assert.fail(`${origen}: el cierre llegó en ${mejor!.n} ráfagas (> ${MAX_RAFAGAS}) en la mejor de ${MEDIDAS} medidas:\n${mejor!.detalle}`);
}

function afirmar(m: Medida, origen: string, sinDeps = false): { n: number; detalle: string } {
  const rel = (p: Peticion) => p.url.slice(m.base.length).split(/[?#]/)[0]!;
  const pedidasDeps = m.peticiones.map(rel).filter((r) => r === 'deps.json' || r.startsWith('deps/'));
  assert.ok(!pedidasDeps.includes('deps.json'), `${origen}: el loader pidió el índice deps.json (solo necesita deps/<cat>.json)`);
  if (sinDeps) assert.deepEqual(pedidasDeps, [], `${origen}: con el cierre precargado en el HTML no se pide ningún deps`);
  else assert.ok(pedidasDeps.length >= 1, `${origen}: sin precarga en el HTML el loader debe pedir deps/<cat>.json`);
  const delCierre = m.peticiones.filter((p) => m.cierre.has(rel(p)));
  // La cascada del lote: lo que el `load()` pidió. Los chunks que el loader ya trajo al arrancar (comparten
  // `iswc-storage`, `asset-url`, el runtime de esbuild) están en el cierre pero no forman parte de ella.
  // Encadenadas: un grupo que salió antes de que respondiera el anterior no es un nivel de la cascada (el loader puede
  // inyectar los `modulepreload` escalonados con el equipo cargado; F7b).
  const grupos = rafagasEncadenadas(delCierre.filter((p) => p.inicio >= m.tLoad));
  console.log(`  ${origen}: ${m.peticiones.length} peticiones · cierre ${delCierre.length}/${m.cierre.size} · tras load() en ${grupos.length} ráfaga(s) [${grupos.map((g) => g.length).join(', ')}] · idb ${m.idb} · caches ${m.caches} · github ${m.github}`);
  assert.deepEqual(m.errores, [], `${origen}: errores en la página: ${m.errores.join(' | ')}`);
  assert.deepEqual(m.definidos, LOTE.map(() => true), `${origen}: el lote quedó definido`);
  const faltan = [...m.cierre].filter((r) => !delCierre.some((p) => rel(p) === r));
  assert.deepEqual(faltan, [], `${origen}: módulos del cierre que no se pidieron`);
  assert.deepEqual(duplicadas(m.peticiones), [], `${origen}: URLs pedidas dos veces`);
  assert.deepEqual(rutasDuplicadas(m.peticiones), [], `${origen}: misma ruta con dos URLs (dos instancias del módulo)`);
  assert.equal(m.github, 0, `${origen}: peticiones a api.github.com`);
  assert.equal(m.idb, 0, `${origen}: indexedDB.open antes de data-app-ready`);
  assert.equal(m.caches, 0, `${origen}: caches.open antes de data-app-ready`);
  // Las ráfagas las decide `medirYAfirmar` (dependen del reloj): aquí solo se devuelven.
  return { n: grupos.length, detalle: grupos.map((g, i) => `  r${i + 1} t=${g[0]!.inicio - m.tLoad}:${g.map(rel).join(' ')}`).join('\n') };
}

test('navegador/loader-rafagas: origen self (mutable) — cierre en ≤ 2 ráfagas, sin duplicados, sin IndexedDB', { timeout: 240_000 }, async () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    await medirYAfirmar(browser, `${ORIGEN}/dist/cdn/`, 'self');
  } finally {
    await cerrarChromium(browser);
  }
});

test('navegador/loader-rafagas: pin SHA de jsDelivr (inmutable) — cierre en ≤ 2 ráfagas, sin duplicados, sin IndexedDB', { timeout: 240_000 }, async () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const { sha } = leerDeps();
  if (!/^[0-9a-f]{40}$/.test(sha)) return;
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    await medirYAfirmar(browser, `https://cdn.jsdelivr.net/gh/${REPO_GITHUB}@${sha}/dist/cdn/`, 'pin');
  } finally {
    await cerrarChromium(browser);
  }
});

test('navegador/loader-rafagas: pin SHA con el cierre precargado en el HTML — ningún deps, ≤ 2 ráfagas, sin duplicados', { timeout: 240_000 }, async () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const { sha } = leerDeps();
  if (!/^[0-9a-f]{40}$/.test(sha)) return;
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    await medirYAfirmar(browser, `https://cdn.jsdelivr.net/gh/${REPO_GITHUB}@${sha}/dist/cdn/`, 'pin+precarga', true);
  } finally {
    await cerrarChromium(browser);
  }
});

export default lista();
