/**
 * servidor.ts — autoservidor estático de la app para los e2e (convención de puertos del kit).
 *
 *   - `E2E_BASE_URL` fijada → no se levanta nada (servidor externo).
 *   - Si no, puerto `E2E_PORT` (default 8851; 8850+ = front e2e, 8800-8849 = APIs). Si ese puerto ya
 *     responde, se REUSA y se deja vivo (no se mata lo que no se encendió). Si no, se levanta (dueño)
 *     y se apaga al terminar. Si está ocupado por otra cosa, sube hasta +50.
 */
import { serveDir } from '@std/http/file-server';

const vivo = async (url: string) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    await r.body?.cancel();
    return r.status < 500;
  } catch {
    return false;
  }
};

export type Servidor = { base: string; apagar: () => Promise<void> };

export async function asegurarServidor(raiz: string): Promise<Servidor> {
  const externa = Deno.env.get('E2E_BASE_URL');
  if (externa) return { base: externa.replace(/\/?$/, '/'), apagar: async () => {} };
  const base0 = Number(Deno.env.get('E2E_PORT') ?? 8851);
  for (let port = base0; port <= base0 + 50; port++) {
    const url = `http://127.0.0.1:${port}/`;
    if (await vivo(`${url}index.html`)) {
      console.log(`[e2e] reuso el servidor vivo en ${url} (no lo apago al final)`);
      return { base: url, apagar: async () => {} };
    }
    try {
      const ac = new AbortController();
      const srv = Deno.serve({ port, hostname: '127.0.0.1', signal: ac.signal, onListen: () => {} }, (req) => serveDir(req, { fsRoot: raiz, quiet: true }));
      console.log(`[e2e] servidor propio en ${url}`);
      return { base: url, apagar: async () => { ac.abort(); await srv.finished; } };
    } catch {
      /* puerto ocupado por otra cosa: el siguiente */
    }
  }
  throw new Error(`[e2e] sin puerto libre entre ${base0} y ${base0 + 50}`);
}
