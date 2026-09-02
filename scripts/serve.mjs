/**
 * Servidor estático para los previews.
 *
 * Existe por una sola razón: `Cache-Control: no-store`. Con `python -m
 * http.server` (solo Last-Modified, sin Cache-Control) Chrome cachea los módulos
 * heurísticamente y una recarga normal sigue ejecutando el JS anterior, así que
 * los cambios en src/components/ parecen no aplicarse.
 *
 *   node serve.mjs [puerto]                # raíz = este repo
 *   SERVE_ROOT=C:\ruta\workspace node serve.mjs 5505
 *        # raíz = el workspace padre (modo Live Server): sirve /apps/<repo>/…
 *        # igual que Live Server pero con transpilado TS + mapeo .js→.ts, que
 *        # Live Server NO hace (sirve .ts como video/mp2t y los specifiers
 *        # .js→.ts dan 404: la galería se queda en loading eterno).
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = process.env.SERVE_ROOT
  ? join(process.env.SERVE_ROOT)
  : join(import.meta.dirname, '..');
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
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

async function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  if (rel.split(sep).includes('..')) return null;
  const target = join(ROOT, rel);
  const info = await stat(target).catch(() => null);
  if (info?.isFile()) return target;
  // Fuente en TypeScript: el navegador pide `./foo.js` porque es lo que exige el
  // resolutor de modulos, pero en disco el fichero es `foo.ts`. Se sirve el
  // `.ts` transpilado al vuelo; un gemelo `.js` en `src/` seria justo lo que se
  // quiere evitar.
  if (/\.js$/.test(target)) {
    const ts = target.replace(/\.js$/, '.ts');
    if ((await stat(ts).catch(() => null))?.isFile()) return ts;
  }
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
  // Un `.ts` no lo entiende el navegador: se transpila en memoria y se sirve
  // como JavaScript. Sin bundle ni minificar — en desarrollo interesa que lo
  // servido se parezca al fuente, y el sourcemap inline deja depurar el .ts.
  if (extname(file).toLowerCase() === '.ts') {
    try {
      const { transform } = await import('esbuild');
      const salida = await transform(await readFile(file, 'utf8'), {
        loader: 'ts', format: 'esm', target: 'es2020',
        sourcefile: file, sourcemap: 'inline',
      });
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(salida.code);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`error transpilando ${file}
${e?.message ?? e}`);
    }
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`IS Web Components en http://localhost:${PORT}/ (sin caché, raíz ${ROOT})`);
});
