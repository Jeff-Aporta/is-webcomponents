// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
/**
 * vendor.ts — descarga por vendor strategy los archivos del kit que usa un consumidor (ISS, ISW…).
 *
 *   deno run -A <kit>/dist/cdn/vendor-distributions/shared/tools/vendor.ts <config.json>
 *
 * `config.json` (sección `vendor` de `shared/schemas.ts`) dice el repo del kit, un checkout local
 * opcional y, por archivo, de dónde viene (`desde`, ruta en el repo) y a dónde va (`hacia`, en el
 * consumidor; lo habitual es una carpeta `ISU/` para no chocar con los archivos propios).
 *
 * PIN POR FECHA ISO: por cada archivo compiten el checkout local (fecha del último commit que lo
 * tocó, o «ahora» si tiene cambios sin commitear) y el HEAD remoto; gana el más reciente, y solo se
 * escribe si es más nuevo que la copia del consumidor (cabecera `// @vendor <ISO>`). Así nunca hay
 * regresiones y siempre queda lo último. Sin red ni checkout, la copia existente se conserva.
 *
 * Cabecera que se escribe en cada archivo de código (.ts, .mjs, .js): el propio archivo dice desde dónde
 * se actualiza (Jeff, 2026-10-13: así no hace falta un diccionario de rutas):
 *   // @vendor <ISO> <repo>@<sha|local> <desde>
 *   // @doc <URL jsDelivr de su documentación, fijada al SHA> (opcional: de `doc` en la config o de la `// @doc` de la fuente)
 *
 * SCHEMAS ÚNICO PODADO: todos los contratos de `vendor-distributions/` viven en `shared/schemas.ts`, en
 * secciones `// ===== @seccion <modulo> [requiere: a, b] =====` … `// ===== @fin <modulo> =====`. Al
 * vendorizar ese archivo se conservan la cabecera, la sección `comun` y las secciones de los módulos
 * (basename de `desde`) que la misma config deposita EN LA MISMA CARPETA que ese `schemas.ts` (si no
 * hay ninguno, las de todos los módulos de la config), más sus `requiere` transitivos; el resto se
 * descarta. El resultado trae `secciones` y la CLI las lista. Una config puede traer `schemas.ts` a
 * varias carpetas (p. ej. `tests/.audit/ISU/` y `src/sources/000 Base/ISU/`): cada copia se poda a lo
 * que su carpeta usa.
 *
 * GUARDIÁN DE IMPORTS: al final, cada archivo de código vendorizado se revisa en el consumidor; si
 * importa un relativo (`../schemas.ts`, `../lib/obj.ts`…) que no existe junto a él, su resultado
 * trae `faltan` y la CLI sale con 1. Todo relativo va en la lista.
 *
 * RUTAS AL APLANAR: si un archivo importa un relativo del kit (`../../shared/testing/x.ts`) que la misma
 * config también trae, el specifier se reescribe a la ruta relativa entre los dos `hacia` (p. ej.
 * `./x.ts` cuando ambos caen en la misma carpeta `ISU/`; si el mismo `desde` va a varias carpetas, se
 * prefiere la copia de la carpeta del importador). Así un módulo `client/` que usa `shared/` se puede
 * depositar plano.
 *
 * PERFILES (`perfil` en la config): el kit separa `vendor-distributions/` en `shared/` (sin navegador),
 * `server/` y `client/` (Playwright, Stagehand, render visual, íconos de UI). Un consumidor `server`
 * solo baja `shared/` + `server/`; uno `client`, `shared/` + `client/`. Lo que no corresponde se
 * BLOQUEA (no se baja, `bloqueado` con motivo, la CLI sale con 1), igual que una ruta de
 * `vendor-distributions/` sin perfil o, en `server`, cualquier archivo que importe una dependencia de
 * navegador (`playwright`, `@browserbasehq/stagehand`, `puppeteer`…). Sin `perfil`: modo anterior, con aviso.
 *
 * PROTOCOLO DE PINES (CLI, al terminar de vendorizar): corre `pin-update.mjs --nuevo=ultimo
 * --local=<local>` (el vendorizado junto a este archivo) para que todo `is-webcomponents@<sha40>` del
 * consumidor apunte al último SHA PUBLICADO de la rama: lee el HEAD en GitHub, lo busca en el checkout
 * local si está accesible (si no, lo dice y sigue), verifica en jsDelivr (retrocede commits hasta uno
 * publicado) y reescribe los pines. Se configura con `pin` en la config (`activo`, `raices`, `saltar`,
 * `verificar`). Códigos del protocolo: 0 ok · 1 refs mutables · 2 uso · 3 nada publicado · 4 sin red
 * (solo aviso: la copia se conserva).
 *
 * Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/tools/vendor.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../schemas.ts` (sección `vendor`) y, para el protocolo de pines, `./pin-update.mjs` (misma carpeta).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, posix, relative, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PERFILES, ZConfigVendor, type TConfigVendor, type TPerfil, type TPerfilVendor, type TResultadoVendor } from "../schemas.ts";

export type { TArchivoVendor, TConfigVendor, TPerfil, TPerfilVendor, TPinVendor, TResultadoVendor } from "../schemas.ts";
export { PERFILES } from "../schemas.ts";

/** Cabecera `@vendor <ISO> <repo>@<sha|local> <desde>`: el primer campo es la fecha ISO. */
const CABECERA = /^\/\/ @vendor (\S+)/m;

