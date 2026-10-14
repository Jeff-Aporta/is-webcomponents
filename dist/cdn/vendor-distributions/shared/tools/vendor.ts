// @vendor 2026-10-14T13:21:59.537Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/tools/vendor.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
/**
 * vendor.ts — mantiene al día, por BARRIDO, todo lo que un consumidor (ISS, ISW…) trae de un repo GitHub
 * (el kit u otro) por vendor strategy: código (.ts .js .mjs .cjs), docs y skills (.md), .css, .html y .json.
 *
 *   deno run -A <ISU>/vendor.ts vendor.json
 *
 * BARRIDO (Jeff, 2026-10-13): `vendor.ts` recorre el consumidor (`raices`, por defecto la raíz; salta
 * node_modules, .git, dist, .tmp*, _entregable…), encuentra todo archivo con cabecera `@vendor` y, para
 * cada uno, resuelve su origen DESDE LA PROPIA CABECERA (`<repo>` y `<desde>`): compara la fecha de la
 * cabecera con la del checkout local (si `local` está configurado y existe) y con la web (el PIN ESTÁTICO
 * del proyecto en jsDelivr), y si hay una fuente más reciente la baja y reescribe la cabecera. Así el
 * propio `vendor.ts` del consumidor se actualiza solo (él también lleva cabecera), y `vendor.json` queda
 * solo como BOOTSTRAP: `repo`, `rama`, `perfil`, `local`, `raices` y las ALTAS (`archivos`: lo que aún no
 * existe en el consumidor, `desde → hacia`; `carpeta: true` trae un árbol completo). Una vez bajado, el
 * archivo se mantiene por su cabecera.
 *
 * FORMATO DE CABECERA POR TIPO DE ARCHIVO (siempre `<ISO> <repo>@main <desde>`: el CANAL es la rama, portable entre
 * máquinas; ni `@local` ni un sha. Las cabeceras anteriores con `@local`/`@<sha40>` se leen igual y migran al reescribir.
 * Opcional `@doc <url>`):
 *   .ts .js .mjs .cjs   // @vendor <ISO> <repo>@<sha> <desde>        // @doc <url>
 *   .md .html           <!-- @vendor <ISO> <repo>@<sha> <desde> -->   <!-- @doc <url> -->
 *   .css                /* @vendor <ISO> <repo>@<sha> <desde> *​/     /* @doc <url> *​/
 *   .json               "$vendor": "<ISO> <repo>@<sha> <desde>"       "$doc": "<url>"   (primeras claves del objeto)
 *
 * FUENTES (ambas se verifican y gana la más reciente; se baja solo si es más nueva que la cabecera):
 *   (1) checkout `local` SOLO si está en la config, existe y es legible (si no, una línea de log y se sigue; nunca
 *       falla): fecha = la cabecera `@vendor` que el hook pre-commit del kit estampa; «ahora» si tiene cambios sin
 *       commitear; `git log -1` si no hay cabecera.
 *   (2) la web: `main` (fecha del último commit del archivo vía API de GitHub, cacheada por sha en
 *       `.tmp/vendor-fechas.json`; sin red/cuota, `Last-Modified` de jsDelivr `@main` como respaldo) y, si el
 *       consumidor tiene pin estático (el `<repo>@<sha40>` más citado en el barrido, o `pin.sha`), también el pin.
 *       Se baja de `https://cdn.jsdelivr.net/gh/<repo>@<sha>/<desde>` (sha del HEAD o del pin; `@main` solo sin API).
 * Un archivo que aún no está en la web (404, p. ej. una skill recién creada) se copia del checkout local con el
 * aviso «copiado de local, aún no publicado».
 *
 * SCHEMAS ÚNICO PODADO: `shared/schemas.ts` se vendoriza una vez por carpeta y se PODA a `comun` + las
 * secciones de los módulos presentes en esa carpeta (archivos con cabecera `@vendor` + altas) + sus
 * `requiere` transitivos. El resultado trae `secciones`.
 *
 * Sin red o con la API de GitHub agotada (60 peticiones/h sin token; `GITHUB_TOKEN` en el entorno sube la cuota) la web
 * no cuenta y solo compite el checkout local; las fechas ya resueltas por pin quedan en caché.
 *
 * SKILLS: una skill del kit (`skills/<nombre>/**`) se trae a `skills/<nombre>/**` del consumidor (alta con
 * `carpeta: true`): SOLO su documentación; `tools/**` y cualquier script .ts/.mjs/.js de la skill no se descargan
 * (se ejecutan online desde `@main`, y cada SKILL.md muestra el comando con su URL). Cada .md lleva su cabecera HTML. `skills/README.md` del consumidor lo genera/actualiza el
 * vendor: índice de skills propias (sin cabecera `@vendor`) y comunes (con su fecha). Nunca se vendoriza
 * encima de un archivo que ya existe SIN cabecera `@vendor` (skill o archivo propio): error claro, no se pisa. Lo que no
 * admite cabecera (.scss, .gitignore…) no tiene fecha: igual al origen = al día; distinto = se reescribe con aviso.
 * La línea `Skill: skills/…md` del docblock de cada .ts se reescribe a la ruta local del consumidor si tiene esa
 * skill, o a la URL jsDelivr del pin si no.
 *
 * GUARDIÁN DE IMPORTS, RUTAS AL APLANAR y PERFILES: como siempre (las plantillas de `skills/` quedan fuera del
 * guardián de imports y del de navegador: son docs, no código que el consumidor compile). Un relativo que no existe junto al archivo
 * → `faltan` y la CLI sale con 1; los relativos entre archivos vendorizados se reescriben a la ruta entre
 * destinos (se prefiere la copia de la misma carpeta); un consumidor `server` nunca recibe `client/` ni
 * dependencias de navegador (`bloqueado`).
 *
 * ONLINE (Jeff, 2026-10-13): este script NO se vendoriza; los consumidores corren su BUNDLE autocontenido
 * (`dist/cdn/vendor-distributions/shared/tools/vendor.mjs`, scripts/build-online.mjs: schemas y pin-update inlineados,
 * `zod` como `npm:`) desde `@main` del kit con `--reload` del origen (Deno cachea los módulos remotos para siempre). Igual `pin-update.mjs`, `download-iconify.ts`
 * y `render-lote.ts`: CLI que corre Deno y cuyos tipos ningún código del consumidor importa. Lo que los tests o el
 * código importan con tipos (pruebas, cooldown, jueces, semantica, proveedores-llm, stagehand, schemas, sync, build/*)
 * sí se vendoriza.
 *
 * PROTOCOLO DE PINES: la CLI corre PRIMERO `pin-update.mjs --nuevo=ultimo --local=<local>` (el que está junto a
 * este archivo, ruta o URL) para que el pin del proyecto sea el último SHA publicado, y luego barre con ese pin.
 * Códigos del protocolo: 0 ok · 1 refs mutables · 2 uso · 3 nada publicado · 4 sin red (aviso).
 *
 * Perfil: shared. Vendor: NO se vendoriza: se corre online el bundle `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs` (con `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`); schemas y pin-update van inlineados.
 * Skill: skills/iswc-foundation/references/06-pines-y-vendor.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, posix, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { PERFILES, ZConfigVendor, type FetchFn, type OpcionesVendorizar, type TCabeceraVendor, type TConfigVendor, type TPerfil, type TPerfilVendor, type TResultadoVendor, type TrabajoVendor as Trabajo } from "../schemas.ts";

/** Nombre del archivo único de contratos (se poda por secciones al vendorizar). */
export const SCHEMAS = "schemas.ts";
/** Sección de `schemas.ts` que siempre se conserva. */
export const SECCION_COMUN = "comun";
/** Extensiones que el barrido entiende (cada una con su formato de cabecera). */
export const EXTENSIONES = [".ts", ".js", ".mjs", ".cjs", ".md", ".css", ".html", ".json"] as const;
/** Carpetas que el barrido nunca entra. */
export const SALTAR = ["node_modules", ".git", "dist", "_entregable", ".tmp", ".tmp-scss"] as const;
const RE_CODIGO = /\.(m?[jt]s|cjs)$/;

