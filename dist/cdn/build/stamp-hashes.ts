// @contexto INDICE.md · src/cdn/build/README.md
/**
 * Sella `?v=` en los import relativos y devuelve el mapa de hashes.
 * El hash es del archivo ya sellado, en orden de dependencias: si cambia
 * un hijo, cambia el hash del padre y el loader pide la URL nueva.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { hashBase, hashPorRuta } from './hash.ts';
import { lookupHash, withAssetHash } from './asset-url.ts';
import { ASSET_HASH_PARAM, ASSET_HASH_PARAM_LEGADO } from './asset-url.ts';

export const ASSET_HASHES_NAME = 'asset-hashes.json';

const REL_REF = /(["'])(\.\.?\/[^"'?#]+\.(?:min\.js|js|mjs|min\.css|css))(\?[^"']*)?\1/g;
const HASH_EXT = /\.(?:min\.js|js|mjs|css)$/i;

export function resolveRel(fromFile: string, spec: string): string {
  const clean = spec.split(/[?#]/)[0];
  const dir = posix.dirname(fromFile);
  return posix.normalize(posix.join(dir, clean)).replace(/^(\.\/)+/, '');
}

/**
 * Un chunk del build único (`_chunks/chunk-<hash>.mjs`) ya lleva en el nombre el hash de su contenido (y el de sus
 * imports): no se sella. Así la URL de un chunk es UNA y la misma para sus importadores y para el
 * `<link rel="modulepreload">` que el loader saca de `deps.json` (F4), sin depender de ningún mapa.
 */
export const esChunk = (ruta: string): boolean => /(?:^|\/)_chunks\//.test(ruta);

/** Un módulo ES (`.mjs`): con `sellarMjs: false` ni se sella por dentro ni se sella su URL (plan F7, tarea 0.2). */
const esMjs = (ruta: string): boolean => /\.mjs$/i.test(ruta);

function depsOf(from: string, text: string, known: Set<string>, sellarMjs = true): string[] {
  if (!sellarMjs && esMjs(from)) return [];
  REL_REF.lastIndex = 0;
  const found = new Set<string>();
  for (const m of text.matchAll(REL_REF)) {
    const target = resolveRel(from, m[2]);
    if (target !== from && known.has(target) && !esChunk(target) && (sellarMjs || !esMjs(target))) found.add(target);
  }
  return [...found];
}

/**
 * Módulos `.mjs` que otro archivo del conjunto importa por ruta relativa (estático o `import()`). Sin sello entre
 * módulos su URL es UNA (sin `?v=`) para todos: el loader, la galería y los HTML tampoco la sellan, o el navegador
 * evaluaría dos instancias (plan F7, tarea 0.2).
 */
export function mjsReferenciados(input: Record<string, string>): Set<string> {
  const known = new Set(Object.keys(input));
  const out = new Set<string>();
  for (const [from, text] of Object.entries(input)) {
    for (const m of text.matchAll(REL_REF)) {
      const target = resolveRel(from, m[2]);
      if (target !== from && known.has(target) && esMjs(target) && !esChunk(target)) out.add(target);
    }
  }
  return out;
}

function stampText(from: string, text: string, hashes: Map<string, string>, known: Set<string>, sellarMjs = true): string {
  if (!sellarMjs && esMjs(from)) return text;
  return text.replace(REL_REF, (whole, quote: string, spec: string, query?: string) => {
    const target = resolveRel(from, spec);
    if (!known.has(target)) return whole;
    if (esChunk(target) || (!sellarMjs && esMjs(target))) return query ? `${quote}${spec}${quote}` : whole;
    const hash = hashes.get(target);
    if (!hash) return whole;
    const next = withAssetHash(`${spec}${query || ''}`, hash);
    return `${quote}${next}${quote}`;
  });
}

/**
 * Sella un conjunto ruta → texto. Las rutas son relativas a la raiz del CDN
 * (`actions/button.min.mjs`). No toca el disco.
 */
export function stampHashTexts(input: Record<string, string>, opts: { sellarMjs?: boolean } = {}): { texts: Record<string, string>; hashes: Record<string, string> } {
  const sellarMjs = opts.sellarMjs !== false;
  const keys = Object.keys(input);
  const known = new Set(keys);
  const deps = new Map<string, string[]>();
  for (const key of keys) deps.set(key, depsOf(key, input[key], known, sellarMjs));

  const texts: Record<string, string> = { ...input };
  const hashes = new Map<string, string>();
  const pending = new Set(keys);
  let guard = keys.length + 1;
  while (pending.size && guard--) {
    const ready = [...pending].filter((k) => deps.get(k)!.every((d) => hashes.has(d)));
    if (!ready.length) break;
    for (const key of ready) {
      const text = stampText(key, texts[key], hashes, known, sellarMjs);
      texts[key] = text;
      hashes.set(key, hashPorRuta(key, text));
      pending.delete(key);
    }
  }
  if (pending.size) {
    // Ciclo de imports (y lo que depende de el): un hash de contenido no puede
    // ser autoconsistente dentro del ciclo. Recalcularlo tras sellar dejaba a
    // cada importador con un `?v=` distinto del mismo archivo, y el navegador
    // cargaba VARIAS instancias del modulo (estado duplicado, p. ej. la sesion).
    // Todo lo pendiente comparte un sello de grupo (su contenido sin `?v=`) y
    // cada archivo recibe uno fijo: la misma URL para todos sus importadores.
    const grupo = hashBase([...pending].sort().map((k) => `${k}\n${texts[k].replace(/[?&][vh]=[0-9a-z]+/gi, '')}`).join('\n--\n'));
    for (const key of pending) hashes.set(key, hashBase(`${grupo}:${key}`));
    for (const key of pending) texts[key] = stampText(key, texts[key], hashes, known, sellarMjs);
  }
  return { texts, hashes: Object.fromEntries(hashes) };
}

