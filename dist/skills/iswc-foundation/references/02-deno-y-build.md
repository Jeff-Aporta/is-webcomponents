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
| `pin` / `vendor:iswc` | protocolo de pines (ver 06) |
| `test` · `test:health` · `test:e2e` · `test:all` · `test:all:halt` | pruebas y gate (ver 07) |
| `sync:entregable` | mirror → entregable (ver 08) |

## Build (`src/utils/build.ts`)

| Fuente | Publicado |
| --- | --- |
| `src/js/<x>.ts` | `dist/cdn/js/<x>.js` (esbuild por archivo, sin bundle, minify, es2022) |
| `view/<v>/<x>.ts` | `dist/cdn/view/<v>/<x>.js` |
| `.tmp-scss/<ruta>.css` de un componente | dentro de su módulo: `import css from 'iswc:css'` → constante con el CSS minificado (el molde lo adopta) |
| `.tmp-scss/src/styles/<x>.css` | `dist/cdn/styles/<x>.css` (hojas de página, p. ej. `app.css`) |
| `src/js/boot.ts` | `dist/cdn/boot.js` (IIFE: síncrono en `<head>`) |
| `src/js/base/zod.ts` | empaquetado con zod (el navegador no resuelve `import "zod"`) |
| `src/js/components/<p>/all.ts` | `dist/cdn/all.min.js` (bundle de compatibilidad) |
| `view/<v>/components/all.ts` | `dist/cdn/view/<v>/components/all.min.js` |

- Imports de vistas `../../../src/js/…` → `../../../js/…` en dist; del shell hacia `view/`, un `../` menos.
- **Sellado**: `stampDirectory(dist/cdn)` del kit reescribe cada import propio con `?v=<hash>` (FNV-1a,
  6 caracteres; ciclos con sello de grupo: una URL por módulo) → `asset-hashes.json`.
- **Registrador** `dist/cdn/<p>Loader.min.js`: exige `iswcLoader` y llama
  `L.registerApp({ tag: { href: new URL('<ruta>?v=<hash>', raiz).href, type: 'module' }, … }, { installSheets: false })`
  (`type: 'module'`: el loader del kit infiere el tipo por extensión y un `.js` sin él iría como script clásico).
- `build-stamp.json`: `{ build, lastbuild, gitCommit, gitBranch }`.
- El HTML versionado nunca lleva `?v=`: el hash solo vive en dist y en el registrador.
- **Kit por alias**: `@jeff-aporta/iswc-base/<ruta>` (p. ej. `core/iswc-element.min.mjs`) queda tal cual en dist y en
  los barriles (externo); lo resuelve el import map de cada HTML y, en Deno, la misma entrada de `deno.json`.
  `iswc:css` en Deno resuelve a `src/utils/iswc-css-vacio.ts` (`''`).
- **Bootstrap**: el build reescribe el bloque `<!-- iswc:precarga:inicio -->`…`<!-- iswc:precarga:fin -->` de
  `index.html` y de cada `view/**/*.html` con el `modulepreload` del loader y del cierre de `SHELL_CRITICO`
  (`src/vendor/iswc-base/deps.json` → `tags[tag]`) y los `<link>` de `is-base.min.css`/`palettes.min.css` del pin
  (ver 03). Idempotente; sin `deps.json` vendorizado avisa y deja solo el loader y las hojas.
