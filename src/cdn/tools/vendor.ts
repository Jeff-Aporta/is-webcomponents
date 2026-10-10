/**
 * vendor.ts — descarga por vendor strategy los archivos del kit que usa un consumidor (ISS, ISW…).
 *
 *   deno run -A <kit>/dist/cdn/tools/vendor.ts <config.json>
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
 *   // @doc <url o ruta de su documentación>
 *
 * Doc: skills/iswc-foundation/references/06-pines-y-vendor.md
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
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
    const doc = a.doc ? (gana.sha ? `https://cdn.jsdelivr.net/gh/${cfg.repo}@${gana.sha}/${a.doc}` : a.doc) : null;
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
  return out;
}

// CLI: deno run -A vendor.ts <config.json>
if (import.meta.main) {
  const ruta = Deno.args[0];
  if (!ruta) {
    console.error("uso: deno run -A vendor.ts <config.json>");
    Deno.exit(2);
  }
  const res = await vendorizar(JSON.parse(readFileSync(ruta, "utf8")));
  for (const r of res) {
    const que = r.estado === "actualizado" ? `actualizado (${r.fuente} ${r.fecha})` : r.estado === "al-dia" ? `al día (${r.previa})` : `AVISO ${r.error}`;
    console.log(`[vendor] ${r.hacia}: ${que}`);
  }
  // Un aviso no rompe el build: la copia existente se conserva (sin red, por ejemplo).
}
