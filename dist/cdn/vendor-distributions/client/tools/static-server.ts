// @vendor 2026-10-13T13:28:49.065Z Jeff-Aporta/is-webcomponents@local src/vendor-distributions/client/tools/static-server.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
/**
 * Servidor estático mínimo (Node http) para servir dist/cdn + labs.
 * Deno lo usa vía node:http (compat).
 *
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/tools/static-server.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../../shared/schemas.ts` (sección `static-server`).
 * Skill: skills/iswc-diagramas-enriquecidos/SKILL.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import type { StaticServer } from '../../shared/schemas.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
};

export function startStaticServer(root: string): Promise<StaticServer> {
  const absRoot = resolve(root);
  return new Promise((resolvePromise) => {
    const server: Server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!rel || rel.endsWith('/')) rel += 'index.html';
      const abs = join(absRoot, rel);
      if (!abs.startsWith(absRoot) || !existsSync(abs)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[extname(abs)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      createReadStream(abs).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolvePromise({
        port,
        base: `http://127.0.0.1:${port}/`,
        close: () => server.close(),
      });
    });
  });
}
