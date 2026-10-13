// @vendor 2026-10-13T15:02:33.985Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs
// Bundle autocontenido de skills/iswc-foundation/tools/create-iswc-app.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es skills/iswc-foundation/tools/create-iswc-app.ts.

// skills/iswc-foundation/tools/create-iswc-app.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var args = Object.fromEntries(Deno.args.filter((a) => a.startsWith("--")).map((a) => {
  const [k, ...v] = a.slice(2).split("=");
  return [k, v.join("=") || "true"];
}));
var carpeta = Deno.args.find((a) => !a.startsWith("--"));
if (!carpeta) {
  console.error("uso: create-iswc-app <carpeta> [--prefijo=p] [--titulo=t] [--puerto=n] [--sha=sha40] [--repo=o/n] [--host=url]");
  Deno.exit(2);
}
var destino = resolve(carpeta);
if (existsSync(destino) && readdirSync(destino).length) {
  console.error(`create-iswc-app: ${destino} existe y no est\xE1 vac\xEDa (no se pisa nada).`);
  Deno.exit(2);
}
var AQUI = new URL("./", import.meta.url);
var remoto = AQUI.protocol !== "file:";
var KIT = new URL("../../../", AQUI);
async function leer(url) {
  if (!remoto) return readFileSync(fileURLToPath(url), "utf8");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`create-iswc-app: ${r.status} ${url.href}`);
  return r.text();
}
function shaPorDefecto() {
  const deUrl = import.meta.url.match(/@([0-9a-f]{40})\//)?.[1] ?? import.meta.url.match(/\/([0-9a-f]{40})\//)?.[1];
  if (deUrl) return deUrl;
  try {
    const r = new Deno.Command("git", { args: ["-C", fileURLToPath(KIT), "rev-parse", "origin/main"] }).outputSync();
    const sha2 = new TextDecoder().decode(r.stdout).trim();
    if (/^[0-9a-f]{40}$/.test(sha2)) return sha2;
  } catch {
  }
  const pin = join(fileURLToPath(KIT), "PIN");
  if (existsSync(pin)) return readFileSync(pin, "utf8").trim();
  throw new Error("create-iswc-app: no s\xE9 el SHA del kit; pasa --sha=<sha40>");
}
var nombre = basename(destino);
var prefijo = (args.prefijo ?? nombre.split(/[^a-z0-9]+/i)[0] ?? "app").toLowerCase();
if (!/^[a-z][a-z0-9]*$/.test(prefijo)) {
  console.error(`create-iswc-app: prefijo inv\xE1lido "${prefijo}" (min\xFAsculas y d\xEDgitos, empieza por letra, sin guiones).`);
  Deno.exit(2);
}
var sha = args.sha ?? shaPorDefecto();
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error(`create-iswc-app: --sha debe ser un SHA de 40 hex (pines fijos), no "${sha}".`);
  Deno.exit(2);
}
var MARCAS = {
  __APP__: nombre,
  __PREFIJO__: prefijo,
  __CLASE__: prefijo[0].toUpperCase() + prefijo.slice(1),
  __TITULO__: args.titulo ?? nombre,
  __SHA__: sha,
  __REPO__: args.repo ?? "Jeff-Aporta/iswc-root",
  __PUERTO__: args.puerto ?? "4200"
};
var host = args.host ?? `https://${MARCAS.__REPO__.split("/")[0].toLowerCase()}.github.io/${nombre}/`;
if (!/^https?:\/\/\S+$/.test(host)) {
  console.error(`create-iswc-app: --host debe ser una URL http(s), no "${host}".`);
  Deno.exit(2);
}
MARCAS.__HOST__ = host.endsWith("/") ? host : `${host}/`;
var marcar = (s) => s.replace(/__(APP|PREFIJO|CLASE|TITULO|SHA|REPO|PUERTO|HOST)__/g, (m) => MARCAS[m] ?? m);
var manifest = JSON.parse(await leer(new URL("../templates/manifest.json", AQUI)));
for (const rel of manifest.archivos) {
  const texto = await leer(new URL(`../templates/${rel}`, AQUI));
  const salida = join(destino, marcar(rel));
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, marcar(texto));
}
var VENDOR = [
  ...["schemas.ts", "test-cooldown.ts", "pruebas.ts", "sync-entregable.ts", "pin-update.mjs"].map((f) => `tools/${f}`),
  ...[
    "index.ts",
    "content-hash.ts",
    "asset-url.ts",
    "asset-url.schemas.ts",
    "stamp-hashes.ts",
    "bundle-min.ts",
    "bundle-min.schemas.ts",
    "asset-store.ts"
  ].map((f) => `build/${f}`)
];
var etiqueta = sha;
for (const rel of VENDOR) {
  let texto;
  if (remoto) {
    texto = await leer(new URL(`src/cdn/${rel}`, KIT)).catch(() => leer(new URL(rel, KIT)));
  } else {
    const raiz = fileURLToPath(KIT);
    const origen = [join(raiz, "src", "cdn", rel), join(raiz, "dist", "cdn", rel)].find(existsSync);
    if (!origen) throw new Error(`create-iswc-app: falta ${rel} en el kit local ${raiz}`);
    texto = readFileSync(origen, "utf8");
    etiqueta = `${sha}+local`;
  }
  texto = texto.replace(/^\/\/ @vendor [^\n]*\n\/\/ No editar[^\n]*\n/, "");
  const salida = join(destino, "src", "vendor", "iswc-root", rel);
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, `// @vendor iswc-root@${etiqueta} dist/cdn/${rel}
// No editar: se cambia en el kit y se descarga con \`deno task vendor:iswc\`.
${texto}`);
}
var SKILL_KIT = ["SKILL.md", "catalog.md", "reference.md", "PROMPT.md", "tools/build.md", "tools/local.md", "tools/migrate.md", "tools/runtime.md"];
var repoKit = MARCAS.__REPO__;
var fijar = (md) => md.replaceAll("Jeff-Aporta/iswc-root", repoKit).replace(new RegExp(`(github.com/${repoKit}/(?:blob|tree))/main/`, "g"), `$1/${sha}/`).replace(new RegExp(`(raw.githubusercontent.com/${repoKit})/main/`, "g"), `$1/${sha}/`).replace(/\]\(\.\.\/((?!catalog\.md|reference\.md|SKILL\.md|PROMPT\.md)[a-z0-9-]+\/[^)]*)\)/g, `](https://raw.githubusercontent.com/${repoKit}/${sha}/skills/$1)`);
for (const rel of SKILL_KIT) {
  try {
    const texto = await leer(new URL(`../../iswc-root/${rel}`, AQUI));
    const salida = join(destino, "specs", "iswc", "kit", rel);
    mkdirSync(dirname(salida), { recursive: true });
    writeFileSync(salida, `<!-- Copia de skills/iswc-root/${rel} del kit ${repoKit}@${sha}. No editar: se refresca con \`deno task vendor:iswc\`. -->
${fijar(texto)}`);
  } catch (e) {
    console.warn(`create-iswc-app: no pude copiar skills/iswc-root/${rel}: ${e instanceof Error ? e.message : e}`);
  }
}
console.log(`
create-iswc-app: ${nombre} creada en ${destino}
  prefijo   <${prefijo}-*>   \xB7   kit ${MARCAS.__REPO__}@${sha.slice(0, 12)}${etiqueta.endsWith("+local") ? " (tools del checkout local)" : ""}

Siguiente:
  cd ${carpeta}
  deno install
  deno task build
  deno task serve        \u2192 http://127.0.0.1:${MARCAS.__PUERTO__}/  (galer\xEDa: /view/demo/)
  deno task test:all

Agentes: AGENTS.md \u2192 specs/README.md \u2192 specs/iswc/ (nuevo-componente, demo-componente, nueva-vista, actualizar-pin).
`);
