// @vendor 2026-10-13T21:34:50.004Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs
// Bundle autocontenido de skills/iswc-foundation/tools/create-iswc-app.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es skills/iswc-foundation/tools/create-iswc-app.ts.
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/vendor-distributions/shared/tools/pin-update.mjs
var pin_update_exports = {};
__export(pin_update_exports, {
  CABECERA_VENDOR: () => CABECERA_VENDOR,
  ONLINE: () => ONLINE,
  SHA: () => SHA,
  actualizarPines: () => actualizarPines,
  inventario: () => inventario,
  opciones: () => opciones,
  protocolo: () => protocolo,
  publicado: () => publicado,
  ultimoPublicado: () => ultimoPublicado,
  ultimoSha: () => ultimoSha,
  ultimosShas: () => ultimosShas,
  verificarLocal: () => verificarLocal
});
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
function opciones(o = {}) {
  const repo = String(o.repo || "Jeff-Aporta/is-webcomponents");
  const nombre2 = repo.split("/")[1];
  const lista = (v, def) => v ? (Array.isArray(v) ? v : String(v).split(",")).map((s) => s.trim()).filter(Boolean) : def;
  return {
    root: o.root ? String(o.root) : process.cwd(),
    repo,
    owner: repo.split("/")[0],
    nombre: nombre2,
    nombres: [nombre2, ...lista(o.alias, ALIAS[nombre2] ?? [])],
    rama: String(o.rama || "main"),
    verificar: String(o.verificar || "dist/cdn/core/loader.min.js"),
    raices: lista(o.raices, RAICES_DEFAULT),
    saltar: new Set(lista(o.saltar, SALTAR_DEFAULT)),
    local: o.local ? String(o.local) : "",
    dryRun: !!o["dry-run"] || !!o.dryRun
  };
}
function archivos(op) {
  const out = [];
  const walk = (p) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const q = join(p, e.name);
      if (e.isDirectory()) {
        if (!op.saltar.has(e.name)) walk(q);
      } else if (EXT.test(e.name)) out.push(q);
    }
  };
  for (const r of op.raices) {
    const p = join(op.root, r);
    if (!existsSync(p)) continue;
    if (EXT.test(r)) out.push(p);
    else walk(p);
  }
  return out;
}
function regexes(op) {
  const reNombres = `(?:${op.nombres.map(esc).join("|")})`;
  return {
    reNombres,
    rePin: new RegExp(`(${reNombres})@([0-9a-zA-Z._-]+)`, "g"),
    // Forma raw por SHA (`raw.githubusercontent.com/<owner>/<repo>/<sha40>/…`): tan inmutable como `@sha`.
    // La usan los imports de `deno.json` (jsDelivr rechaza archivos nuevos de repos > 50 MB).
    reRaw: new RegExp(`(${esc(op.owner)}\\/)(${reNombres})\\/([0-9a-f]{40})\\/`, "g"),
    reMutable: new RegExp([
      `${reNombres}@(main|master|latest|[0-9a-f]{7,39}\\b)`,
      // rama, latest o SHA corto
      `${esc(op.owner)}\\/${reNombres}\\/(main|master)\\/`,
      // raw.githack / githubusercontent por rama
      // GitHub Pages DEL KIT (sirve siempre la última versión). El sitio propio de la app (`iswc.host`) no es un pin.
      `[a-z0-9-]+\\.github\\.io\\/${reNombres}(?![\\w-])`
    ].join("|"), "i")
  };
}
function inventario(op = opciones()) {
  const { rePin, reRaw, reMutable } = regexes(op);
  const rel = (f) => relative(op.root, f).replace(/\\/g, "/");
  const pines = /* @__PURE__ */ new Map();
  const mutables = [];
  const legados = /* @__PURE__ */ new Set();
  for (const f of archivos(op)) {
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(rePin)) {
      if (!SHA.test(m[2])) continue;
      pines.set(m[2], (pines.get(m[2]) ?? /* @__PURE__ */ new Set()).add(rel(f)));
      if (m[1] !== op.nombre) legados.add(rel(f));
    }
    for (const m of t.matchAll(reRaw)) {
      pines.set(m[3], (pines.get(m[3]) ?? /* @__PURE__ */ new Set()).add(rel(f)));
      if (m[2] !== op.nombre) legados.add(rel(f));
    }
    t.split("\n").forEach((l, i) => {
      if (reMutable.test(l) && !ONLINE.test(l) && !CABECERA_VENDOR.test(l)) mutables.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`);
    });
  }
  return { pines, mutables, legados };
}
async function publicado(sha2, op = opciones()) {
  const u = `https://cdn.jsdelivr.net/gh/${op.repo}@${sha2}/${op.verificar}`;
  const r = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(2e4) }).catch(() => null);
  log(`verificaci\xF3n ${u} \u2192 ${r?.status ?? "sin red"}`);
  return !!r && r.status < 400;
}
async function ultimoSha(op = opciones()) {
  const u = `https://api.github.com/repos/${op.repo}/commits/${op.rama}`;
  const r = await fetch(u, { headers: { Accept: "application/vnd.github.sha", "User-Agent": "iswc-pin", ...auth() }, signal: AbortSignal.timeout(2e4) }).catch(() => null);
  let t = r?.ok ? (await r.text()).trim() : "";
  if (!SHA.test(t)) {
    const j = await fetch(`https://data.jsdelivr.com/v1/package/resolve/gh/${op.repo}@${op.rama}`, { signal: AbortSignal.timeout(2e4) }).then((x) => x.ok ? x.json() : null).catch(() => null);
    t = SHA.test(String(j?.version ?? "")) ? String(j.version) : "";
    if (t) log(`HEAD de ${op.repo}@${op.rama} \u2192 ${t} (resuelto por jsDelivr; API de GitHub ${r?.status ?? "sin red"})`);
  }
  if (!t) log(`HEAD de ${op.repo}@${op.rama} \u2192 sin respuesta (${r?.status ?? "red"})`);
  else if (r?.ok) log(`HEAD de ${op.repo}@${op.rama} \u2192 ${t}`);
  return SHA.test(t) ? t : "";
}
async function ultimosShas(op = opciones(), n = 30) {
  const u = `https://api.github.com/repos/${op.repo}/commits?sha=${encodeURIComponent(op.rama)}&per_page=${n}`;
  const r = await fetch(u, { headers: { Accept: "application/vnd.github+json", "User-Agent": "iswc-pin", ...auth() }, signal: AbortSignal.timeout(2e4) }).catch(() => null);
  if (!r?.ok) return [];
  const lista = await r.json().catch(() => []);
  return Array.isArray(lista) ? lista.map((c) => String(c?.sha ?? "")).filter((s) => SHA.test(s)) : [];
}
async function ultimoPublicado(op = opciones()) {
  const head = await ultimoSha(op);
  if (!head) return { sha: "", head: "" };
  if (await publicado(head, op)) return { sha: head, head };
  log(`el HEAD ${head.slice(0, 12)} a\xFAn no est\xE1 en jsDelivr: se busca el \xFAltimo publicado`);
  for (const sha2 of (await ultimosShas(op)).filter((s) => s !== head)) if (await publicado(sha2, op)) return { sha: sha2, head };
  return { sha: "", head };
}
function verificarLocal(local, sha2 = "") {
  if (!local) return { accesible: false, motivo: "sin --local", head: "", tieneSha: null };
  if (!existsSync(local)) return { accesible: false, motivo: `no existe ${local} (ruta no accesible o mal configurada)`, head: "", tieneSha: null };
  const git = (...a) => execFileSync("git", ["-C", local, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  let head = "";
  try {
    head = git("rev-parse", "HEAD");
  } catch {
    return { accesible: false, motivo: `${local} no es un repo git accesible`, head: "", tieneSha: null };
  }
  let tieneSha = null;
  if (sha2) {
    try {
      git("cat-file", "-e", `${sha2}^{commit}`);
      tieneSha = true;
    } catch {
      tieneSha = false;
    }
  }
  return { accesible: true, motivo: "ok", head, tieneSha };
}
function actualizarPines(nuevo, op = opciones(), viejos = null) {
  const { reNombres } = regexes(op);
  const rel = (f) => relative(op.root, f).replace(/\\/g, "/");
  const { pines } = inventario(op);
  const lista = viejos ?? [...pines.keys()].filter((s) => s !== nuevo);
  const shas = [...lista, nuevo].map(esc).join("|");
  const reViejo = new RegExp(`${reNombres}@(${shas})`, "g");
  const reViejoRaw = new RegExp(`(${esc(op.owner)}\\/)${reNombres}\\/(?:${shas})\\/`, "g");
  let n = 0;
  const tocados = [];
  for (const f of archivos(op)) {
    const t = readFileSync(f, "utf8");
    const next = t.replace(reViejo, (m) => {
      const r = `${op.nombre}@${nuevo}`;
      if (m !== r) n += 1;
      return r;
    }).replace(reViejoRaw, (m, pre) => {
      const r = `${pre}${op.nombre}/${nuevo}/`;
      if (m !== r) n += 1;
      return r;
    });
    if (next === t) continue;
    tocados.push(rel(f));
    if (!op.dryRun) writeFileSync(f, next);
  }
  return { viejos: lista, n, tocados };
}
async function protocolo(nuevoPedido, op = opciones(), viejo = "") {
  let nuevo = String(nuevoPedido).toLowerCase();
  let head = nuevo;
  if (nuevo === "ultimo") {
    const u = await ultimoPublicado(op);
    head = u.head;
    if (!u.head) {
      console.error(`[pin] sin red: no se pudo resolver el HEAD de ${op.repo}@${op.rama}. Nada se toc\xF3.`);
      return 4;
    }
    if (!u.sha) {
      console.error(`[pin] ning\xFAn commit reciente de ${op.repo}@${op.rama} responde en jsDelivr (${op.verificar}). Nada se toc\xF3.`);
      return 3;
    }
    nuevo = u.sha;
  }
  if (!SHA.test(nuevo)) {
    console.error(`[pin] --nuevo debe ser un SHA de 40 hex o "ultimo" (no rama, tag ni SHA corto): "${nuevoPedido}"`);
    return 2;
  }
  if (viejo && !SHA.test(String(viejo))) {
    console.error(`[pin] --viejo debe ser la cadena exacta de 40 hex: "${viejo}"`);
    return 2;
  }
  if (op.local) {
    const l = verificarLocal(op.local, head);
    if (!l.accesible) log(`checkout local omitido: ${l.motivo}`);
    else {
      log(`checkout local ${op.local}: HEAD ${l.head.slice(0, 12)}${l.head === head ? " = remoto" : ` \u2260 remoto ${head.slice(0, 12)}`}${l.tieneSha === false ? " (no tiene el SHA remoto: \xBFpull pendiente?)" : l.tieneSha ? " (tiene el SHA remoto)" : ""}`);
      if (l.head !== head && l.tieneSha) log("el checkout local va por delante del remoto: \xBFpush pendiente? Los pines siguen al \xFAltimo publicado");
    }
  }
  if (nuevoPedido !== "ultimo" && !await publicado(nuevo, op)) {
    console.error(`[pin] ${op.repo}@${nuevo} no responde en jsDelivr: publ\xEDcalo antes de pinear. Nada se toc\xF3.`);
    return 3;
  }
  const r = actualizarPines(nuevo, op, viejo ? [String(viejo)] : null);
  log(`${r.viejos.map((s) => s.slice(0, 12)).join(", ") || "(ya homog\xE9neo)"} \u2192 ${nuevo.slice(0, 12)} \xB7 ${r.n} reemplazos en ${r.tocados.length} archivos${op.dryRun ? " (dry-run)" : ""}`);
  for (const f of r.tocados) log(`  ${f}`);
  const { mutables } = inventario(op);
  if (mutables.length) {
    log(`ALERTA: quedan refs mutables (corr\xEDgelas a mano):
  ${mutables.join("\n  ")}`);
    return 1;
  }
  log("siguiente: build + tests del consumidor");
  return 0;
}
function esPrincipal() {
  if (!/\/pin-update\.m?[jt]s(?:[?#].*)?$/.test(import.meta.url)) return false;
  if (import.meta.main === true) return true;
  const a = process.argv[1];
  if (!a) return false;
  if (import.meta.url === a) return true;
  try {
    return import.meta.url === pathToFileURL(a).href;
  } catch {
    return false;
  }
}
var ALIAS, RAICES_DEFAULT, SALTAR_DEFAULT, EXT, ONLINE, CABECERA_VENDOR, SHA, auth, esc, log;
var init_pin_update = __esm({
  async "src/vendor-distributions/shared/tools/pin-update.mjs"() {
    ALIAS = { "is-webcomponents": ["iswc-root"], "iswc-root": ["is-webcomponents"] };
    RAICES_DEFAULT = ["index.html", "sw.js", "staticwebapp.config.json", "manifest.json", "src", "view", "demo", "public"];
    SALTAR_DEFAULT = ["node_modules", "vendor", "dist", ".tmp-scss", ".git"];
    EXT = /\.(html|ts|js|mjs|json|css|scss|md)$/;
    ONLINE = /raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/main\/(?:dist\/cdn\/)?(?:vendor-distributions\/(?:shared\/tools\/(?:vendor|pin-update)|client\/tools\/(?:download-iconify|render-lote))\.(?:ts|mjs)|skills\/[^/\s]+\/tools\/[^/\s]+\.(?:ts|mjs))\b|--reload=https:\/\/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(?![\w-])/;
    CABECERA_VENDOR = /^\s*(?:(?:\/\/|<!--|#|\/?\*)\s*@vendor\s|"\$vendor"\s*:)/;
    SHA = /^[0-9a-f]{40}$/;
    auth = () => process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    log = (m) => console.log(`[pin] ${m}`);
    if (esPrincipal()) {
      const args2 = Object.fromEntries(process.argv.slice(2).map((a) => {
        const [k, ...v] = a.replace(/^--/, "").split("=");
        return [k, v.length ? v.join("=") : true];
      }));
      const op = opciones(args2);
      log(`${op.repo} \xB7 ra\xEDces: ${op.raices.join(", ")}`);
      if (!args2.nuevo) {
        const { pines, mutables, legados } = inventario(op);
        for (const [sha2, fs] of pines) log(`  ${sha2}  (${fs.size} archivos)`);
        if (!pines.size) log("  sin pines de este repo");
        if (pines.size > 1) log("  ALERTA: pines heterog\xE9neos \u2192 --nuevo=<sha40|ultimo>");
        if (mutables.length) log(`  ALERTA: refs mutables:
    ${mutables.join("\n    ")}`);
        if (legados.size) log(`  ALERTA: nombre anterior del repo (\u2192 ${op.nombre}; se corrige con --nuevo):
    ${[...legados].join("\n    ")}`);
        process.exit(pines.size > 1 || mutables.length || legados.size ? 1 : 0);
      }
      process.exit(await protocolo(String(args2.nuevo), op, args2.viejo ? String(args2.viejo) : ""));
    }
  }
});

// skills/iswc-foundation/tools/create-iswc-app.ts
import { existsSync as existsSync2, mkdirSync, readdirSync as readdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { basename, dirname, join as join2, resolve } from "node:path";
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
if (existsSync2(destino) && readdirSync2(destino).length) {
  console.error(`create-iswc-app: ${destino} existe y no est\xE1 vac\xEDa (no se pisa nada).`);
  Deno.exit(2);
}
var AQUI = new URL("./", import.meta.url);
var remoto = AQUI.protocol !== "file:";
var KIT = new URL("../../../", AQUI);
async function leer(url) {
  if (!remoto) return readFileSync2(fileURLToPath(url), "utf8");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`create-iswc-app: ${r.status} ${url.href}`);
  return r.text();
}
var REPO_KIT = args.repo ?? import.meta.url.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\//)?.[1] ?? import.meta.url.match(/cdn\.jsdelivr\.net\/gh\/([^/]+\/[^/@]+)@/)?.[1] ?? "Jeff-Aporta/iswc-root";
async function shaPorDefecto() {
  const deUrl = import.meta.url.match(/@([0-9a-f]{40})\//)?.[1] ?? import.meta.url.match(/\/([0-9a-f]{40})\//)?.[1];
  if (deUrl) return deUrl;
  if (remoto) {
    const { opciones: opciones2, ultimoPublicado: ultimoPublicado2 } = await init_pin_update().then(() => pin_update_exports);
    const u = await ultimoPublicado2(opciones2({ repo: REPO_KIT, rama: "main" }));
    if (u.sha) return u.sha;
    throw new Error(`create-iswc-app: no pude resolver el \xFAltimo commit publicado de ${REPO_KIT}@main (\xBFsin red?); pasa --sha=<sha40>`);
  }
  try {
    const r = new Deno.Command("git", { args: ["-C", fileURLToPath(KIT), "rev-parse", "origin/main"] }).outputSync();
    const sha2 = new TextDecoder().decode(r.stdout).trim();
    if (/^[0-9a-f]{40}$/.test(sha2)) return sha2;
  } catch {
  }
  const pin = join2(fileURLToPath(KIT), "PIN");
  if (existsSync2(pin)) return readFileSync2(pin, "utf8").trim();
  throw new Error("create-iswc-app: no s\xE9 el SHA del kit; pasa --sha=<sha40>");
}
var nombre = basename(destino);
var prefijo = (args.prefijo ?? nombre.split(/[^a-z0-9]+/i)[0] ?? "app").toLowerCase();
if (!/^[a-z][a-z0-9]*$/.test(prefijo)) {
  console.error(`create-iswc-app: prefijo inv\xE1lido "${prefijo}" (min\xFAsculas y d\xEDgitos, empieza por letra, sin guiones).`);
  Deno.exit(2);
}
var sha = args.sha ?? await shaPorDefecto();
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
  __REPO__: REPO_KIT,
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
  const texto = (await leer(new URL(`../templates/${rel}`, AQUI))).replace(/^[ \t]*(?:\/\/|<!--|#)[ \t]*@vendor \d{4}-\d\d-\d\dT[^\n]*\r?\n/m, "");
  const salida = join2(destino, marcar(rel));
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync2(salida, marcar(texto));
}
var etiqueta = remoto ? sha : `${sha}+local`;
{
  const r = await new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", join2("scripts", "vendor", "vendor-iswc-tools.mjs"), ...remoto ? [] : ["--local"]],
    cwd: destino,
    env: remoto ? {} : { ISWC_LOCAL: fileURLToPath(KIT) },
    stdout: "inherit",
    stderr: "inherit"
  }).output();
  if (r.code) throw new Error(`create-iswc-app: vendor-iswc-tools.mjs fall\xF3 (${r.code})`);
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
