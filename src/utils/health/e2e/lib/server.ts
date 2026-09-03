// server.ts: servidor estatico para los tests E2E de is-webcomponents (sin
// dependencias propias; usa esbuild del repo, que ya es devDep).
// A diferencia de un servidor estatico simple, la galeria importa MODULOS TS
// en crudo (src/previews/registry.ts, src/cdn/collect-is-tags.ts) y los
// componentes piden ./x.js cuando en disco hay x.ts: hay que transpilar TS al
// vuelo y mapear .js → .ts, igual que scripts/serve.mjs del repo.
import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { repoDir } from './env.ts';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

export type ServidorE2E = { url: string; cerrar: () => Promise<void> };

async function resolverArchivo(root: string, urlPath: string) {
  const rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  if (rel.split(sep).includes('..')) return null;
  const target = join(root, rel);
  const info = await stat(target).catch(() => null);
  if (info?.isFile()) return target;
  // Specifiers .js que en disco son .ts (resolucion del kit)
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

export async function levantarServidor(opts: { root?: string; puerto?: number; host?: string } = {}): Promise<ServidorE2E> {
  const root = resolve(opts.root ?? repoDir);
  const host = opts.host ?? '127.0.0.1';
  let transformEsbuild: typeof import('esbuild').transform | null = null;

  const servidor: Server = createServer(async (req, res) => {
    try {
      const archivo = await resolverArchivo(root, String(req.url ?? '/'));
      if (!archivo) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('404');
        return;
      }
      // .ts: transpilar en memoria (igual que serve.mjs); el navegador no
      // entiende TS y los modulos raw del shell lo importan en crudo.
      if (extname(archivo).toLowerCase() === '.ts') {
        transformEsbuild ??= (await import('esbuild')).transform;
        const salida = await transformEsbuild(await readFile(archivo, 'utf8'), {
          loader: 'ts',
          format: 'esm',
          target: 'es2020',
          sourcefile: archivo,
        });
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'no-store',
        });
        res.end(salida.code);
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[extname(archivo).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(await readFile(archivo));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`error: ${msg}`);
    }
  });

  await new Promise<void>((ok, err) => {
    servidor.once('error', err);
    servidor.listen(opts.puerto ?? 0, host, () => ok());
  });
  const dir = servidor.address();
  const puerto = typeof dir === 'object' && dir ? dir.port : opts.puerto ?? 0;
  return {
    url: `http://${host}:${puerto}/index.html`,
    cerrar: () => new Promise<void>((r) => servidor.close(() => r())),
  };
}
