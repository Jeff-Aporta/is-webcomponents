/**
 * sync-cf-versions.mjs — genera dist/cdn/versions.json.
 *
 * Cloudflare Pages asigna a cada deployment una URL inmutable
 * `https://<id8>.<project>.pages.dev` cuyo id NO se deriva del commit, así que
 * la única forma de fijar una versión anterior es guardar el mapeo
 * commit -> url. Este script lo pide a la API de Pages y escribe el JSON que
 * consume el front (scripts/cdn-sources.js).
 *
 * Cada entrada se VERIFICA con un HEAD contra un archivo conocido: los
 * deployments viejos pueden purgarse o haber fallado a medio subir, y un
 * snippet que apunte a una URL muerta es peor que no ofrecer la versión.
 *
 * Uso: CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/sync-cf-versions.mjs
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.env.CF_PAGES_PROJECT || 'is-webcomponents';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
/** Archivo que debe existir en todo deployment sano: sirve de sonda. */
const PROBE = 'all.min.js';
/** Cuántas versiones históricas se conservan. La API de Pages rechaza
 *  per_page fuera de [5, 25], así que se pide por páginas. */
const KEEP = Number(process.env.CF_VERSIONS_KEEP || 50);
const PER_PAGE = 25;

if (!TOKEN || !ACCOUNT) {
  console.error('Faltan CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID');
  process.exit(1);
}

const api = async (path) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`API ${path}: ${JSON.stringify(json.errors)}`);
  return json.result;
};

const deployments = [];
for (let page = 1; deployments.length < KEEP; page += 1) {
  const batch = await api(`/pages/projects/${PROJECT}/deployments?per_page=${PER_PAGE}&page=${page}`);
  deployments.push(...batch);
  if (batch.length < PER_PAGE) break;
}
deployments.length = Math.min(deployments.length, KEEP);

const candidates = deployments
  .filter((d) => d.latest_stage?.status === 'success')
  .map((d) => ({
    id: d.id.slice(0, 8),
    url: d.url,
    commit: d.deployment_trigger?.metadata?.commit_hash || '',
    branch: d.deployment_trigger?.metadata?.branch || '',
    created: d.created_on,
  }))
  .filter((d) => d.url);

// Verificación en paralelo: una URL listada pero muerta rompe el snippet.
const checked = await Promise.all(candidates.map(async (d) => {
  try {
    const res = await fetch(`${d.url}/${PROBE}`, { method: 'HEAD' });
    return res.ok ? d : null;
  } catch {
    return null;
  }
}));

const versions = checked.filter(Boolean);
if (!versions.length) {
  console.error('Ningún deployment verificado: se deja versions.json intacto.');
  process.exit(1);
}

const out = {
  project: PROJECT,
  latest: `https://${PROJECT}.pages.dev`,
  generated: new Date().toISOString(),
  versions,
};

await writeFile(join(root, 'dist', 'cdn', 'versions.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`versions.json — ${versions.length} deployments verificados (de ${candidates.length})`);
