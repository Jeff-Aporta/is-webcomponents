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
  "@iswc/component-schemas": "https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/src/previews/_kit/component.schemas.ts",
  "@iswc/loader-schemas": "https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/src/cdn/loader.schemas.ts"
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
| `.tmp-scss/src/js/<x>.css` | `dist/cdn/js/<x>.css` (hermana de su módulo) |
| `src/js/boot.ts` | `dist/cdn/boot.js` (IIFE: síncrono en `<head>`) |
| `src/js/base/zod.ts` | empaquetado con zod (el navegador no resuelve `import "zod"`) |
| `src/js/components/<p>/all.ts` | `dist/cdn/all.min.js` (bundle de compatibilidad) |
| `view/<v>/components/all.ts` | `dist/cdn/view/<v>/components/all.min.js` |

- Imports de vistas `../../../src/js/…` → `../../../js/…` en dist; del shell hacia `view/`, un `../` menos.
- **Sellado**: `stampDirectory(dist/cdn)` del kit reescribe cada import propio con `?v=<hash>` (FNV-1a,
  6 caracteres; ciclos con sello de grupo: una URL por módulo) → `asset-hashes.json`.
- **Registrador** `dist/cdn/<p>Loader.min.js`: exige `ISWebComponentsLoader` y llama
  `L.registerApp({ tag: new URL('<ruta>?v=<hash>', raiz).href, … }, { installSheets: false })`.
- `build-stamp.json`: `{ build, lastbuild, gitCommit, gitBranch }`.
- El HTML versionado nunca lleva `?v=`: el hash solo vive en dist y en el registrador.
