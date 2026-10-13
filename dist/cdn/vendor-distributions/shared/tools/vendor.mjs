// @vendor 2026-10-13T19:16:35.461Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/tools/vendor.mjs
// Bundle autocontenido de src/vendor-distributions/shared/tools/vendor.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es src/vendor-distributions/shared/tools/vendor.ts.
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
      if (reMutable.test(l) && !ONLINE.test(l) && !CABECERA_VENDOR.test(l)) mutables.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`);
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
var ALIAS, RAICES_DEFAULT, SALTAR_DEFAULT, EXT, ONLINE, CABECERA_VENDOR, SHA, auth, esc, log;
var init_pin_update = __esm({
  async "src/vendor-distributions/shared/tools/pin-update.mjs"() {
    ALIAS = { "is-webcomponents": ["iswc-root"], "iswc-root": ["is-webcomponents"] };
    RAICES_DEFAULT = ["index.html", "sw.js", "staticwebapp.config.json", "manifest.json", "src", "view", "demo", "public"];
    SALTAR_DEFAULT = ["node_modules", "vendor", "dist", ".tmp-scss", ".git"];
    EXT = /\.(html|ts|js|mjs|json|css|scss|md)$/;
    ONLINE = /raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/main\/(?:dist\/cdn\/)?(?:vendor-distributions\/(?:shared\/tools\/(?:vendor|pin-update)|client\/tools\/(?:download-iconify|render-lote))\.(?:ts|mjs)|skills\/[^/\s]+\/tools\/[^/\s]+\.(?:ts|mjs))\b|--reload=https:\/\/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(?![\w-])/;
    CABECERA_VENDOR = /^\s*(?:\/\/|<!--|#|\*)\s*@vendor\s/;
    SHA = /^[0-9a-f]{40}$/;
    auth = () => process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    log = (m) => console.log(`[pin] ${m}`);
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
  }
});

// src/vendor-distributions/shared/tools/vendor.ts
import { existsSync as existsSync2, mkdirSync, readdirSync as readdirSync2, readFileSync as readFileSync2, renameSync, statSync, writeFileSync as writeFileSync2 } from "node:fs";
import { basename, dirname, extname, isAbsolute, join as join2, posix, relative as relative2, resolve } from "node:path";
import { execFileSync as execFileSync2 } from "node:child_process";
import process2 from "node:process";
import { pathToFileURL as pathToFileURL2 } from "node:url";

// src/vendor-distributions/shared/schemas.ts
import { z } from "npm:zod@^4.4.3";
var ZConsulta = z.lazy(
  () => z.union([z.boolean(), z.number(), z.string(), z.null(), z.undefined(), z.record(z.string(), ZConsulta)])
);
var ZJson = z.lazy(
  () => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(ZJson), z.record(z.string(), ZJson)])
);
var ZAccionObj = z.discriminatedUnion("op", [
  z.object({ op: z.literal("push"), valor: ZJson }),
  z.object({ op: z.literal("update"), valor: ZJson }),
  z.object({ op: z.literal("insert"), valor: ZJson }),
  z.object({ op: z.literal("delete"), query: ZConsulta }),
  z.object({ op: z.literal("get"), query: ZConsulta }),
  z.object({ op: z.literal("getValue"), query: ZConsulta })
]);
var ZRefObj = z.object({
  path: z.string().min(1),
  query: ZConsulta,
  actions: z.array(ZAccionObj).optional()
});
var ZCooldownLlave = z.union([z.string().datetime({ offset: true }), z.literal(-1)]);
var ZEntradaLlave = z.object({ nombre: z.string().min(1).optional(), model: z.string().optional(), cooldownHasta: ZCooldownLlave.optional() }).passthrough();
var ZProveedorLlm = z.object({
  /** Id del proveedor (`deepseek`, `minimax`, `openai`…); por defecto el `model`. */
  nombre: z.string().trim().min(1).optional(),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
  /** Base del API sin barra final. Default OpenAI. */
  baseUrl: z.string().trim().min(1).default("https://api.openai.com/v1"),
  /** Cuerpo extra que el proveedor exige o acepta (p. ej. MiniMax: `{ thinking: { type: 'disabled' } }`). */
  extra: z.record(z.string(), z.unknown()).optional()
}).transform((p) => ({ ...p, nombre: p.nombre ?? p.model, baseUrl: p.baseUrl.replace(/\/+$/, "") }));
var ZArchivoProveedores = z.object({ proveedores: z.array(z.unknown()).default([]) });
var ZCacheProveedor = z.object({ nombre: z.string().min(1), ts: z.number() });
var ZLlaveJev = z.object({
  nombre: z.string().min(1).default("jev"),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).default("jev-latest"),
  baseUrl: z.string().trim().min(1).default("https://api.typesafe.ai/v1")
}).passthrough().transform((j) => ({ ...j, baseUrl: j.baseUrl.replace(/\/+$/, "") }));
var ZPreguntaJev = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), instructions: z.string().min(1) }),
  z.object({ type: z.literal("choice"), instructions: z.string().min(1), criteria: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal("score"), instructions: z.string().min(1), criteria: z.array(z.string()).min(2) })
]);
var ZRespuestaJev = z.object({
  type: z.enum(["noul", "choice", "score"]),
  noul: z.number().optional(),
  choice: z.string().optional(),
  score: z.number().optional(),
  confidence: z.number().optional(),
  probabilities: z.record(z.string(), z.number()).optional()
}).passthrough();
var ZCuerpoJev = z.object({ model: z.string().optional(), answers: z.record(z.string(), ZRespuestaJev) }).passthrough();
var PERFILES = ["shared", "server", "client"];
var ZPerfilVendor = z.enum(["server", "client"]);
var ZArchivoVendor = z.object({
  /** Ruta en el repo (p. ej. `dist/cdn/vendor-distributions/shared/lib/obj.ts` o `skills/iswc-foundation`). */
  desde: z.string().min(1),
  /** Ruta en el consumidor, relativa a `raiz` (p. ej. `src/sources/000 Base/ISU/obj.ts` o `skills/iswc-foundation`). */
  hacia: z.string().min(1),
  /** Documentación del archivo en el repo (va como `@doc` en la cabecera). */
  doc: z.string().min(1).optional(),
  /** `true`: `desde` es una carpeta; se trae el árbol completo bajo `hacia` (listado del checkout local o de jsDelivr). */
  carpeta: z.boolean().optional()
});
var ZPinVendor = z.object({
  /** `false` no corre el protocolo de pines. Default `true`. */
  activo: z.boolean().default(true),
  /** Rutas (relativas a `raiz`) a barrer en busca de pines. Default: las de `pin-update.mjs` (front típico). */
  raices: z.array(z.string().min(1)).optional(),
  /** Carpetas que no se barren. Default: `node_modules, vendor, dist, .tmp-scss, .git`. */
  saltar: z.array(z.string().min(1)).optional(),
  /** Archivo que debe existir en el pin para darlo por publicado. Default `dist/cdn/core/loader.min.js`. */
  verificar: z.string().min(1).optional(),
  /** Pin a usar como fuente web cuando el consumidor no cita ningún `<repo>@<sha40>` (p. ej. un server sin front). */
  sha: z.string().regex(/^[0-9a-f]{40}$/).optional()
});
var ZConfigVendor = z.object({
  /** `dueño/repo` en GitHub (el kit u otro: el barrido sirve para cualquier repo). */
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  /** Rama que se sigue (para el protocolo de pines y como respaldo sin pin). */
  rama: z.string().min(1).default("main"),
  /** Checkout local del repo (opcional): compite por fecha con la web; si no existe, se omite. */
  local: z.string().optional(),
  /**
   * Perfil del consumidor (`server` o `client`): solo se bajan `vendor-distributions/shared/` y
   * `vendor-distributions/<perfil>/`; con `server`, además, ningún archivo puede traer dependencias de
   * navegador. Sin perfil se baja todo (modo anterior) con aviso.
   */
  perfil: ZPerfilVendor.optional(),
  /** Raíz del consumidor (base de `hacia` y del barrido). Por defecto, el directorio desde el que se corre. */
  raiz: z.string().optional(),
  /** Carpetas a barrer en busca de cabeceras `@vendor` (relativas a `raiz`). Default: toda la raíz. */
  raices: z.array(z.string().min(1)).optional(),
  /** Carpetas que el barrido no entra, además de `node_modules, .git, dist, _entregable, .tmp*`. */
  saltar: z.array(z.string().min(1)).optional(),
  /** Protocolo de pines y pin de respaldo (ver `ZPinVendor`). */
  pin: ZPinVendor.optional(),
  /** Altas: lo que aún no existe en el consumidor. Vacío = solo barrido. */
  archivos: z.array(ZArchivoVendor).default([])
});
var IconIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
var OpcionesDescargaSchema = z.object({
  /** Raíz de la app (carpeta o URL `file:`). */
  raiz: z.union([z.string(), z.instanceof(URL)]),
  /** Archivos o carpetas a barrer, relativos a la raíz. */
  roots: z.array(z.string()).min(1),
  /** Carpeta de salida, relativa a la raíz: ahí va `iconify/`. */
  salida: z.string().optional(),
  /** Ids que el barrido no puede ver (armados en ejecución, o los que pintan los componentes del kit: el aviso `[iswc-icon] falta en local:` los nombra). */
  extra: z.array(IconIdSchema).optional(),
  /** Nombres de carpeta que no se barren. */
  ignorar: z.array(z.string()).optional(),
  /** Extensiones barridas. */
  extensiones: z.array(z.string()).optional(),
  /** Borrar SVG de `iconify/` que ya nadie usa. */
  podar: z.boolean().optional(),
  /** Sin red: conserva lo que ya está en disco. */
  offline: z.boolean().optional(),
  /** API de Iconify. */
  api: z.string().url().optional(),
  /** Descargas en paralelo. */
  concurrencia: z.number().int().positive().optional(),
  /** Silencio en consola. */
  silencioso: z.boolean().optional()
});
var ResumenDescargaSchema = z.object({
  archivos: z.number(),
  encontrados: z.number(),
  descargados: z.array(IconIdSchema),
  existentes: z.number(),
  inexistentes: z.array(IconIdSchema),
  podados: z.array(IconIdSchema),
  avisos: z.array(z.string()),
  /** Carpeta de los SVG, relativa a la raíz (`assets/iconify`). */
  carpeta: z.string()
});
var CajaIconifySchema = { width: z.number().optional(), height: z.number().optional(), left: z.number().optional(), top: z.number().optional() };
var IconifyJsonSchema = z.object({
  ...CajaIconifySchema,
  icons: z.record(z.string(), z.object({ body: z.string(), ...CajaIconifySchema })).optional(),
  aliases: z.record(z.string(), z.unknown()).optional()
});
var EditableSchema = z.object({
  slug: z.string().optional(),
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
  payload: z.unknown()
});
var OpcionesEditablesSchema = z.object({
  /** Slugs a renderizar (vacío = todos). */
  only: z.array(z.string()).optional(),
  /** Archivos de solo soporte (incrustados por otros): no se dibujan. */
  soporte: z.array(z.string()).optional(),
  /** Defaults si el editable no los trae. */
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional()
});
var EditableLoteSchema = z.object({
  /** Nombre de salida; por defecto el del archivo sin `.json`. */
  slug: z.string().optional(),
  /** Módulo de docs al que pertenece (entra en la huella). */
  module: z.string().optional(),
  /** Custom element del kit (`iswc-flowchart`, `iswc-er-diagram`…). */
  tag: z.string(),
  /** Módulo relativo a `<kit>/dist/cdn/` (`diagrams/flowchart.min.js`). */
  script: z.string(),
  attrs: z.record(z.string(), z.string()).optional(),
  /** Payload declarativo; puede llevar referencias `{ path, query, actions }` relativas al editable. */
  payload: z.unknown(),
  oficial: z.boolean().optional()
});
var OpcionesLoteDatosSchema = z.object({
  /** Carpeta de editables `<slug>.json`. */
  carpeta: z.string().min(1),
  /** Carpeta de salida de los SVG. */
  salidaSvg: z.string().min(1),
  /** Carpeta de salida de los PNG (si `png`). */
  salidaPng: z.string().min(1),
  /** Archivo de caché; por defecto `<carpeta>/diagramas-iswc.cache.json`. */
  cache: z.string().optional(),
  /**
   * Raíz de un checkout del kit (opcional): si está, `dist/cdn/…` y Playwright salen de ahí. Sin él (o para lo que
   * falte), `dist/cdn/…` se pide a `https://raw.githubusercontent.com/<repo>/<pinKit|main>/` y Playwright sale del
   * `package.json` del directorio actual (o de `npm:playwright`).
   */
  kit: z.string().min(1).optional(),
  /** Sello del kit que entra en la huella; por defecto `<kit>/PIN` o `dist/cdn/build-stamp.json`. */
  pinKit: z.string().optional(),
  /** Slugs a procesar (vacío = todos). */
  solo: z.array(z.string()).optional(),
  /** Ignora el caché: renderiza todo. */
  forzar: z.boolean().optional(),
  /** Intentos por diagrama (Chromium a veces no arranca). Default 5. */
  intentos: z.number().int().positive().optional(),
  /** Timeout del render de cada diagrama (ms). Default 300_000. */
  timeoutMs: z.number().int().positive().optional(),
  /** Espera tras ready antes de extraer (ms). Default 500. */
  settleMs: z.number().int().nonnegative().optional(),
  /** También PNG. Default true. */
  png: z.boolean().optional()
});
var EntradaCacheSchema = z.object({
  huella: z.string().length(64),
  svg: z.string(),
  png: z.string().nullable(),
  fecha: z.string(),
  ancho: z.number().nullable(),
  alto: z.number().nullable()
});
var CacheLoteSchema = z.object({
  version: z.number().int(),
  diagramas: z.record(z.string(), EntradaCacheSchema)
});

