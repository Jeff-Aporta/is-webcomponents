// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/tools/pin-update.mjs
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
// pin-update.mjs — Protocolo de actualización y verificación de pines CDN, del lado del CONSUMIDOR.
//
// Regla (WT-2026-10-07, Jeff): el kit NO escribe en los consumidores. Cada consumidor
// vendoriza este script (dist/cdn/vendor-distributions/shared/tools/pin-update.mjs) y actualiza sus propios pines.
// Todo lo externo apunta a un SHA de 40 hex ya publicado (jsDelivr / raw.githack):
// nunca @main, @master, @latest, SHA corto ni GitHub Pages (siempre sirve la última versión). Excepción: los
// scripts ONLINE del kit (vendor.ts, pin-update.mjs, download-iconify.ts, render-lote.ts) se corren desde raw@main
// con --reload: esa URL no se cuenta como mutable (ver ONLINE).
//
// Transversal (Node y Deno): solo `node:fs`/`node:path`/`node:process`/`node:child_process` y fetch.
// Exporta sus funciones (`inventario`, `ultimoSha`, `ultimoPublicado`, `publicado`, `verificarLocal`,
// `actualizarPines`, `protocolo`) y solo corre la CLI cuando se ejecuta directamente: `vendor.ts` lo lanza
// al terminar de vendorizar (protocolo de pines del vendor/update).
//
// USO (desde la raíz del consumidor)
//   pin-update.mjs                                   inventario: pines por SHA + refs mutables (exit 1 si hay)
//   pin-update.mjs --nuevo=<sha40>                   reemplaza TODOS los pines por <sha40>
//   pin-update.mjs --nuevo=ultimo [--local=<ruta>]   PROTOCOLO: HEAD de la rama en GitHub → se busca en el checkout
//                                                    local (si está accesible; si no, se dice y se sigue) → último
//                                                    commit PUBLICADO en jsDelivr (retrocede hasta 30) → se fija en todo
//   pin-update.mjs --nuevo=<sha40> --viejo=<sha40>   reemplaza solo esa cadena exacta
//   --repo=Owner/nombre        paquete gh (default Jeff-Aporta/is-webcomponents)
//   --rama=main                rama que se sigue para `ultimo`
//   --local=<ruta>             checkout local del kit (solo informativo: nunca falla por él)
//   --raices=a,b,c             rutas a barrer (default: front típico, ver RAICES)
//   --saltar=a,b               carpetas a ignorar (default node_modules,vendor,dist,.tmp-scss,.git)
//   --verificar=<ruta>         archivo que debe existir en el pin (default dist/cdn/core/loader.min.js)
//   --dry-run                  muestra qué cambiaría, sin escribir
//
// Salida: 0 ok · 1 heterogéneo o refs mutables · 2 uso inválido · 3 pin no publicado (nada se tocó) ·
//         4 sin red (no se pudo resolver `ultimo`; nada se tocó).
//
// Perfil: shared. Vendor: NO se vendoriza: `vendor.ts` lo lanza online desde `@main` (junto a él, por URL); también `deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/shared/tools/pin-update.mjs`. Sin imports relativos.
// Skill: skills/iswc-foundation/references/06-pines-y-vendor.md
// Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

// Otros nombres del mismo repo. Se inventarían como pines del repo y, al pinear, se reescriben al
// nombre real. Hoy el repo de GitHub es `is-webcomponents`: el rename a `iswc-root` no se hizo y
// jsDelivr da 404 con ese nombre, así que un `iswc-root@x` se corrige a `is-webcomponents@y`.
// Cuando el rename exista, se invierte (default `iswc-root`, alias `is-webcomponents`).
const ALIAS = { 'is-webcomponents': ['iswc-root'], 'iswc-root': ['is-webcomponents'] };
const RAICES_DEFAULT = ['index.html', 'sw.js', 'staticwebapp.config.json', 'manifest.json', 'src', 'view', 'demo', 'public'];
const SALTAR_DEFAULT = ['node_modules', 'vendor', 'dist', '.tmp-scss', '.git'];
const EXT = /\.(html|ts|js|mjs|json|css|scss|md)$/;
// Scripts ONLINE del kit (Jeff, 2026-10-13): CLI que los consumidores corren desde `@main` con `--reload` y que
// nadie importa con tipos. Su URL por rama NO es una ref mutable prohibida (es la forma canónica).
export const ONLINE = /raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/main\/src\/vendor-distributions\/(?:shared\/tools\/(?:vendor\.ts|pin-update\.mjs)|client\/tools\/(?:download-iconify|render-lote)\.ts)\b|--reload=https:\/\/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(?![\w-])/;
export const SHA = /^[0-9a-f]{40}$/;
/** `GITHUB_TOKEN` (opcional) sube la cuota de la API de 60/h a 5000/h. */
const auth = () => (process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {});
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const log = (m) => console.log(`[pin] ${m}`);

