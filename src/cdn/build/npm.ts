/**
 * npm.ts — el `package.json` del kit, generado por el build (plan D9, fase F6). Preparado, NO publicado.
 *
 *   versionProvisional(fecha, sha)   `0.0.0-<yyyymmdd>.<sha7>` hasta que haya semver (specs/cdn.md §npm).
 *   exportsNpm(exports)              `exports.json` + `./<carpeta>/*.min.mjs|.min.css`, CSS base y JSON publicados.
 *   sideEffectsNpm(tags)             módulos que registran custom elements (cada tag y el loader) y el CSS.
 *   packageJson(opts)                el objeto completo, listo para `JSON.stringify`.
 *
 * El alias `@jeff-aporta/iswc-base/<ruta>` resuelve por `exports` igual que por el import map del CDN: con extensión
 * (`core/loader.min.mjs`, como en el import map) y sin ella (`core/loader`, `actions/button`).
 */
import type { ExportsJson } from './graph.schemas.js';
import type { PackageJson, PackageJsonOptions } from './npm.schemas.js';

const NOMBRE = '@jeff-aporta/iswc-base';
const DIST = './dist/cdn';

/** Versión provisional: semver de prerelease; un sha7 todo dígitos con cero inicial no es identificador válido. */
export function versionProvisional(fecha: string, sha: string): string {
  const corto = /^[0-9a-f]{40}$/i.test(sha) ? sha.slice(0, 7).toLowerCase() : 'main';
  const id = /^0\d*$/.test(corto) ? `g${corto}` : corto;
  return `0.0.0-${fecha}.${id}`;
}

/** Carpetas con comodín en `exports.json` (`./actions/*` → `actions`). */
function carpetasComodin(exports: ExportsJson): string[] {
  const claves = Object.keys(exports).filter((k) => /^\.\/[^/*]+\/\*$/.test(k));
  return claves.map((k) => k.slice(2, -2)).sort();
}

/** `exports` de npm: lo de `exports.json` más las formas con extensión del import map y los archivos sueltos. */
export function exportsNpm(exports: ExportsJson): ExportsJson {
  const out: ExportsJson = { ...exports };
  for (const carpeta of carpetasComodin(exports)) {
    // Con extensión gana a `./<carpeta>/*` (mismo prefijo, clave más larga): `core/loader.min.mjs` no se dobla.
    out[`./${carpeta}/*.min.mjs`] = `${DIST}/${carpeta}/*.min.mjs`;
    out[`./${carpeta}/*.min.css`] = `${DIST}/${carpeta}/*.min.css`;
  }
  out['./loader.min.mjs'] = `${DIST}/loader.min.mjs`;
  out['./is-base.css'] = `${DIST}/is-base.min.css`;
  out['./is-base.min.css'] = `${DIST}/is-base.min.css`;
  out['./palettes.css'] = `${DIST}/palettes.min.css`;
  out['./palettes.min.css'] = `${DIST}/palettes.min.css`;
  out['./deps.json'] = `${DIST}/deps.json`;
  out['./deps/*'] = `${DIST}/deps/*`;
  out['./importmap.json'] = `${DIST}/importmap.json`;
  out['./package.json'] = './package.json';
  return out;
}

/** `sideEffects`: cada `<cat>/<tag>.min.mjs` del catálogo, el loader (y su alias de raíz) y el CSS; el resto es puro. */
export function sideEffectsNpm(tags: Record<string, string>): string[] {
  const modulos = new Set(Object.values(tags).map((ruta) => `${DIST}/${ruta}`));
  modulos.add(`${DIST}/core/loader.min.mjs`);
  modulos.add(`${DIST}/loader.min.mjs`);
  return [...[...modulos].sort(), `${DIST}/**/*.css`];
}

export function packageJson(opts: PackageJsonOptions): PackageJson {
  return {
    name: NOMBRE,
    version: versionProvisional(opts.fecha, opts.sha),
    description: 'iswc-base: web components del kit ISWC, un módulo ES por tag (dist/cdn).',
    type: 'module',
    license: opts.licencia,
    repository: { type: 'git', url: `git+https://github.com/${opts.repo}.git` },
    files: ['dist/cdn', 'README.md'],
    exports: exportsNpm(opts.exports),
    sideEffects: sideEffectsNpm(opts.tags),
    peerDependencies: { zod: '^4.4.3' },
    peerDependenciesMeta: { zod: { optional: true } },
  };
}
