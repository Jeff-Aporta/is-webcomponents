#!/usr/bin/env node
/**
 * vendor-stamp.mjs — estampa la cabecera de origen `@vendor <ISO> <repo>@local <ruta-en-el-kit>` en lo que el
 * kit distribuye por vendor: `src/vendor-distributions/**` y `skills/**` (Jeff, 2026-10-13). Así el `vendor.ts`
 * de cada consumidor compara fechas reales leyendo la cabecera, sin consultar git. El sha es `local` porque al
 * estampar aún no está commiteado; el consumidor, al bajar desde la web, escribe el sha del pin.
 *
 *   node scripts/vendor-stamp.mjs                 archivos STAGED (lo llama el hook pre-commit; los re-añade al stage)
 *   node scripts/vendor-stamp.mjs --todos         todos los archivos de las dos carpetas (primera vez / reparar)
 *   node scripts/vendor-stamp.mjs a.ts b.md       solo esos
 *   --fecha=<ISO>   fecha a estampar (default ahora) · --repo=<dueño/repo> · --dry-run · --sin-add
 *
 * Formato por extensión (el mismo que entiende `vendor.ts`):
 *   .ts .js .mjs .cjs   // @vendor …        .md .html   <!-- @vendor … -->   (en un .md con front matter YAML, justo
 *   .css                /* @vendor … *​/     .json       "$vendor": "…"       después del `---` de cierre)
 * No se estampan: .json bajo `templates/` (plantillas que la app usa tal cual), ni extensiones sin formato (.scss, .gitignore…).
 * Transversal (Node y Deno): solo `node:fs`/`node:path`/`node:child_process`.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CARPETAS = ['src/vendor-distributions', 'skills'];
const args = process.argv.slice(2);
const flag = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const repo = flag('repo') || 'Jeff-Aporta/is-webcomponents';
const fecha = flag('fecha') || new Date().toISOString();
const dry = args.includes('--dry-run');
const sinAdd = args.includes('--sin-add');
const todos = args.includes('--todos');
const sueltos = args.filter((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim();
const posix = (p) => p.replaceAll('\\', '/');

function estiloDe(ruta) {
  const e = extname(ruta).toLowerCase();
  if (['.ts', '.js', '.mjs', '.cjs'].includes(e)) return 'linea';
  if (e === '.md' || e === '.html') return 'html';
  if (e === '.css') return 'css';
  if (e === '.json') return 'json';
  return null;
}
const ENV = { linea: (c) => `// ${c}`, html: (c) => `<!-- ${c} -->`, css: (c) => `/* ${c} */` };
const RE = { linea: /^\/\/ @vendor [^\n]*\r?\n/, html: /^<!-- @vendor [^\n]*? -->\r?\n/, css: /^\/\* @vendor [^\n]*? \*\/\r?\n/ };

/** Front matter YAML de un .md (`---` … `---`): la cabecera va después, para no romper a quien lo parsea. */
function partirFrontMatter(t) {
  const m = t.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? { fm: m[0], resto: t.slice(m[0].length) } : { fm: '', resto: t };
}

/** Texto con la cabecera `@vendor` puesta o reemplazada; `null` si el archivo no se estampa. */
export function estampar(texto, ruta, cuerpo) {
  const estilo = estiloDe(ruta);
  if (!estilo) return null;
  if (estilo === 'json') {
    if (/(^|\/)templates\//.test(posix(ruta))) return null;
    let v;
    try { v = JSON.parse(texto); } catch { return null; }
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const { $vendor: _v, ...resto } = v;
    return `${JSON.stringify({ $vendor: cuerpo, ...resto }, null, 2)}\n`;
  }
  const { fm, resto } = estilo === 'html' && ruta.endsWith('.md') ? partirFrontMatter(texto) : { fm: '', resto: texto };
  const limpio = resto.replace(RE[estilo], '');
  return `${fm}${ENV[estilo](`@vendor ${cuerpo}`)}\n${limpio}`;
}

function listar(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) listar(p, out); else out.push(p);
  }
  return out;
}

function candidatos() {
  if (sueltos.length) return sueltos.map((f) => resolve(ROOT, f));
  if (todos) return CARPETAS.flatMap((c) => (existsSync(join(ROOT, c)) ? listar(join(ROOT, c)) : []));
  return git('diff', '--cached', '--name-only', '--diff-filter=ACMR').split(/\r?\n/).filter(Boolean).map((f) => resolve(ROOT, f));
}

/** Ejecutado directamente (rutas reales: en Windows un temp 8.3 y su forma larga son el mismo archivo). */
function esPrincipal() {
  try { return !!process.argv[1] && realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (esPrincipal()) {
  let n = 0;
  const tocados = [];
  for (const abs of candidatos()) {
    const rel = posix(relative(ROOT, abs));
    if (!CARPETAS.some((c) => rel.startsWith(`${c}/`))) continue;
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    const antes = readFileSync(abs, 'utf8');
    const despues = estampar(antes, abs, `${fecha} ${repo}@local ${rel}`);
    if (despues === null || despues === antes) continue;
    n++;
    tocados.push(rel);
    if (!dry) writeFileSync(abs, despues);
  }
  if (!dry && !sinAdd && tocados.length && !sueltos.length && !todos) git('add', '--', ...tocados);
  console.log(`[vendor-stamp] ${n} archivos estampados con @vendor ${fecha} ${repo}@local${dry ? ' (dry-run)' : ''}`);
  for (const t of tocados.slice(0, 40)) console.log(`  ${t}`);
  if (tocados.length > 40) console.log(`  … y ${tocados.length - 40} más`);
}