/** Opciones normalizadas (de la CLI o de quien importa). */
export function opciones(o = {}) {
  const repo = String(o.repo || 'Jeff-Aporta/is-webcomponents');
  const nombre = repo.split('/')[1];
  const lista = (v, def) => (v ? (Array.isArray(v) ? v : String(v).split(',')).map((s) => s.trim()).filter(Boolean) : def);
  return {
    root: o.root ? String(o.root) : process.cwd(),
    repo,
    owner: repo.split('/')[0],
    nombre,
    nombres: [nombre, ...lista(o.alias, ALIAS[nombre] ?? [])],
    rama: String(o.rama || 'main'),
    verificar: String(o.verificar || 'dist/cdn/core/loader.min.js'),
    raices: lista(o.raices, RAICES_DEFAULT),
    saltar: new Set(lista(o.saltar, SALTAR_DEFAULT)),
    local: o.local ? String(o.local) : '',
    dryRun: !!o['dry-run'] || !!o.dryRun,
  };
}

function archivos(op) {
  const out = [];
  const walk = (p) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const q = join(p, e.name);
      if (e.isDirectory()) { if (!op.saltar.has(e.name)) walk(q); } else if (EXT.test(e.name)) out.push(q);
    }
  };
  for (const r of op.raices) {
    const p = join(op.root, r);
    if (!existsSync(p)) continue;
    if (EXT.test(r)) out.push(p); else walk(p);
  }
  return out;
}

function regexes(op) {
  const reNombres = `(?:${op.nombres.map(esc).join('|')})`;
  return {
    reNombres,
    rePin: new RegExp(`(${reNombres})@([0-9a-zA-Z._-]+)`, 'g'),
    // Forma raw por SHA (`raw.githubusercontent.com/<owner>/<repo>/<sha40>/…`): tan inmutable como `@sha`.
    // La usan los imports de `deno.json` (jsDelivr rechaza archivos nuevos de repos > 50 MB).
    reRaw: new RegExp(`(${esc(op.owner)}\\/)(${reNombres})\\/([0-9a-f]{40})\\/`, 'g'),
    reMutable: new RegExp([
      `${reNombres}@(main|master|latest|[0-9a-f]{7,39}\\b)`, // rama, latest o SHA corto
      `${esc(op.owner)}\\/${reNombres}\\/(main|master)\\/`, // raw.githack / githubusercontent por rama
      // GitHub Pages DEL KIT (sirve siempre la última versión). El sitio propio de la app (`iswc.host`) no es un pin.
      `[a-z0-9-]+\\.github\\.io\\/${reNombres}(?![\\w-])`,
    ].join('|'), 'i'),
  };
}

/** Pines por SHA (sha → archivos), refs mutables (`archivo:línea: texto`) y archivos con el nombre anterior del repo. */
export function inventario(op = opciones()) {
  const { rePin, reRaw, reMutable } = regexes(op);
  const rel = (f) => relative(op.root, f).replace(/\\/g, '/');
  const pines = new Map();
  const mutables = [];
  const legados = new Set();
  for (const f of archivos(op)) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(rePin)) {
      if (!SHA.test(m[2])) continue;
      pines.set(m[2], (pines.get(m[2]) ?? new Set()).add(rel(f)));
      if (m[1] !== op.nombre) legados.add(rel(f));
    }
    for (const m of t.matchAll(reRaw)) {
      pines.set(m[3], (pines.get(m[3]) ?? new Set()).add(rel(f)));
      if (m[2] !== op.nombre) legados.add(rel(f));
    }
    t.split('\n').forEach((l, i) => { if (reMutable.test(l) && !ONLINE.test(l)) mutables.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`); });
  }
  return { pines, mutables, legados };
}

/** `true` si `verificar` responde en jsDelivr para ese SHA. */
export async function publicado(sha, op = opciones()) {
  const u = `https://cdn.jsdelivr.net/gh/${op.repo}@${sha}/${op.verificar}`;
  const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(20_000) }).catch(() => null);
  log(`verificación ${u} → ${r?.status ?? 'sin red'}`);
  return !!r && r.status < 400;
}

