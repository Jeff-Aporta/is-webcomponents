// @contexto INDICE.md · scripts/README.md
// medir-carga.mjs — cascada de carga de una página en Edge headless (plan carga modular, F7).
//
//   deno task medir -- --url=<url|ruta> [--ready=<attr|selector>] [--cold|--warm] [--throttle] [--json=<ruta>]
//                      [--servir=<carpeta>] [--latencia=<ms>] [--lote=tag1,tag2] [--seo] [--corridas=<n>]
//                      [--espera=<ms>] [--resolver=<host>=<ip:puerto>,…] [--kit=<regex>]
//
//   --url        página a medir; con --servir, una ruta relativa a la carpeta servida (`/`, `/index.html`).
//   --ready      hito de «lista»: un atributo (`data-app-ready`, en <html> o en cualquier elemento) o un selector
//                (`iswc-doc-demo[data-ready="1"]`). Por defecto `data-app-ready`.
//   --cold       (por defecto) visita en frío, contexto nuevo sin caché. --warm añade la segunda visita en el mismo
//                contexto (caché HTTP caliente).
//   --throttle   3G rápido (80 ms, 1,5 Mbit/s) y CPU ×4.
//   --servir     sirve esa carpeta estática en un puerto libre (`max-age=600` + ETag, como Pages).
//   --latencia   retraso de cada respuesta del servidor propio (> 50 ms para que una cascada se vea como ráfagas).
//   --lote       página mínima contra `dist` del kit servido en un puerto libre: importa `cdn/core/loader.min.mjs`,
//                `load()` + `ensure()` de esos tags y marca `data-app-ready`.
//   --seo        checklist SEO del DOM final (title, description, canonical, lang, viewport, un h1, alt, texto de
//                enlaces, og:/twitter:, consola sin errores, tamaño del HTML, módulos con type=module), 0–100.
//   --corridas   repite la medición n veces (cada una con navegador nuevo) y resume con la mediana.
//   --espera     ms que se sigue observando tras el hito (LCP, CLS, long tasks, peticiones tardías). Def. 3000.
//   --resolver   `--host-resolver-rules` de Edge: `cdn.jsdelivr.net=127.0.0.1:4450` (servidores locales con TLS
//                autofirmado; se ignoran los errores de certificado).
//   --solo-local ningún host salvo localhost/127.0.0.1 resuelve (medición hermética; las fuentes externas fallan).
//   --kit        regex de las URLs que cuentan como módulos del kit (def. `is-webcomponents@…/dist/cdn/…js` y, con
//                --servir o --lote, `/dist/cdn/…js` y `/cdn/…js` del servidor propio).
//   --json       escribe el resumen (y cada corrida) en esa ruta.
//
// Mide: DCL, hito, peticiones (hasta el hito y totales), bytes transferidos y decodificados, ráfagas hasta el hito
// (algoritmo de tests/_shared/rafagas.ts), URLs y rutas duplicadas, errores de consola, `indexedDB.open` y
// `caches.open`, peticiones a api.github.com, módulos del kit; web vitals por PerformanceObserver (LCP, CLS, long
// tasks con TBT aproximado, INP si hubo interacción) y `Performance.getMetrics` por CDP (ScriptDuration,
// LayoutDuration, JSHeapUsedSize). Lighthouse no está en las dependencias del kit: no se usa (lo dice el resumen).
// Navegador: siempre Edge (`channel: 'msedge'`), nunca el Chrome del usuario. Documentado en specs/cdn.md §Medir.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { statSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { extname } from 'node:path';
import { join } from 'node:path';
import { normalize } from 'node:path';
import { resolve } from 'node:path';
import { sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { duplicadas } from '../tests/_shared/rafagas.ts';
import { rafagas } from '../tests/_shared/rafagas.ts';
import { rafagasEncadenadas } from '../tests/_shared/rafagas.ts';
import { rutasDuplicadas } from '../tests/_shared/rafagas.ts';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const KIT_PIN = 'is-webcomponents@[0-9a-f]{7,40}/dist/cdn/.+\\.m?js(?:[?#]|$)';
const UMBRAL_LONG_TASK = 50;

/** Opciones desde argv (`--clave=valor` o `--bandera`). */
function opcionesDeArgv(argv) {
  const o = {};
  for (const a of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a);
    if (m) o[m[1]] = m[2] ?? true;
  }
  return {
    url: o.url ?? null,
    ready: o.ready ?? 'data-app-ready',
    warm: !!o.warm,
    throttle: !!o.throttle,
    json: o.json ?? null,
    servir: o.servir ?? null,
    latencia: Number(o.latencia ?? 0),
    lote: o.lote ? String(o.lote).split(',').map((t) => t.trim()).filter(Boolean) : null,
    seo: !!o.seo,
    corridas: Math.max(1, Number(o.corridas ?? 1)),
    espera: Number(o.espera ?? 3000),
    resolver: o.resolver ? String(o.resolver).split(',').filter(Boolean) : [],
    kit: o.kit ?? null,
    soloLocal: !!o['solo-local'],
  };
}

