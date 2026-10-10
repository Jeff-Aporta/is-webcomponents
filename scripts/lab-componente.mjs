#!/usr/bin/env node
// lab-componente.mjs — Lab local de un componente del kit en otro proyecto.
//
// Empaqueta UN componente (fuente TS + su SCSS) sin minificar en la carpeta que
// se indique, para consumirlo y ajustarlo en vivo (Live Server) antes de publicarlo:
//
//   deno run -A scripts/lab-componente.mjs src/components/helpers/md-render.ts <carpeta-destino> --cdn=<base dist/cdn> [--watch]
//
// Se empaqueta SOLO el componente y sus módulos internos (md-lite, md-hydrate…):
// los demás componentes (todo módulo que registra un tag con `defineElement`) y
// las hojas base (`core/base-sheets`) se importan del CDN pineado (`--cdn`), igual
// que en el build publicado; así cada componente conserva su propio CSS.
//
// El archivo generado (`<destino>/<nombre>.js`) es ESM autocontenido: lleva su CSS
// incrustado (igual que el build: `__IS_COMPONENT_CSS__`) y registra el mismo tag.
// Cargarlo ANTES que el loader del kit hace que la página use la versión del lab.
// No se edita el generado: se edita el fuente del kit y se regenera (`--watch`).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';
import * as sass from 'sass';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [entrada, destino] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const vigilar = process.argv.includes('--watch');
const cdn = (process.argv.find((a) => a.startsWith('--cdn=')) ?? '').slice(6).replace(/\/$/, '');
if (!entrada || !destino) {
  console.error('uso: lab-componente.mjs <src/components/.../x.ts> <carpeta-destino> [--watch]');
  process.exit(2);
}
const entradaAbs = resolve(raiz, entrada);
const nombre = basename(entradaAbs, '.ts');
const scss = entradaAbs.replace(/\.ts$/, '.scss');
const salida = join(resolve(destino), `${nombre}.js`);
mkdirSync(dirname(salida), { recursive: true });

// Las hojas constructables no admiten `@import`: los `@import url('x.css')` locales se incrustan.
const incrustarImports = (texto) => texto.replace(/@import\s+url\(['"]?([^'")]+\.css)['"]?\);?/g, (m, ruta) => {
  const abs = resolve(dirname(scss), ruta);
  if (existsSync(abs)) return readFileSync(abs, 'utf8');
  // En el build esa hoja sale de su .scss hermano.
  const fuente = abs.replace(/\.css$/, '.scss');
  return existsSync(fuente) ? sass.compile(fuente, { style: 'expanded', loadPaths: [dirname(fuente), join(raiz, 'src', 'styles')], silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'] }).css : m;
});
const css = () => (existsSync(scss)
  ? incrustarImports(sass.compile(scss, { style: 'expanded', loadPaths: [dirname(scss), join(raiz, 'src', 'styles')], silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'] }).css)
  : '');

const componentes = join(raiz, 'src', 'components');
const baseSheets = join(raiz, 'src', 'core', 'base-sheets.ts');
/** Otro componente del kit (registra un tag): se toma del CDN, no se empaqueta. */
const norm = (p) => resolve(p).toLowerCase();
const esOtroComponente = (ts) => norm(ts) !== norm(entradaAbs) && norm(ts).startsWith(norm(componentes)) && /defineElement\(|customElements\.define\(/.test(readFileSync(ts, 'utf8'));

/** Los fuentes importan `./x.js` y el archivo real es `./x.ts`; lo ajeno al componente va al CDN. */
const jsATs = {
  name: 'js-a-ts',
  setup(b) {
    b.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (args) => {
      const ts = resolve(args.resolveDir, args.path.replace(/\.js$/, '.ts'));
      if (!existsSync(ts)) return undefined;
      if (cdn && norm(ts) === norm(baseSheets)) return { path: `${cdn}/_shared/base-sheets.min.js`, external: true };
      if (cdn && esOtroComponente(ts)) {
        const rel = relative(componentes, ts).split(sep).join('/').replace(/\.ts$/, '.min.js');
        return { path: `${cdn}/${rel}`, external: true };
      }
      return { path: ts };
    });
  },
};

/** El CSS del componente se recompila en cada build (cambios del .scss incluidos). */
const cssEnVivo = {
  name: 'css-en-vivo',
  setup(b) {
    b.onStart(() => { b.initialOptions.define = { __IS_COMPONENT_CSS__: JSON.stringify(css()) }; });
    b.onEnd((r) => {
      if (r.errors.length) return;
      console.log(`[lab] ${relative(raiz, entradaAbs)} -> ${salida} (${new Date().toLocaleTimeString()})`);
    });
  },
};

const ctx = await context({
  entryPoints: [entradaAbs],
  outfile: salida,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: false,
  legalComments: 'none',
  banner: { js: `// LAB generado desde is-webcomponents/${relative(raiz, entradaAbs).replace(/\\/g, '/')}: no editar aqui, editar el fuente del kit y regenerar.` },
  define: { __IS_COMPONENT_CSS__: JSON.stringify(css()) },
  plugins: [jsATs, cssEnVivo],
  logLevel: 'warning',
});
if (vigilar) {
  await ctx.watch();
  console.log('[lab] vigilando cambios (Ctrl+C para salir)');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
// El .scss no esta en el grafo de esbuild: --watch lo vigila aparte.
if (vigilar && existsSync(scss)) {
  const { watch } = await import('node:fs');
  watch(scss, () => ctx.rebuild().catch((e) => console.error(e)));
}
