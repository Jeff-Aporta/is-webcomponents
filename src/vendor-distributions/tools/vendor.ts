// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
/**
 * vendor.ts — descarga por vendor strategy los archivos del kit que usa un consumidor (ISS, ISW…).
 *
 *   deno run -A <kit>/dist/cdn/vendor-distributions/tools/vendor.ts <config.json>
 *
 * `config.json` (ver vendor.schemas.ts) dice el repo del kit, un checkout local opcional y, por
 * archivo, de dónde viene (`desde`, ruta en el repo) y a dónde va (`hacia`, en el consumidor; lo
 * habitual es una carpeta `ISU/` para no chocar con los archivos propios).
 *
 * PIN POR FECHA ISO: por cada archivo compiten el checkout local (fecha del último commit que lo
 * tocó, o «ahora» si tiene cambios sin commitear) y el HEAD remoto; gana el más reciente, y solo se
 * escribe si es más nuevo que la copia del consumidor (cabecera `// @vendor <ISO>`). Así nunca hay
 * regresiones y siempre queda lo último. Sin red ni checkout, la copia existente se conserva.
 *
 * Cabecera que se escribe en cada archivo (los de código: .ts, .mjs, .js):
 *   // @vendor <ISO> <repo>@<sha|local> <desde>
 *   // @doc <URL jsDelivr de su documentación, fijada al SHA> (de `doc` en la config o de la `// @doc` de la fuente)
 *
 * GUARDIÁN DE IMPORTS: al final, cada archivo de código vendorizado se revisa en el consumidor; si
 * importa un relativo (`./x.schemas.js`, `../lib/obj.ts`…) que no existe junto a él, su resultado
 * trae `faltan` y la CLI sale con 1. Todo hermano `.schemas` (y cualquier relativo) va en la lista.
 *
 *
 * Vendor: `dist/cdn/vendor-distributions/tools/vendor.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./vendor.schemas.ts`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { ZConfigVendor, type TConfigVendor, type TResultadoVendor } from "./vendor.schemas.ts";

export type * from "./vendor.schemas.ts";

const CABECERA = /^\/\/ @vendor (\S+)/m;

/** Fecha ISO del último commit que tocó `ruta` en el checkout (o «ahora» si tiene cambios sin commitear). */
function fechaLocal(checkout: string, ruta: string): string | null {
  try {
    const iso = execFileSync("git", ["-C", checkout, "log", "-1", "--format=%cI", "--", ruta], { encoding: "utf8" }).trim();
    if (!iso) return null;
    const sucio = execFileSync("git", ["-C", checkout, "status", "--porcelain", "--", ruta], { encoding: "utf8" }).trim();
    return sucio ? new Date().toISOString() : new Date(iso).toISOString();
  } catch {
    return null;
  }
}

