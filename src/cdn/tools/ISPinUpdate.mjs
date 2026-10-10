// ISPinUpdate.mjs — Protocolo de actualización y verificación de pines CDN, del lado del CONSUMIDOR.
//
// Regla (WT-2026-10-07, Jeff): el kit NO escribe en los consumidores. Cada consumidor
// vendoriza este script (dist/cdn/tools/ISPinUpdate.mjs) y actualiza sus propios pines.
// Todo lo externo apunta a un SHA de 40 hex ya publicado (jsDelivr / raw.githack):
// nunca @main, @master, @latest, SHA corto ni GitHub Pages (siempre sirve la última versión).
//
// Transversal (Node y Deno): solo `node:fs`/`node:path`/`node:process` y fetch.
//
// USO (desde la raíz del consumidor)
//   ISPinUpdate.mjs                                   inventario: pines por SHA + refs mutables (exit 1 si hay)
//   ISPinUpdate.mjs --nuevo=<sha40>                   reemplaza TODOS los pines por <sha40>
//   ISPinUpdate.mjs --nuevo=ultimo                    resuelve el HEAD de la rama (--rama, default main) a su SHA y lo fija
//   ISPinUpdate.mjs --nuevo=<sha40> --viejo=<sha40>   reemplaza solo esa cadena exacta
//   --repo=Owner/nombre        paquete gh (default Jeff-Aporta/iswc-root)
//   --raices=a,b,c             rutas a barrer (default: front típico, ver RAICES)
//   --saltar=a,b               carpetas a ignorar (default node_modules,vendor,dist,.tmp-scss,.git)
//   --verificar=<ruta>         archivo que debe existir en el pin (default dist/cdn/core/loader.min.js)
//   --dry-run                  muestra qué cambiaría, sin escribir
//
// Salida: 0 ok · 1 heterogéneo o refs mutables · 2 uso inválido · 3 pin no publicado (nada se tocó).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));
const ROOT = process.cwd();
const repo = String(args.repo || 'Jeff-Aporta/iswc-root');
const nombre = repo.split('/')[1];
// Nombres anteriores del mismo repo (jsDelivr los sigue resolviendo tras renombrar). Se inventarían
// como pines del repo y, al pinear, se reescriben al nombre actual: `is-webcomponents@x` → `iswc-root@y`.
const ALIAS = { 'iswc-root': ['is-webcomponents'] };
const nombres = [nombre, ...(args.alias ? String(args.alias).split(',') : ALIAS[nombre] ?? [])];
const rama = String(args.rama || 'main');
const verificar = String(args.verificar || 'dist/cdn/core/loader.min.js');
const RAICES = args.raices
  ? String(args.raices).split(',').map((s) => s.trim()).filter(Boolean)
  : ['index.html', 'sw.js', 'staticwebapp.config.json', 'manifest.json', 'src', 'view', 'demo', 'public'];
const SALTAR = new Set(args.saltar
  ? String(args.saltar).split(',').map((s) => s.trim())
  : ['node_modules', 'vendor', 'dist', '.tmp-scss', '.git']);
const EXT = /\.(html|ts|js|mjs|json|css|scss|md)$/;
const SHA = /^[0-9a-f]{40}$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const log = (m) => console.log(`[pin] ${m}`);

function archivos() {
  const out = [];
  const walk = (p) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const q = join(p, e.name);
      if (e.isDirectory()) { if (!SALTAR.has(e.name)) walk(q); } else if (EXT.test(e.name)) out.push(q);
    }
  };
  for (const r of RAICES) {
    const p = join(ROOT, r);
    if (!existsSync(p)) continue;
    if (EXT.test(r)) out.push(p); else walk(p);
  }
  return out;
}

const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');
const reNombres = `(?:${nombres.map(esc).join('|')})`;
const rePin = new RegExp(`(${reNombres})@([0-9a-zA-Z._-]+)`, 'g');
// Forma raw por SHA (`raw.githubusercontent.com/<owner>/<repo>/<sha40>/…`): tan inmutable como `@sha`.
// La usan los imports de `deno.json` (jsDelivr rechaza archivos nuevos de repos > 50 MB).
const owner = repo.split('/')[0];
const reRaw = new RegExp(`(${esc(owner)}\\/)(${reNombres})\\/([0-9a-f]{40})\\/`, 'g');
const reMutable = new RegExp([
  `${reNombres}@(main|master|latest|[0-9a-f]{7,39}\\b)`, // rama, latest o SHA corto
  `${esc(repo.split('/')[0])}\\/${reNombres}\\/(main|master)\\/`, // raw.githack / githubusercontent por rama
  // GitHub Pages DEL KIT (sirve siempre la última versión). El sitio propio de la app (`iswc.host`) no es un pin.
  `[a-z0-9-]+\\.github\\.io\\/${reNombres}(?![\\w-])`,
].join('|'), 'i');

