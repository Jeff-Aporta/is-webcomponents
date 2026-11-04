/**
 * Servidor para los demos en `demos/`. Misma idea que `serve.mjs` pero con
 * ROOT fija en `demos/` y capaz de resolver `../src/...` (porque los demos
 * importan componentes desde el src relativo al repo).
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { reescribirAlias } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';

const ROOT = join(import.meta.dirname, '..');
const PORT = Number(process.argv[2]) || 8491;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
};

async function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  if (rel.split(sep).includes('..')) return null;
  const target = join(ROOT, rel);
  const info = await stat(target).catch(() => null);
  if (info?.isFile()) return target;
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
  if (extname(file).toLowerCase() === '.ts') {
    try {
      const { transform } = await import('esbuild');
      const out = await transform(await readFile(file, 'utf8'), {
        loader: 'ts', format: 'esm', target: 'es2020',
        sourcefile: file, sourcemap: 'inline',
      });
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
      });
      // `@jeff-aporta/iswc-base/<ruta>` → `/src/<ruta>` (ROOT es la raíz del repo).
      res.end(reescribirAlias(out.code, (ruta) => `/src/${ruta}`));
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`error transpilando ${file}\n${e?.message ?? e}`);
    }
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Demos de iswc-base en http://localhost:${PORT}/ (raíz ${ROOT})`);
  console.log(`  http://localhost:${PORT}/demos/diagramas/ER/index.html`);
});