/** Quita comentarios de bloque y de línea completa (los imports dentro de comentarios no cuentan). */
const sinComentarios = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Specifiers de `import … from`, `export … from`, `import 'x'`, `import('x')`, `require('x')` y `createRequire(u)('x')`. */
const RE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bcreateRequire\s*\([^)]*\)\s*\(\s*)["']([^"']+)["']/g;

/** Paquetes que solo tienen sentido con un navegador (automatización, DOM simulado). */
const RE_NAVEGADOR = /^(?:npm:)?(?:playwright(?:-core)?|@playwright\/|puppeteer(?:-core)?|@browserbasehq\/|chromium|chrome-launcher|jsdom|happy-dom|@stagehand\/)/;

/** Marcadores de sección de `schemas.ts`. */
const RE_SECCION = /^\/\/ ===== @seccion (\S+)(?: \[requiere: ([^\]]*)\])? =====\r?\n([\s\S]*?)^\/\/ ===== @fin \1 =====\r?\n?/gm;

/** Cuerpo de una cabecera: `<ISO> <repo>@<sha|local> <desde>` (o solo `<ISO>`, forma corta tolerada al leer). */
const RE_CUERPO = /^(\S+)(?:\s+([^\s@]+\/[^\s@]+)@(\S+)\s+(\S+))?\s*$/;

// ── Perfiles ───────────────────────────────────────────────────────────────────

/**
 * Perfil de una ruta del kit (`…/vendor-distributions/<perfil>/…`). `null` si la ruta no es de
 * `vendor-distributions/` (p. ej. `skills/…`); `"sin-perfil"` si lo es pero no cuelga de un perfil.
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

// ── Cabeceras por tipo de archivo ──────────────────────────────────────────────

/** Estilo de comentario de una ruta por su extensión; `null` si el barrido no la entiende. */
export function estiloDe(ruta: string): "linea" | "html" | "css" | "json" | null {
  const e = extname(ruta).toLowerCase();
  if (e === ".ts" || e === ".js" || e === ".mjs" || e === ".cjs") return "linea";
  if (e === ".md" || e === ".html") return "html";
  if (e === ".css") return "css";
  if (e === ".json") return "json";
  return null;
}

const ENVOLTORIO = {
  linea: (c: string) => `// ${c}`,
  html: (c: string) => `<!-- ${c} -->`,
  css: (c: string) => `/* ${c} */`,
} as const;
const RE_LINEA_CABECERA = {
  linea: /^\/\/ @(vendor|doc) ([^\n]*?)\r?\n/,
  html: /^<!-- @(vendor|doc) ([^\n]*?) -->\r?\n/,
  css: /^\/\* @(vendor|doc) ([^\n]*?) \*\/\r?\n/,
} as const;

/** Front matter YAML de un .md (`---` … `---`): la cabecera va después, para no romper a quien lo parsea (skills). */
function partirFrontMatter(texto: string, ruta: string): { fm: string; resto: string } {
  if (!ruta.toLowerCase().endsWith(".md")) return { fm: "", resto: texto };
  const m = texto.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? { fm: m[0], resto: texto.slice(m[0].length) } : { fm: "", resto: texto };
}

function parsearCuerpo(cuerpo: string): TCabeceraVendor | null {
  const m = cuerpo.trim().match(RE_CUERPO);
  if (!m) return null;
  const d = new Date(m[1]!);
  if (isNaN(d.getTime())) return null;
  return { fecha: d.toISOString(), repo: m[2] ?? null, sha: m[3] ?? null, desde: m[4] ?? null };
}

