// @vendor 2026-10-13T15:02:33.985Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/client/tools/download-iconify.mjs
// Bundle autocontenido de src/vendor-distributions/client/tools/download-iconify.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es src/vendor-distributions/client/tools/download-iconify.ts.

// src/vendor-distributions/client/tools/download-iconify.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
var DEFAULTS = {
  salida: "assets",
  ignorar: ["node_modules", "dist", "vendor", ".git", ".tmp", ".tmp-scss"],
  extensiones: [".ts", ".js", ".mjs", ".html", ".json"],
  podar: true,
  offline: false,
  api: "https://api.iconify.design/",
  concurrencia: 8
};
var ARCHIVO_MAPA = "iconify.json";
var CARPETA_SVG = "iconify";
var LOTE = 80;
var RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
var RE_LITERAL = /(['"`])([a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*)\1/g;
var esIdIcono = (s) => RE_ID.test(s);
function extraerIconos(texto) {
  const out = /* @__PURE__ */ new Set();
  for (const m of texto.matchAll(RE_LITERAL)) out.add(m[2]);
  return [...out];
}
var sinComentarios = (codigo) => codigo.replace(/\/\*\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
function leerDeno(raiz) {
  for (const f of ["deno.json", "deno.jsonc"]) {
    const p = join(raiz, f);
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(readFileSync(p, "utf8").replace(/^\s*\/\/.*$/gm, ""));
    } catch {
      return null;
    }
  }
  return null;
}
function leerHost(raiz) {
  const h = leerDeno(raiz)?.iswc?.host;
  return typeof h === "string" && /^https?:\/\//.test(h) ? h.endsWith("/") ? h : `${h}/` : null;
}
function nombreApp(raiz) {
  const n = leerDeno(raiz)?.name;
  return typeof n === "string" && n ? n : basename(resolve(raiz));
}
function listar(raiz, roots, ignorar, exts, excluir) {
  const out = [];
  const visitar = (p) => {
    if (!existsSync(p) || resolve(p).startsWith(excluir)) return;
    if (statSync(p).isDirectory()) {
      if (ignorar.has(basename(p))) return;
      for (const n of readdirSync(p).sort()) visitar(join(p, n));
    } else if (exts.has(extname(p))) out.push(p);
  };
  for (const r of roots) visitar(join(raiz, r));
  return out;
}
var agrupar = (ids) => {
  const out = {};
  for (const id of [...new Set(ids)].sort()) {
    const [set, nombre] = id.split(":");
    (out[set] ??= []).push(nombre);
  }
  return out;
};
function mapaDelKit(urlHerramienta = import.meta.url) {
  const m = urlHerramienta.match(/^((?:https?|file):.*?)\/(?:src|dist\/cdn)\/vendor-distributions\/(?:client\/)?tools\/[^/]+$/);
  return m ? new URL(`${m[1]}/assets/${ARCHIVO_MAPA}`).href : null;
}
async function leerMapa(ref, raiz, f) {
  const texto = /^https?:/.test(ref) ? await f(ref).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }) : readFileSync(ref.startsWith("file:") ? fileURLToPath(ref) : join(raiz, ref), "utf8");
  const m = JSON.parse(texto);
  if (m?.v !== 1 || typeof m.icons !== "object") throw new Error("no es un iconify.json v1");
  return m;
}
function svgDe(datos, nombre) {
  const i = datos.icons?.[nombre];
  if (!i) return null;
  const w = i.width ?? datos.width ?? 16;
  const h = i.height ?? datos.height ?? 16;
  const l = i.left ?? datos.left ?? 0;
  const t = i.top ?? datos.top ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${+(w / h).toFixed(4)}em" height="1em" viewBox="${l} ${t} ${w} ${h}">${i.body}</svg>`;
}
async function pedir(f, url, intentos = 4) {
  for (let k = 0; k < intentos; k++) {
    try {
      const r = await f(url);
      if (r.ok || r.status === 404) return r;
      await r.body?.cancel();
    } catch {
    }
    if (k < intentos - 1) await new Promise((res) => setTimeout(res, 400 * 2 ** k));
  }
  return null;
}
async function enLotes(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}
async function descargarIconos(opciones) {
  const o = { ...DEFAULTS, ...Object.fromEntries(Object.entries(opciones).filter(([, v]) => v !== void 0)) };
  const f = opciones.fetch ?? fetch;
  const raiz = resolve(typeof o.raiz === "string" ? o.raiz : fileURLToPath(o.raiz));
  const salida = join(raiz, o.salida);
  const dirSvg = join(salida, CARPETA_SVG);
  const api = o.api.endsWith("/") ? o.api : `${o.api}/`;
  const avisos = [];
  const log = (s) => {
    if (!o.silencioso) console.log(`[iconify] ${s}`);
  };
  const avisar = (s) => {
    avisos.push(s);
    if (!o.silencioso) console.warn(`[iconify] aviso: ${s}`);
  };
  const archivos = listar(raiz, o.roots, new Set(o.ignorar), new Set(o.extensiones), resolve(salida));
  const candidatos = new Set(o.extra ?? []);
  for (const a of archivos) {
    const texto = readFileSync(a, "utf8");
    for (const i of extraerIconos(/\.(ts|js|mjs)$/.test(a) ? sinComentarios(texto) : texto)) candidatos.add(i);
  }
  const refs = o.mapas ?? [mapaDelKit()].filter((x) => !!x);
  let consumidos = 0;
  for (const ref of refs) {
    if (o.offline && /^https?:/.test(ref)) continue;
    try {
      const m = await leerMapa(ref, raiz, f);
      for (const [set, nombres] of Object.entries(m.icons)) {
        for (const n of nombres) {
          candidatos.add(`${set}:${n}`);
          consumidos++;
        }
      }
    } catch (e) {
      avisar(`mapa ${ref} inaccesible (${e.message}): sus \xEDconos no se suman`);
    }
  }
  const enDisco = (id) => {
    const [s, n] = id.split(":");
    return existsSync(join(dirSvg, s, `${n}.svg`));
  };
  let colecciones = null;
  if (!o.offline) {
    try {
      const r = await pedir(f, `${api}collections`);
      if (!r?.ok) throw new Error(r ? `HTTP ${r.status}` : "sin respuesta");
      colecciones = new Set(Object.keys(await r.json()));
    } catch (e) {
      avisar(`API de Iconify inaccesible (${e.message}): se conserva lo que ya est\xE1 en disco`);
    }
  }
  const validos = [...candidatos].filter((id) => esIdIcono(id) && (colecciones ? colecciones.has(id.split(":")[0]) : enDisco(id))).sort();
  const descargados = [];
  const inexistentes = [];
  const faltan = validos.filter((id) => !enDisco(id));
  const existentes = validos.length - faltan.length;
  const guardar = (set, nombre, svg) => {
    mkdirSync(join(dirSvg, set), { recursive: true });
    writeFileSync(join(dirSvg, set, `${nombre}.svg`), svg);
    descargados.push(`${set}:${nombre}`);
  };
  if (colecciones && faltan.length) {
    const lotes = [];
    for (const [set, nombres] of Object.entries(agrupar(faltan))) {
      for (let i = 0; i < nombres.length; i += LOTE) lotes.push([set, nombres.slice(i, i + LOTE)]);
    }
    const sueltos = [];
    await enLotes(lotes, o.concurrencia, async ([set, nombres]) => {
      const r = await pedir(f, `${api}${set}.json?icons=${nombres.join(",")}`);
      if (!r) return avisar(`${set}: la API no respondi\xF3 (${nombres.length} \xEDconos quedan pendientes)`);
      if (r.status === 404) return void inexistentes.push(...nombres.map((n) => `${set}:${n}`));
      const datos = await r.json();
      for (const n of nombres) {
        const svg = svgDe(datos, n);
        if (svg) guardar(set, n, svg);
        else if (datos.aliases?.[n]) sueltos.push([set, n]);
        else inexistentes.push(`${set}:${n}`);
      }
    });
    await enLotes(sueltos, o.concurrencia, async ([set, n]) => {
      const r = await pedir(f, `${api}${set}/${n}.svg`);
      const svg = r?.ok ? await r.text() : "";
      if (svg.trimStart().startsWith("<svg")) guardar(set, n, svg);
      else if (r) inexistentes.push(`${set}:${n}`);
      else avisar(`${set}:${n}: la API no respondi\xF3`);
    });
  }
  inexistentes.sort();
  descargados.sort();
  for (const id of inexistentes) avisar(`${id} no existe en Iconify`);
  const finales = new Set(validos.filter(enDisco));
  const podados = [];
  if (o.podar && existsSync(dirSvg) && (colecciones || o.offline)) {
    for (const set of readdirSync(dirSvg)) {
      const d = join(dirSvg, set);
      if (!statSync(d).isDirectory()) continue;
      for (const n of readdirSync(d)) {
        const id = `${set}:${n.replace(/\.svg$/, "")}`;
        if (n.endsWith(".svg") && !finales.has(id)) {
          rmSync(join(d, n));
          podados.push(id);
        }
      }
      if (!readdirSync(d).length) rmSync(d, { recursive: true });
    }
  }
  podados.sort();
  const mapa = {
    v: 1,
    app: nombreApp(raiz),
    host: o.host ?? leerHost(raiz),
    ruta: relative(raiz, join(salida, ARCHIVO_MAPA)).replace(/\\/g, "/"),
    base: `${CARPETA_SVG}/`,
    icons: agrupar(finales)
  };
  if (!mapa.host) avisar('deno.json sin "iswc": { "host": "https://\u2026/" }: el mapa sale con host null');
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, ARCHIVO_MAPA), `${JSON.stringify(mapa, null, 2)}
`);
  log(`${archivos.length} archivos \xB7 ${finales.size} \xEDconos (${consumidos} de consumos; ${descargados.length} nuevos, ${existentes} ya estaban, ${podados.length} podados, ${inexistentes.length} inexistentes) \u2192 ${mapa.ruta}`);
  return { archivos: archivos.length, encontrados: finales.size, descargados, existentes, inexistentes, podados, avisos, mapa };
}
if (import.meta.main) {
  const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const lista = (k) => arg(k)?.split(",").map((s) => s.trim()).filter(Boolean);
  const r = await descargarIconos({
    raiz: arg("raiz") ?? process.cwd(),
    roots: lista("roots") ?? ["index.html", "src", "view"],
    salida: arg("salida"),
    extra: lista("extra"),
    mapas: lista("mapas"),
    offline: process.argv.includes("--offline")
  });
  if (r.inexistentes.length) process.exitCode = 1;
}
export {
  ARCHIVO_MAPA,
  CARPETA_SVG,
  DEFAULTS,
  descargarIconos,
  esIdIcono,
  extraerIconos,
  leerHost,
  mapaDelKit,
  sinComentarios,
  svgDe
};
