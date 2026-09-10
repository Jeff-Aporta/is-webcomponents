// vendor-e2e-config.ts — vendor DL con timestamp de `cdn/e2e-config.ts`.
// Descarga la config E2E estándar MÁS RECIENTE (por `Last-Modified`) desde la
// fuente única (muestralo-main/cdn, servida por el worker) y la deja en
// `lib/e2e-config.ts`. Así los e2e trabajan siempre con la versión vigente y
// nunca vuelven a una más vieja que la local. Funciona desde cualquier server
// (solo red), no depende del monorepo local.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { e2eDir } from './env.ts';

const CDN_BASE = 'https://muestralo-api.jeffaporta.workers.dev/cdn';
const FILE = 'e2e-config.ts';

export type ResultadoVendor = 'ok' | 'skip';

/**
 * Garantiza la config E2E más reciente antes de correr los tests.
 * `E2E_CONFIG_SKIP_DL=1` la salta (usa la copia local/commit).
 */
export async function descargarConfigE2E(opts: { dir?: string; fuerza?: boolean } = {}): Promise<ResultadoVendor> {
  const salto = process.env.E2E_CONFIG_SKIP_DL?.toLowerCase();
  if (salto === '1' || salto === 'true') {
    console.log('[vendor:e2e] E2E_CONFIG_SKIP_DL=1 — se usa la config local');
    return 'skip';
  }
  const dir = opts.dir ?? join(e2eDir, 'lib');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, FILE);
  const lock = join(dir, `.${FILE}.timestamp`);

  let res: Response;
  try {
    res = await fetch(`${CDN_BASE}/${FILE}`);
  } catch (e) {
    console.warn(`[vendor:e2e] no se pudo descargar ${FILE} (offline?): ${(e as Error)?.message ?? String(e)}`);
    return 'skip';
  }
  if (!res.ok) {
    console.warn(`[vendor:e2e] GET ${FILE} -> ${res.status}; se usa la config local`);
    return 'skip';
  }
  const body = await res.text();
  const lastModified = (res.headers.get('last-modified') ?? '').trim();

  let prev = '';
  if (existsSync(lock)) {
    try { prev = readFileSync(lock, 'utf8').trim(); } catch { prev = ''; }
  }
  if (!opts.fuerza && prev && lastModified && prev === lastModified && existsSync(dest)) {
    console.log(`[vendor:e2e] ${FILE} ya está en la versión ${prev} — skip`);
    return 'skip';
  }
  writeFileSync(dest, body);
  writeFileSync(lock, lastModified || new Date().toISOString());
  console.log(`[vendor:e2e] ${FILE} actualizado -> ${dest}${lastModified ? ` (${lastModified})` : ''}`);
  return 'ok';
}