/** Lee la cabecera `@vendor` (y `@doc`) de un texto según su estilo; `null` si no la tiene. */
export function leerCabecera(texto: string, ruta: string): (TCabeceraVendor & { doc: string | null }) | null {
  const estilo = estiloDe(ruta);
  if (!estilo) return null;
  if (estilo === "json") {
    const v = texto.match(/"\$vendor"\s*:\s*"([^"]*)"/)?.[1];
    const c = v ? parsearCuerpo(v) : null;
    return c ? { ...c, doc: texto.match(/"\$doc"\s*:\s*"([^"]*)"/)?.[1] ?? null } : null;
  }
  const re = RE_LINEA_CABECERA[estilo];
  let resto = partirFrontMatter(texto, ruta).resto;
  let cab: TCabeceraVendor | null = null;
  let doc: string | null = null;
  for (let i = 0; i < 2; i++) {
    const m = resto.match(re);
    if (!m) break;
    if (m[1] === "vendor") cab = parsearCuerpo(m[2]!);
    else doc = m[2]!.trim();
    resto = resto.slice(m[0].length);
  }
  return cab ? { ...cab, doc } : null;
}

/** La `@doc` de las primeras líneas (con o sin `@vendor` delante: en el kit la fuente puede abrir con `// @doc`). */
export function docDeCabecera(texto: string, ruta: string): string | null {
  const estilo = estiloDe(ruta);
  if (!estilo) return null;
  if (estilo === "json") return texto.match(/"\$doc"\s*:\s*"([^"]*)"/)?.[1] ?? null;
  const re = RE_LINEA_CABECERA[estilo];
  let resto = partirFrontMatter(texto, ruta).resto;
  for (let i = 0; i < 2; i++) {
    const m = resto.match(re);
    if (!m) break;
    if (m[1] === "doc") return m[2]!.trim();
    resto = resto.slice(m[0].length);
  }
  return null;
}

