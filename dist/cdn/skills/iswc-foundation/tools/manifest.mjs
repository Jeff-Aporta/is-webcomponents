// @vendor 2026-10-14T00:35:24.801Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/tools/manifest.mjs
// Bundle autocontenido de skills/iswc-foundation/tools/manifest.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es skills/iswc-foundation/tools/manifest.ts.

// skills/iswc-foundation/tools/manifest.ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
var T = fileURLToPath(new URL("../templates/", import.meta.url));
var listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? listar(p) : [relative(T, p).split("\\").join("/")];
});
var archivos = listar(T).filter((f) => f !== "manifest.json").sort();
var texto = `${JSON.stringify({ archivos }, null, 2)}
`;
var ruta = join(T, "manifest.json");
if (Deno.args.includes("--check")) {
  let actual = "";
  try {
    actual = readFileSync(ruta, "utf8");
  } catch {
  }
  if (actual !== texto) {
    console.error("templates/manifest.json desactualizado: deno run -A skills/iswc-foundation/tools/manifest.ts");
    Deno.exit(1);
  }
  console.log(`templates/manifest.json al d\xEDa (${archivos.length} archivos)`);
} else {
  writeFileSync(ruta, texto);
  console.log(`templates/manifest.json: ${archivos.length} archivos`);
}