/** Nombre del archivo único de contratos (se poda por secciones al vendorizar). */
export const SCHEMAS = "schemas.ts";
/** Sección de `schemas.ts` que siempre se conserva. */
export const SECCION_COMUN = "comun";

/** Quita comentarios de bloque y de línea completa (los imports dentro de comentarios no cuentan). */
const sinComentarios = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Specifiers de `import … from`, `export … from`, `import 'x'`, `import('x')`, `require('x')` y `createRequire(u)('x')`. */
const RE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bcreateRequire\s*\([^)]*\)\s*\(\s*)["']([^"']+)["']/g;

/** Paquetes que solo tienen sentido con un navegador (automatización, DOM simulado). */
const RE_NAVEGADOR = /^(?:npm:)?(?:playwright(?:-core)?|@playwright\/|puppeteer(?:-core)?|@browserbasehq\/|chromium|chrome-launcher|jsdom|happy-dom|@stagehand\/)/;

/** Marcadores de sección de `schemas.ts`. */
const RE_SECCION = /^\/\/ ===== @seccion (\S+)(?: \[requiere: ([^\]]*)\])? =====\r?\n([\s\S]*?)^\/\/ ===== @fin \1 =====\r?\n?/gm;

/**
 * Perfil de una ruta del kit (`…/vendor-distributions/<perfil>/…`). `null` si la ruta no es de
 * `vendor-distributions/` (p. ej. `dist/cdn/build/…`); `"sin-perfil"` si lo es pero no cuelga de un perfil.
 */
export function perfilDeRuta(ruta: string): TPerfil | "sin-perfil" | null {
  const m = ruta.replaceAll("\\", "/").match(/(?:^|\/)vendor-distributions\/(.*)$/);
  if (!m) return null;
  const primero = m[1]!.split("/")[0]!;
  return (PERFILES as readonly string[]).includes(primero) && m[1]!.includes("/") ? primero as TPerfil : "sin-perfil";
}

/** Dependencias de navegador que importa un código (specifiers que nombran playwright, stagehand, puppeteer…). */
export function dependenciasDeNavegador(codigo: string): string[] {
  const out = new Set<string>();
  for (const m of sinComentarios(codigo).matchAll(RE_SPECIFIER)) if (RE_NAVEGADOR.test(m[1]!)) out.add(m[1]!);
  return [...out];
}

/** Motivo por el que un consumidor de `perfil` no puede bajar `desde`, o `null` si lo admite. */
export function bloqueoDePerfil(desde: string, perfil: TPerfilVendor): string | null {
  const p = perfilDeRuta(desde);
  if (p === null || p === "shared" || p === perfil) return null;
  if (p === "sin-perfil") return `ruta de vendor-distributions sin perfil (anterior al 2026-10-12): usa vendor-distributions/{shared,${perfil}}/…`;
  return `es del perfil ${p} y el consumidor declara ${perfil}: solo baja shared/ y ${perfil}/`;
}

/** Ruta del kit sin extensión de código (clave para emparejar `.js` con `.ts`). */
const claveKit = (ruta: string): string => posix.normalize(ruta.replaceAll("\\", "/")).replace(/\.(m?[jt]s)$/, "");

