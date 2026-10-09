// run.ts — corre el benchmark de raíces de íconos desde Deno y guarda resultados en `resultados/`.
//
//   deno run -A labs/icon-cdn-bench/run.ts [--sha=<40hex>] [--semilla=N] [--lotes=25,100,300] [--concurrencia=6] [--set=mdi] [--solo=pages,githack]
//
// El SHA por defecto es `origin/main` (debe estar publicado: jsDelivr/githack/raw lo sirven por SHA).
// Los nombres salen del índice del set (`dist/assets/icons/<set>.json`), barajados con semilla fija
// para que dos corridas pidan los mismos íconos.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { correr, origenes, tabla } from './bench.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

const git = (args: string[]) => new TextDecoder().decode(new Deno.Command('git', { args, cwd: RAIZ }).outputSync().stdout).trim();
const sha = arg('sha') ?? git(['rev-parse', 'origin/main']);
const remoto = git(['remote', 'get-url', 'origin']).match(/github\.com[/:]([^/]+)\/([^/.]+)/);
const owner = remoto?.[1] ?? 'Jeff-Aporta';
const repo = remoto?.[2] ?? 'is-webcomponents';
const pages = `https://${owner.toLowerCase()}.github.io/${repo}/`;
const set = arg('set') ?? 'mdi';
const lotes = (arg('lotes') ?? '25,100,300').split(',').map(Number);
const concurrencia = Number(arg('concurrencia') ?? 6);
const solo = arg('solo')?.split(',');

const indice = JSON.parse(readFileSync(join(RAIZ, 'dist/assets/icons', `${set}.json`), 'utf8')) as { icons: string[] };
let semilla = Number(arg('semilla') ?? 20261009);
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const nombres = [...indice.icons].sort(() => azar() - 0.5);

const lista = origenes({ owner, repo, sha, pages }).filter((o) => !solo || solo.includes(o.id));
console.log(`[bench] ${owner}/${repo}@${sha.slice(0, 10)} · set ${set} · lotes ${lotes.join(',')} · ${concurrencia} en vuelo · ${lista.map((o) => o.id).join(', ')}`);
const filas = await correr({
  origenes: lista, set, nombres, lotes, concurrencia,
  alAvanzar: (f: { lote: number; origen: string; fria: { total: number; err: number }; tibia: { total: number; err: number } }) =>
    console.log(`  ${String(f.lote).padStart(4)} ${f.origen.padEnd(9)} fría ${String(f.fria.total).padStart(6)} ms${f.fria.err ? ` (${f.fria.err} err)` : ''} · tibia ${String(f.tibia.total).padStart(6)} ms${f.tibia.err ? ` (${f.tibia.err} err)` : ''}`),
});

const fecha = new Date().toISOString();
const dir = join(AQUI, 'resultados');
mkdirSync(dir, { recursive: true });
const base = join(dir, `${fecha.slice(0, 19).replace(/[:T]/g, '-')}-c${concurrencia}`);
writeFileSync(`${base}.json`, JSON.stringify({ fecha, owner, repo, sha, set, semilla: arg('semilla') ?? 20261009, lotes, concurrencia, cliente: `deno ${Deno.version.deno} · ${Deno.build.os}`, filas }, null, 2));
writeFileSync(`${base}.md`, `# Bench íconos · ${fecha}\n\n${owner}/${repo}@${sha} · set \`${set}\` · ${concurrencia} en vuelo · Deno ${Deno.version.deno}\n\n${tabla(filas)}\n`);
console.log(`\n${tabla(filas)}\n\n[bench] → ${base}.{json,md}`);