/** Commit HEAD de la rama en GitHub (sha y fecha), o null sin red. */
async function cabezaRemota(repo: string, rama: string): Promise<{ sha: string; fecha: string } | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits/${rama}`, {
      headers: { "User-Agent": "iswc-vendor", Accept: "application/vnd.github+json" },
    });
    if (!r.ok) return null;
    const c = await r.json() as { sha?: string; commit?: { author?: { date?: string }; committer?: { date?: string } } };
    const fecha = c.commit?.committer?.date ?? c.commit?.author?.date;
    return c.sha && fecha ? { sha: c.sha, fecha: new Date(fecha).toISOString() } : null;
  } catch {
    return null;
  }
}

/** Fecha de la copia del consumidor (cabecera `@vendor`), o null si no hay o no se entiende. */
function fechaCopia(archivo: string): string | null {
  if (!existsSync(archivo)) return null;
  const m = readFileSync(archivo, "utf8").match(CABECERA);
  const d = m ? new Date(m[1]!) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : null;
}

/** Quita una cabecera `@vendor`/`@doc` previa (al copiar desde un consumidor o reescribir). */
const sinCabecera = (t: string): string => t.replace(/^(\/\/ @(vendor|doc) [^\n]*\n)+/, "");

/** Relativos (`./`, `../`) que importa `archivo` y no existen junto a él (`.js` y `.ts` se aceptan entre sí). */
export function importsFaltantes(archivo: string): string[] {
  if (!existsSync(archivo)) return [];
  // ponytail: regex sobre el texto sin comentarios; un `from './x'` dentro de un string daría falso positivo.
  const texto = readFileSync(archivo, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const faltan = new Set<string>();
  for (const m of texto.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.\.?\/[^"']+)["']/g)) {
    const ruta = resolve(dirname(archivo), m[1]!);
    const alternas = [ruta, ruta.replace(/\.js$/, ".ts"), ruta.replace(/\.ts$/, ".js"), ruta.replace(/\.mjs$/, ".mts")];
    if (!alternas.some((r) => existsSync(r))) faltan.add(m[1]!);
  }
  return [...faltan];
}

/** Actualiza los archivos de la configuración. No lanza por archivo: cada uno trae su estado. */
export async function vendorizar(entrada: unknown, opciones: { raiz?: string } = {}): Promise<TResultadoVendor[]> {
  const cfg: TConfigVendor = ZConfigVendor.parse(entrada);
  const raiz = resolve(opciones.raiz ?? cfg.raiz ?? ".");
  const local = cfg.local && existsSync(cfg.local) ? cfg.local : null;
  const remoto = await cabezaRemota(cfg.repo, cfg.rama);
  const out: TResultadoVendor[] = [];
  for (const a of cfg.archivos) {
    const destino = isAbsolute(a.hacia) ? a.hacia : join(raiz, a.hacia);
    const previa = fechaCopia(destino);
    const base: TResultadoVendor = { desde: a.desde, hacia: a.hacia, estado: "error", previa };
    const fl = local ? fechaLocal(local, a.desde) : null;
    const gana = fl && (!remoto || new Date(fl) > new Date(remoto.fecha))
      ? { fuente: "local" as const, fecha: fl, sha: null }
      : remoto ? { fuente: "remoto" as const, fecha: remoto.fecha, sha: remoto.sha } : null;
    if (!gana) { out.push({ ...base, error: "ni checkout local ni remoto disponibles (¿sin red?): se conserva la copia" }); continue; }
    if (previa && new Date(previa) >= new Date(gana.fecha)) { out.push({ ...base, estado: "al-dia", ...gana }); continue; }
    let texto: string;
    try {
      if (gana.fuente === "local") {
        const f = join(local!, a.desde);
        if (!existsSync(f)) { out.push({ ...base, ...gana, error: `no existe en el checkout: ${f}` }); continue; }
        texto = readFileSync(f, "utf8");
      } else {
        const r = await fetch(`https://cdn.jsdelivr.net/gh/${cfg.repo}@${gana.sha}/${a.desde}`);
        if (!r.ok) { out.push({ ...base, ...gana, error: `jsDelivr ${r.status}` }); continue; }
        texto = await r.text();
      }
    } catch (e) {
      out.push({ ...base, ...gana, error: `descarga: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    const codigo = /\.(m?[jt]s)$/.test(a.desde);
    const origen = `${cfg.repo}@${gana.sha ?? "local"}`;
    // La doc SIEMPRE por CDN (nunca ruta local): `a.doc` o la `// @doc` que trae la fuente, fijada al
    // SHA ganador; si ganó el checkout local (sin SHA), a la rama.
    const ref = gana.sha ?? cfg.rama;
    const docFuente = texto.match(/^\/\/ @doc (\S+)/m)?.[1];
    const doc = a.doc
      ? (/^https?:/.test(a.doc) ? a.doc : `https://cdn.jsdelivr.net/gh/${cfg.repo}@${ref}/${a.doc}`)
      : docFuente ? docFuente.replace(/(cdn\.jsdelivr\.net\/gh\/[^@/]+\/[^@/]+)@[^/]+\//, `$1@${ref}/`) : null;
    const cabecera = codigo ? `// @vendor ${gana.fecha} ${origen} ${a.desde}\n${doc ? `// @doc ${doc}\n` : ""}` : "";
    try {
      mkdirSync(dirname(destino), { recursive: true });
      const tmp = `${destino}.${Date.now()}.tmp`;
      writeFileSync(tmp, cabecera + sinCabecera(texto), "utf8");
      renameSync(tmp, destino);
      out.push({ ...base, estado: "actualizado", ...gana });
    } catch (e) {
      out.push({ ...base, ...gana, error: `escritura: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  for (const r of out) {
    if (!/\.(m?[jt]s)$/.test(r.hacia)) continue;
    const faltan = importsFaltantes(isAbsolute(r.hacia) ? r.hacia : join(raiz, r.hacia));
    if (faltan.length) r.faltan = faltan;
  }
  return out;
}

// CLI: deno run -A vendor.ts <config.json>
// Sin `Deno.*` ni `import.meta.main`: compila igual con lib DOM (ISW) que con deno.ns.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("uso: deno run -A vendor.ts <config.json>");
    process.exit(2);
  }
  const res = await vendorizar(JSON.parse(readFileSync(ruta, "utf8")));
  for (const r of res) {
    const que = r.estado === "actualizado" ? `actualizado (${r.fuente} ${r.fecha})` : r.estado === "al-dia" ? `al día (${r.previa})` : `AVISO ${r.error}`;
    console.log(`[vendor] ${r.hacia}: ${que}`);
    if (r.faltan) console.error(`[vendor] ERROR ${r.hacia} importa lo que no se vendoriza: ${r.faltan.join(", ")} (agrégalo a ${ruta})`);
  }
  // Un aviso no rompe el build: la copia existente se conserva (sin red, por ejemplo).
  // Un import sin vendorizar sí: ese archivo no compila en el consumidor.
  if (res.some((r) => r.faltan)) process.exit(1);
}