/** Nombre de módulo de una ruta del kit (basename sin extensión): la clave de su sección en `schemas.ts`. */
export const moduloDe = (ruta: string): string => basename(ruta.replaceAll("\\", "/")).replace(/\.(m?[jt]s)$/, "");

/** `true` si la ruta es el archivo único de contratos. */
export const esSchemas = (ruta: string): boolean => basename(ruta.replaceAll("\\", "/")) === SCHEMAS;

/** Secciones de un `schemas.ts`: nombre → { requiere, texto }, en orden; y la cabecera previa a la primera. */
export function seccionesDeSchemas(texto: string): { cabecera: string; secciones: Map<string, { requiere: string[]; texto: string }> } {
  const secciones = new Map<string, { requiere: string[]; texto: string }>();
  let primera = texto.length;
  for (const m of texto.matchAll(RE_SECCION)) {
    primera = Math.min(primera, m.index!);
    const requiere = (m[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    secciones.set(m[1]!, { requiere, texto: m[0] });
  }
  return { cabecera: texto.slice(0, primera), secciones };
}

/**
 * Poda un `schemas.ts` a `comun` + las secciones de `modulos` + sus `requiere` transitivos. Devuelve el
 * texto podado y las secciones conservadas (en el orden del archivo). Un módulo sin sección no aporta.
 */
export function podarSchemas(texto: string, modulos: readonly string[]): { texto: string; secciones: string[] } {
  const { cabecera, secciones } = seccionesDeSchemas(texto);
  if (!secciones.size) return { texto, secciones: [] };
  const quedan = new Set<string>([SECCION_COMUN]);
  const pendientes = [...modulos];
  while (pendientes.length) {
    const s = pendientes.pop()!;
    const sec = secciones.get(s);
    if (!sec || quedan.has(s)) continue;
    quedan.add(s);
    pendientes.push(...sec.requiere);
  }
  const orden = [...secciones.keys()].filter((s) => quedan.has(s));
  return { texto: cabecera.replace(/\s*$/, "\n\n") + orden.map((s) => secciones.get(s)!.texto).join("\n"), secciones: orden };
}

/**
 * Reescribe los relativos de `texto` (fuente en `desde`) que apuntan a otro archivo de la misma config:
 * el specifier pasa a ser la ruta entre los dos destinos, con la extensión que traía. Si el mismo
 * archivo del kit va a varias carpetas, se prefiere la de `destino` (el importador).
 */
function reescribirRelativos(texto: string, desde: string, destino: string, destinos: Map<string, string[]>): string {
  return texto.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.?\/[^"']+)\2/g, (todo, pre: string, q: string, spec: string) => {
    const otros = destinos.get(claveKit(posix.join(posix.dirname(desde.replaceAll("\\", "/")), spec)));
    if (!otros?.length) return todo;
    const otro = otros.find((o) => dirname(o) === dirname(destino)) ?? otros[0]!;
    let rel = relative(dirname(destino), otro).replaceAll("\\", "/");
    if (!rel.startsWith(".")) rel = `./${rel}`;
    const ext = spec.match(/\.(m?[jt]s)$/)?.[0];
    rel = ext ? rel.replace(/\.(m?[jt]s)$/, ext) : rel.replace(/\.(m?[jt]s)$/, "");
    return `${pre}${q}${rel}${q}`;
  });
}

/** Fecha ISO del último commit que tocó `ruta` en el checkout (o «ahora» si tiene cambios sin commitear o aún no está commiteado). */
function fechaLocal(checkout: string, ruta: string): string | null {
  try {
    const sucio = execFileSync("git", ["-C", checkout, "status", "--porcelain", "--", ruta], { encoding: "utf8" }).trim();
    if (sucio) return new Date().toISOString();
    const iso = execFileSync("git", ["-C", checkout, "log", "-1", "--format=%cI", "--", ruta], { encoding: "utf8" }).trim();
    return iso ? new Date(iso).toISOString() : null;
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

/** Fecha de la copia del consumidor (cabecera `@vendor`, nueva o anterior), o null si no hay o no se entiende. */
export function fechaCopia(archivo: string): string | null {
  if (!existsSync(archivo)) return null;
  const m = readFileSync(archivo, "utf8").match(CABECERA);
  const d = m ? new Date(m[1]!) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : null;
}

/** Quita una cabecera `@vendor`/`@doc` previa (al copiar desde un consumidor o reescribir). */
export const sinCabecera = (t: string): string => t.replace(/^(\/\/ @(vendor|doc) [^\n]*\n)+/, "");

/** Relativos (`./`, `../`) que importa `archivo` y no existen junto a él (`.js` y `.ts` se aceptan entre sí). */
export function importsFaltantes(archivo: string): string[] {
  if (!existsSync(archivo)) return [];
  // ponytail: regex sobre el texto sin comentarios; un `from './x'` dentro de un string daría falso positivo.
  const texto = sinComentarios(readFileSync(archivo, "utf8"));
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
  const destinoDe = (hacia: string): string => (isAbsolute(hacia) ? hacia : join(raiz, hacia));
  // Ruta del kit (sin extensión) → destinos en el consumidor: base de la reescritura de relativos.
  const destinos = new Map<string, string[]>();
  for (const a of cfg.archivos) destinos.set(claveKit(a.desde), [...(destinos.get(claveKit(a.desde)) ?? []), destinoDe(a.hacia)]);
  /** Módulos (basename) que la config deposita en la carpeta de `destino`; si ninguno, todos los de la config. */
  const modulosJunto = (destino: string): string[] => {
    const modulos = cfg.archivos.filter((a) => /\.(m?[jt]s)$/.test(a.desde) && !esSchemas(a.desde)).map((a) => ({ m: moduloDe(a.desde), d: destinoDe(a.hacia) }));
    const mismos = modulos.filter((x) => dirname(x.d) === dirname(destino)).map((x) => x.m);
    return mismos.length ? mismos : modulos.map((x) => x.m);
  };
  for (const a of cfg.archivos) {
    const destino = destinoDe(a.hacia);
    const previa = fechaCopia(destino);
    const base: TResultadoVendor = { desde: a.desde, hacia: a.hacia, estado: "error", previa };
    const bloqueo = cfg.perfil ? bloqueoDePerfil(a.desde, cfg.perfil) : null;
    if (bloqueo) { out.push({ ...base, error: bloqueo, bloqueado: bloqueo }); continue; }
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
    const deps = codigo && cfg.perfil === "server" ? dependenciasDeNavegador(texto) : [];
    if (deps.length) {
      const motivo = `importa dependencias de navegador (${deps.join(", ")}) y el consumidor es server`;
      out.push({ ...base, ...gana, error: motivo, bloqueado: motivo });
      continue;
    }
    let secciones: string[] | undefined;
    if (codigo && esSchemas(a.desde)) {
      const p = podarSchemas(texto, modulosJunto(destino));
      texto = p.texto;
      secciones = p.secciones;
    }
    if (codigo) texto = reescribirRelativos(texto, a.desde, destino, destinos);
    // La doc SIEMPRE por CDN (nunca ruta local): `a.doc` o la `// @doc` que trae la fuente, fijada al
    // SHA ganador; si ganó el checkout local (sin SHA), a la rama.
    const ref = gana.sha ?? cfg.rama;
    const docFuente = texto.match(/^\/\/ @doc (\S+)/m)?.[1];
    const doc = a.doc
      ? (/^https?:/.test(a.doc) ? a.doc : `https://cdn.jsdelivr.net/gh/${cfg.repo}@${ref}/${a.doc}`)
      : docFuente ? docFuente.replace(/(cdn\.jsdelivr\.net\/gh\/[^@/]+\/[^@/]+)@[^/]+\//, `$1@${ref}/`) : null;
    const origen = `${cfg.repo}@${gana.sha ?? "local"}`;
    const cabecera = codigo ? `// @vendor ${gana.fecha} ${origen} ${a.desde}\n${doc ? `// @doc ${doc}\n` : ""}` : "";
    try {
      mkdirSync(dirname(destino), { recursive: true });
      const tmp = `${destino}.${Date.now()}.tmp`;
      writeFileSync(tmp, cabecera + sinCabecera(texto), "utf8");
      renameSync(tmp, destino);
      out.push({ ...base, estado: "actualizado", ...gana, ...(secciones ? { secciones } : {}) });
    } catch (e) {
      out.push({ ...base, ...gana, error: `escritura: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  for (const r of out) {
    if (!/\.(m?[jt]s)$/.test(r.hacia) || r.bloqueado) continue;
    const archivo = destinoDe(r.hacia);
    const faltan = importsFaltantes(archivo);
    if (faltan.length) r.faltan = faltan;
    // Una copia previa (al día) también cuenta: un server no conserva nada que importe navegador.
    const deps = cfg.perfil === "server" && existsSync(archivo) ? dependenciasDeNavegador(readFileSync(archivo, "utf8")) : [];
    if (deps.length) r.bloqueado = `la copia importa dependencias de navegador (${deps.join(", ")}) y el consumidor es server`;
  }
  return out;
}

/**
 * Protocolo de pines tras vendorizar: `pin-update.mjs --nuevo=ultimo --local=<local>` (el que está junto a
 * este archivo), con el runtime actual (Deno o Node) y `cwd` en la raíz del consumidor. Devuelve el código
 * del protocolo (`null` si no se corrió: `pin.activo: false` o falta el script).
 */
export function protocoloPines(cfg: TConfigVendor, raiz: string, log: (l: string) => void = console.log): number | null {
  if (cfg.pin?.activo === false) { log("[vendor] pines: desactivado en la config (pin.activo: false)"); return null; }
  const script = join(dirname(fileURLToPath(import.meta.url)), "pin-update.mjs");
  if (!existsSync(script)) { log(`[vendor] AVISO pines: falta ${script} (vendoriza shared/tools/pin-update.mjs junto a vendor.ts); no se actualizan pines`); return null; }
  const args = [script, "--nuevo=ultimo", `--repo=${cfg.repo}`, `--rama=${cfg.rama}`];
  if (cfg.local) args.push(`--local=${cfg.local}`);
  if (cfg.pin?.raices?.length) args.push(`--raices=${cfg.pin.raices.join(",")}`);
  if (cfg.pin?.saltar?.length) args.push(`--saltar=${cfg.pin.saltar.join(",")}`);
  if (cfg.pin?.verificar) args.push(`--verificar=${cfg.pin.verificar}`);
  // Sin `Deno.*`: el runtime se detecta por el global; `process.execPath` es deno o node según quien corra.
  const esDeno = "Deno" in globalThis;
  const r = spawnSync(process.execPath, esDeno ? ["run", "-A", ...args] : args, { cwd: raiz, stdio: "inherit" });
  return r.status ?? 1;
}

// CLI: deno run -A vendor.ts <config.json>
// Sin `Deno.*` ni `import.meta.main`: compila igual con lib DOM (ISW) que con deno.ns.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("uso: deno run -A vendor.ts <config.json>");
    process.exit(2);
  }
  const config: unknown = JSON.parse(readFileSync(ruta, "utf8"));
  const cfg = ZConfigVendor.parse(config);
  if (!cfg.perfil) console.warn(`[vendor] AVISO ${ruta} no declara "perfil" ("server" o "client"): se baja sin filtrar por perfil`);
  const res = await vendorizar(config);
  for (const r of res) {
    const que = r.estado === "actualizado" ? `actualizado (${r.fuente} ${r.fecha})` : r.estado === "al-dia" ? `al día (${r.previa})` : `AVISO ${r.error}`;
    console.log(`[vendor] ${r.hacia}: ${que}${r.secciones ? ` · secciones: ${r.secciones.join(", ")}` : ""}`);
    if (r.bloqueado) console.error(`[vendor] ERROR ${r.hacia} bloqueado por perfil: ${r.bloqueado} (quítalo de ${ruta})`);
    if (r.faltan) console.error(`[vendor] ERROR ${r.hacia} importa lo que no se vendoriza: ${r.faltan.join(", ")} (agrégalo a ${ruta})`);
  }
  // Un aviso no rompe el build: la copia existente se conserva (sin red, por ejemplo).
  // Un import sin vendorizar sí: ese archivo no compila en el consumidor.
  // Un archivo de otro perfil tampoco: el consumidor arrastraría dependencias que no le tocan.
  if (res.some((r) => r.faltan || r.bloqueado)) process.exit(1);
  // Protocolo de pines: 4 (sin red) es aviso; 1 (refs mutables), 2 (uso) y 3 (nada publicado) rompen.
  const pin = protocoloPines(cfg, resolve(cfg.raiz ?? "."));
  if (pin === 4) console.warn("[vendor] AVISO pines: sin red, los pines se conservan");
  else if (pin !== null && pin !== 0) { console.error(`[vendor] ERROR protocolo de pines (código ${pin})`); process.exit(1); }
}
