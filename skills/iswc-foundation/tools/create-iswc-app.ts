/**
 * create-iswc-app — crea una app iswc nueva con el estándar iswc-foundation (el «create-react-app» del kit).
 *
 * Se ejecuta DIRECTO desde la URL (Deno no necesita descargar ni clonar nada) o desde un checkout local:
 *   deno run -A https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/skills/iswc-foundation/tools/create-iswc-app.ts mi-app
 *   deno run -A skills/iswc-foundation/tools/create-iswc-app.ts ../mi-app --prefijo=mia --titulo="Mi App"
 * (raw por SHA: jsDelivr rechaza archivos nuevos de repos > 50 MB; la forma `…/gh/<repo>@<sha>/dist/cdn/skills/…` también sirve.)
 *
 * Opciones:
 *   --prefijo=<p>   prefijo de los componentes (`<p>-app`, `<p>-hola`). Default: primera palabra del nombre.
 *   --titulo=<t>    título visible. Default: el nombre de la carpeta.
 *   --puerto=<n>    puerto de `deno task serve`. Default 4200.
 *   --sha=<sha40>   pin del kit. Default: la versión del kit desde la que corre esta herramienta
 *                   (el SHA de su URL, o `origin/main` del checkout local: siempre publicado).
 *   --repo=<o/n>    repo del kit. Default Jeff-Aporta/iswc-root.
 *
 * Crea el esqueleto COMPLETO (shell, registro de tags, base de componentes, Zod, SCSS, build con
 * `?v=<hash>`, galería, vista `hola` (bienvenida + hola mundo + modal), gate de pruebas con sus casos
 * base, sync, specs WHAT sembradas, .gitignore) y vendoriza las tools del kit al MISMO SHA del pin. Deja la app lista para
 * `deno install` + `deno task build`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(Deno.args.filter((a) => a.startsWith('--')).map((a) => {
  const [k, ...v] = a.slice(2).split('=');
  return [k!, v.join('=') || 'true'];
}));
const carpeta = Deno.args.find((a) => !a.startsWith('--'));
if (!carpeta) {
  console.error('uso: create-iswc-app <carpeta> [--prefijo=p] [--titulo=t] [--puerto=n] [--sha=sha40] [--repo=o/n]');
  Deno.exit(2);
}
const destino = resolve(carpeta);
if (existsSync(destino) && readdirSync(destino).length) {
  console.error(`create-iswc-app: ${destino} existe y no está vacía (no se pisa nada).`);
  Deno.exit(2);
}

const AQUI = new URL('./', import.meta.url);
const remoto = AQUI.protocol !== 'file:';
/** Raíz del kit desde esta herramienta: `…/skills/iswc-foundation/tools/` → 3 niveles arriba (repo o dist/cdn). */
const KIT = new URL('../../../', AQUI);

async function leer(url: URL): Promise<string> {
  if (!remoto) return readFileSync(fileURLToPath(url), 'utf8');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`create-iswc-app: ${r.status} ${url.href}`);
  return r.text();
}