// src/vendor-distributions/shared/tools/vendor.ts
var SCHEMAS = "schemas.ts";
var SECCION_COMUN = "comun";
var EXTENSIONES = [".ts", ".js", ".mjs", ".cjs", ".md", ".css", ".html", ".json"];
var SALTAR = ["node_modules", ".git", "dist", "_entregable", ".tmp", ".tmp-scss"];
var RE_CODIGO = /\.(m?[jt]s|cjs)$/;
var sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
var RE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bcreateRequire\s*\([^)]*\)\s*\(\s*)["']([^"']+)["']/g;
var RE_NAVEGADOR = /^(?:npm:)?(?:playwright(?:-core)?|@playwright\/|puppeteer(?:-core)?|@browserbasehq\/|chromium|chrome-launcher|jsdom|happy-dom|@stagehand\/)/;
var RE_SECCION = /^\/\/ ===== @seccion (\S+)(?: \[requiere: ([^\]]*)\])? =====\r?\n([\s\S]*?)^\/\/ ===== @fin \1 =====\r?\n?/gm;
var RE_CUERPO = /^(\S+)(?:\s+([^\s@]+\/[^\s@]+)@(\S+)\s+(\S+))?\s*$/;
function perfilDeRuta(ruta) {
  const m = ruta.replaceAll("\\", "/").match(/(?:^|\/)vendor-distributions\/(.*)$/);
  if (!m) return null;
  const primero = m[1].split("/")[0];
  return PERFILES.includes(primero) && m[1].includes("/") ? primero : "sin-perfil";
}
function dependenciasDeNavegador(codigo) {
  const out = /* @__PURE__ */ new Set();
  for (const m of sinComentarios(codigo).matchAll(RE_SPECIFIER)) if (RE_NAVEGADOR.test(m[1])) out.add(m[1]);
  return [...out];
}
function bloqueoDePerfil(desde, perfil) {
  const p = perfilDeRuta(desde);
  if (p === null || p === "shared" || p === perfil) return null;
  if (p === "sin-perfil") return `ruta de vendor-distributions sin perfil (anterior al 2026-10-12): usa vendor-distributions/{shared,${perfil}}/\u2026`;
  return `es del perfil ${p} y el consumidor declara ${perfil}: solo baja shared/ y ${perfil}/`;
}
function estiloDe(ruta) {
  const e = extname(ruta).toLowerCase();
  if (e === ".ts" || e === ".js" || e === ".mjs" || e === ".cjs") return "linea";
  if (e === ".md" || e === ".html") return "html";
  if (e === ".css") return "css";
  if (e === ".json") return "json";
  return null;
}
var ENVOLTORIO = {
  linea: (c) => `// ${c}`,
  html: (c) => `<!-- ${c} -->`,
  css: (c) => `/* ${c} */`
};
var RE_LINEA_CABECERA = {
  linea: /^\/\/ @(vendor|doc) ([^\n]*?)\r?\n/,
  html: /^<!-- @(vendor|doc) ([^\n]*?) -->\r?\n/,
  css: /^\/\* @(vendor|doc) ([^\n]*?) \*\/\r?\n/
};
function partirFrontMatter(texto, ruta) {
  if (!ruta.toLowerCase().endsWith(".md")) return { fm: "", resto: texto };
  const m = texto.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? { fm: m[0], resto: texto.slice(m[0].length) } : { fm: "", resto: texto };
}
function parsearCuerpo(cuerpo) {
  const m = cuerpo.trim().match(RE_CUERPO);
  if (!m) return null;
  const d = new Date(m[1]);
  if (isNaN(d.getTime())) return null;
  return { fecha: d.toISOString(), repo: m[2] ?? null, sha: m[3] ?? null, desde: m[4] ?? null };
}
function leerCabecera(texto, ruta) {
  const estilo = estiloDe(ruta);
  if (!estilo) return null;
  if (estilo === "json") {
    const v = texto.match(/"\$vendor"\s*:\s*"([^"]*)"/)?.[1];
    const c = v ? parsearCuerpo(v) : null;
    return c ? { ...c, doc: texto.match(/"\$doc"\s*:\s*"([^"]*)"/)?.[1] ?? null } : null;
  }
  const re = RE_LINEA_CABECERA[estilo];
  let resto = partirFrontMatter(texto, ruta).resto;
  let cab = null;
  let doc = null;
  for (let i = 0; i < 2; i++) {
    const m = resto.match(re);
    if (!m) break;
    if (m[1] === "vendor") cab = parsearCuerpo(m[2]);
    else doc = m[2].trim();
    resto = resto.slice(m[0].length);
  }
  return cab ? { ...cab, doc } : null;
}
function docDeCabecera(texto, ruta) {
  const estilo = estiloDe(ruta);
  if (!estilo) return null;
  if (estilo === "json") return texto.match(/"\$doc"\s*:\s*"([^"]*)"/)?.[1] ?? null;
  const re = RE_LINEA_CABECERA[estilo];
  let resto = partirFrontMatter(texto, ruta).resto;
  for (let i = 0; i < 2; i++) {
    const m = resto.match(re);
    if (!m) break;
    if (m[1] === "doc") return m[2].trim();
    resto = resto.slice(m[0].length);
  }
  return null;
}
function sinCabecera(texto, ruta) {
  const estilo = estiloDe(ruta);
  if (!estilo) return texto;
  if (estilo === "json") {
    try {
      const v = JSON.parse(texto);
      if (!v || typeof v !== "object" || Array.isArray(v)) return texto;
      const { $vendor: _v, $doc: _d, ...resto2 } = v;
      return `${JSON.stringify(resto2, null, 2)}
`;
    } catch {
      return texto;
    }
  }
  const re = RE_LINEA_CABECERA[estilo];
  const { fm, resto } = partirFrontMatter(texto, ruta);
  let t = resto;
  while (re.test(t)) t = t.replace(re, "");
  return fm + t;
}
function conCabecera(texto, ruta, cuerpo, doc) {
  const estilo = estiloDe(ruta);
  if (!estilo) return texto;
  const limpio = sinCabecera(texto, ruta);
  if (estilo === "json") {
    const v = JSON.parse(limpio);
    return `${JSON.stringify({ $vendor: cuerpo, ...doc ? { $doc: doc } : {}, ...v }, null, 2)}
`;
  }
  const env = ENVOLTORIO[estilo];
  const { fm, resto } = partirFrontMatter(limpio, ruta);
  return `${fm}${env(`@vendor ${cuerpo}`)}
${doc ? `${env(`@doc ${doc}`)}
` : ""}${resto}`;
}
function fechaCopia(archivo) {
  if (!existsSync2(archivo)) return null;
  return leerCabecera(readFileSync2(archivo, "utf8"), archivo)?.fecha ?? null;
}
var claveKit = (ruta) => posix.normalize(ruta.replaceAll("\\", "/")).replace(RE_CODIGO, "");
var moduloDe = (ruta) => basename(ruta.replaceAll("\\", "/")).replace(RE_CODIGO, "");
var esSkill = (ruta) => /^skills\//.test(ruta.replaceAll("\\", "/"));
var esSchemas = (ruta) => basename(ruta.replaceAll("\\", "/")) === SCHEMAS;
function seccionesDeSchemas(texto) {
  const secciones = /* @__PURE__ */ new Map();
  let primera = texto.length;
  for (const m of texto.matchAll(RE_SECCION)) {
    primera = Math.min(primera, m.index);
    const requiere = (m[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    secciones.set(m[1], { requiere, texto: m[0] });
  }
  return { cabecera: texto.slice(0, primera), secciones };
}
function podarSchemas(texto, modulos) {
  const { cabecera, secciones } = seccionesDeSchemas(texto);
  if (!secciones.size) return { texto, secciones: [] };
  const quedan = /* @__PURE__ */ new Set([SECCION_COMUN]);
  const pendientes = [...modulos];
  while (pendientes.length) {
    const s = pendientes.pop();
    const sec = secciones.get(s);
    if (!sec || quedan.has(s)) continue;
    quedan.add(s);
    pendientes.push(...sec.requiere);
  }
  const orden = [...secciones.keys()].filter((s) => quedan.has(s));
  return { texto: cabecera.replace(/\s*$/, "\n\n") + orden.map((s) => secciones.get(s).texto).join("\n"), secciones: orden };
}
function reescribirRelativos(texto, desde, destino, destinos) {
  return texto.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.?\/[^"']+)\2/g, (todo, pre, q, spec) => {
    const otros = destinos.get(claveKit(posix.join(posix.dirname(desde.replaceAll("\\", "/")), spec)));
    if (!otros?.length) return todo;
    const otro = otros.find((o) => dirname(o) === dirname(destino)) ?? otros[0];
    let rel = relative2(dirname(destino), otro).replaceAll("\\", "/");
    if (!rel.startsWith(".")) rel = `./${rel}`;
    const ext = spec.match(RE_CODIGO)?.[0];
    rel = ext ? rel.replace(RE_CODIGO, ext) : rel.replace(RE_CODIGO, "");
    return `${pre}${q}${rel}${q}`;
  });
}
function reescribirSkill(texto, destino, raiz, altas, repo, ref) {
  return texto.replace(/^(\s*(?:\*|\/\/)\s*Skill:\s*)(skills\/\S+)/m, (_, pre, ruta) => {
    const local = join2(raiz, ruta);
    if (existsSync2(local) || altas.has(ruta)) {
      let rel = relative2(dirname(destino), local).replaceAll("\\", "/");
      if (!rel.startsWith(".")) rel = `./${rel}`;
      return `${pre}${rel}`;
    }
    return `${pre}https://cdn.jsdelivr.net/gh/${repo}@${ref}/${ruta}`;
  });
}
function importsFaltantes(archivo) {
  if (!existsSync2(archivo)) return [];
  const texto = sinComentarios(readFileSync2(archivo, "utf8"));
  const faltan = /* @__PURE__ */ new Set();
  for (const m of texto.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.\.?\/[^"']+)["']/g)) {
    const ruta = resolve(dirname(archivo), m[1]);
    const alternas = [ruta, ruta.replace(/\.js$/, ".ts"), ruta.replace(/\.ts$/, ".js"), ruta.replace(/\.mjs$/, ".mts")];
    if (!alternas.some((r) => existsSync2(r))) faltan.add(m[1]);
  }
  return [...faltan];
}
function fechaLocal(checkout, ruta) {
  const f = join2(checkout, ruta);
  if (!existsSync2(f)) return null;
  let sucio = true;
  try {
    sucio = !!execFileSync2("git", ["-C", checkout, "status", "--porcelain", "--", ruta], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
  }
  if (sucio) return (/* @__PURE__ */ new Date()).toISOString();
  const cab = leerCabecera(readFileSync2(f, "utf8"), f);
  if (cab) return cab.fecha;
  try {
    const iso = execFileSync2("git", ["-C", checkout, "log", "-1", "--format=%cI", "--", ruta], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return iso ? new Date(iso).toISOString() : null;
  } catch {
    return null;
  }
}
function cabecerasApi() {
  const h = { "User-Agent": "iswc-vendor", Accept: "application/vnd.github+json" };
  if (process2.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process2.env.GITHUB_TOKEN}`;
  return h;
}
async function cabezaRemota(repo, rama, fetchFn) {
  try {
    const r = await fetchFn(`https://api.github.com/repos/${repo}/commits/${rama}`, { headers: cabecerasApi() });
    if (r.ok) {
      const c = await r.json();
      const fecha = c.commit?.committer?.date ?? c.commit?.author?.date;
      if (c.sha && fecha) return { sha: c.sha, fecha: new Date(fecha).toISOString() };
    }
  } catch {
  }
  try {
    const r = await fetchFn(`https://data.jsdelivr.com/v1/package/resolve/gh/${repo}@${rama}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.version && /^[0-9a-f]{40}$/.test(j.version) ? { sha: j.version, fecha: null } : null;
  } catch {
    return null;
  }
}
async function fechaEnPin(repo, sha, ruta, fetchFn) {
  try {
    const r = await fetchFn(`https://api.github.com/repos/${repo}/commits?sha=${sha}&path=${encodeURIComponent(ruta)}&per_page=1`, { headers: cabecerasApi() });
    if (!r.ok) return null;
    const l = await r.json();
    const fecha = l[0]?.commit?.committer?.date ?? l[0]?.commit?.author?.date;
    return fecha ? new Date(fecha).toISOString() : null;
  } catch {
    return null;
  }
}
function cacheFechas(raiz) {
  const ruta = join2(raiz, ".tmp", "vendor-fechas.json");
  let datos = {};
  try {
    datos = existsSync2(ruta) ? JSON.parse(readFileSync2(ruta, "utf8")) : {};
  } catch {
    datos = {};
  }
  return {
    leer: (k) => datos[k],
    guardar: (k, v) => {
      datos[k] = v;
      try {
        mkdirSync(dirname(ruta), { recursive: true });
        writeFileSync2(ruta, `${JSON.stringify(datos, null, 2)}
`);
      } catch {
      }
    }
  };
}
function archivosDeSkill(desde, lista) {
  if (!esSkill(desde)) return [...lista];
  return lista.filter((f) => !/\/tools\//.test(f) && !/\.(m?[jt]s|cjs)$/.test(f));
}
async function listarEnWeb(repo, sha, prefijo, fetchFn) {
  try {
    const r = await fetchFn(`https://data.jsdelivr.com/v1/package/gh/${repo}@${sha}/flat`);
    if (!r.ok) return null;
    const j = await r.json();
    const p = `/${prefijo.replace(/\/$/, "")}/`;
    return (j.files ?? []).map((f) => f.name).filter((n) => n.startsWith(p)).map((n) => n.slice(1));
  } catch {
    return null;
  }
}
function listarEnLocal(checkout, prefijo) {
  const out = [];
  const base = join2(checkout, prefijo);
  if (!existsSync2(base)) return out;
  const walk = (d) => {
    for (const e of readdirSync2(d, { withFileTypes: true })) {
      const p = join2(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative2(checkout, p).replaceAll("\\", "/"));
    }
  };
  walk(base);
  return out.sort();
}
function barrer(raiz, raices = ["."], saltar = SALTAR) {
  const out = [];
  const salta = (n) => saltar.some((s) => n === s || s.endsWith("*") && n.startsWith(s.slice(0, -1)) || s === ".tmp" && n.startsWith(".tmp"));
  const walk = (d) => {
    for (const e of readdirSync2(d, { withFileTypes: true })) {
      const p = join2(d, e.name);
      if (e.isDirectory()) {
        if (!salta(e.name)) walk(p);
      } else if (estiloDe(e.name)) out.push(relative2(raiz, p).replaceAll("\\", "/"));
    }
  };
  for (const r of raices) {
    const p = resolve(raiz, r);
    if (!existsSync2(p)) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (estiloDe(p)) out.push(relative2(raiz, p).replaceAll("\\", "/"));
  }
  return [...new Set(out)].sort();
}
function inventariar(raiz, archivos2, repo) {
  const vendorizados = [];
  const pines = /* @__PURE__ */ new Map();
  const nombre = repo.split("/")[1];
  const rePin = new RegExp(`(?:${nombre}|iswc-root|is-webcomponents)@([0-9a-f]{40})`, "g");
  for (const h of archivos2) {
    let t;
    try {
      t = readFileSync2(join2(raiz, h), "utf8");
    } catch {
      continue;
    }
    const cab = leerCabecera(t, h);
    if (cab) vendorizados.push({ hacia: h, cabecera: cab });
    for (const m of t.matchAll(rePin)) pines.set(m[1], (pines.get(m[1]) ?? 0) + 1);
  }
  return { vendorizados, pines };
}
var MARCA_README = "<!-- generado por vendor.ts: \xEDndice de skills propias y comunes; se regenera en cada vendor -->";
function generarReadmeSkills(raiz, log2 = () => {
}) {
  const dir = join2(raiz, "skills");
  if (!existsSync2(dir)) return null;
  const readme = join2(dir, "README.md");
  if (existsSync2(readme) && !readFileSync2(readme, "utf8").includes(MARCA_README)) {
    log2(`[vendor] AVISO skills/README.md existe y no lo gener\xF3 vendor.ts: no se toca (agrega la marca \xAB${MARCA_README}\xBB para que lo regenere)`);
    return null;
  }
  const propias = [];
  const comunes = [];
  for (const e of readdirSync2(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory()) continue;
    const skill = join2(dir, e.name, "SKILL.md");
    const cab = existsSync2(skill) ? leerCabecera(readFileSync2(skill, "utf8"), skill) : null;
    const n = listarEnLocal(dir, e.name).length;
    if (cab) comunes.push(`| [${e.name}](${e.name}/SKILL.md) | ${cab.repo ?? "?"}@main \xB7 \`${cab.desde ?? ""}\` | ${cab.fecha} | ${n} |`);
    else propias.push(`| [${e.name}](${existsSync2(skill) ? `${e.name}/SKILL.md` : e.name}) | ${n} |`);
  }
  const texto = [
    MARCA_README,
    "# Skills de este proyecto",
    "",
    "Punto de entrada de los agentes: aqu\xED est\xE1n las skills PROPIAS del proyecto y las COMUNES que vienen del kit por",
    "vendor (`vendor.ts`, barrido por cabecera `<!-- @vendor <ISO> <repo>@<sha> <desde> -->` en cada .md). Las comunes no",
    "se editan aqu\xED: se cambian en el kit y el siguiente `vendor` las trae (gana la fecha m\xE1s reciente entre el checkout",
    "local y el pin del proyecto en jsDelivr). Una skill propia nunca se pisa: si una alta choca con un archivo sin",
    "cabecera `@vendor`, `vendor.ts` falla con un error claro.",
    "",
    "## Propias",
    "",
    "| Skill | Archivos |",
    "| --- | --- |",
    ...propias.length ? propias : ["| (ninguna) | |"],
    "",
    "## Comunes (del kit, por vendor)",
    "",
    "| Skill | Origen | @vendor | Archivos |",
    "| --- | --- | --- | --- |",
    ...comunes.length ? comunes : ["| (ninguna) | | | |"],
    ""
  ].join("\n");
  writeFileSync2(readme, texto);
  return readme;
}
async function vendorizar(entrada, opciones2 = {}) {
  const cfg = ZConfigVendor.parse(entrada);
  const raiz = resolve(opciones2.raiz ?? cfg.raiz ?? ".");
  const fetchFn = opciones2.fetchFn ?? fetch;
  const log2 = opciones2.log ?? (() => {
  });
  const local = cfg.local && existsSync2(cfg.local) ? cfg.local : null;
  const destinoDe = (hacia) => isAbsolute(hacia) ? hacia : join2(raiz, hacia);
  const out = [];
  const { vendorizados, pines } = inventariar(raiz, barrer(raiz, cfg.raices ?? ["."], [...SALTAR, ...cfg.saltar ?? []]), cfg.repo);
  const pinBarrido = [...pines.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const pin = pinBarrido ?? cfg.pin?.sha ?? null;
  const cabeza = await cabezaRemota(cfg.repo, cfg.rama, fetchFn);
  if (cfg.local && !local) log2(`[vendor] checkout local omitido: no existe o no es legible (${cfg.local})`);
  log2(`[vendor] fuentes: ${local ? `local ${local}` : "sin local"} \xB7 web ${cfg.repo}@${cfg.rama}${cabeza ? ` (HEAD ${cabeza.sha.slice(0, 12)}${cabeza.fecha ? "" : ", sin API de GitHub: fechas por jsDelivr"})` : " (sin red)"}${pin ? ` \xB7 pin ${pin.slice(0, 12)}${pinBarrido ? ` (${pines.get(pinBarrido)} referencias)` : " (de la config)"}` : " \xB7 sin pin"}`);
  const fechas = cacheFechas(raiz);
  const fechaEnSha = async (sha, desde, fechaCommit) => {
    const k = `${cfg.repo}@${sha}:${desde}`;
    const c = fechas.leer(k);
    if (c !== void 0) return c;
    const f = await fechaEnPin(cfg.repo, sha, desde, fetchFn) ?? fechaCommit;
    if (f) fechas.guardar(k, f);
    return f;
  };
  const fechaJsDelivrMain = async (desde) => {
    try {
      const r = await fetchFn(`https://cdn.jsdelivr.net/gh/${cfg.repo}@${cfg.rama}/${desde}`, { method: "HEAD" });
      const lm = r.ok ? r.headers.get("last-modified") : null;
      const d = lm ? new Date(lm) : null;
      return d && !isNaN(d.getTime()) ? d.toISOString() : null;
    } catch {
      return null;
    }
  };
  const fechaWeb = async (desde) => {
    const candidatos = [];
    const fMain = (cabeza ? await fechaEnSha(cabeza.sha, desde, cabeza.fecha) : null) ?? await fechaJsDelivrMain(desde);
    if (fMain) candidatos.push({ fecha: fMain, ref: cabeza?.sha ?? cfg.rama });
    if (pin && pin !== cabeza?.sha) {
      const fPin = await fechaEnSha(pin, desde, null);
      if (fPin) candidatos.push({ fecha: fPin, ref: pin });
    }
    return candidatos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0] ?? null;
  };
  const trabajos = [];
  const altasRutas = /* @__PURE__ */ new Set();
  for (const a of cfg.archivos ?? []) {
    if (a.carpeta) {
      const lista = local ? listarEnLocal(local, a.desde) : await listarEnWeb(cfg.repo, cabeza?.sha ?? pin ?? cfg.rama, a.desde, fetchFn);
      if (!lista) {
        out.push({ desde: a.desde, hacia: a.hacia, estado: "error", previa: null, error: "carpeta: no se pudo listar (sin checkout local ni red)" });
        continue;
      }
      for (const f of archivosDeSkill(a.desde, lista)) {
        const rel = f.slice(a.desde.replace(/\/$/, "").length + 1);
        const hacia = posix.join(a.hacia.replaceAll("\\", "/"), rel);
        trabajos.push({ desde: f, hacia, destino: destinoDe(hacia), doc: a.doc, previa: null, alta: true });
      }
    } else {
      trabajos.push({ desde: a.desde, hacia: a.hacia, destino: destinoDe(a.hacia), doc: a.doc, previa: null, alta: true });
    }
  }
  for (const t of trabajos) {
    altasRutas.add(t.desde);
    const texto = existsSync2(t.destino) ? readFileSync2(t.destino, "utf8") : null;
    t.previa = texto !== null ? leerCabecera(texto, t.destino) : null;
    t.alta = texto === null;
  }
  const yaEnAltas = new Set(trabajos.map((t) => t.destino));
  for (const v of vendorizados) {
    const destino = destinoDe(v.hacia);
    if (yaEnAltas.has(destino)) continue;
    if (!v.cabecera.desde) {
      out.push({ desde: "?", hacia: v.hacia, estado: "error", previa: v.cabecera.fecha, error: "cabecera @vendor sin <repo>@<sha> <desde>: se conserva; vuelve a darla de alta en vendor.json para que lleve origen" });
      continue;
    }
    if (v.cabecera.repo && v.cabecera.repo !== cfg.repo) {
      out.push({ desde: v.cabecera.desde, hacia: v.hacia, estado: "al-dia", previa: v.cabecera.fecha, error: `de otro repo (${v.cabecera.repo}): no se toca en esta corrida` });
      continue;
    }
    trabajos.push({ desde: v.cabecera.desde, hacia: v.hacia, destino, previa: v.cabecera, alta: false });
  }
  const destinos = /* @__PURE__ */ new Map();
  for (const t of trabajos) destinos.set(claveKit(t.desde), [...destinos.get(claveKit(t.desde)) ?? [], t.destino]);
  const modulosJunto = (destino) => trabajos.filter((t) => RE_CODIGO.test(t.desde) && !esSchemas(t.desde) && dirname(t.destino) === dirname(destino)).map((t) => moduloDe(t.desde));
  for (const t of trabajos) {
    const base = { desde: t.desde, hacia: t.hacia, estado: "error", previa: t.previa?.fecha ?? null };
    const bloqueo = cfg.perfil ? bloqueoDePerfil(t.desde, cfg.perfil) : null;
    if (bloqueo) {
      out.push({ ...base, error: bloqueo, bloqueado: bloqueo });
      continue;
    }
    if (existsSync2(t.destino) && !t.previa && estiloDe(t.destino)) {
      out.push({ ...base, error: `ya existe sin cabecera @vendor (archivo o skill PROPIA del consumidor): no se pisa; ren\xF3mbralo o quita el alta` });
      continue;
    }
    const fl = local ? fechaLocal(local, t.desde) : null;
    const fw = await fechaWeb(t.desde);
    const gana = fl && (!fw || new Date(fl) >= new Date(fw.fecha)) ? { fuente: "local", fecha: fl, sha: null, ref: "" } : fw ? { fuente: "remoto", fecha: fw.fecha, sha: /^[0-9a-f]{40}$/.test(fw.ref) ? fw.ref : null, ref: fw.ref } : null;
    if (!gana) {
      out.push({ ...base, error: "ni checkout local ni web disponibles (\xBFsin red?): se conserva la copia" });
      continue;
    }
    if (t.previa && new Date(t.previa.fecha) >= new Date(gana.fecha)) {
      out.push({ ...base, estado: "al-dia", ...gana });
      continue;
    }
    const sinFormato = !estiloDe(t.destino) && existsSync2(t.destino);
    let texto;
    let aviso;
    try {
      if (gana.fuente === "local") {
        texto = readFileSync2(join2(local, t.desde), "utf8");
      } else {
        const r = await fetchFn(`https://cdn.jsdelivr.net/gh/${cfg.repo}@${gana.ref}/${t.desde}`);
        if (r.ok) texto = await r.text();
        else if (local && existsSync2(join2(local, t.desde))) {
          texto = readFileSync2(join2(local, t.desde), "utf8");
          gana.sha = null;
          aviso = `copiado de local, a\xFAn no publicado en ${cfg.repo}@${gana.ref.slice(0, 12)} (jsDelivr ${r.status})`;
        } else {
          out.push({ ...base, ...gana, error: `jsDelivr ${r.status} y sin checkout local` });
          continue;
        }
      }
    } catch (e) {
      out.push({ ...base, ...gana, error: `descarga: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    if (sinFormato && readFileSync2(t.destino, "utf8") === texto) {
      out.push({ ...base, estado: "al-dia", ...gana });
      continue;
    }
    if (sinFormato) aviso = `${aviso ? `${aviso} \xB7 ` : ""}sin formato de cabecera: se reescribe desde el origen (igual al origen = al d\xEDa)`;
    const codigo = RE_CODIGO.test(t.desde);
    const deps = codigo && !esSkill(t.desde) && cfg.perfil === "server" ? dependenciasDeNavegador(texto) : [];
    if (deps.length) {
      const motivo = `importa dependencias de navegador (${deps.join(", ")}) y el consumidor es server`;
      out.push({ ...base, ...gana, error: motivo, bloqueado: motivo });
      continue;
    }
    let secciones;
    if (codigo && esSchemas(t.desde)) {
      const p = podarSchemas(texto, modulosJunto(t.destino));
      texto = p.texto;
      secciones = p.secciones;
    }
    const ref = pin ?? gana.sha ?? cfg.rama;
    if (codigo) {
      texto = reescribirRelativos(texto, t.desde, t.destino, destinos);
      texto = reescribirSkill(texto, t.destino, raiz, altasRutas, cfg.repo, ref);
      if (/^[0-9a-f]{40}$/.test(ref)) texto = texto.replaceAll(`cdn.jsdelivr.net/gh/${cfg.repo}@${cfg.rama}/`, `cdn.jsdelivr.net/gh/${cfg.repo}@${ref}/`);
    }
    const docFuente = docDeCabecera(texto, t.destino) ?? t.previa?.doc ?? null;
    const docCfg = t.doc ?? null;
    const doc = docCfg ? /^https?:/.test(docCfg) ? docCfg : `https://cdn.jsdelivr.net/gh/${cfg.repo}@${ref}/${docCfg}` : docFuente ? docFuente.replace(/(cdn\.jsdelivr\.net\/gh\/[^@/]+\/[^@/]+)@[^/]+\//, `$1@${ref}/`) : null;
    const cuerpo = `${gana.fecha} ${cfg.repo}@${cfg.rama} ${t.desde}`;
    try {
      const final = estiloDe(t.destino) ? conCabecera(texto, t.destino, cuerpo, doc) : texto;
      mkdirSync(dirname(t.destino), { recursive: true });
      const tmp = `${t.destino}.${Date.now()}.tmp`;
      writeFileSync2(tmp, final, "utf8");
      renameSync(tmp, t.destino);
      out.push({ ...base, estado: "actualizado", ...gana, ...secciones ? { secciones } : {}, ...aviso ? { aviso } : {} });
    } catch (e) {
      out.push({ ...base, ...gana, error: `escritura: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  for (const r of out) {
    if (!RE_CODIGO.test(r.hacia) || r.bloqueado || esSkill(r.desde)) continue;
    const archivo = destinoDe(r.hacia);
    const faltan = importsFaltantes(archivo);
    if (faltan.length) r.faltan = faltan;
    const deps = cfg.perfil === "server" && existsSync2(archivo) ? dependenciasDeNavegador(readFileSync2(archivo, "utf8")) : [];
    if (deps.length) r.bloqueado = `la copia importa dependencias de navegador (${deps.join(", ")}) y el consumidor es server`;
  }
  const readme = generarReadmeSkills(raiz, log2);
  if (readme) log2(`[vendor] skills/README.md regenerado`);
  return out;
}
async function protocoloPines(cfg, raiz, log2 = console.log) {
  if (cfg.pin?.activo === false) {
    log2("[vendor] pines: desactivado en la config (pin.activo: false)");
    return null;
  }
  const { opciones: opciones2, protocolo: protocolo2 } = await init_pin_update().then(() => pin_update_exports);
  const op = opciones2({ root: raiz, repo: cfg.repo, rama: cfg.rama, local: cfg.local, raices: cfg.pin?.raices, saltar: cfg.pin?.saltar, verificar: cfg.pin?.verificar });
  return await protocolo2("ultimo", op);
}
function esPrincipal2(url = import.meta.url, argv1 = process2.argv[1], main = import.meta.main) {
  if (main === true) return true;
  if (!argv1) return false;
  if (url === argv1) return true;
  try {
    return url === pathToFileURL2(argv1).href;
  } catch {
    return false;
  }
}
if (esPrincipal2()) {
  const ruta = process2.argv[2];
  if (!ruta) {
    console.error("uso: deno run -A vendor.ts <config.json>");
    process2.exit(2);
  }
  const config = JSON.parse(readFileSync2(ruta, "utf8"));
  const cfg = ZConfigVendor.parse(config);
  const raiz = resolve(cfg.raiz ?? ".");
  if (!cfg.perfil) console.warn(`[vendor] AVISO ${ruta} no declara "perfil" ("server" o "client"): se baja sin filtrar por perfil`);
  const pin = await protocoloPines(cfg, raiz);
  if (pin === 4) console.warn("[vendor] AVISO pines: sin red, los pines se conservan");
  const res = await vendorizar(config, { raiz, log: console.log });
  for (const r of res) {
    const que = r.estado === "actualizado" ? `actualizado (${r.fuente} ${r.fecha})` : r.estado === "al-dia" ? `al d\xEDa (${r.previa})${r.error ? ` \xB7 ${r.error}` : ""}` : `AVISO ${r.error}`;
    console.log(`[vendor] ${r.hacia}: ${que}${r.secciones ? ` \xB7 secciones: ${r.secciones.join(", ")}` : ""}${r.aviso ? ` \xB7 ${r.aviso}` : ""}`);
    if (r.bloqueado) console.error(`[vendor] ERROR ${r.hacia} bloqueado por perfil: ${r.bloqueado} (qu\xEDtalo de ${ruta})`);
    if (r.faltan) console.error(`[vendor] ERROR ${r.hacia} importa lo que no se vendoriza: ${r.faltan.join(", ")} (dalo de alta en ${ruta})`);
  }
  const propios = res.filter((r) => r.error?.includes("no se pisa"));
  if (res.some((r) => r.faltan || r.bloqueado) || propios.length) process2.exit(1);
  if (pin !== null && pin !== 0 && pin !== 4) {
    console.error(`[vendor] ERROR protocolo de pines (c\xF3digo ${pin})`);
    process2.exit(1);
  }
}
export {
  EXTENSIONES,
  SALTAR,
  SCHEMAS,
  SECCION_COMUN,
  archivosDeSkill,
  barrer,
  bloqueoDePerfil,
  conCabecera,
  dependenciasDeNavegador,
  docDeCabecera,
  esPrincipal2 as esPrincipal,
  esSchemas,
  esSkill,
  estiloDe,
  fechaCopia,
  fechaLocal,
  generarReadmeSkills,
  importsFaltantes,
  inventariar,
  leerCabecera,
  moduloDe,
  perfilDeRuta,
  podarSchemas,
  protocoloPines,
  seccionesDeSchemas,
  sinCabecera,
  vendorizar
};
