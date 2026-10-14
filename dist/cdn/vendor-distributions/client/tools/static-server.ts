// @vendor 2026-10-14T01:16:34.698Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/client/tools/static-server.ts
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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, extname, resolve } from 'node:path';
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

/**
 * Sirve `root`. Con `remoto` (p. ej. `https://raw.githubusercontent.com/<repo>/<ref>/`), lo que no esté en disco
 * bajo `dist/cdn/` se pide ahí y se sirve con su MIME (raw no da `text/javascript`): así el render funciona sin
 * checkout del kit. Lo traído se guarda en memoria y, si `ref` es un SHA (inmutable), en `<root>/.iswc-remoto/`.
 */
export function startStaticServer(root: string, remoto?: string): Promise<StaticServer> {
  const absRoot = resolve(root);
  const memoria = new Map<string, Uint8Array | null>();
  const inmutable = !!remoto && /\/[0-9a-f]{40}\/$/.test(remoto);
  const traer = async (rel: string): Promise<Uint8Array | null> => {
    if (!remoto || !rel.startsWith('dist/cdn/')) return null;
    const enMemoria = memoria.get(rel);
    if (enMemoria !== undefined) return enMemoria;
    const enDisco = join(absRoot, '.iswc-remoto', rel);
    if (inmutable && existsSync(enDisco)) { const b = new Uint8Array(await readFile(enDisco)); memoria.set(rel, b); return b; }
    let cuerpo: Uint8Array | null = null;
    for (let i = 0; i < 3 && cuerpo === null; i++) {
      try {
        const r = await fetch(remoto + rel);
        if (r.ok) cuerpo = new Uint8Array(await r.arrayBuffer());
        else { await r.body?.cancel(); if (r.status === 404) break; }
      } catch { /* red: reintento */ }
    }
    memoria.set(rel, cuerpo);
    if (cuerpo && inmutable) { await mkdir(dirname(enDisco), { recursive: true }); await writeFile(enDisco, cuerpo); }
    return cuerpo;
  };
  return new Promise((resolvePromise) => {
    const server: Server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!rel || rel.endsWith('/')) rel += 'index.html';
      const abs = join(absRoot, rel);
      const cabeceras = (f: string) => ({
        'Content-Type': TYPES[extname(f)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      if (!abs.startsWith(absRoot)) { res.writeHead(404); res.end('not found'); return; }
      if (existsSync(abs)) { res.writeHead(200, cabeceras(abs)); createReadStream(abs).pipe(res); return; }
      void traer(rel.split('\\').join('/')).then((cuerpo) => {
        if (!cuerpo) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, cabeceras(rel));
        res.end(cuerpo);
      });
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
