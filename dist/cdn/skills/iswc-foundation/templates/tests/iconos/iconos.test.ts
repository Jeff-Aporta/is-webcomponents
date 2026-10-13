// @vendor 2026-10-13T16:24:33.496Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/templates/tests/iconos/iconos.test.ts
// iconos.test.ts — íconos de la app (sin navegador), sobre lo que deja `deno task build`. Sin mapa.
//
//   W-ICO-01  cada ícono que la app pinta está en local: assets/iconify/<set>/<n>.svg (y no queda assets/iconify.json)
//   W-ICO-02  deno.json declara el sitio publicado: `iswc.host` absoluto http(s)
//   W-ICO-03  el registrador publicado declara <html data-icons> = iswc.host + assets/iconify/
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { definirPruebas } from '../../src/vendor/iswc-root/tools/pruebas.ts';
import { PREFIJO } from '../../src/js/kit-tags.ts';

const RAIZ = Deno.cwd();
const leer = (rel: string) => readFileSync(join(RAIZ, rel), 'utf8');
const host = (): string | null => {
  const deno: { iswc?: { host?: unknown } } = JSON.parse(leer('deno.json'));
  const h = deno.iswc?.host;
  return typeof h === 'string' ? h : null;
};

const COMUNES = ['mdi', 'solar', 'tabler', 'lucide', 'ph', 'fluent', 'material-symbols', 'simple-icons', 'carbon', 'heroicons'];

/** Ids que la app pinta, extraídos con el MISMO barrido que usa `deno task icons` (la herramienta de assets/dl.js). */
async function idsUsados(): Promise<string[]> {
  const url = leer('assets/dl.js').match(/from '([^']+download-iconify\.(?:ts|mjs))'/)?.[1];
  if (!url) throw new Error('assets/dl.js no importa download-iconify');
  const { extraerIconos, sinComentarios } = await import(url);
  const fuentes = ['index.html', 'src/js', 'view'].flatMap(function listar(rel: string): string[] {
    const p = join(RAIZ, rel);
    if (!existsSync(p)) return [];
    if (Deno.statSync(p).isFile) return /\.(ts|js|html|json)$/.test(rel) ? [rel] : [];
    return [...Deno.readDirSync(p)].flatMap((e) => listar(`${rel}/${e.name}`));
  });
  const ids = new Set<string>();
  for (const f of fuentes) for (const id of extraerIconos(sinComentarios(leer(f)))) ids.add(id);
  // Sin red no hay lista de colecciones de Iconify: cuentan los sets comunes y los que ya están en disco
  // (así `node:fs` o `http:x` no pasan por íconos, y un set común que no bajó sí falla).
  const enDisco = existsSync(join(RAIZ, 'assets', 'iconify')) ? [...Deno.readDirSync(join(RAIZ, 'assets', 'iconify'))].map((e) => e.name) : [];
  const sets = new Set([...COMUNES, ...enDisco]);
  return [...ids].filter((id) => sets.has(id.split(':')[0]!)).sort();
}

export default definirPruebas([
  {
    nombre: 'iconos W-ICO-01 lo que la app pinta está en assets/iconify (sin mapa)',
    categoria: 'what',
    async correr({ expect }) {
      const usados = await idsUsados();
      expect('la app usa íconos', usados.length > 0);
      for (const id of usados) {
        const [set, n] = id.split(':') as [string, string];
        expect(`${id} archivo`, existsSync(join(RAIZ, 'assets', 'iconify', set, `${n}.svg`)));
      }
      expect('sin assets/iconify.json (el mapa ya no existe)', !existsSync(join(RAIZ, 'assets', 'iconify.json')));
    },
  },
  {
    nombre: 'iconos W-ICO-02 deno.json declara el sitio publicado (iswc.host absoluto)',
    categoria: 'what',
    correr({ expect }) {
      const h = host();
      expect('iswc.host http(s) absoluto', !!h && /^https?:\/\//.test(h), String(h));
    },
  },
  {
    nombre: 'iconos W-ICO-03 el registrador declara <html data-icons> con la web publicada',
    categoria: 'what',
    correr({ expect }) {
      // Se lee el registrador publicado (no se importa: un import queda en caché del proceso y no se re-ejecuta).
      const loader = leer(join('dist', 'cdn', `${PREFIJO}Loader.min.js`));
      const h = host() ?? '';
      const base = new URL('assets/iconify/', h.endsWith('/') ? h : `${h}/`).href;
      expect('declara dataset.icons', /\.dataset\.icons/.test(loader), loader.slice(-300));
      expect(`con la base ${base}`, loader.includes(JSON.stringify(base)), loader.slice(-300));
    },
  },
]);
