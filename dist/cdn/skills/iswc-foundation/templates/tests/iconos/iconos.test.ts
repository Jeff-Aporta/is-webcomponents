// iconos.test.ts — íconos de la app (sin navegador), sobre lo que deja `deno task build`.
//
//   W-ICO-01  cada ícono que la app pinta está en local: listado en assets/iconify.json y como archivo
//   W-ICO-02  el mapa dice dónde está publicada la app: `host` = deno.json → iswc.host
//   W-ICO-03  el registrador publicado registra el mapa de la app para <iswc-icon> (con ?v=<hash>)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { definirPruebas } from '../../src/vendor/iswc-root/tools/pruebas.ts';
import { PREFIJO } from '../../src/js/kit-tags.ts';

const RAIZ = Deno.cwd();
const leer = (rel: string) => readFileSync(join(RAIZ, rel), 'utf8');
type Mapa = { host: string | null; ruta: string; base: string; icons: Record<string, string[]> };
const mapa = (): Mapa => JSON.parse(leer('assets/iconify.json'));

const COMUNES = ['mdi', 'solar', 'tabler', 'lucide', 'ph', 'fluent', 'material-symbols', 'simple-icons', 'carbon', 'heroicons'];

/** Ids que la app pinta, extraídos con el MISMO barrido que usa `deno task icons` (la herramienta de assets/dl.js). */
async function idsUsados(): Promise<string[]> {
  const url = leer('assets/dl.js').match(/from '([^']+download-iconify\.ts)'/)?.[1];
  if (!url) throw new Error('assets/dl.js no importa download-iconify.ts');
  const { extraerIconos, sinComentarios } = await import(url);
  const fuentes = ['index.html', 'src/js', 'view'].flatMap(function listar(rel: string): string[] {
    const p = join(RAIZ, rel);
    if (!existsSync(p)) return [];
    if (Deno.statSync(p).isFile) return /\.(ts|js|html|json)$/.test(rel) ? [rel] : [];
    return [...Deno.readDirSync(p)].flatMap((e) => listar(`${rel}/${e.name}`));
  });
  const ids = new Set<string>();
  for (const f of fuentes) for (const id of extraerIconos(sinComentarios(leer(f)))) ids.add(id);
  // Sin red no hay lista de colecciones de Iconify: cuentan los sets comunes y los que ya trae el mapa
  // (así `node:fs` o `http:x` no pasan por íconos, y un set común que no bajó sí falla).
  const sets = new Set([...COMUNES, ...Object.keys(mapa().icons)]);
  return [...ids].filter((id) => sets.has(id.split(':')[0]!)).sort();
}

export default definirPruebas([
  {
    nombre: 'iconos W-ICO-01 lo que la app pinta está local (mapa y archivo)',
    categoria: 'what',
    async correr({ expect }) {
      const m = mapa();
      const usados = await idsUsados();
      expect('la app usa íconos', usados.length > 0);
      for (const id of usados) {
        const [set, n] = id.split(':') as [string, string];
        expect(`${id} en el mapa`, !!m.icons[set]?.includes(n));
        expect(`${id} archivo`, existsSync(join(RAIZ, 'assets', m.base, set, `${n}.svg`)));
      }
    },
  },
  {
    nombre: 'iconos W-ICO-02 el mapa lleva el host publicado de deno.json',
    categoria: 'what',
    correr({ eq }) {
      const deno = JSON.parse(leer('deno.json')) as { iswc?: { host?: string } };
      eq('host', mapa().host, deno.iswc?.host ?? null);
      eq('ruta', mapa().ruta, 'assets/iconify.json');
    },
  },
  {
    nombre: 'iconos W-ICO-03 el registrador registra el mapa de la app',
    categoria: 'what',
    async correr({ expect }) {
      const g = globalThis as Record<string, unknown>;
      g.ISWebComponentsLoader = { registerApp() { return this; } };
      g.__ISWC_ICONS__ = [];
      await import(pathToFileURL(join(RAIZ, 'dist', 'cdn', `${PREFIJO}Loader.min.js`)).href);
      const cola = g.__ISWC_ICONS__ as string[];
      const url = cola.find((u) => /\/assets\/iconify\.json\?v=[0-9a-z]+$/.test(u));
      expect('registrado con ?v=<hash>', !!url, JSON.stringify(cola));
      expect('apunta al mapa real', !!url && existsSync(fileURLToPath(new URL(url))), url);
    },
  },
]);
