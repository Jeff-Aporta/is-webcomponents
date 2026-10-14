// @vendor 2026-10-14T14:46:24.593Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/tools/probar-foundation.mjs
// Bundle autocontenido de skills/iswc-foundation/tools/probar-foundation.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es skills/iswc-foundation/tools/probar-foundation.ts.

// skills/iswc-foundation/tools/probar-foundation.ts
import { join as join2 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// src/vendor-distributions/shared/testing/test-cooldown.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

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

// src/vendor-distributions/shared/testing/test-cooldown.ts
var COOLDOWN_FACTOR = 1440;
function cooldownMs(durationMs, factor = COOLDOWN_FACTOR) {
  return Math.max(0, Math.round(durationMs * factor));
}
function formatMs(ms) {
  const s = Math.max(0, Math.round(ms / 1e3));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${r}s` : `${r}s`;
}
function testId(file, name) {
  return `${file.replace(/\\/g, "/")}::${name}`;
}
function createTestCooldown(opts) {
  const factor = opts.factor ?? COOLDOWN_FACTOR;
  const now = opts.now ?? Date.now;
  let db = null;
  const leer = () => {
    try {
      const v = existsSync(opts.dbPath) ? JSON.parse(readFileSync(opts.dbPath, "utf8")) : {};
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  };
  const load = () => db ??= leer();
  const grabar = (id, entrada) => {
    const fresco = leer();
    fresco[id] = entrada;
    mkdirSync(dirname(opts.dbPath), { recursive: true });
    const tmp2 = `${opts.dbPath}.${process.pid}.tmp`;
    writeFileSync(tmp2, JSON.stringify(fresco, null, 2) + "\n", "utf8");
    renameSync(tmp2, opts.dbPath);
    if (db) db[id] = entrada;
  };
  const check = (id) => {
    if (opts.disabled) return { skip: false };
    const e = load()[id];
    const t = now();
    return e && e.until > t ? { skip: true, until: e.until, remainingMs: e.until - t } : { skip: false };
  };
  const record = (id, durationMs, ok, factorCooldown = 1) => {
    if (opts.disabled) return;
    const t = now();
    const ms = cooldownMs(durationMs, factor * factorCooldown);
    grabar(id, ok ? { durationMs, okAt: t, until: t + ms, cooldownMin: Math.round(ms / 600) / 100, ...factorCooldown !== 1 ? { factorCooldown } : {} } : { durationMs, okAt: null, until: -1, failAt: t });
  };
  const run = async (id, fn) => {
    const c = check(id);
    if (c.skip) return { skipped: true, until: c.until, remainingMs: c.remainingMs };
    const t0 = now();
    try {
      const value = await fn();
      const durationMs = now() - t0;
      record(id, durationMs, true);
      return { skipped: false, durationMs, value };
    } catch (e) {
      record(id, now() - t0, false);
      throw e;
    }
  };
  return { check, record, run, entries: () => leer() };
}
function testCooldownFromEnv(opts = {}) {
  return createTestCooldown({
    dbPath: process.env.TEST_COOLDOWN_DB ?? join(process.cwd(), ".tmp", "test-cooldown.json"),
    disabled: process.env.TEST_COOLDOWN === "0" || process.argv.includes("--sin-cooldown"),
    ...opts
  });
}
var COOLDOWN_LLAVE_MS = 24 * 60 * 6e4;

// skills/iswc-foundation/tools/probar-foundation.ts
var AQUI = fileURLToPath(new URL("./", import.meta.url));
var COOLDOWN = testCooldownFromEnv();
var ID = testId("skills/iswc-foundation/tools/probar-foundation.ts", "*");
var enCooldown = COOLDOWN.check(ID);
if (enCooldown.skip) {
  console.log(`[cooldown] ~ probar-foundation (faltan ${formatMs(enCooldown.remainingMs)}); --sin-cooldown para forzar`);
  Deno.exit(0);
}
var INICIO = Date.now();
var pasar = Deno.args.filter((a) => a.startsWith("--sha=") || a.startsWith("--repo="));
if (!pasar.some((a) => a.startsWith("--sha="))) {
  const r = new Deno.Command("git", { args: ["-C", join2(AQUI, "..", "..", ".."), "rev-parse", "origin/main"] }).outputSync();
  const sha = new TextDecoder().decode(r.stdout).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("probar-foundation: no pude leer origin/main del kit; pasa --sha=<sha40>");
  pasar.push(`--sha=${sha}`);
}
if (!pasar.some((a) => a.startsWith("--repo="))) {
  const r = new Deno.Command("git", { args: ["-C", join2(AQUI, "..", "..", ".."), "remote", "get-url", "origin"] }).outputSync();
  const repo = new TextDecoder().decode(r.stdout).trim().match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
  if (repo) pasar.push(`--repo=${repo}`);
}
async function correr(cmd, cwd, env = {}) {
  console.log(`
[probar-foundation] $ ${cmd.join(" ")}`);
  const r = await new Deno.Command(cmd[0], { args: cmd.slice(1), cwd, env, stdout: "inherit", stderr: "inherit" }).output();
  return r.code;
}
async function herramientaDeIconosLocal(app2) {
  const dl = join2(app2, "assets", "dl.js");
  const texto = await Deno.readTextFile(dl);
  const url = texto.match(/from '([^']+)'/)?.[1];
  if (!url) return 1;
  const ok = await fetch(url, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
  if (ok) return 0;
  const local = pathToFileURL(join2(AQUI, "..", "..", "..", "src", "vendor-distributions", "client", "tools", "download-iconify.ts")).href;
  await Deno.writeTextFile(dl, texto.replace(url, local));
  console.log(`[probar-foundation] la herramienta online no responde \u2192 assets/dl.js usa ${local}`);
  return 0;
}
if (await correr([Deno.execPath(), "run", "-A", join2(AQUI, "manifest.ts"), "--check"], AQUI)) {
  COOLDOWN.record(ID, Date.now() - INICIO, false);
  Deno.exit(1);
}
var tmp = await Deno.makeTempDir({ prefix: "iswc-foundation-" });
var app = join2(tmp, "app-prueba");
var code = await correr([Deno.execPath(), "run", "-A", join2(AQUI, "create-iswc-app.ts"), app, "--prefijo=prueba", "--titulo=App de prueba", ...pasar], AQUI);
if (!code) code = await herramientaDeIconosLocal(app);
if (!code) code = await correr([Deno.execPath(), "install"], app);
if (!code) code = await correr([Deno.execPath(), "task", "test:all"], app, { TEST_COOLDOWN: "0" });
console.log(`
[probar-foundation] ${code ? `ROJO (rc=${code})` : "VERDE"} \xB7 app en ${app}`);
COOLDOWN.record(ID, Date.now() - INICIO, !code);
if (!Deno.args.includes("--conservar") && !code) await Deno.remove(tmp, { recursive: true });
Deno.exit(code);
