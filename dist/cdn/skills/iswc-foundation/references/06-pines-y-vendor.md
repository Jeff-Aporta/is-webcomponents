# 06 — Pines y vendor del kit

## Pin fijo

- Un único SHA de 40 hex **ya publicado** del kit en TODA la app: `src/js/iswc.ts` (canónico), los HTML
  (raíz, vistas, demos, galería) y `deno.json`.
- Formas válidas: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<sha40>/…` (runtime) y
  `https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/…` (fuentes `.ts` para Deno).
- Prohibido: `@main`, `@master`, `@latest`, SHA corto, `*.github.io`, ramas en raw/githack.
- El kit nunca escribe en la app: **la app se actualiza a sí misma**.

## Protocolo de pines (`pin-update.mjs`, vendorizado junto a `vendor.ts`; lo corre `vendor.ts` al terminar)

```bash
deno run -A <ISU>/vendor.ts vendor.json       # vendoriza y, al final, corre el protocolo: pin-update.mjs --nuevo=ultimo --local=<local>
deno run -A <ISU>/pin-update.mjs              # inventario: exit 1 si hay >1 SHA, refs mutables o nombre viejo del repo
deno run -A <ISU>/pin-update.mjs --nuevo=<sha40|ultimo> [--local=<ruta>] [--viejo=<sha40>] [--dry-run]
deno task build && deno task test:all
```

- `--nuevo=ultimo` (el protocolo del vendor/update): (1) lee el HEAD de la rama en GitHub; (2) si hay `--local`
  (el `local` del `vendor.json`), lo busca en el checkout (`git rev-parse HEAD`, `git cat-file -e <sha>`) y lo dice;
  si la ruta no existe, no es un repo git o no se puede leer, lo anota («checkout local omitido: …», ruta no
  accesible o mal configurada) y SIGUE: nunca falla por el local; (3) verifica en jsDelivr que
  `dist/cdn/core/loader.min.js` (`--verificar`) exista en ese SHA y, si el HEAD aún no está publicado, retrocede
  commit a commit (hasta 30) hasta el último publicado; (4) reescribe TODOS los `is-webcomponents@<sha40>` (y la
  forma raw por SHA) de las `--raices` del consumidor a ese SHA. Así todo el proyecto apunta siempre al último SHA
  publicado. `--nuevo=<sha40>` fija uno exacto (también verificado).
- Reconoce y reescribe el nombre anterior del repo (`is-webcomponents@…` ↔ `iswc-root@…`, en `@sha` y en raw).
- Regla intacta: nunca `@main`/`@latest`/SHA corto (quedan como refs mutables → exit 1).
- Códigos: 0 ok · 1 heterogéneo/mutable/legado · 2 uso inválido · 3 pin no publicado (nada se tocó) · 4 sin red
  (nada se tocó). En `vendor.ts`: 4 es aviso (los pines se conservan); 1, 2 y 3 hacen salir con 1.
- En `vendor.json`, `"pin": { "activo": true, "raices": [...], "saltar": [...], "verificar": "..." }` ajusta el
  barrido (por defecto las raíces de un front típico: `index.html`, `src`, `view`, `demo`, `public`…); `activo: false`
  lo apaga. Si falta `pin-update.mjs` junto a `vendor.ts`, el protocolo no corre y se avisa.

## Vendor (`src/vendor/iswc-root/`)

| Carpeta | Archivos |
| --- | --- |
| `tools/` | `schemas.ts` (podado), `pruebas.ts` (con `--hijo`), `test-cooldown.ts` (con la cola), `sync-entregable.ts`, `vendor.ts`, `pin-update.mjs` |
| `build/` | `index.ts`, `content-hash.ts`, `asset-url(.schemas).ts`, `stamp-hashes.ts`, `bundle-min(.schemas).ts`, `asset-store.ts` |

- Cabecera `// @vendor <ISO> <repo>@<sha|local> <desde>` (+ `// @doc <url>`) y «No editar». Se cambian en el kit y se re-vendorizan con
  `vendor.ts` (pin por fecha ISO: compiten el checkout `local` y el HEAD remoto); el protocolo de pines deja el SHA
  del consumidor en el último publicado.

## Descarga de vendor: `shared/tools/vendor.ts` (pin por fecha ISO y perfil)

Todo lo que un proyecto trae del kit por vendor strategy lo baja `dist/cdn/vendor-distributions/shared/tools/vendor.ts`, con Deno, a partir de un JSON del proyecto (sección `vendor` de `shared/schemas.ts`):

```json
{
  "repo": "Jeff-Aporta/is-webcomponents",
  "local": "C:/ContaPyme/Personal/apps/is-webcomponents",
  "perfil": "server",
  "pin": { "raices": ["index.html", "src", "demo", "docs"] },
  "archivos": [
    { "desde": "dist/cdn/vendor-distributions/shared/lib/obj.ts", "hacia": "src/sources/000 Base/ISU/obj.ts", "doc": "src/vendor-distributions/shared/lib/obj.md" },
    { "desde": "dist/cdn/vendor-distributions/shared/schemas.ts", "hacia": "src/sources/000 Base/ISU/schemas.ts" },
    { "desde": "dist/cdn/vendor-distributions/shared/tools/vendor.ts", "hacia": "scripts/vendor/ISU/vendor.ts" },
    { "desde": "dist/cdn/vendor-distributions/shared/schemas.ts", "hacia": "scripts/vendor/ISU/schemas.ts" },
    { "desde": "dist/cdn/vendor-distributions/shared/tools/pin-update.mjs", "hacia": "scripts/vendor/ISU/pin-update.mjs" }
  ]
}
```