function inventario() {
  const pines = new Map(); // sha -> Set(archivo)
  const mutables = [];
  const legados = new Set(); // archivos que pinean con un nombre anterior del repo
  for (const f of archivos()) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(rePin)) {
      if (!SHA.test(m[2])) continue;
      pines.set(m[2], (pines.get(m[2]) ?? new Set()).add(rel(f)));
      if (m[1] !== nombre) legados.add(rel(f));
    }
    for (const m of t.matchAll(reRaw)) {
      pines.set(m[3], (pines.get(m[3]) ?? new Set()).add(rel(f)));
      if (m[2] !== nombre) legados.add(rel(f));
    }
    t.split('\n').forEach((l, i) => { if (reMutable.test(l)) mutables.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`); });
  }
  return { pines, mutables, legados };
}

async function publicado(sha) {
  const u = `https://cdn.jsdelivr.net/gh/${repo}@${sha}/${verificar}`;
  const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(20_000) }).catch(() => null);
  log(`verificación ${u} → ${r?.status ?? 'sin red'}`);
  return !!r && r.status < 400;
}

async function ultimoSha() {
  const u = `https://api.github.com/repos/${repo}/commits/${rama}`;
  const r = await fetch(u, { headers: { Accept: 'application/vnd.github.sha' }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  const t = r?.ok ? (await r.text()).trim() : '';
  log(`HEAD de ${repo}@${rama} → ${t || `sin respuesta (${r?.status ?? 'red'})`}`);
  return SHA.test(t) ? t : '';
}

const { pines, mutables, legados } = inventario();
log(`${repo} · raíces: ${RAICES.join(', ')}`);

if (!args.nuevo) {
  for (const [sha, fs] of pines) log(`  ${sha}  (${fs.size} archivos)`);
  if (!pines.size) log('  sin pines de este repo');
  if (pines.size > 1) log('  ALERTA: pines heterogéneos → --nuevo=<sha40>');
  if (mutables.length) log(`  ALERTA: refs mutables:\n    ${mutables.join('\n    ')}`);
  if (legados.size) log(`  ALERTA: nombre anterior del repo (→ ${nombre}; se corrige con --nuevo):\n    ${[...legados].join('\n    ')}`);
  process.exit(pines.size > 1 || mutables.length || legados.size ? 1 : 0);
}

let nuevo = String(args.nuevo).toLowerCase();
if (nuevo === 'ultimo') nuevo = await ultimoSha();
if (!SHA.test(nuevo)) {
  console.error(`[pin] --nuevo debe ser un SHA de 40 hex o "ultimo" (no rama, tag ni SHA corto): "${args.nuevo}"`);
  process.exit(2);
}
if (args.viejo && !SHA.test(String(args.viejo))) {
  console.error(`[pin] --viejo debe ser la cadena exacta de 40 hex: "${args.viejo}"`);
  process.exit(2);
}
if (!(await publicado(nuevo))) {
  console.error(`[pin] ${repo}@${nuevo} no responde en jsDelivr: publícalo antes de pinear. Nada se tocó.`);
  process.exit(3);
}

const viejos = args.viejo ? [String(args.viejo)] : [...pines.keys()].filter((s) => s !== nuevo);
// El nuevo SHA también entra: un pin ya al día pero con el nombre anterior del repo se renombra.
const reViejo = new RegExp(`${reNombres}@(${[...viejos, nuevo].map(esc).join('|')})`, 'g');
let n = 0;
const tocados = [];
if (reViejo) {
  for (const f of archivos()) {
    const t = readFileSync(f, 'utf8');
    const shas = [...viejos, nuevo].map(esc).join('|');
    const reViejoRaw = new RegExp(`(${esc(owner)}\\/)${reNombres}\\/(?:${shas})\\/`, 'g');
    const next = t
      .replace(reViejo, (m) => { const r = `${nombre}@${nuevo}`; if (m !== r) n += 1; return r; })
      .replace(reViejoRaw, (m, pre) => { const r = `${pre}${nombre}/${nuevo}/`; if (m !== r) n += 1; return r; });
    if (next === t) continue;
    tocados.push(rel(f));
    if (!args['dry-run']) writeFileSync(f, next);
  }
}
log(`${viejos.map((s) => s.slice(0, 12)).join(', ') || '(ya homogéneo)'} → ${nuevo.slice(0, 12)} · ${n} reemplazos en ${tocados.length} archivos${args['dry-run'] ? ' (dry-run)' : ''}`);
for (const f of tocados) log(`  ${f}`);
if (mutables.length) {
  log(`ALERTA: quedan refs mutables (corrígelas a mano):\n  ${mutables.join('\n  ')}`);
  process.exit(1);
}
log('siguiente: build + tests del consumidor');
