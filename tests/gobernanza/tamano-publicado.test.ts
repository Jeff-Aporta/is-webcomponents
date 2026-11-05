/**
 * tamano-publicado.test.ts — el árbol que sirve jsDelivr no puede pasar de 50 MB (plan D8).
 *
 * jsDelivr resuelve un SHA frío empaquetando el repo (`git archive`, que respeta los `export-ignore` de
 * .gitattributes) y rechaza paquetes de más de 50 MB: un pin nuevo dejaría de servir. Se mide HEAD (lo publicado):
 *
 *   - `git archive HEAD` ≤ MAX_ARCHIVO (lo medido tras sacar las colecciones completas de íconos + 10 %);
 *   - `dist/cdn` ≤ MAX_DIST_CDN (lo medido tras el build único de F3 + 20 %: el core ya no se duplica).
 *
 * Además reporta el peso por carpeta de primer nivel del repo (`git ls-tree`), `labs/` incluido: es la más pesada,
 * pero está fuera del tarball (`export-ignore`) y su destino lo decide el usuario.
 */
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = new URL('../../', import.meta.url);

const MB = 1024 * 1024;
/**
 * `git archive` medido el 4-nov-2026 tras retirar `dist/assets/icons/` (13 635 archivos de mdi/tabler y su
 * catálogo): 28,5 MB (antes 43,0 MB); + 10 %. Muy por debajo de los 50 MB de jsDelivr: crecer de nuevo es
 * una decisión, no un accidente.
 */
const MAX_ARCHIVO = 31.4 * MB;
/** dist/cdn medido el 4-nov-2026 tras F3: 9,5 MB (antes 11,3 MB con el core inlinado en cada bundle); + 20 %. */
const MAX_DIST_CDN = 11.4 * MB;

async function git(args: string[]): Promise<Uint8Array> {
  const r = await new Deno.Command('git', { args, cwd: RAIZ, stdout: 'piped', stderr: 'null' }).output();
  if (!r.success) throw new Error(`git ${args.join(' ')} falló`);
  return r.stdout;
}

const mb = (n: number) => `${(n / MB).toFixed(1)} MB`;

test('gobernanza/tamano-publicado: el tarball de HEAD cabe en jsDelivr y dist/cdn en su tope', async () => {
  let arbol: Uint8Array;
  try { arbol = await git(['archive', 'HEAD']); } catch { console.log('  SKIP — sin git'); return; }
  const lineas = new TextDecoder().decode(await git(['ls-tree', '-r', '-l', 'HEAD'])).split('\n');
  const porCarpeta = new Map<string, number>();
  let distCdn = 0;
  for (const linea of lineas) {
    const m = linea.match(/^\S+ blob \S+\s+(\d+)\t(.+)$/);
    if (!m) continue;
    const bytes = Number(m[1]);
    const ruta = m[2];
    const carpeta = ruta.includes('/') ? ruta.split('/')[0] : '(raíz)';
    porCarpeta.set(carpeta, (porCarpeta.get(carpeta) ?? 0) + bytes);
    if (ruta.startsWith('dist/cdn/')) distCdn += bytes;
  }
  const top = [...porCarpeta].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c} ${mb(n)}`).join(' · ');
  console.log(`  git archive HEAD: ${mb(arbol.length)} (tope ${mb(MAX_ARCHIVO)}) · dist/cdn: ${mb(distCdn)} (tope ${mb(MAX_DIST_CDN)})`);
  console.log(`  repo por carpeta: ${top}`);
  assert.ok(arbol.length <= MAX_ARCHIVO, `git archive HEAD pesa ${mb(arbol.length)} > ${mb(MAX_ARCHIVO)}: jsDelivr rechaza > 50 MB`);
  assert.ok(distCdn <= MAX_DIST_CDN, `dist/cdn pesa ${mb(distCdn)} > ${mb(MAX_DIST_CDN)}`);
});

export default lista();
