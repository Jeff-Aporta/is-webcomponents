// mover.ts — mueve archivos (git mv) y reescribe toda referencia relativa a ellos.
//
//   deno run -A scripts/codemods/mover.ts plan.json [--seco]
//
// plan.json = [{ "from": "src/a/x.ts", "to": "src/a/schemas/x.ts" }, …] (rutas desde la raíz del repo).
// Reescribe: import/export/import()/new URL(…, import.meta.url) en .ts/.js/.mjs, @use/@import/@forward en
// .scss, enlaces relativos de .md y literales 'src/…' (con .ts o .js) en scripts, src y tests.
import { dirname, join, normalize, relative } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = normalize(join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', '..'));
const seco = Deno.args.includes('--seco');
const plan: { from: string; to: string }[] = JSON.parse(readFileSync(Deno.args[0], 'utf8'));
const posix = (p: string) => p.replaceAll('\\', '/');
const mapa = new Map(plan.map((m) => [posix(normalize(m.from)), posix(normalize(m.to))]));

const RAICES = ['src', 'scripts', 'tests', 'index.html'];
const OMITIR = /(^|\/)(node_modules|dist|_tmp|\.tmp)(\/|$)/;
function archivos(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  if (statSync(abs).isFile()) return (out.push(dir), out);
  for (const n of readdirSync(abs)) {
    const rel = posix(join(dir, n));
    if (OMITIR.test(rel)) continue;
    if (statSync(join(ROOT, rel)).isDirectory()) archivos(rel, out);
    else if (/\.(ts|mts|js|mjs|cjs|scss|md|html|json)$/.test(n)) out.push(rel);
  }
  return out;
}

// Resuelve un especificador relativo a un archivo real (repo-relativo) y dice qué sufijo se usó.
function resolver(desde: string, spec: string, scss: boolean): { real: string; forma: (nuevo: string) => string } | null {
  const base = posix(normalize(join(dirname(desde), spec)));
  const cands: [string, (n: string) => string][] = [[base, (n) => n]];
  if (base.endsWith('.js')) cands.push([base.slice(0, -3) + '.ts', (n) => n.replace(/\.ts$/, '.js')]);
  if (!/\.\w+$/.test(base)) {
    cands.push([base + '.ts', (n) => n.replace(/\.ts$/, '')], [base + '.js', (n) => n.replace(/\.js$/, '')]);
    if (scss) {
      const d = dirname(base), f = base.split('/').pop();
      cands.push([`${d}/_${f}.scss`, (n) => n.replace(/(^|\/)_([^/]+)\.scss$/, '$1$2')], [base + '.scss', (n) => n.replace(/\.scss$/, '')]);
    }
  }
  for (const [c, forma] of cands) if (mapa.has(c) || existsSync(join(ROOT, c))) return { real: c, forma };
  return null;
}

function relativo(desdeArchivo: string, hacia: string): string {
  let r = posix(relative(dirname(desdeArchivo), hacia));
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

const PATRONES = [
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bexport\s+\*\s+from\s*|new URL\(\s*)(['"`])(\.{1,2}\/[^'"`\n]+?)\2/g,
  /(@use\s+|@import\s+|@forward\s+|@import\s+url\()(['"])(\.{0,2}\/?[^'"\n]+?)\2/g,
  /(\]\()()(\.{1,2}\/[^)\s#]+)(?=[)#])/g,
];

let tocados = 0;
for (const arch of RAICES.flatMap((r) => archivos(r))) {
  const nuevoArch = mapa.get(arch) ?? arch;
  const scss = arch.endsWith('.scss');
  let txt = readFileSync(join(ROOT, arch), 'utf8');
  const orig = txt;
  for (const re of PATRONES) {
    txt = txt.replace(re, (todo, pre, q, spec) => {
      if (!scss && re === PATRONES[1]) return todo;
      if (scss && re !== PATRONES[1]) return todo;
      if (/^(https?:|data:|\w+:)/.test(spec)) return todo;
      const sufijo = spec.match(/[?#].*$/)?.[0] ?? '';
      const limpio = spec.slice(0, spec.length - sufijo.length);
      const r = resolver(arch, limpio.startsWith('.') ? limpio : './' + limpio, scss);
      if (!r) return todo;
      const destino = mapa.get(r.real) ?? r.real;
      if (destino === r.real && nuevoArch === arch) return todo;
      let nuevo = r.forma(relativo(nuevoArch, destino));
      if (scss && !limpio.startsWith('.')) nuevo = nuevo.replace(/^\.\//, '');
      return `${pre}${q}${nuevo}${sufijo}${q}`;
    });
  }
  // Literales desde la raíz: 'src/x/y.ts' o 'src/x/y.js'.
  for (const [de, a] of mapa) {
    const sinExt = de.replace(/\.ts$/, ''), aSinExt = a.replace(/\.ts$/, '');
    txt = txt.replaceAll(de, a);
    if (de.endsWith('.ts')) txt = txt.replaceAll(sinExt + '.js', aSinExt + '.js');
  }
  if (txt !== orig) {
    tocados++;
    if (!seco) writeFileSync(join(ROOT, arch), txt);
  }
}

if (!seco) {
  for (const [de, a] of mapa) {
    mkdirSync(join(ROOT, dirname(a)), { recursive: true });
    execFileSync('git', ['mv', de, a], { cwd: ROOT });
  }
}
console.log(`mover: ${mapa.size} movidos, ${tocados} archivos reescritos${seco ? ' (seco)' : ''}`);