/** Servidor estático en un puerto libre: `max-age=600` + ETag (como Pages), `latencia` ms por respuesta. */
export async function servirEstatico(raiz, { latencia = 0, extra = {} } = {}) {
  const base = resolve(raiz);
  const srv = createServer((req, res) => {
    const responder = () => {
      const u = new URL(req.url ?? '/', 'http://x');
      if (extra[u.pathname]) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(extra[u.pathname]);
        return;
      }
      let ruta = normalize(join(base, decodeURIComponent(u.pathname)));
      if (ruta !== base && !ruta.startsWith(base + sep)) { res.writeHead(403); res.end(); return; }
      try {
        if (statSync(ruta).isDirectory()) ruta = join(ruta, 'index.html');
        const cuerpo = readFileSync(ruta);
        const etag = `"${createHash('md5').update(cuerpo).digest('hex').slice(0, 16)}"`;
        if (req.headers['if-none-match'] === etag) { res.writeHead(304, { etag, 'cache-control': 'max-age=600' }); res.end(); return; }
        res.writeHead(200, { 'content-type': MIME[extname(ruta)] ?? 'application/octet-stream', etag, 'cache-control': 'max-age=600', 'access-control-allow-origin': '*' });
        res.end(cuerpo);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('404');
      }
    };
    if (latencia > 0) setTimeout(responder, latencia);
    else responder();
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const puerto = srv.address().port;
  return { origen: `http://127.0.0.1:${puerto}`, cerrar: () => new Promise((ok) => { srv.closeAllConnections?.(); srv.close(() => ok()); }) };
}

/** Página mínima del lote: loader del kit, `load()` + `ensure()` de cada tag y `data-app-ready`. */
function paginaLote(tags, loader = '/cdn/core/loader.min.mjs') {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>lote</title><link rel="icon" href="data:,"><body><script type="module">
import { iswcLoader as L } from '${loader}';
const lote = ${JSON.stringify(tags)};
window.__tLoad = performance.now();
await L.load(...lote);
await Promise.all(lote.map((t) => L.ensure(t)));
window.__definidos = lote.filter((t) => !customElements.get(t));
document.documentElement.setAttribute('data-app-ready', '');
</script></body></html>`;
}

/** Script de inicio: contadores de IndexedDB / Cache Storage, hito y web vitals por PerformanceObserver. */
function sondas(ready) {
  const w = window;
  w.__m = { idb: [], caches: 0, ready: null, lcp: null, cls: 0, longTasks: [], inp: null };
  const m = w.__m;
  try {
    const abrir = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...a) => { m.idb.push({ n: a[0], t: Math.round(performance.now()), antes: m.ready == null }); return abrir(...a); };
  } catch { /* sin IndexedDB */ }
  try {
    const abrir = caches.open.bind(caches);
    caches.open = (...a) => { m.caches++; return abrir(...a); };
  } catch { /* sin Cache Storage */ }
  const selector = /^[a-z][a-z0-9-]*$/i.test(ready) ? `[${ready}]` : ready;
  const listo = () => { try { return !!document.querySelector(selector); } catch { return false; } };
  const mirar = () => {
    if (m.ready == null && listo()) m.ready = performance.now();
  };
  new MutationObserver(mirar).observe(document, { subtree: true, childList: true, attributes: true });
  const observar = (tipo, fn) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type: tipo, buffered: true }); } catch { /* tipo no soportado */ } };
  observar('largest-contentful-paint', (e) => { m.lcp = e.startTime; });
  observar('layout-shift', (e) => { if (!e.hadRecentInput) m.cls += e.value; });
  observar('longtask', (e) => { m.longTasks.push({ t: e.startTime, d: e.duration }); });
  observar('event', (e) => { if (e.interactionId) m.inp = Math.max(m.inp ?? 0, e.duration); });
}

/** Checklist SEO del DOM final (se evalúa en la página; recorre también los shadow roots abiertos). */
function checklistSeo() {
  const todos = (sel) => {
    const out = [];
    const ver = (raiz) => {
      out.push(...raiz.querySelectorAll(sel));
      for (const el of raiz.querySelectorAll('*')) if (el.shadowRoot) ver(el.shadowRoot);
    };
    ver(document);
    return out;
  };
  const meta = (n) => document.head.querySelector(`meta[name="${n}"]`)?.getAttribute('content')?.trim() ?? '';
  const metaP = (p) => document.head.querySelector(`meta[property^="${p}"], meta[name^="${p}"]`);
  const h1 = todos('h1').length;
  const imgs = todos('img');
  const sinAlt = imgs.filter((i) => !i.hasAttribute('alt')).length;
  const enlaces = todos('a[href]');
  const sinTexto = enlaces.filter((a) => !(a.textContent ?? '').trim() && !a.getAttribute('aria-label') && !a.getAttribute('title') && !a.querySelector('img[alt]:not([alt=""])')).length;
  const scripts = [...document.querySelectorAll('script[src]')];
  const noModulo = scripts.filter((s) => s.type !== 'module' && /\.mjs(?:[?#]|$)/.test(s.src)).length;
  const descripcion = meta('description');
  return [
    { id: 'title', ok: !!document.title.trim() && document.title.trim().length <= 70, valor: document.title.trim() },
    { id: 'meta-description', ok: descripcion.length >= 50 && descripcion.length <= 160, valor: descripcion.length },
    { id: 'canonical', ok: !!document.head.querySelector('link[rel="canonical"][href]'), valor: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '' },
    { id: 'lang', ok: !!document.documentElement.lang, valor: document.documentElement.lang },
    { id: 'viewport', ok: /width=device-width/.test(meta('viewport')), valor: meta('viewport') },
    { id: 'h1-unico', ok: h1 === 1, valor: h1 },
    { id: 'img-alt', ok: sinAlt === 0, valor: `${sinAlt}/${imgs.length} sin alt` },
    { id: 'enlaces-con-texto', ok: sinTexto === 0, valor: `${sinTexto}/${enlaces.length} sin texto` },
    { id: 'og', ok: !!metaP('og:'), valor: !!metaP('og:') },
    { id: 'twitter', ok: !!metaP('twitter:'), valor: !!metaP('twitter:') },
    { id: 'modulos-type-module', ok: noModulo === 0, valor: `${noModulo} .mjs sin type=module` },
  ];
}

const mediana = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[(v.length - 1) >> 1] : null;
};

/** Una visita: navega, espera el hito y la ventana de observación, y resume. */
async function visita(ctx, page, cdp, url, op, etiqueta) {
  const peticiones = new Map();
  let t0 = null;
  const errores = [];
  const onSent = (e) => {
    if (t0 == null) t0 = e.timestamp;
    if (!peticiones.has(e.requestId)) peticiones.set(e.requestId, { url: e.request.url, tipo: e.type ?? '', inicio: (e.timestamp - t0) * 1000, fin: null, transferidos: 0, decodificados: 0, estado: null, cache: false });
  };
  const onResp = (e) => { const p = peticiones.get(e.requestId); if (p) { p.estado = e.response.status; p.cache = !!(e.response.fromDiskCache || e.response.fromServiceWorker); } };
  const onData = (e) => { const p = peticiones.get(e.requestId); if (p) p.decodificados += e.dataLength; };
  const onFin = (e) => { const p = peticiones.get(e.requestId); if (p) { p.fin = (e.timestamp - t0) * 1000; p.transferidos = e.encodedDataLength; } };
  const onCache = (e) => { const p = peticiones.get(e.requestId); if (p) p.cache = true; };
  cdp.on('Network.requestWillBeSent', onSent);
  cdp.on('Network.responseReceived', onResp);
  cdp.on('Network.dataReceived', onData);
  cdp.on('Network.loadingFinished', onFin);
  cdp.on('Network.requestServedFromCache', onCache);
  const onConsola = (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 200)); };
  const onError = (e) => errores.push(`pageerror: ${String(e.message ?? e).slice(0, 200)}`);
  page.on('console', onConsola);
  page.on('pageerror', onError);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    let ready = null;
    try {
      await page.waitForFunction(() => window.__m?.ready != null, null, { timeout: 30_000, polling: 50 });
      ready = await page.evaluate(() => window.__m.ready);
    } catch { ready = null; }
    await page.waitForTimeout(op.espera);
    const m = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
      return { ...window.__m, dcl: n ? n.domContentLoadedEventEnd : null, load: n ? n.loadEventEnd : null, fcp: fcp ? fcp.startTime : null, htmlBytes: n ? n.decodedBodySize : null, definidos: window.__definidos ?? null, tLoad: window.__tLoad ?? null, fetchStart: n ? n.fetchStart : 0 };
    });
    const metricas = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    const seo = op.seo ? await page.evaluate(checklistSeo) : null;
    const lista = [...peticiones.values()].filter((p) => !p.url.startsWith('data:'));
    const hasta = lista.filter((p) => ready == null || p.inicio <= ready);
    const kit = new RegExp(op.kit ?? KIT_PIN);
    const tbt = m.longTasks.reduce((s, x) => s + Math.max(0, x.d - UMBRAL_LONG_TASK), 0);
    const resumen = {
      etiqueta,
      dcl: m.dcl == null ? null : Math.round(m.dcl),
      fcp: m.fcp == null ? null : Math.round(m.fcp),
      ready: ready == null ? null : Math.round(ready),
      peticiones: lista.length,
      peticionesHastaReady: hasta.length,
      kbTransferidos: Math.round(lista.reduce((s, p) => s + p.transferidos, 0) / 1024),
      kbDecodificados: Math.round(lista.reduce((s, p) => s + p.decodificados, 0) / 1024),
      rafagas: rafagas(hasta.map((p) => ({ url: p.url, inicio: p.inicio, fin: p.fin }))).length,
      // Con --lote: solo la cascada que pidió `load()` (lo que el loader trajo al arrancar no cuenta; igual que
      // tests/navegador/loader-rafagas). El cero de las peticiones es la del documento (≈ fetchStart). Encadenadas:
      // un grupo que salió antes de que respondiera el anterior no es un nivel nuevo (rafagasEncadenadas).
      rafagasTrasLoad: m.tLoad == null ? null : rafagasEncadenadas(hasta.filter((p) => p.inicio >= m.tLoad - m.fetchStart)).length,
      rafagasTrasLoadBrutas: m.tLoad == null ? null : rafagas(hasta.filter((p) => p.inicio >= m.tLoad - m.fetchStart)).length,
      duplicadas: duplicadas(lista).length,
      rutasDuplicadas: rutasDuplicadas(lista).length,
      modulosKit: lista.filter((p) => kit.test(p.url)).length,
      js: lista.filter((p) => p.tipo === 'Script').length,
      github: lista.filter((p) => /^https:\/\/api\.github\.com\//.test(p.url)).length,
      idb: m.idb.length,
      idbAntesReady: m.idb.filter((x) => x.antes).length,
      caches: m.caches,
      errores: errores.length,
      lcp: m.lcp == null ? null : Math.round(m.lcp),
      cls: Math.round(m.cls * 1000) / 1000,
      longTasks: m.longTasks.length,
      tbt: Math.round(tbt),
      inp: m.inp == null ? null : Math.round(m.inp),
      scriptMs: Math.round((metricas.ScriptDuration ?? 0) * 1000),
      layoutMs: Math.round((metricas.LayoutDuration ?? 0) * 1000),
      heapMb: Math.round((metricas.JSHeapUsedSize ?? 0) / 1048576 * 10) / 10,
      htmlKb: m.htmlBytes == null ? null : Math.round(m.htmlBytes / 102.4) / 10,
      sinDefinir: m.definidos,
    };
    if (seo) {
      seo.push({ id: 'consola-sin-errores', ok: errores.length === 0, valor: errores.length });
      seo.push({ id: 'html-ligero', ok: (m.htmlBytes ?? 0) <= 100 * 1024, valor: resumen.htmlKb });
      resumen.seo = Math.round(100 * seo.filter((c) => c.ok).length / seo.length);
      resumen.seoFallos = seo.filter((c) => !c.ok).map((c) => `${c.id} (${c.valor})`);
    }
    const fallidas = lista.filter((p) => (p.estado ?? 0) >= 400).map((p) => `${p.estado} ${p.url}`);
    resumen.fallidas = fallidas.length;
    return { resumen, detalle: { errores, fallidas, duplicadas: duplicadas(lista), rutasDuplicadas: rutasDuplicadas(lista), peticiones: lista, tLoad: m.tLoad == null ? null : m.tLoad - m.fetchStart } };
  } finally {
    cdp.off('Network.requestWillBeSent', onSent);
    cdp.off('Network.responseReceived', onResp);
    cdp.off('Network.dataReceived', onData);
    cdp.off('Network.loadingFinished', onFin);
    cdp.off('Network.requestServedFromCache', onCache);
    page.off('console', onConsola);
    page.off('pageerror', onError);
  }
}

/** Una corrida: navegador nuevo, visita fría y (con `warm`) la caliente. */
async function corrida(url, op) {
  const args = [];
  const reglas = op.resolver.map((r) => `MAP ${r.replace('=', ' ')}`);
  // --solo-local: todo host que no sea el propio no resuelve (fuentes de Google, CDN): medición hermética.
  if (op.soloLocal) reglas.push('MAP * ~NOTFOUND', 'EXCLUDE localhost', 'EXCLUDE 127.0.0.1');
  if (reglas.length) args.push(`--host-resolver-rules=${reglas.join(', ')}`);
  if (op.resolver.length) args.push('--ignore-certificate-errors');
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args });
  try {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    await ctx.addInitScript(sondas, op.ready);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Performance.enable');
    if (op.throttle) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 1.5e6 / 8, uploadThroughput: 750e3 / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const out = [await visita(ctx, page, cdp, url, op, op.throttle ? 'frio-3g' : 'frio')];
    if (op.warm) out.push(await visita(ctx, page, cdp, url, op, op.throttle ? 'caliente-3g' : 'caliente'));
    return out;
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise((ok) => setTimeout(ok, 5000))]);
  }
}

/** Mide según `op` (ver la cabecera). Devuelve `{ url, opciones, resumen: { <etiqueta>: medianas }, corridas }`. */
export async function medirCarga(op) {
  let servidor = null;
  let url = op.url;
  try {
    if (op.lote) {
      servidor = await servirEstatico(join(RAIZ, 'dist'), { latencia: op.latencia, extra: { '/__lote.html': paginaLote(op.lote) } });
      url = `${servidor.origen}/__lote.html`;
      op = { ...op, ready: 'data-app-ready', kit: op.kit ?? '/cdn/.+\\.m?js(?:[?#]|$)' };
    } else if (op.servir) {
      servidor = await servirEstatico(op.servir, { latencia: op.latencia });
      url = new URL(op.url ?? '/', servidor.origen).href;
      op = { ...op, kit: op.kit ?? `${KIT_PIN}|/dist/cdn/.+\\.m?js(?:[?#]|$)` };
    }
    if (!url) throw new Error('medir-carga: falta --url (o --lote)');
    const corridas = [];
    for (let i = 0; i < op.corridas; i++) corridas.push(await corrida(url, op));
    const resumen = {};
    for (const etiqueta of new Set(corridas.flat().map((v) => v.resumen.etiqueta))) {
      const vs = corridas.flat().filter((v) => v.resumen.etiqueta === etiqueta).map((v) => v.resumen);
      const r = { n: vs.length };
      for (const k of Object.keys(vs[0])) {
        if (k === 'etiqueta') continue;
        r[k] = typeof vs[0][k] === 'number' || vs[0][k] === null ? mediana(vs.map((v) => v[k])) : vs[vs.length - 1][k];
      }
      r.readys = vs.map((v) => v.ready);
      resumen[etiqueta] = r;
    }
    return { url, opciones: { ...op, url }, lighthouse: 'no disponible (lighthouse no está en las dependencias del kit)', resumen, corridas: corridas.map((c) => c.map((v) => ({ ...v.resumen, detalle: { errores: v.detalle.errores, fallidas: v.detalle.fallidas, duplicadas: v.detalle.duplicadas, rutasDuplicadas: v.detalle.rutasDuplicadas, ...(op.conPeticiones ? { peticiones: v.detalle.peticiones, tLoad: v.detalle.tLoad } : {}) } }))) };
  } finally {
    await servidor?.cerrar();
  }
}

if (import.meta.main ?? (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  const op = opcionesDeArgv(process.argv.slice(2));
  const r = await medirCarga(op);
  for (const [etiqueta, v] of Object.entries(r.resumen)) {
    console.log(`\n== ${etiqueta} · ${r.url} · n=${v.n} (mediana)`);
    console.log(`  ready ${v.ready} ms [${v.readys.join('/')}] · DCL ${v.dcl} · FCP ${v.fcp} · LCP ${v.lcp} · CLS ${v.cls} · long tasks ${v.longTasks} (TBT ≈ ${v.tbt} ms) · INP ${v.inp}`);
    console.log(`  peticiones ${v.peticiones} (${v.peticionesHastaReady} hasta el hito) · ${v.kbTransferidos} KB transferidos / ${v.kbDecodificados} KB · ráfagas ${v.rafagas}${v.rafagasTrasLoad == null ? '' : ` (${v.rafagasTrasLoad} encadenadas tras load(), ${v.rafagasTrasLoadBrutas} por hueco)`} · módulos del kit ${v.modulosKit} · JS ${v.js}`);
    console.log(`  duplicadas ${v.duplicadas} (rutas ${v.rutasDuplicadas}) · IndexedDB ${v.idb} (${v.idbAntesReady} antes del hito) · caches ${v.caches} · api.github ${v.github} · errores ${v.errores} · respuestas ≥ 400 ${v.fallidas}`);
    console.log(`  CDP: script ${v.scriptMs} ms · layout ${v.layoutMs} ms · heap ${v.heapMb} MB · HTML ${v.htmlKb} KB${v.seo == null ? '' : ` · SEO ${v.seo}/100${v.seoFallos.length ? ` (falla: ${v.seoFallos.join(', ')})` : ''}`}`);
  }
  if (op.json) writeFileSync(resolve(op.json), JSON.stringify(r, null, 1) + '\n', 'utf8');
}