/** Quita una cabecera `@vendor`/`@doc` previa (al copiar desde el kit o desde otro consumidor). */
export function sinCabecera(texto: string, ruta: string): string {
  const estilo = estiloDe(ruta);
  if (!estilo) return texto;
  if (estilo === "json") {
    try {
      const v: unknown = JSON.parse(texto);
      if (!v || typeof v !== "object" || Array.isArray(v)) return texto;
      const { $vendor: _v, $doc: _d, ...resto } = v as Record<string, unknown>;
      return `${JSON.stringify(resto, null, 2)}\n`;
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

/** Antepone (o, en JSON, inserta como primeras claves) la cabecera `@vendor` y la `@doc` opcional. */
export function conCabecera(texto: string, ruta: string, cuerpo: string, doc: string | null): string {
  const estilo = estiloDe(ruta);
  if (!estilo) return texto;
  const limpio = sinCabecera(texto, ruta);
  if (estilo === "json") {
    const v = JSON.parse(limpio) as Record<string, unknown>;
    return `${JSON.stringify({ $vendor: cuerpo, ...(doc ? { $doc: doc } : {}), ...v }, null, 2)}\n`;
  }
  const env = ENVOLTORIO[estilo];
  const { fm, resto } = partirFrontMatter(limpio, ruta);
  return `${fm}${env(`@vendor ${cuerpo}`)}\n${doc ? `${env(`@doc ${doc}`)}\n` : ""}${resto}`;
}

/** Fecha de la copia del consumidor (cabecera `@vendor`), o null si no hay o no se entiende. */
export function fechaCopia(archivo: string): string | null {
  if (!existsSync(archivo)) return null;
  return leerCabecera(readFileSync(archivo, "utf8"), archivo)?.fecha ?? null;
}

// ── schemas.ts: secciones y poda ───────────────────────────────────────────────

/** Ruta del kit sin extensión de código (clave para emparejar `.js` con `.ts`). */
const claveKit = (ruta: string): string => posix.normalize(ruta.replaceAll("\\", "/")).replace(RE_CODIGO, "");

/** Nombre de módulo de una ruta (basename sin extensión): la clave de su sección en `schemas.ts`. */
export const moduloDe = (ruta: string): string => basename(ruta.replaceAll("\\", "/")).replace(RE_CODIGO, "");

/** `true` si viene de `skills/`: docs y plantillas, no código que el consumidor compile (sin guardián de imports ni de navegador). */
export const esSkill = (ruta: string): boolean => /^skills\//.test(ruta.replaceAll("\\", "/"));

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

// ── Reescrituras al depositar ──────────────────────────────────────────────────

/**
 * Reescribe los relativos de `texto` (fuente en `desde`) que apuntan a otro archivo vendorizado: el specifier
 * pasa a ser la ruta entre los dos destinos, con la extensión que traía. Si el mismo archivo del kit está en
 * varias carpetas, se prefiere la de `destino` (el importador).
 */
function reescribirRelativos(texto: string, desde: string, destino: string, destinos: Map<string, string[]>): string {
  return texto.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.?\/[^"']+)\2/g, (todo, pre: string, q: string, spec: string) => {
    const otros = destinos.get(claveKit(posix.join(posix.dirname(desde.replaceAll("\\", "/")), spec)));
    if (!otros?.length) return todo;
    const otro = otros.find((o) => dirname(o) === dirname(destino)) ?? otros[0]!;
    let rel = relative(dirname(destino), otro).replaceAll("\\", "/");
    if (!rel.startsWith(".")) rel = `./${rel}`;
    const ext = spec.match(RE_CODIGO)?.[0];
    rel = ext ? rel.replace(RE_CODIGO, ext) : rel.replace(RE_CODIGO, "");
    return `${pre}${q}${rel}${q}`;
  });
}

/**
 * La línea `Skill: skills/…md` del docblock: ruta relativa a la copia local del consumidor si la tiene (archivo
 * existente o alta de esta corrida), o URL jsDelivr del pin si no.
 */
function reescribirSkill(texto: string, destino: string, raiz: string, altas: Set<string>, repo: string, ref: string): string {
  return texto.replace(/^(\s*(?:\*|\/\/)\s*Skill:\s*)(skills\/\S+)/m, (_, pre: string, ruta: string) => {
    const local = join(raiz, ruta);
    if (existsSync(local) || altas.has(ruta)) {
      let rel = relative(dirname(destino), local).replaceAll("\\", "/");
      if (!rel.startsWith(".")) rel = `./${rel}`;
      return `${pre}${rel}`;
    }
    return `${pre}https://cdn.jsdelivr.net/gh/${repo}@${ref}/${ruta}`;
  });
}

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

// ── Fuentes: checkout local y web (pin estático) ───────────────────────────────

/**
 * Fecha del archivo en el checkout: la cabecera `@vendor` que el hook pre-commit del kit estampa (si está
 * commiteado y limpio); si tiene cambios sin commitear o no está en git, «ahora»; si no, `git log -1`.
 */
export function fechaLocal(checkout: string, ruta: string): string | null {
  const f = join(checkout, ruta);
  if (!existsSync(f)) return null;
  let sucio = true;
  try {
    sucio = !!execFileSync("git", ["-C", checkout, "status", "--porcelain", "--", ruta], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { /* sin git: cuenta como sucio (ahora) */ }
  if (sucio) return new Date().toISOString();
  const cab = leerCabecera(readFileSync(f, "utf8"), f);
  if (cab) return cab.fecha;
  try {
    const iso = execFileSync("git", ["-C", checkout, "log", "-1", "--format=%cI", "--", ruta], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return iso ? new Date(iso).toISOString() : null;
  } catch {
    return null;
  }
}

/** Cabeceras de la API de GitHub; `GITHUB_TOKEN` (opcional) sube la cuota de 60/h a 5000/h. */
function cabecerasApi(): Record<string, string> {
  const h: Record<string, string> = { "User-Agent": "iswc-vendor", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

/**
 * Commit HEAD de la rama: sha y fecha por la API de GitHub; sin API (cuota 60/h, sin token) el sha lo resuelve
 * jsDelivr (`data.jsdelivr.com/v1/package/resolve/gh/<repo>@<rama>`) y la fecha queda null (se usa `Last-Modified`
 * por archivo). `null` solo sin red.
 */
async function cabezaRemota(repo: string, rama: string, fetchFn: FetchFn): Promise<{ sha: string; fecha: string | null } | null> {
  try {
    const r = await fetchFn(`https://api.github.com/repos/${repo}/commits/${rama}`, { headers: cabecerasApi() });
    if (r.ok) {
      const c = await r.json() as { sha?: string; commit?: { author?: { date?: string }; committer?: { date?: string } } };
      const fecha = c.commit?.committer?.date ?? c.commit?.author?.date;
      if (c.sha && fecha) return { sha: c.sha, fecha: new Date(fecha).toISOString() };
    }
  } catch { /* sin API: respaldo */ }
  try {
    const r = await fetchFn(`https://data.jsdelivr.com/v1/package/resolve/gh/${repo}@${rama}`);
    if (!r.ok) return null;
    const j = await r.json() as { version?: string };
    return j.version && /^[0-9a-f]{40}$/.test(j.version) ? { sha: j.version, fecha: null } : null;
  } catch {
    return null;
  }
}

/** Fecha del último commit que tocó `ruta` en `sha` (API de GitHub), o null. */
async function fechaEnPin(repo: string, sha: string, ruta: string, fetchFn: FetchFn): Promise<string | null> {
  try {
    const r = await fetchFn(`https://api.github.com/repos/${repo}/commits?sha=${sha}&path=${encodeURIComponent(ruta)}&per_page=1`, { headers: cabecerasApi() });
    if (!r.ok) return null;
    const l = await r.json() as { commit?: { committer?: { date?: string }; author?: { date?: string } } }[];
    const fecha = l[0]?.commit?.committer?.date ?? l[0]?.commit?.author?.date;
    return fecha ? new Date(fecha).toISOString() : null;
  } catch {
    return null;
  }
}

/** Caché de fechas por pin (un pin es inmutable): `.tmp/vendor-fechas.json` del consumidor. */
function cacheFechas(raiz: string): { leer: (k: string) => string | null | undefined; guardar: (k: string, v: string | null) => void } {
  const ruta = join(raiz, ".tmp", "vendor-fechas.json");
  let datos: Record<string, string | null> = {};
  try { datos = existsSync(ruta) ? JSON.parse(readFileSync(ruta, "utf8")) as Record<string, string | null> : {}; } catch { datos = {}; }
  return {
    leer: (k) => datos[k],
    guardar: (k, v) => {
      datos[k] = v;
      try { mkdirSync(dirname(ruta), { recursive: true }); writeFileSync(ruta, `${JSON.stringify(datos, null, 2)}\n`); } catch { /* sin .tmp: sin caché */ }
    },
  };
}

/**
 * Lo que de una skill (`skills/<nombre>/**`) viaja al consumidor: SOLO documentación (.md, .json, .html…). `tools/**` y
 * cualquier .ts/.mjs/.js/.cjs de la skill NUNCA se descargan: se ejecutan online con Deno desde `@main` (Jeff, 2026-10-13).
 * Fuera de `skills/` no se filtra nada.
 */
export function archivosDeSkill(desde: string, lista: readonly string[]): string[] {
  if (!esSkill(desde)) return [...lista];
  return lista.filter((f) => !/\/tools\//.test(f) && !/\.(m?[jt]s|cjs)$/.test(f));
}

/** Archivos bajo `prefijo` en `repo@sha` (listado plano de jsDelivr), o null sin red. */
async function listarEnWeb(repo: string, sha: string, prefijo: string, fetchFn: FetchFn): Promise<string[] | null> {
  try {
    const r = await fetchFn(`https://data.jsdelivr.com/v1/package/gh/${repo}@${sha}/flat`);
    if (!r.ok) return null;
    const j = await r.json() as { files?: { name: string }[] };
    const p = `/${prefijo.replace(/\/$/, "")}/`;
    return (j.files ?? []).map((f) => f.name).filter((n) => n.startsWith(p)).map((n) => n.slice(1));
  } catch {
    return null;
  }
}

/** Archivos bajo `prefijo` en el checkout local (recursivo, rutas posix relativas al checkout). */
function listarEnLocal(checkout: string, prefijo: string): string[] {
  const out: string[] = [];
  const base = join(checkout, prefijo);
  if (!existsSync(base)) return out;
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(relative(checkout, p).replaceAll("\\", "/"));
    }
  };
  walk(base);
  return out.sort();
}

// ── Barrido ────────────────────────────────────────────────────────────────────

/** Archivos con extensión apta bajo `raices` (relativos a `raiz`, posix), saltando `saltar`. */
export function barrer(raiz: string, raices: readonly string[] = ["."], saltar: readonly string[] = SALTAR): string[] {
  const out: string[] = [];
  const salta = (n: string) => saltar.some((s) => n === s || (s.endsWith("*") && n.startsWith(s.slice(0, -1))) || (s === ".tmp" && n.startsWith(".tmp")));
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!salta(e.name)) walk(p); }
      else if (estiloDe(e.name)) out.push(relative(raiz, p).replaceAll("\\", "/"));
    }
  };
  for (const r of raices) {
    const p = resolve(raiz, r);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) walk(p); else if (estiloDe(p)) out.push(relative(raiz, p).replaceAll("\\", "/"));
  }
  return [...new Set(out)].sort();
}

/** Lo que el barrido sabe de cada archivo: su cabecera (si la tiene) y los pines `<repo>@<sha40>` que cita. */
export function inventariar(raiz: string, archivos: readonly string[], repo: string): { vendorizados: { hacia: string; cabecera: TCabeceraVendor & { doc: string | null } }[]; pines: Map<string, number> } {
  const vendorizados: { hacia: string; cabecera: TCabeceraVendor & { doc: string | null } }[] = [];
  const pines = new Map<string, number>();
  const nombre = repo.split("/")[1]!;
  const rePin = new RegExp(`(?:${nombre}|iswc-root|is-webcomponents)@([0-9a-f]{40})`, "g");
  for (const h of archivos) {
    let t: string;
    try { t = readFileSync(join(raiz, h), "utf8"); } catch { continue; }
    const cab = leerCabecera(t, h);
    if (cab) vendorizados.push({ hacia: h, cabecera: cab });
    for (const m of t.matchAll(rePin)) pines.set(m[1]!, (pines.get(m[1]!) ?? 0) + 1);
  }
  return { vendorizados, pines };
}

// ── skills/README.md del consumidor ────────────────────────────────────────────

const MARCA_README = "<!-- generado por vendor.ts: índice de skills propias y comunes; se regenera en cada vendor -->";

/** Genera/actualiza `skills/README.md` del consumidor: skills propias (sin cabecera `@vendor`) y comunes (con fecha). */
export function generarReadmeSkills(raiz: string, log: (l: string) => void = () => {}): string | null {
  const dir = join(raiz, "skills");
  if (!existsSync(dir)) return null;
  const readme = join(dir, "README.md");
  if (existsSync(readme) && !readFileSync(readme, "utf8").includes(MARCA_README)) {
    log(`[vendor] AVISO skills/README.md existe y no lo generó vendor.ts: no se toca (agrega la marca «${MARCA_README}» para que lo regenere)`);
    return null;
  }
  const propias: string[] = [];
  const comunes: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory()) continue;
    const skill = join(dir, e.name, "SKILL.md");
    const cab = existsSync(skill) ? leerCabecera(readFileSync(skill, "utf8"), skill) : null;
    const n = listarEnLocal(dir, e.name).length;
    if (cab) comunes.push(`| [${e.name}](${e.name}/SKILL.md) | ${cab.repo ?? "?"}@main · \`${cab.desde ?? ""}\` | ${cab.fecha} | ${n} |`);
    else propias.push(`| [${e.name}](${existsSync(skill) ? `${e.name}/SKILL.md` : e.name}) | ${n} |`);
  }
  const texto = [
    MARCA_README,
    "# Skills de este proyecto",
    "",
    "Punto de entrada de los agentes: aquí están las skills PROPIAS del proyecto y las COMUNES que vienen del kit por",
    "vendor (`vendor.ts`, barrido por cabecera `<!-- @vendor <ISO> <repo>@<sha> <desde> -->` en cada .md). Las comunes no",
    "se editan aquí: se cambian en el kit y el siguiente `vendor` las trae (gana la fecha más reciente entre el checkout",
    "local y el pin del proyecto en jsDelivr). Una skill propia nunca se pisa: si una alta choca con un archivo sin",
    "cabecera `@vendor`, `vendor.ts` falla con un error claro.",
    "",
    "## Propias",
    "",
    "| Skill | Archivos |",
    "| --- | --- |",
    ...(propias.length ? propias : ["| (ninguna) | |"]),
    "",
    "## Comunes (del kit, por vendor)",
    "",
    "| Skill | Origen | @vendor | Archivos |",
    "| --- | --- | --- | --- |",
    ...(comunes.length ? comunes : ["| (ninguna) | | | |"]),
    "",
  ].join("\n");
  writeFileSync(readme, texto);
  return readme;
}