function shaPorDefecto(): string {
  const deUrl = import.meta.url.match(/@([0-9a-f]{40})\//)?.[1] ?? import.meta.url.match(/\/([0-9a-f]{40})\//)?.[1];
  if (deUrl) return deUrl;
  // Checkout local: el último SHA PUBLICADO (origin/main); el PIN local puede ir por delante del remoto.
  try {
    const r = new Deno.Command('git', { args: ['-C', fileURLToPath(KIT), 'rev-parse', 'origin/main'] }).outputSync();
    const sha = new TextDecoder().decode(r.stdout).trim();
    if (/^[0-9a-f]{40}$/.test(sha)) return sha;
  } catch {
    /* sin git: PIN */
  }
  const pin = join(fileURLToPath(KIT), 'PIN');
  if (existsSync(pin)) return readFileSync(pin, 'utf8').trim();
  throw new Error('create-iswc-app: no sé el SHA del kit; pasa --sha=<sha40>');
}

const nombre = basename(destino);
const prefijo = (args.prefijo ?? nombre.split(/[^a-z0-9]+/i)[0] ?? 'app').toLowerCase();
if (!/^[a-z][a-z0-9]*$/.test(prefijo)) {
  console.error(`create-iswc-app: prefijo inválido "${prefijo}" (minúsculas y dígitos, empieza por letra, sin guiones).`);
  Deno.exit(2);
}
const sha = args.sha ?? shaPorDefecto();
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error(`create-iswc-app: --sha debe ser un SHA de 40 hex (pines fijos), no "${sha}".`);
  Deno.exit(2);
}
const MARCAS: Record<string, string> = {
  __APP__: nombre,
  __PREFIJO__: prefijo,
  __CLASE__: prefijo[0]!.toUpperCase() + prefijo.slice(1),
  __TITULO__: args.titulo ?? nombre,
  __SHA__: sha,
  __REPO__: args.repo ?? 'Jeff-Aporta/iswc-root',
  __PUERTO__: args.puerto ?? '4200',
};
const marcar = (s: string) => s.replace(/__(APP|PREFIJO|CLASE|TITULO|SHA|REPO|PUERTO)__/g, (m) => MARCAS[m] ?? m);

// 1) Plantillas
const manifest = JSON.parse(await leer(new URL('../templates/manifest.json', AQUI))) as { archivos: string[] };
for (const rel of manifest.archivos) {
  const texto = await leer(new URL(`../templates/${rel}`, AQUI));
  const salida = join(destino, marcar(rel));
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, marcar(texto));
}

// 2) Tools del kit, vendorizadas desde ESTA versión del kit (vendor = pin desde el día 0)
const VENDOR = [
  ...['test-cooldown.ts', 'test-cooldown.schemas.ts', 'test-queue.ts', 'pruebas.ts', 'pruebas.schemas.ts', 'pruebas-hijo.ts',
    'sync-entregable.ts', 'sync-entregable.schemas.ts', 'pin-update.mjs'].map((f) => `tools/${f}`),
  ...['index.ts', 'content-hash.ts', 'asset-url.ts', 'asset-url.schemas.ts', 'stamp-hashes.ts', 'bundle-min.ts',
    'bundle-min.schemas.ts', 'asset-store.ts'].map((f) => `build/${f}`),
];
let etiqueta = sha;
for (const rel of VENDOR) {
  let texto: string;
  if (remoto) {
    // raw: KIT = raíz del repo (fuente en src/cdn/); jsDelivr: KIT = …/dist/cdn/.
    texto = await leer(new URL(`src/cdn/${rel}`, KIT)).catch(() => leer(new URL(rel, KIT)));
  } else {
    const raiz = fileURLToPath(KIT);
    const origen = [join(raiz, 'src', 'cdn', rel), join(raiz, 'dist', 'cdn', rel)].find(existsSync);
    if (!origen) throw new Error(`create-iswc-app: falta ${rel} en el kit local ${raiz}`);
    texto = readFileSync(origen, 'utf8');
    etiqueta = `${sha}+local`;
  }
  texto = texto.replace(/^\/\/ @vendor [^\n]*\n\/\/ No editar[^\n]*\n/, '');
  const salida = join(destino, 'src', 'vendor', 'iswc-root', rel);
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, `// @vendor iswc-root@${etiqueta} dist/cdn/${rel}\n// No editar: se cambia en el kit y se descarga con \`deno task vendor:iswc\`.\n${texto}`);
}

console.log(`
create-iswc-app: ${nombre} creada en ${destino}
  prefijo   <${prefijo}-*>   ·   kit ${MARCAS.__REPO__}@${sha.slice(0, 12)}${etiqueta.endsWith('+local') ? ' (tools del checkout local)' : ''}

Siguiente:
  cd ${carpeta}
  deno install
  deno task build
  deno task serve        → http://127.0.0.1:${MARCAS.__PUERTO__}/  (galería: /view/demo/)
  deno task test:all

Agentes: AGENTS.md → specs/README.md → specs/iswc/ (nuevo-componente, demo-componente, nueva-vista, actualizar-pin).
`);