- **Qué hay para vendorizar**: todo vive en `dist/cdn/vendor-distributions/` separado por **perfil**:
  `shared/` (sin navegador: `schemas.ts` único · `lib/` obj, zod · `testing/` pruebas (con su modo hijo), test-cooldown
  (con la cola), deno-test, proveedores-llm, jueces, semantica · `tools/` vendor, pin-update, sync-entregable), `server/`
  (exclusivo de server; hoy vacío) y `client/` (`testing/` stagehand · `tools/` render-diagram, render-lab, render-lote,
  hosts, sanitize-svg, static-server, download-iconify).
  Índice con propósito y doc de cada archivo: `dist/cdn/vendor-distributions/README.md`.
- **Un solo `schemas.ts`, podado**: todos los contratos viven en `shared/schemas.ts` por secciones
  `// ===== @seccion <modulo> [requiere: a, b] =====` … `// ===== @fin <modulo> =====`. Se vendoriza UNA vez por carpeta
  `ISU/` (los módulos importan `./schemas.ts`), y `vendor.ts` conserva solo `comun` + las secciones de los módulos que
  esa carpeta trae + sus `requiere` transitivos (la CLI lista `secciones: …`). Guardián: `meta/vendor.test.ts` V10/V11.
- **Perfil del consumidor** (`"perfil": "server" | "client"` en `vendor.json`): un server baja `shared/` + `server/` y
  nunca tiene que instalar Playwright, Stagehand ni nada de navegador; un client baja `shared/` + `client/`. `vendor.ts`
  BLOQUEA (no escribe, `ERROR … bloqueado por perfil`, sale con 1) lo de otro perfil, las rutas planas anteriores
  (`vendor-distributions/{lib,testing,tools}/…`) y, en `server`, cualquier archivo que importe `playwright`,
  `@browserbasehq/stagehand`, `puppeteer`… (también `createRequire(u)('playwright')`). Sin `perfil` baja todo con aviso.
  En el kit, `shared/` nunca importa `client/` ni `server/`, y `server/` ↔ `client/` no se cruzan (guardián
  `meta/vendor-perfiles.test.ts`).
- **Aplanar entre perfiles**: si un archivo importa un relativo de otro perfil (`client/testing/stagehand.ts` →
  `../../shared/testing/proveedores-llm.ts`) y la config trae los dos, `vendor.ts` reescribe el specifier a la ruta
  entre los dos `hacia` (`./proveedores-llm.ts` si caen en la misma `ISU/`).
- **Carpeta `ISU/`**: lo vendorizado conserva su nombre normal y vive en una carpeta `ISU/` del proyecto, así no choca con los archivos propios.
- **Pin por fecha ISO**: por archivo compiten el checkout local del kit (fecha del último commit que lo tocó, o «ahora» si tiene cambios sin commitear) y el HEAD remoto; gana el más reciente y solo se escribe si es más nuevo que la copia (`// @vendor <ISO>`). Nunca hay regresiones.
- **Cabecera**: `// @vendor <ISO> <repo>@<sha|local> <desde>` (el propio archivo dice desde dónde se actualiza: no hace
  falta un diccionario de rutas) y, opcional, `// @doc <URL jsDelivr de su .md>`. La doc va SIEMPRE por CDN (nunca ruta local): sale de `doc` en `vendor.json` o, si falta, de la `// @doc` con que la fuente abre (todo archivo de `vendor-distributions/` la trae; guardián `meta/vendor-distributions-doc.test.ts`), fijada al SHA ganador (a la rama si ganó el checkout local).
- **Dónde se corre**: el comando vive solo en el `package.json` del mirror `_experimental` (el del entregable no lo define), y el sync al entregable siempre descarga antes de copiar.
- **Pines al terminar**: la CLI de `vendor.ts` corre el protocolo de pines (arriba) con el `pin-update.mjs` vendorizado
  junto a ella: `vendor.ts` y `pin-update.mjs` van siempre a la misma carpeta.

### Lote de diagramas con caché por hash (`client/tools/render-lote.ts`)

El `deno task docs:diagramas` de ISS e ISW es el módulo vendorizado tal cual (sin wrapper), sobre los editables
`docs-experimental/diagramas/<slug>.json` `{ slug?, module, tag, script, attrs?, payload }`:

```
deno run -A --no-check --sloppy-imports <ISU>/render-lote.ts --carpeta=docs-experimental/diagramas --svg=docs-experimental/gen/diagrams/iswc/svg --png=docs-experimental/gen/diagrams/iswc/png --kit=../../../Personal/apps/is-webcomponents [--forzar] [--solo=a,b]
```

- **Huella**: sha256 del spec RESUELTO (`module`, `tag`, `script`, `attrs`, payload con sus referencias
  `{ path, query, actions }` ya resueltas por `Obj.resolver`, relativas al editable) + `pinKit` (`<kit>/PIN`) +
  `version` del módulo. Un value de `../fuentes/codigo.json` que entra al diagrama cambia su huella; uno que no entra, no.
- **Caché** `diagramas-iswc.cache.json` junto a los editables (o `--cache`):
  `{ version, diagramas: { [slug]: { huella, svg, png, fecha, ancho, alto } } }`; atómico tras cada diagrama OK.
  Ni el caché ni los `_*.json` (fuentes de solo soporte) son diagramas.
- **Decisión**: `render` si la huella difiere, falta en caché, faltan el SVG/PNG o `--forzar`; `skip` si coincide.
  Cada render va en un proceso hijo (`--one <slug>`) con 5 intentos; `lote · N renderizados · M sin cambios · K fallidos`, exit 1 si hay fallidos.
- Viaja con `render-diagram.ts` y sus relativos (`obj`, `hosts`, `sanitize-svg`, `static-server`, `schemas.ts`); el
  perfil es `client` (Playwright lo carga del `node_modules` del kit por `--kit`). Detalle:
  [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md).
