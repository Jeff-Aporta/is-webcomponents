// @vendor 2026-10-13T15:51:18.306Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/tools/pin-update.mjs
// Bundle autocontenido de src/vendor-distributions/shared/tools/pin-update.mjs (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es src/vendor-distributions/shared/tools/pin-update.mjs.

// src/vendor-distributions/shared/tools/pin-update.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
var ALIAS = { "is-webcomponents": ["iswc-root"], "iswc-root": ["is-webcomponents"] };
var RAICES_DEFAULT = ["index.html", "sw.js", "staticwebapp.config.json", "manifest.json", "src", "view", "demo", "public"];
var SALTAR_DEFAULT = ["node_modules", "vendor", "dist", ".tmp-scss", ".git"];
var EXT = /\.(html|ts|js|mjs|json|css|scss|md)$/;
var ONLINE = /raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/main\/(?:dist\/cdn\/)?(?:vendor-distributions\/(?:shared\/tools\/(?:vendor|pin-update)|client\/tools\/(?:download-iconify|render-lote))\.(?:ts|mjs)|skills\/[^/\s]+\/tools\/[^/\s]+\.(?:ts|mjs))\b|--reload=https:\/\/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(?![\w-])/;
var SHA = /^[0-9a-f]{40}$/;
var auth = () => process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
var esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
var log = (m) => console.log(`[pin] ${m}`);
function opciones(o = {}) {
  const repo = String(o.repo || "Jeff-Aporta/is-webcomponents");
  const nombre = repo.split("/")[1];
  const lista = (v, def) => v ? (Array.isArray(v) ? v : String(v).split(",")).map((s) => s.trim()).filter(Boolean) : def;
  return {
    root: o.root ? String(o.root) : process.cwd(),
    repo,
    owner: repo.split("/")[0],
    nombre,
    nombres: [nombre, ...lista(o.alias, ALIAS[nombre] ?? [])],
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
      if (reMutable.test(l) && !ONLINE.test(l)) mutables.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`);
    });
  }
  return { pines, mutables, legados };
}
async function publicado(sha, op = opciones()) {
  const u = `https://cdn.jsdelivr.net/gh/${op.repo}@${sha}/${op.verificar}`;
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
  for (const sha of (await ultimosShas(op)).filter((s) => s !== head)) if (await publicado(sha, op)) return { sha, head };
  return { sha: "", head };
}
function verificarLocal(local, sha = "") {
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
  if (sha) {
    try {
      git("cat-file", "-e", `${sha}^{commit}`);
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
if (esPrincipal()) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }));
  const op = opciones(args);
  log(`${op.repo} \xB7 ra\xEDces: ${op.raices.join(", ")}`);
  if (!args.nuevo) {
    const { pines, mutables, legados } = inventario(op);
    for (const [sha, fs] of pines) log(`  ${sha}  (${fs.size} archivos)`);
    if (!pines.size) log("  sin pines de este repo");
    if (pines.size > 1) log("  ALERTA: pines heterog\xE9neos \u2192 --nuevo=<sha40|ultimo>");
    if (mutables.length) log(`  ALERTA: refs mutables:
    ${mutables.join("\n    ")}`);
    if (legados.size) log(`  ALERTA: nombre anterior del repo (\u2192 ${op.nombre}; se corrige con --nuevo):
    ${[...legados].join("\n    ")}`);
    process.exit(pines.size > 1 || mutables.length || legados.size ? 1 : 0);
  }
  process.exit(await protocolo(String(args.nuevo), op, args.viejo ? String(args.viejo) : ""));
}
export {
  ONLINE,
  SHA,
  actualizarPines,
  inventario,
  opciones,
  protocolo,
  publicado,
  ultimoPublicado,
  ultimoSha,
  ultimosShas,
  verificarLocal
};