// ── Vendorizar ─────────────────────────────────────────────────────────────────

/**
 * Barre el consumidor y aplica las altas de la configuración. No lanza por archivo: cada uno trae su estado.
 * Devuelve un resultado por archivo (primero las altas, luego lo barrido).
 */
export async function vendorizar(entrada: unknown, opciones: OpcionesVendorizar = {}): Promise<TResultadoVendor[]> {
  const cfg: TConfigVendor = ZConfigVendor.parse(entrada);
  const raiz = resolve(opciones.raiz ?? cfg.raiz ?? ".");
  const fetchFn = opciones.fetchFn ?? fetch;
  const log = opciones.log ?? (() => {});
  const local = cfg.local && existsSync(cfg.local) ? cfg.local : null;
  const destinoDe = (hacia: string): string => (isAbsolute(hacia) ? hacia : join(raiz, hacia));
  const out: TResultadoVendor[] = [];

  // 1. Barrido: cabeceras existentes y pin del proyecto.
  const { vendorizados, pines } = inventariar(raiz, barrer(raiz, cfg.raices ?? ["."], [...SALTAR, ...(cfg.saltar ?? [])]), cfg.repo);
  const pinBarrido = [...pines.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const pin = pinBarrido ?? cfg.pin?.sha ?? null;
  // El CANAL que se sigue es la rama (`main`): HEAD en GitHub (sha + fecha) si hay red y cuota.
  const cabeza = await cabezaRemota(cfg.repo, cfg.rama, fetchFn);
  if (cfg.local && !local) log(`[vendor] checkout local omitido: no existe o no es legible (${cfg.local})`);
  log(`[vendor] fuentes: ${local ? `local ${local}` : "sin local"} · web ${cfg.repo}@${cfg.rama}${cabeza ? ` (HEAD ${cabeza.sha.slice(0, 12)}${cabeza.fecha ? "" : ", sin API de GitHub: fechas por jsDelivr"})` : " (sin red)"}${pin ? ` · pin ${pin.slice(0, 12)}${pinBarrido ? ` (${pines.get(pinBarrido)} referencias)` : " (de la config)"}` : " · sin pin"}`);
  const fechas = cacheFechas(raiz);
  /** Fecha del archivo en un sha (API, cacheada: un sha es inmutable), o la del commit si la API no responde. */
  const fechaEnSha = async (sha: string, desde: string, fechaCommit: string | null): Promise<string | null> => {
    const k = `${cfg.repo}@${sha}:${desde}`;
    const c = fechas.leer(k);
    if (c !== undefined) return c;
    const f = (await fechaEnPin(cfg.repo, sha, desde, fetchFn)) ?? fechaCommit;
    if (f) fechas.guardar(k, f);
    return f;
  };
  /** Respaldo sin API: `Last-Modified` de jsDelivr `@main` (puede ir horas por detrás del commit). */
  const fechaJsDelivrMain = async (desde: string): Promise<string | null> => {
    try {
      const r = await fetchFn(`https://cdn.jsdelivr.net/gh/${cfg.repo}@${cfg.rama}/${desde}`, { method: "HEAD" });
      const lm = r.ok ? r.headers.get("last-modified") : null;
      const d = lm ? new Date(lm) : null;
      return d && !isNaN(d.getTime()) ? d.toISOString() : null;
    } catch {
      return null;
    }
  };
  /** La web: main (API o respaldo jsDelivr) y, si el consumidor tiene pin, también el pin; gana la más reciente. */
  const fechaWeb = async (desde: string): Promise<{ fecha: string; ref: string } | null> => {
    const candidatos: { fecha: string; ref: string }[] = [];
    const fMain = (cabeza ? await fechaEnSha(cabeza.sha, desde, cabeza.fecha) : null) ?? await fechaJsDelivrMain(desde);
    if (fMain) candidatos.push({ fecha: fMain, ref: cabeza?.sha ?? cfg.rama });
    if (pin && pin !== cabeza?.sha) {
      const fPin = await fechaEnSha(pin, desde, null);
      if (fPin) candidatos.push({ fecha: fPin, ref: pin });
    }
    return candidatos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0] ?? null;
  };

  // 2. Trabajos: altas (expandiendo `carpeta: true`) + barridos.
  const trabajos: Trabajo[] = [];
  const altasRutas = new Set<string>();
  for (const a of cfg.archivos ?? []) {
    if (a.carpeta) {
      // Listado: checkout local; si no, jsDelivr en el HEAD (o el pin, o la rama).
      const lista = local ? listarEnLocal(local, a.desde) : await listarEnWeb(cfg.repo, cabeza?.sha ?? pin ?? cfg.rama, a.desde, fetchFn);
      if (!lista) { out.push({ desde: a.desde, hacia: a.hacia, estado: "error", previa: null, error: "carpeta: no se pudo listar (sin checkout local ni red)" }); continue; }
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
    const texto = existsSync(t.destino) ? readFileSync(t.destino, "utf8") : null;
    t.previa = texto !== null ? leerCabecera(texto, t.destino) : null;
    t.alta = texto === null;
  }
  const yaEnAltas = new Set(trabajos.map((t) => t.destino));
  for (const v of vendorizados) {
    const destino = destinoDe(v.hacia);
    if (yaEnAltas.has(destino)) continue;
    if (!v.cabecera.desde) { out.push({ desde: "?", hacia: v.hacia, estado: "error", previa: v.cabecera.fecha, error: "cabecera @vendor sin <repo>@<sha> <desde>: se conserva; vuelve a darla de alta en vendor.json para que lleve origen" }); continue; }
    if (v.cabecera.repo && v.cabecera.repo !== cfg.repo) { out.push({ desde: v.cabecera.desde, hacia: v.hacia, estado: "al-dia", previa: v.cabecera.fecha, error: `de otro repo (${v.cabecera.repo}): no se toca en esta corrida` }); continue; }
    trabajos.push({ desde: v.cabecera.desde, hacia: v.hacia, destino, previa: v.cabecera, alta: false });
  }
  // Ruta del kit (sin extensión) → destinos: base de la reescritura de relativos y de la poda.
  const destinos = new Map<string, string[]>();
  for (const t of trabajos) destinos.set(claveKit(t.desde), [...(destinos.get(claveKit(t.desde)) ?? []), t.destino]);
  const modulosJunto = (destino: string): string[] =>
    trabajos.filter((t) => RE_CODIGO.test(t.desde) && !esSchemas(t.desde) && dirname(t.destino) === dirname(destino)).map((t) => moduloDe(t.desde));

  // 3. Cada trabajo: fuentes, decisión, escritura.
  for (const t of trabajos) {
    const base: TResultadoVendor = { desde: t.desde, hacia: t.hacia, estado: "error", previa: t.previa?.fecha ?? null };
    const bloqueo = cfg.perfil ? bloqueoDePerfil(t.desde, cfg.perfil) : null;
    if (bloqueo) { out.push({ ...base, error: bloqueo, bloqueado: bloqueo }); continue; }
    // Un archivo cuya extensión admite cabecera y no la tiene es PROPIO del consumidor: no se pisa.
    if (existsSync(t.destino) && !t.previa && estiloDe(t.destino)) {
      out.push({ ...base, error: `ya existe sin cabecera @vendor (archivo o skill PROPIA del consumidor): no se pisa; renómbralo o quita el alta` });
      continue;
    }
    const fl = local ? fechaLocal(local, t.desde) : null;
    const fw = await fechaWeb(t.desde);
    // `ref`: de dónde se baja (sha del HEAD o del pin; `main` solo como respaldo sin API). No va en la cabecera.
    const gana: { fuente: "local" | "remoto"; fecha: string; sha: string | null; ref: string } | null = fl && (!fw || new Date(fl) >= new Date(fw.fecha))
      ? { fuente: "local", fecha: fl, sha: null, ref: "" }
      : fw ? { fuente: "remoto", fecha: fw.fecha, sha: /^[0-9a-f]{40}$/.test(fw.ref) ? fw.ref : null, ref: fw.ref } : null;
    if (!gana) { out.push({ ...base, error: "ni checkout local ni web disponibles (¿sin red?): se conserva la copia" }); continue; }
    if (t.previa && new Date(t.previa.fecha) >= new Date(gana.fecha)) { out.push({ ...base, estado: "al-dia", ...gana }); continue; }
    // Sin formato de cabecera (.scss, .gitignore…): no hay fecha que comparar; igual al origen = al día, distinto = se reescribe.
    const sinFormato = !estiloDe(t.destino) && existsSync(t.destino);
    let texto: string;
    let aviso: string | undefined;
    try {
      if (gana.fuente === "local") {
        texto = readFileSync(join(local!, t.desde), "utf8");
      } else {
        const r = await fetchFn(`https://cdn.jsdelivr.net/gh/${cfg.repo}@${gana.ref}/${t.desde}`);
        if (r.ok) texto = await r.text();
        else if (local && existsSync(join(local, t.desde))) {
          texto = readFileSync(join(local, t.desde), "utf8");
          gana.sha = null;
          aviso = `copiado de local, aún no publicado en ${cfg.repo}@${gana.ref.slice(0, 12)} (jsDelivr ${r.status})`;
        } else { out.push({ ...base, ...gana, error: `jsDelivr ${r.status} y sin checkout local` }); continue; }
      }
    } catch (e) {
      out.push({ ...base, ...gana, error: `descarga: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    if (sinFormato && readFileSync(t.destino, "utf8") === texto) { out.push({ ...base, estado: "al-dia", ...gana }); continue; }
    if (sinFormato) aviso = `${aviso ? `${aviso} · ` : ""}sin formato de cabecera: se reescribe desde el origen (igual al origen = al día)`;
    const codigo = RE_CODIGO.test(t.desde);
    const deps = codigo && !esSkill(t.desde) && cfg.perfil === "server" ? dependenciasDeNavegador(texto) : [];
    if (deps.length) {
      const motivo = `importa dependencias de navegador (${deps.join(", ")}) y el consumidor es server`;
      out.push({ ...base, ...gana, error: motivo, bloqueado: motivo });
      continue;
    }
    let secciones: string[] | undefined;
    if (codigo && esSchemas(t.desde)) {
      const p = podarSchemas(texto, modulosJunto(t.destino));
      texto = p.texto;
      secciones = p.secciones;
    }
    // Las URL del contenido (`@doc`, docblocks `Doc:`) se fijan al pin del proyecto (nada mutable); sin pin, al sha bajado o a la rama.
    const ref = pin ?? gana.sha ?? cfg.rama;
    if (codigo) {
      texto = reescribirRelativos(texto, t.desde, t.destino, destinos);
      texto = reescribirSkill(texto, t.destino, raiz, altasRutas, cfg.repo, ref);
      // Toda URL jsDelivr del repo por rama (`@main/`, docblocks `Doc:`…) queda fijada al pin: nada mutable en el consumidor.
      if (/^[0-9a-f]{40}$/.test(ref)) texto = texto.replaceAll(`cdn.jsdelivr.net/gh/${cfg.repo}@${cfg.rama}/`, `cdn.jsdelivr.net/gh/${cfg.repo}@${ref}/`);
    }
    // La doc SIEMPRE por CDN (nunca ruta local): `doc` del alta, la `@doc` de la fuente o la de la copia previa, fijada al pin.
    const docFuente = docDeCabecera(texto, t.destino) ?? t.previa?.doc ?? null;
    const docCfg = t.doc ?? null;
    const doc = docCfg
      ? (/^https?:/.test(docCfg) ? docCfg : `https://cdn.jsdelivr.net/gh/${cfg.repo}@${ref}/${docCfg}`)
      : docFuente ? docFuente.replace(/(cdn\.jsdelivr\.net\/gh\/[^@/]+\/[^@/]+)@[^/]+\//, `$1@${ref}/`) : null;
    // Cabecera PORTABLE (Jeff, 2026-10-13): siempre `<ISO> <repo>@<rama> <desde>`; ni `@local` (ruta de esta máquina) ni un
    // sha (ya está en el pin y en git). Las cabeceras anteriores con `@local`/`@<sha>` se leen igual y migran aquí.
    const cuerpo = `${gana.fecha} ${cfg.repo}@${cfg.rama} ${t.desde}`;
    try {
      const final = estiloDe(t.destino) ? conCabecera(texto, t.destino, cuerpo, doc) : texto;
      mkdirSync(dirname(t.destino), { recursive: true });
      const tmp = `${t.destino}.${Date.now()}.tmp`;
      writeFileSync(tmp, final, "utf8");
      renameSync(tmp, t.destino);
      out.push({ ...base, estado: "actualizado", ...gana, ...(secciones ? { secciones } : {}), ...(aviso ? { aviso } : {}) });
    } catch (e) {
      out.push({ ...base, ...gana, error: `escritura: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  // 4. Guardián de imports y de navegador sobre las copias (también las al día).
  for (const r of out) {
    if (!RE_CODIGO.test(r.hacia) || r.bloqueado || esSkill(r.desde)) continue;
    const archivo = destinoDe(r.hacia);
    const faltan = importsFaltantes(archivo);
    if (faltan.length) r.faltan = faltan;
    const deps = cfg.perfil === "server" && existsSync(archivo) ? dependenciasDeNavegador(readFileSync(archivo, "utf8")) : [];
    if (deps.length) r.bloqueado = `la copia importa dependencias de navegador (${deps.join(", ")}) y el consumidor es server`;
  }
  // 5. Índice de skills del consumidor.
  const readme = generarReadmeSkills(raiz, log);
  if (readme) log(`[vendor] skills/README.md regenerado`);
  return out;
}

// ── Protocolo de pines (CLI) ───────────────────────────────────────────────────

/**
 * El protocolo de `pin-update.mjs` (`--nuevo=ultimo --local=<local>`) llamado como función, con la raíz del
 * consumidor como `root`. Devuelve el código del protocolo (`null` si no se corrió: `pin.activo: false`).
 */
export async function protocoloPines(cfg: TConfigVendor, raiz: string, log: (l: string) => void = console.log): Promise<number | null> {
  if (cfg.pin?.activo === false) { log("[vendor] pines: desactivado en la config (pin.activo: false)"); return null; }
  // `pin-update.mjs` se llama como función (en el bundle online va inlineado: nada de localizar hermanos por ruta).
  const { opciones, protocolo } = await import("./pin-update.mjs");
  const op = opciones({ root: raiz, repo: cfg.repo, rama: cfg.rama, local: cfg.local, raices: cfg.pin?.raices, saltar: cfg.pin?.saltar, verificar: cfg.pin?.verificar });
  return await protocolo("ultimo", op);
}

/**
 * ¿Este módulo es el programa principal? Sin `Deno.*` ni `import.meta.main` (compila igual con lib DOM que con
 * deno.ns). Local: `argv[1]` es la ruta; ONLINE (`deno run -A https://raw.githubusercontent.com/…/vendor.ts`):
 * `argv[1]` es un relleno y manda `import.meta.main`.
 */
export function esPrincipal(url: string = import.meta.url, argv1: string | undefined = process.argv[1], main: boolean | undefined = (import.meta as { main?: boolean }).main): boolean {
  // Deno: `import.meta.main` es la verdad (online, `argv[1]` es un `$deno$node.mjs` de relleno). Node no lo define.
  if (main === true) return true;
  if (!argv1) return false;
  if (url === argv1) return true;
  try { return url === pathToFileURL(argv1).href; } catch { return false; }
}

// CLI: deno run -A vendor.ts <config.json>   (o, ONLINE, el bundle y siempre con --reload del origen:
//   deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs <config.json>)
if (esPrincipal()) {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("uso: deno run -A vendor.ts <config.json>");
    process.exit(2);
  }
  const config: unknown = JSON.parse(readFileSync(ruta, "utf8"));
  const cfg = ZConfigVendor.parse(config);
  const raiz = resolve(cfg.raiz ?? ".");
  if (!cfg.perfil) console.warn(`[vendor] AVISO ${ruta} no declara "perfil" ("server" o "client"): se baja sin filtrar por perfil`);
  // Primero los pines (el barrido lee la web del pin del proyecto): 4 (sin red) es aviso; 1, 2 y 3 rompen al final.
  const pin = await protocoloPines(cfg, raiz);
  if (pin === 4) console.warn("[vendor] AVISO pines: sin red, los pines se conservan");
  const res = await vendorizar(config, { raiz, log: console.log });
  for (const r of res) {
    const que = r.estado === "actualizado" ? `actualizado (${r.fuente} ${r.fecha})` : r.estado === "al-dia" ? `al día (${r.previa})${r.error ? ` · ${r.error}` : ""}` : `AVISO ${r.error}`;
    console.log(`[vendor] ${r.hacia}: ${que}${r.secciones ? ` · secciones: ${r.secciones.join(", ")}` : ""}${r.aviso ? ` · ${r.aviso}` : ""}`);
    if (r.bloqueado) console.error(`[vendor] ERROR ${r.hacia} bloqueado por perfil: ${r.bloqueado} (quítalo de ${ruta})`);
    if (r.faltan) console.error(`[vendor] ERROR ${r.hacia} importa lo que no se vendoriza: ${r.faltan.join(", ")} (dalo de alta en ${ruta})`);
  }
  // Un aviso no rompe el build: la copia existente se conserva (sin red, por ejemplo).
  // Un import sin vendorizar sí; un archivo de otro perfil tampoco; un alta sobre un archivo propio tampoco.
  const propios = res.filter((r) => r.error?.includes("no se pisa"));
  if (res.some((r) => r.faltan || r.bloqueado) || propios.length) process.exit(1);
  if (pin !== null && pin !== 0 && pin !== 4) { console.error(`[vendor] ERROR protocolo de pines (código ${pin})`); process.exit(1); }
}
