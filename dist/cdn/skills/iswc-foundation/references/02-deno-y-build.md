<!-- @vendor 2026-10-14T16:13:19.844Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/references/02-deno-y-build.md -->
# 02 — Deno, tareas y build

## `deno.json`

```json
"imports": {
  "@browserbasehq/stagehand": "npm:@browserbasehq/stagehand@4.1.0",
  "@types/node": "npm:@types/node@^22.20.5",
  "esbuild": "npm:esbuild@0.28.1",
  "jsdom": "npm:jsdom@29.1.1",
  "zod": "npm:zod@4.4.3",
  "sass": "npm:sass@^1.105.0",
  "@std/http/file-server": "jsr:@std/http@1/file-server",
  "@iswc/component-schemas": "https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/<sha40>/src/previews/_kit/schemas/component.schemas.ts",
  "@iswc/loader-schemas": "https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/<sha40>/src/cdn/schemas/loader.schemas.ts"
}
```

- Los schemas del kit van por **raw con SHA** (inmutable): jsDelivr rechaza archivos nuevos de repos de
  más de 50 MB («Package size exceeded»). `deno task pin` audita y actualiza también esta forma.
- `nodeModulesDir: "auto"`, `unstable: ["sloppy-imports"]` (imports `.js` → `.ts`), `strict` + `noUncheckedIndexedAccess`.

## Tareas (nombres exactos)

| Tarea | Hace |
| --- | --- |
| `build:scss` | `.scss` de `src/` y `view/` → `.tmp-scss/<ruta>.css` |
| `build` | `build:scss` + `src/utils/build.ts` → `dist/cdn/` |
| `dev` | build en vigilancia (debounce 80 ms, sin solapes) |
| `serve` | servidor estático local |
| `check` | typecheck estricto del código de la app (`src/js/`, `view/`) |
| `pin` / `vendor:ISWC` | protocolo de pines (ver 06) |
| `test` · `test:health` · `test:e2e` · `test:all` · `test:all:halt` | pruebas y gate (ver 07) |
| `sync:entregable` | mirror → entregable (ver 08) |

## Build (`src/utils/build.ts`): el conversor del kit

El build NO se copia en cada app: `src/utils/build.ts` (~15 líneas) llama a **`construirApp`** del kit desde la URL del
pin, la misma herramienta en todos los proyectos (contrato completo: `specs/cdn.md` §Conversor `construirApp` del kit).

```ts
import { join } from 'node:path';
import { stop } from 'esbuild';
import { construirApp, vigilarApp } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/build/construir-app.ts';
import { mapaRutas, PREFIJO, SHELL_CRITICO, tagsArranque } from '../js/kit-tags.ts';

const fuente = (rel: string) => (rel.startsWith('js/') ? `src/${rel}` : rel).replace(/\.js$/, '.ts');
const opts = {
  raiz: join(import.meta.dirname!, '..', '..'),
  prefijo: PREFIJO,
  planos: ['src/js/boot.ts'],
  tags: Object.fromEntries(Object.entries(mapaRutas()).map(([t, r]) => [t, fuente(r)])),
  html: [{ archivo: 'index.html', kit: [...SHELL_CRITICO], app: tagsArranque() }],
};
await construirApp(opts);
if (Deno.args.includes('--watch')) await vigilarApp(opts);
else await stop();
```

| Fuente | Publicado |
| --- | --- |
| `src/js/<x>.ts` | `dist/cdn/js/<x>.min.mjs` |
| `view/<v>/<x>.ts` | `dist/cdn/view/<v>/<x>.min.mjs` |
| código compartido de las raíces (tags, `app` de cada página, módulos citados en los HTML) | `dist/cdn/_chunks/chunk-<hash>.mjs` |
| `.tmp-scss/<ruta>.css` de un componente | dentro de su módulo: `import css from 'iswc:css'` (el molde lo adopta); también `dist/cdn/<ruta>.css` |
| `.tmp-scss/src/styles/<x>.css` | `dist/cdn/styles/<x>.css` (hojas de página, p. ej. `app.css`) |
| `src/js/boot.ts` (`planos`) | `dist/cdn/boot.js` (IIFE: síncrono en `<head>`) |
| `tags` | `dist/cdn/<p>Loader.min.mjs` (registrador) y `dist/cdn/deps.json` (cierre por tag) |

- Las raíces van en UN build con splitting (lo común una vez); las demás fuentes salen sueltas y autónomas (las
  importan los tests y los barriles `all.ts`).
- **Kit por alias**: `@jeff-aporta/iswc-base/<ruta>` se reescribe a la URL del pin (la misma que usa el loader); `zod`
  y los `externos` los resuelve el import map. En Deno, `iswc:css` resuelve a `src/utils/iswc-css-vacio.ts` (`''`).
- **`?v=`** solo en origen mutable (Pages, local) y nunca dentro de un `.mjs` ni en un chunk; `asset-hashes.json`.
- **Registrador**: `L.registerApp({ tag: { href, type: 'module' } }, { installSheets: false })` y `<html data-icons>`; los
  cierres de cada tag (`<p>Loader.deps.json`) los pide con la primera interacción y los pasa con `configure({ deps })`.
- **HTML**: el conversor escribe el bloque `<!-- iswc:precarga:inicio -->`…`<!-- iswc:precarga:fin -->` de cada página de
  `html` (import map, precarga del kit y de la app, `is-base`/`palettes` sin bloquear, loader y registrador; ver 03) y
  pone el `?v=` de las demás referencias a `dist/cdn/`. Idempotente.

## Convertir un proyecto Deno de `.ts` a `.mjs` optimizado

1. **Pin**: `deno task pin --nuevo=<sha40|ultimo>` (verifica en jsDelivr y vendoriza `deps.json`), luego
   `deno task vendor:ISWC` al mismo SHA (tools de pruebas y pines; el build ya no se vendoriza: si quedó
   `src/vendor/iswc-base/build/`, se borra).
2. **`src/utils/build.ts`** = el de arriba: `tags` desde `kit-tags.ts`, `planos` (`boot.ts`), una entrada de `html` por
   página con su `kit` (tags del kit que pinta al arrancar) y su `app` (tags y fuentes propias del arranque), y si hace
   falta `externos`/`importMap`/`precargas` (un vendor propio) o `lote` (armazón en un módulo).
3. **HTML**: quitar el import map, el `<script>` del loader y el del registrador y poner en su lugar las marcas
   `<!-- iswc:precarga:inicio -->` / `<!-- iswc:precarga:fin -->`; las referencias propias pasan a `.min.mjs`
   (`dist/cdn/js/kit-tags.min.mjs`). Sin `?v=` a mano: lo pone el build.
4. **Tests** que importan lo publicado: `dist/cdn/<ruta>.js` → `dist/cdn/<ruta>.min.mjs`; el registrador es
   `<p>Loader.min.mjs`.
5. **`deno task build`** y revisar el informe (`[construirApp] N entradas + M chunks · KB · tags · HTML reescritos`).
   Una segunda corrida no debe reescribir ningún HTML.
6. **Verificar**: `deno task test:all` en verde y medir la portada antes/después con el kit
   (`deno task medir -- --url=<url> --warm --corridas=5`, Edge headless): peticiones, KB, módulos, ráfagas y
   `data-app-ready` iguales o mejores.