/** SHA del HEAD de la rama en GitHub, o `''` sin red. */
export async function ultimoSha(op = opciones()) {
  const u = `https://api.github.com/repos/${op.repo}/commits/${op.rama}`;
  const r = await fetch(u, { headers: { Accept: 'application/vnd.github.sha', 'User-Agent': 'iswc-pin', ...auth() }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  const t = r?.ok ? (await r.text()).trim() : '';
  log(`HEAD de ${op.repo}@${op.rama} → ${t || `sin respuesta (${r?.status ?? 'red'})`}`);
  return SHA.test(t) ? t : '';
}

/** Últimos SHA de la rama (el HEAD primero), o `[]` sin red. */
export async function ultimosShas(op = opciones(), n = 30) {
  const u = `https://api.github.com/repos/${op.repo}/commits?sha=${encodeURIComponent(op.rama)}&per_page=${n}`;
  const r = await fetch(u, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'iswc-pin', ...auth() }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!r?.ok) return [];
  const lista = await r.json().catch(() => []);
  return Array.isArray(lista) ? lista.map((c) => String(c?.sha ?? '')).filter((s) => SHA.test(s)) : [];
}

/**
 * Último SHA PUBLICADO de la rama: el HEAD si jsDelivr ya lo sirve; si no, retrocede commit a commit.
 * `{ sha, head }` (`sha` vacío si ninguno está publicado; `head` vacío sin red).
 */
export async function ultimoPublicado(op = opciones()) {
  const head = await ultimoSha(op);
  if (!head) return { sha: '', head: '' };
  if (await publicado(head, op)) return { sha: head, head };
  log(`el HEAD ${head.slice(0, 12)} aún no está en jsDelivr: se busca el último publicado`);
  for (const sha of (await ultimosShas(op)).filter((s) => s !== head)) if (await publicado(sha, op)) return { sha, head };
  return { sha: '', head };
}

/**
 * Qué sabe el checkout local del SHA remoto. NUNCA falla: si la ruta no existe, no es un repo git o no se
 * puede leer, `accesible: false` con el motivo (ruta no accesible o mal configurada) y se sigue sin él.
 */
export function verificarLocal(local, sha = '') {
  if (!local) return { accesible: false, motivo: 'sin --local', head: '', tieneSha: null };
  if (!existsSync(local)) return { accesible: false, motivo: `no existe ${local} (ruta no accesible o mal configurada)`, head: '', tieneSha: null };
  const git = (...a) => execFileSync('git', ['-C', local, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let head = '';
  try { head = git('rev-parse', 'HEAD'); } catch { return { accesible: false, motivo: `${local} no es un repo git accesible`, head: '', tieneSha: null }; }
  let tieneSha = null;
  if (sha) { try { git('cat-file', '-e', `${sha}^{commit}`); tieneSha = true; } catch { tieneSha = false; } }
  return { accesible: true, motivo: 'ok', head, tieneSha };
}

/** Reescribe los pines de `viejos` (o todos los que no sean `nuevo`) a `nuevo`. Devuelve reemplazos y archivos tocados. */
export function actualizarPines(nuevo, op = opciones(), viejos = null) {
  const { reNombres } = regexes(op);
  const rel = (f) => relative(op.root, f).replace(/\\/g, '/');
  const { pines } = inventario(op);
  const lista = viejos ?? [...pines.keys()].filter((s) => s !== nuevo);
  const shas = [...lista, nuevo].map(esc).join('|');
  // El nuevo SHA también entra: un pin ya al día pero con el nombre anterior del repo se renombra.
  const reViejo = new RegExp(`${reNombres}@(${shas})`, 'g');
  const reViejoRaw = new RegExp(`(${esc(op.owner)}\\/)${reNombres}\\/(?:${shas})\\/`, 'g');
  let n = 0;
  const tocados = [];
  for (const f of archivos(op)) {
    const t = readFileSync(f, 'utf8');
    const next = t
      .replace(reViejo, (m) => { const r = `${op.nombre}@${nuevo}`; if (m !== r) n += 1; return r; })
      .replace(reViejoRaw, (m, pre) => { const r = `${pre}${op.nombre}/${nuevo}/`; if (m !== r) n += 1; return r; });
    if (next === t) continue;
    tocados.push(rel(f));
    if (!op.dryRun) writeFileSync(f, next);
  }
  return { viejos: lista, n, tocados };
}

/**
 * Protocolo completo (`--nuevo=<sha40|ultimo>`): resuelve el SHA, informa del checkout local, verifica
 * que esté publicado y reescribe los pines. Devuelve el código de salida documentado arriba.
 */
export async function protocolo(nuevoPedido, op = opciones(), viejo = '') {
  let nuevo = String(nuevoPedido).toLowerCase();
  let head = nuevo;
  if (nuevo === 'ultimo') {
    const u = await ultimoPublicado(op);
    head = u.head;
    if (!u.head) { console.error(`[pin] sin red: no se pudo resolver el HEAD de ${op.repo}@${op.rama}. Nada se tocó.`); return 4; }
    if (!u.sha) { console.error(`[pin] ningún commit reciente de ${op.repo}@${op.rama} responde en jsDelivr (${op.verificar}). Nada se tocó.`); return 3; }
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
  // Checkout local: solo información (¿tiene el SHA? ¿va por delante?). Nunca falla por él.
  if (op.local) {
    const l = verificarLocal(op.local, head);
    if (!l.accesible) log(`checkout local omitido: ${l.motivo}`);
    else {
      log(`checkout local ${op.local}: HEAD ${l.head.slice(0, 12)}${l.head === head ? ' = remoto' : ` ≠ remoto ${head.slice(0, 12)}`}${l.tieneSha === false ? ' (no tiene el SHA remoto: ¿pull pendiente?)' : l.tieneSha ? ' (tiene el SHA remoto)' : ''}`);
      if (l.head !== head && l.tieneSha) log('el checkout local va por delante del remoto: ¿push pendiente? Los pines siguen al último publicado');
    }
  }
  if (nuevoPedido !== 'ultimo' && !(await publicado(nuevo, op))) {
    console.error(`[pin] ${op.repo}@${nuevo} no responde en jsDelivr: publícalo antes de pinear. Nada se tocó.`);
    return 3;
  }
  const r = actualizarPines(nuevo, op, viejo ? [String(viejo)] : null);
  log(`${r.viejos.map((s) => s.slice(0, 12)).join(', ') || '(ya homogéneo)'} → ${nuevo.slice(0, 12)} · ${r.n} reemplazos en ${r.tocados.length} archivos${op.dryRun ? ' (dry-run)' : ''}`);
  for (const f of r.tocados) log(`  ${f}`);
  const { mutables } = inventario(op);
  if (mutables.length) {
    log(`ALERTA: quedan refs mutables (corrígelas a mano):\n  ${mutables.join('\n  ')}`);
    return 1;
  }
  log('siguiente: build + tests del consumidor');
  return 0;
}

/** Programa principal: `argv[1]` es la ruta (local) o la propia URL (online, `deno run -A https://…/pin-update.mjs`). */
function esPrincipal() {
  const a = process.argv[1];
  if (!a) return false;
  if (import.meta.url === a) return true;
  try { return import.meta.url === pathToFileURL(a).href; } catch { return false; }
}

// CLI solo al ejecutarse directamente (importarlo no barre nada).
if (esPrincipal()) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }));
  const op = opciones(args);
  log(`${op.repo} · raíces: ${op.raices.join(', ')}`);
  if (!args.nuevo) {
    const { pines, mutables, legados } = inventario(op);
    for (const [sha, fs] of pines) log(`  ${sha}  (${fs.size} archivos)`);
    if (!pines.size) log('  sin pines de este repo');
    if (pines.size > 1) log('  ALERTA: pines heterogéneos → --nuevo=<sha40|ultimo>');
    if (mutables.length) log(`  ALERTA: refs mutables:\n    ${mutables.join('\n    ')}`);
    if (legados.size) log(`  ALERTA: nombre anterior del repo (→ ${op.nombre}; se corrige con --nuevo):\n    ${[...legados].join('\n    ')}`);
    process.exit(pines.size > 1 || mutables.length || legados.size ? 1 : 0);
  }
  process.exit(await protocolo(String(args.nuevo), op, args.viejo ? String(args.viejo) : ''));
}
