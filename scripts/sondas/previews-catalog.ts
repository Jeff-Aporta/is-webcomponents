// @contexto INDICE.md · scripts/README.md
/**
 * previews-catalog.ts — genera `src/previews/catalog.ts` desde las fichas reales.
 *
 * El catalogo es el mapa `tag -> { json, behavior?, category }` que consume la
 * galeria. Se genera desde el filesystem:
 *
 *   src/components/<cat>/<nombre>.json           -> json:    ../../dist/previews/<cat>/<nombre>.json
 *   src/components/<cat>/utils/<nombre>.preview.ts -> behavior: ../../dist/previews/<cat>/<nombre>.preview.min.js
 *
 * El `behavior` solo aparece si el componente tiene su `<nombre>.preview.ts`
 * (el bundle que el build deja en `dist/previews/<cat>/`).
 *
 * La `category` es la LOGICA (la del manifest): `data-viz` es un alias legacy de
 * `charts`, asi que sus componentes se anuncian como `charts` aunque el JSON
 * viva en la carpeta fisica `data-viz/`. La ruta del `json` es la fisica (la que
 * copia el build a `dist/previews/`).
 *
 * Uso: deno task previews:catalog
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const componentsRoot = join(root, 'src', 'components');
const destino = join(root, 'src', 'previews', 'catalog.ts');

interface Entrada {
  json: string;
  behavior?: string;
  category: string;
}

/** Compara sin depender del locale (el resultado tiene que ser el mismo en cualquier maquina). */
function menor(a: string, b: string): boolean {
  return a < b;
}

/** La categoria logica de cada tag (la del manifest: `data-viz` es alias de `charts`). */
function categoriasLogicas(): Map<string, string> {
  const mapa = new Map<string, string>();
  const manifest = readFileSync(join(root, 'src', 'manifest.ts'), 'utf8');
  for (const linea of manifest.split('\n')) {
    const tag = /\btag:\s*'([^']+)'/.exec(linea);
    const categoria = /\bcategory:\s*'([^']+)'/.exec(linea);
    if (tag && categoria) mapa.set(tag[1], categoria[1]);
  }
  return mapa;
}

const logicas = categoriasLogicas();

const entradas = new Map<string, Entrada>();

for (const categoria of readdirSync(componentsRoot, { withFileTypes: true })) {
  if (!categoria.isDirectory() || categoria.name.startsWith('_')) continue;
  const dir = join(componentsRoot, categoria.name);
  for (const fichero of readdirSync(dir, { withFileTypes: true })) {
    if (!fichero.isFile() || !fichero.name.endsWith('.json')) continue;
    const nombre = fichero.name.replace(/\.json$/, '');
    const tag = `iswc-${nombre}`;
    const entrada: Entrada = {
      json: `../../dist/previews/${categoria.name}/${nombre}.json`,
      category: logicas.get(tag) ?? categoria.name,
    };
    if (existsSync(join(dir, 'utils', `${nombre}.preview.ts`))) {
      entrada.behavior = `../../dist/previews/${categoria.name}/${nombre}.preview.min.js`;
    }
    entradas.set(tag, entrada);
  }
}

// Las paginas del sitio tambien son previews: su ficha va a `dist/pages/<n>.json`
// y su behaviour (si la ficha lo declara con `hasBehavior`) a
// `dist/pages/<n>.min.js`. Sin esta parte el catalogo perderia `home`, `icons`,
// `phase7`, `theming` y `ecosystem`.
const pagesRoot = join(root, 'src', 'pages');
for (const fichero of readdirSync(pagesRoot, { withFileTypes: true })) {
  if (!fichero.isFile() || !fichero.name.endsWith('.json')) continue;
  const nombre = fichero.name.replace(/\.json$/, '');
  const ficha = JSON.parse(readFileSync(join(pagesRoot, fichero.name), 'utf8')) as {
    tag?: string;
    category?: string;
    hasBehavior?: boolean;
  };
  const entrada: Entrada = {
    json: `../../dist/pages/${nombre}.json`,
    category: ficha.category ?? '',
  };
  if (ficha.hasBehavior) entrada.behavior = `../../dist/pages/${nombre}.min.js`;
  entradas.set(ficha.tag ?? nombre, entrada);
}

const tags = [...entradas.keys()].sort((a, b) => {
  const ea = entradas.get(a)!;
  const eb = entradas.get(b)!;
  if (ea.category !== eb.category) return menor(ea.category, eb.category);
  return menor(a, b);
});

const cuerpo = tags.map((tag) => {
  const e = entradas.get(tag)!;
  const lineas = [`  "${tag}": {`, `    "json": "${e.json}",`];
  if (e.behavior) lineas.push(`    "behavior": "${e.behavior}",`);
  lineas.push(`    "category": "${e.category}"`);
  lineas.push('  }');
  return lineas.join('\n');
}).join(',\n');

const texto = [
  '// @contexto INDICE.md · src/previews/README.md',
  '/**',
  ' * AUTO-GENERADO por scripts/sondas/previews-catalog.ts — no editar a mano.',
  ' * tag → { json, behavior?, category }',
  ' */',
  'export default {',
  cuerpo,
  '};',
  '',
].join('\n');

writeFileSync(destino, texto, 'utf8');
console.log(`catalog: ${tags.length} entradas -> src/previews/catalog.ts`);
