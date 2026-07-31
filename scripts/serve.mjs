/**
 * Servidor estático para los previews.
 *
 * Existe por una sola razón: `Cache-Control: no-store`. Con `python -m
 * http.server` (solo Last-Modified, sin Cache-Control) Chrome cachea los módulos
 * heurísticamente y una recarga normal sigue ejecutando el JS anterior, así que
 * los cambios en components/ parecen no aplicarse.
 *
 *   node serve.mjs [puerto]
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PORT = Number(process.argv[2]) || 8391;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
};

async function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  if (rel.split(sep).includes('..')) return null;
  const target = join(ROOT, rel);
  const info = await stat(target).catch(() => null);
  if (info?.isFile()) return target;
  if (info?.isDirectory()) {
    const index = join(target, 'index.html');
    return (await stat(index).catch(() => null))?.isFile() ? index : null;
  }
  return null;
}

createServer(async (req, res) => {
  const file = await resolveFile(req.url || '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`previews en http://localhost:${PORT}/previews/ (sin caché)`);
});
