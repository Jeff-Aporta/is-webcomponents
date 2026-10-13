// @vendor 2026-10-13T15:51:18.306Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/tools/probar-foundation.mjs
// Bundle autocontenido de skills/iswc-foundation/tools/probar-foundation.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es skills/iswc-foundation/tools/probar-foundation.ts.

// skills/iswc-foundation/tools/probar-foundation.ts
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
var AQUI = fileURLToPath(new URL("./", import.meta.url));
var pasar = Deno.args.filter((a) => a.startsWith("--sha=") || a.startsWith("--repo="));
if (!pasar.some((a) => a.startsWith("--sha="))) {
  const r = new Deno.Command("git", { args: ["-C", join(AQUI, "..", "..", ".."), "rev-parse", "origin/main"] }).outputSync();
  const sha = new TextDecoder().decode(r.stdout).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("probar-foundation: no pude leer origin/main del kit; pasa --sha=<sha40>");
  pasar.push(`--sha=${sha}`);
}
if (!pasar.some((a) => a.startsWith("--repo="))) {
  const r = new Deno.Command("git", { args: ["-C", join(AQUI, "..", "..", ".."), "remote", "get-url", "origin"] }).outputSync();
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
  const dl = join(app2, "assets", "dl.js");
  const texto = await Deno.readTextFile(dl);
  const url = texto.match(/from '([^']+)'/)?.[1];
  if (!url) return 1;
  const ok = await fetch(url, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
  if (ok) return 0;
  const local = pathToFileURL(join(AQUI, "..", "..", "..", "src", "cdn", "tools", "download-iconify.ts")).href;
  await Deno.writeTextFile(dl, texto.replace(url, local));
  console.log(`[probar-foundation] el pin a\xFAn no publica download-iconify.ts \u2192 assets/dl.js usa ${local}`);
  return 0;
}
if (await correr([Deno.execPath(), "run", "-A", join(AQUI, "manifest.ts"), "--check"], AQUI)) Deno.exit(1);
var tmp = await Deno.makeTempDir({ prefix: "iswc-foundation-" });
var app = join(tmp, "app-prueba");
var code = await correr([Deno.execPath(), "run", "-A", join(AQUI, "create-iswc-app.ts"), app, "--prefijo=prueba", "--titulo=App de prueba", ...pasar], AQUI);
if (!code) code = await herramientaDeIconosLocal(app);
if (!code) code = await correr([Deno.execPath(), "install"], app);
if (!code) code = await correr([Deno.execPath(), "task", "test:all"], app, { TEST_COOLDOWN: "0" });
console.log(`
[probar-foundation] ${code ? `ROJO (rc=${code})` : "VERDE"} \xB7 app en ${app}`);
if (!Deno.args.includes("--conservar") && !code) await Deno.remove(tmp, { recursive: true });
Deno.exit(code);
