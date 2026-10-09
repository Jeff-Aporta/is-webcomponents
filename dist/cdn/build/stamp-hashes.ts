/**
 * Sella `?h=` en los import relativos y devuelve el mapa de hashes.
 * El hash es del archivo ya sellado, en orden de dependencias: si cambia
 * un hijo, cambia el hash del padre y el loader pide la URL nueva.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { contentHash } from './content-hash.js';
import { lookupHash, withAssetHash } from './asset-url.js';

export const ASSET_HASHES_NAME = 'asset-hashes.json';

const REL_REF = /(["'])(\.\.?\/[^"'?#]+\.(?:min\.js|js|mjs|min\.css|css))(\?[^"']*)?\1/g;
const HASH_EXT = /\.(?:min\.js|js|mjs|css)$/i;

export function resolveRel(fromFile: string, spec: string): string {
  const clean = spec.split(/[?#]/)[0];
  const dir = posix.dirname(fromFile);
  return posix.normalize(posix.join(dir, clean)).replace(/^(\.\/)+/, '');
}

function depsOf(from: string, text: string, known: Set<string>): string[] {
  REL_REF.lastIndex = 0;
  const found = new Set<string>();
  for (const m of text.matchAll(REL_REF)) {
    const target = resolveRel(from, m[2]);
    if (target !== from && known.has(target)) found.add(target);
  }
  return [...found];
}

function stampText(from: string, text: string, hashes: Map<string, string>, known: Set<string>): string {
  return text.replace(REL_REF, (whole, quote: string, spec: string, query?: string) => {
    const target = resolveRel(from, spec);
    if (!known.has(target)) return whole;
    const hash = hashes.get(target);
    if (!hash) return whole;
    const next = withAssetHash(`${spec}${query || ''}`, hash);
    return `${quote}${next}${quote}`;
  });
}

/**
 * Sella un conjunto ruta → texto. Las rutas son relativas a la raiz del CDN
 * (`actions/button.min.js`). No toca el disco.
 */
export function stampHashTexts(input: Record<string, string>): { texts: Record<string, string>; hashes: Record<string, string> } {
  const keys = Object.keys(input);
  const known = new Set(keys);
  const deps = new Map<string, string[]>();
  for (const key of keys) deps.set(key, depsOf(key, input[key], known));

  const texts: Record<string, string> = { ...input };
  const hashes = new Map<string, string>();
  const pending = new Set(keys);
  let guard = keys.length + 1;
  while (pending.size && guard--) {
    const ready = [...pending].filter((k) => deps.get(k)!.every((d) => hashes.has(d)));
    if (!ready.length) break;
    for (const key of ready) {
      const text = stampText(key, texts[key], hashes, known);
      texts[key] = text;
      hashes.set(key, contentHash(text));
      pending.delete(key);
    }
  }
  if (pending.size) {
    // Ciclo de imports (y lo que depende de el): un hash de contenido no puede
    // ser autoconsistente dentro del ciclo. Recalcularlo tras sellar dejaba a
    // cada importador con un `?h=` distinto del mismo archivo, y el navegador
    // cargaba VARIAS instancias del modulo (estado duplicado, p. ej. la sesion).
    // Todo lo pendiente comparte un sello de grupo (su contenido sin `?h=`) y
    // cada archivo recibe uno fijo: la misma URL para todos sus importadores.
    const grupo = contentHash([...pending].sort().map((k) => `${k}\n${texts[k].replace(/\?h=[0-9a-z]+/gi, '')}`).join('\n--\n'));
    for (const key of pending) hashes.set(key, contentHash(`${grupo}:${key}`));
    for (const key of pending) texts[key] = stampText(key, texts[key], hashes, known);
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

/** Lee el arbol, sella los .js/.css y escribe solo lo que cambio. */
export async function stampDirectory(dir: string, skip?: (rel: string) => boolean): Promise<Record<string, string>> {
  const input: Record<string, string> = {};
  await walkFiles(dir, '', input, skip);
  const { texts, hashes } = stampHashTexts(input);
  await Promise.all(Object.keys(texts).map(async (rel) => {
    if (texts[rel] === input[rel]) return;
    await writeFile(join(dir, ...rel.split('/')), texts[rel]);
  }));
  return hashes;
}

export async function hashFile(abs: string): Promise<string> {
  return contentHash(await readFile(abs));
}

/** Reescribe href, src, import() y from de un HTML con el mapa ya cerrado. */
export function applyHashToHtml(html: string, files: Record<string, string>): string {
  const stamp = (url: string): string => {
    const hash = lookupHash(files, url);
    return hash ? withAssetHash(url, hash) : url;
  };
  let out = html.replace(/(\s(?:href|src)\s*=\s*["'])([^"']+)(["'])/gi, (_w, a: string, url: string, b: string) => `${a}${stamp(url)}${b}`);
  out = out.replace(/(\bfrom\s*["'])([^"']+)(["'])/g, (_w, a: string, url: string, b: string) => `${a}${stamp(url)}${b}`);
  out = out.replace(/(\bimport\s*\(\s*["'])([^"']+)(["'])/g, (_w, a: string, url: string, b: string) => `${a}${stamp(url)}${b}`);
  return out;
}

export async function rewriteHtmlTree(dir: string, files: Record<string, string>, skipDir?: (name: string) => boolean): Promise<number> {
  let n = 0;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return 0; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    if (skipDir?.(e.name)) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      n += await rewriteHtmlTree(abs, files);
      continue;
    }
    if (!e.name.endsWith('.html')) continue;
    const prev = await readFile(abs, 'utf8');
    const next = applyHashToHtml(prev, files);
    if (next === prev) continue;
    await writeFile(abs, next);
    n += 1;
  }
  return n;
}

export function hashesJson(files: Record<string, string>): string {
  const ordered: Record<string, string> = {};
  for (const key of Object.keys(files).sort()) ordered[key] = files[key];
  return `${JSON.stringify({ v: 1, files: ordered }, null, 2)}\n`;
}
