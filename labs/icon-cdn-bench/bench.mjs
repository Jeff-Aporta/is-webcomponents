// bench.mjs — benchmark de raíces de carga de íconos SVG (corre igual en Deno y en el navegador).
//
// Mide cuánto tarda en llegar un LOTE de íconos desde cada origen candidato, con la concurrencia
// que tendría una página (varias peticiones en vuelo), en dos pasadas:
//   fría  → URL con `?b=<nonce>`: obliga a que el borde del CDN vaya al origen (peor caso real:
//           el primer visitante tras publicar un SHA nuevo).
//   tibia → URL limpia, segunda vez: lo que ve el resto de visitantes (borde del CDN caliente).
// La caché del cliente se esquiva siempre (`cache: 'no-store'`): se mide la red, no el disco.

/** @typedef {{ id: string, nombre: string, url: (set: string, n: string) => string, lote?: (set: string, ns: string[]) => string, loteTam?: number }} Origen */

/** @param {{ owner: string, repo: string, sha: string, pages: string }} o @returns {Origen[]} */
export function origenes({ owner, repo, sha, pages }) {
  const ruta = (set, n) => `dist/assets/icons/${set}/${n}.svg`;
  return [
    { id: 'pages', nombre: 'GitHub Pages (web estática)', url: (s, n) => `${pages}${ruta(s, n)}` },
    { id: 'jsdelivr', nombre: 'jsDelivr @SHA', url: (s, n) => `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${sha}/${ruta(s, n)}` },
    { id: 'githack', nombre: 'rawcdn.githack @SHA', url: (s, n) => `https://rawcdn.githack.com/${owner}/${repo}/${sha}/${ruta(s, n)}` },
    { id: 'raw', nombre: 'raw.githubusercontent @SHA', url: (s, n) => `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${ruta(s, n)}` },
    { id: 'api', nombre: 'API Iconify (SVG suelto)', url: (s, n) => `https://api.iconify.design/${s}/${n}.svg` },
    {
      id: 'api-lote', nombre: 'API Iconify (JSON en lote de 80)', url: (s, n) => `https://api.iconify.design/${s}.json?icons=${n}`,
      lote: (s, ns) => `https://api.iconify.design/${s}.json?icons=${ns.join(',')}`,
    },
    {
      // Proxy de «un JSON por app con todos sus SVG»: un solo archivo estático de ~130 KB en Pages
      // (el índice del set, del tamaño de ~300 cuerpos SVG).
      id: 'pages-json', nombre: 'Pages: 1 JSON con todo el lote (proxy)', url: (s) => `${pages}dist/assets/icons/${s}.json`,
      lote: (s) => `${pages}dist/assets/icons/${s}.json`, loteTam: Infinity,
    },
  ];
}

const pct = (xs, p) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return Math.round(o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))]);
};

/** Corre `fn` sobre `items` con `n` en vuelo. */
async function enVuelo(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

/**
 * Una pasada: pide `nombres` (del set) a un origen y devuelve tiempos.
 * @returns {Promise<{ total: number, ok: number, err: number, estados: Record<string, number>, p50: number|null, p95: number|null, bytes: number, peticiones: number }>}
 */
export async function pasada(origen, set, nombres, { concurrencia = 6, nonce = '', timeoutMs = 20000 } = {}) {
  const urls = origen.lote
    ? Array.from({ length: Math.max(1, Math.ceil(nombres.length / (origen.loteTam ?? 80))) }, (_, i) => origen.lote(set, nombres.slice(i * 80, i * 80 + 80)))
    : nombres.map((n) => origen.url(set, n));
  const tiempos = [];
  const estados = {};
  let ok = 0, err = 0, bytes = 0;
  const t0 = performance.now();
  await enVuelo(urls, concurrencia, async (u) => {
    const url = nonce ? `${u}${u.includes('?') ? '&' : '?'}b=${nonce}` : u;
    const ini = performance.now();
    const ctl = new AbortController();
    const reloj = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
      const txt = await r.text();
      estados[r.status] = (estados[r.status] || 0) + 1;
      if (r.ok && (txt.includes('<svg') || txt.includes('"icons"'))) { ok++; bytes += txt.length; } else err++;
    } catch (e) {
      estados[e?.name === 'AbortError' ? 'timeout' : 'red'] = (estados[e?.name === 'AbortError' ? 'timeout' : 'red'] || 0) + 1;
      err++;
    } finally {
      clearTimeout(reloj);
      tiempos.push(performance.now() - ini);
    }
  });
  return { total: Math.round(performance.now() - t0), ok, err, estados, p50: pct(tiempos, 50), p95: pct(tiempos, 95), bytes, peticiones: urls.length };
}

/**
 * Benchmark completo: por cada tamaño de lote y origen, pasada fría y tibia.
 * Cada tamaño usa nombres DISTINTOS (no se reaprovecha el borde caliente de otro tamaño).
 * @param {{ origenes: Origen[], set: string, nombres: string[], lotes: number[], concurrencia?: number, alAvanzar?: (fila: object) => void }} o
 */
export async function correr({ origenes, set, nombres, lotes, concurrencia = 6, alAvanzar = () => {} }) {
  const filas = [];
  let desde = 0;
  for (const tam of lotes) {
    const grupo = nombres.slice(desde, desde + tam);
    desde += tam;
    if (grupo.length < tam) break;
    for (const o of origenes) {
      const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const fria = await pasada(o, set, grupo, { concurrencia, nonce });
      const tibia = await pasada(o, set, grupo, { concurrencia });
      const fila = { lote: tam, origen: o.id, nombre: o.nombre, fria, tibia };
      filas.push(fila);
      alAvanzar(fila);
    }
  }
  return filas;
}

/** Tabla markdown de resultados. */
export function tabla(filas) {
  const c = (p) => (p.err ? `${p.total} ms (${p.ok}/${p.ok + p.err} ok · ${Object.entries(p.estados).filter(([k]) => k !== '200').map(([k, v]) => `${k}×${v}`).join(' ')})` : `${p.total} ms`);
  const out = ['| Lote | Origen | Fría total | Fría p50/p95 | Tibia total | Tibia p50/p95 | Peticiones |', '| ---: | --- | ---: | ---: | ---: | ---: | ---: |'];
  for (const f of filas) {
    out.push(`| ${f.lote} | ${f.nombre} | ${c(f.fria)} | ${f.fria.p50}/${f.fria.p95} | ${c(f.tibia)} | ${f.tibia.p50}/${f.tibia.p95} | ${f.fria.peticiones} |`);
  }
  return out.join('\n');
}
