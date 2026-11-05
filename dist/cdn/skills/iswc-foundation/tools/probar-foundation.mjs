// Bundle autocontenido de skills/iswc-foundation/tools/probar-foundation.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es skills/iswc-foundation/tools/probar-foundation.ts.

// skills/iswc-foundation/tools/probar-foundation.ts
import { join as join2 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// src/vendor-distributions/shared/testing/test-cooldown.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
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
