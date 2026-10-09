/**
 * probar-foundation.ts — guardián del estándar: crea una app con create-iswc-app y le corre el gate.
 *
 *   deno run -A skills/iswc-foundation/tools/probar-foundation.ts [--sha=<sha40>] [--repo=o/n] [--conservar]
 *
 * 1. `templates/manifest.json` al día con `templates/` (exit 1 si no).
 * 2. Crea la app en un directorio temporal (tools del checkout local), `deno install`, `deno task test:all`
 *    con TEST_COOLDOWN=0. Verde = las plantillas cumplen el estándar que documentan.
 * Por defecto pinea al `PIN` del kit; `--repo`/`--sha` permiten probar contra otro repo/SHA publicado.
 */
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = fileURLToPath(new URL('./', import.meta.url));
const pasar = Deno.args.filter((a) => a.startsWith('--sha=') || a.startsWith('--repo='));
// Pin = un SHA PUBLICADO: sin --sha se usa origin/main del kit (el PIN local puede ir por delante del remoto).
if (!pasar.some((a) => a.startsWith('--sha='))) {
  const r = new Deno.Command('git', { args: ['-C', join(AQUI, '..', '..', '..'), 'rev-parse', 'origin/main'] }).outputSync();
  const sha = new TextDecoder().decode(r.stdout).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('probar-foundation: no pude leer origin/main del kit; pasa --sha=<sha40>');
  pasar.push(`--sha=${sha}`);
}

// Repo = el remoto real del checkout (el default de create-iswc-app es el nombre final del kit).
if (!pasar.some((a) => a.startsWith('--repo='))) {
  const r = new Deno.Command('git', { args: ['-C', join(AQUI, '..', '..', '..'), 'remote', 'get-url', 'origin'] }).outputSync();
  const repo = new TextDecoder().decode(r.stdout).trim().match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
  if (repo) pasar.push(`--repo=${repo}`);
}

async function correr(cmd: string[], cwd: string, env: Record<string, string> = {}): Promise<number> {
  console.log(`\n[probar-foundation] $ ${cmd.join(' ')}`);
  const r = await new Deno.Command(cmd[0]!, { args: cmd.slice(1), cwd, env, stdout: 'inherit', stderr: 'inherit' }).output();
  return r.code;
}

/**
 * `assets/dl.js` importa la herramienta de íconos por URL al SHA del pin. Si ese SHA publicado aún no la
 * trae (cambio local sin push), la prueba usa la del checkout: se valida la plantilla, no la red.
 */
async function herramientaDeIconosLocal(app: string): Promise<number> {
  const dl = join(app, 'assets', 'dl.js');
  const texto = await Deno.readTextFile(dl);
  const url = texto.match(/from '([^']+)'/)?.[1];
  if (!url) return 1;
  const ok = await fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
  if (ok) return 0;
  const local = pathToFileURL(join(AQUI, '..', '..', '..', 'src', 'cdn', 'tools', 'download-iconify.ts')).href;
  await Deno.writeTextFile(dl, texto.replace(url, local));
  console.log(`[probar-foundation] el pin aún no publica download-iconify.ts → assets/dl.js usa ${local}`);
  return 0;
}

if (await correr([Deno.execPath(), 'run', '-A', join(AQUI, 'manifest.ts'), '--check'], AQUI)) Deno.exit(1);
const tmp = await Deno.makeTempDir({ prefix: 'iswc-foundation-' });
const app = join(tmp, 'app-prueba');
let code = await correr([Deno.execPath(), 'run', '-A', join(AQUI, 'create-iswc-app.ts'), app, '--prefijo=prueba', '--titulo=App de prueba', ...pasar], AQUI);
if (!code) code = await herramientaDeIconosLocal(app);
if (!code) code = await correr([Deno.execPath(), 'install'], app);
if (!code) code = await correr([Deno.execPath(), 'task', 'test:all'], app, { TEST_COOLDOWN: '0' });
console.log(`\n[probar-foundation] ${code ? `ROJO (rc=${code})` : 'VERDE'} · app en ${app}`);
if (!Deno.args.includes('--conservar') && !code) await Deno.remove(tmp, { recursive: true });
Deno.exit(code);