async function walkFiles(dir: string, rel: string, out: Record<string, string>, skip?: (rel: string) => boolean): Promise<void> {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    const childAbs = join(dir, e.name);
    if (e.isDirectory()) {
      await walkFiles(childAbs, childRel, out, skip);
      continue;
    }
    if (!HASH_EXT.test(e.name) || e.name.endsWith('.map')) continue;
    const key = childRel.replace(/\\/g, '/');
    if (skip?.(key)) continue;
    out[key] = await readFile(childAbs, 'utf8');
  }
}

/**
 * Lee el arbol, sella los .js/.css y escribe solo lo que cambio. Con `sellarMjs: false` (el `dist/cdn` del kit, F7)
 * ningún `.mjs` lleva `?v=` dentro ni hacia él: su hash solo va al mapa (`asset-hashes.json`, `deps/<cat>.json`).
 */
export async function stampDirectory(dir: string, skip?: (rel: string) => boolean, opts: { sellarMjs?: boolean } = {}): Promise<Record<string, string>> {
  const input: Record<string, string> = {};
  await walkFiles(dir, '', input, skip);
  const { texts, hashes } = stampHashTexts(input, opts);
  await Promise.all(Object.keys(texts).map(async (rel) => {
    if (texts[rel] === input[rel]) return;
    await writeFile(join(dir, ...rel.split('/')), texts[rel]);
  }));
  return hashes;
}

/** `mjsReferenciados` de un árbol en disco (rutas relativas a `dir`). */
export async function mjsReferenciadosEn(dir: string): Promise<Set<string>> {
  const input: Record<string, string> = {};
  await walkFiles(dir, '', input);
  return mjsReferenciados(input);
}

/** Hash de un archivo suelto; `clave` es su ruta publicada (como en `stampHashTexts`). */
export async function hashFile(abs: string, clave: string): Promise<string> {
  return hashPorRuta(clave, await readFile(abs, 'utf8'));
}

/** `url` sin los parámetros de sello (`v`, y el legado `h`); el resto de la query y el fragmento quedan. */
export function sinSelloUrl(url: string): string {
  const cut = url.indexOf('#');
  const frag = cut < 0 ? '' : url.slice(cut);
  const base = cut < 0 ? url : url.slice(0, cut);
  const q = base.indexOf('?');
  if (q < 0) return url;
  const params = new URLSearchParams(base.slice(q + 1));
  params.delete(ASSET_HASH_PARAM);
  params.delete(ASSET_HASH_PARAM_LEGADO);
  const resto = params.toString();
  return `${base.slice(0, q)}${resto ? `?${resto}` : ''}${frag}`;
}

/** ¿`url` apunta (ruta exacta o por sufijo, como `lookupHash`) a uno de `rutas`? */
function apuntaA(url: string, rutas: ReadonlySet<string>): boolean {
  const path = url.split(/[?#]/)[0].replace(/\\/g, '/').replace(/^\.\//, '');
  if (rutas.has(path)) return true;
  for (const r of rutas) if (path.endsWith('/' + r)) return true;
  return false;
}

/**
 * Reescribe href, src, import() y from de un HTML con el mapa ya cerrado. `sinSello`: rutas que no llevan `?v=` (los
 * `.mjs` que otro módulo importa por ruta relativa, plan F7 0.2): se les quita el que tengan de un build anterior, o
 * el HTML pediría una URL distinta de la de sus importadores y el navegador evaluaría dos instancias.
 */
export function applyHashToHtml(html: string, files: Record<string, string>, sinSello: Iterable<string> = []): string {
  const fuera = new Set(sinSello);
  const stamp = (url: string): string => {
    if (fuera.size && apuntaA(url, fuera)) return sinSelloUrl(url);
    const hash = lookupHash(files, url);
    return hash ? withAssetHash(url, hash) : url;
  };
  let out = html.replace(/(\s(?:href|src)\s*=\s*["'])([^"']+)(["'])/gi, (_w, a: string, url: string, b: string) => `${a}${stamp(url)}${b}`);
  out = out.replace(/(\bfrom\s*["'])([^"']+)(["'])/g, (_w, a: string, url: string, b: string) => `${a}${stamp(url)}${b}`);
  out = out.replace(/(\bimport\s*\(\s*["'])([^"']+)(["'])/g, (_w, a: string, url: string, b: string) => `${a}${stamp(url)}${b}`);
  return out;
}

export async function rewriteHtmlTree(dir: string, files: Record<string, string>, skipDir?: (name: string) => boolean, sinSello: Iterable<string> = []): Promise<number> {
  let n = 0;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return 0; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    if (skipDir?.(e.name)) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      n += await rewriteHtmlTree(abs, files, skipDir, sinSello);
      continue;
    }
    if (!e.name.endsWith('.html')) continue;
    const prev = await readFile(abs, 'utf8');
    const next = applyHashToHtml(prev, files, sinSello);
    if (next === prev) continue;
    await writeFile(abs, next);
    n += 1;
  }
  return n;
}

export function hashesJson(files: Record<string, string>): string {
  const ordered: Record<string, string> = {};
  for (const key of Object.keys(files).sort()) ordered[key] = files[key];
  // Minificado: este JSON viaja al navegador (lo pide el loader y la galería).
  return JSON.stringify({ v: 1, files: ordered });
}
