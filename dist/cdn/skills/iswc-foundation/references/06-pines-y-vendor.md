<!-- @vendor 2026-10-14T00:35:24.801Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/references/06-pines-y-vendor.md -->
# 06 — Pines y vendor del kit

## Pin fijo

- Un único SHA de 40 hex **ya publicado** del kit en TODA la app: `src/js/iswc.ts` (canónico), los HTML
  (raíz, vistas, demos, galería) y `deno.json`.
- Formas válidas: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<sha40>/…` (runtime) y
  `https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/…` (fuentes `.ts` para Deno).
- Prohibido: `@main`, `@master`, `@latest`, SHA corto, `*.github.io`, ramas en raw/githack.
- El kit nunca escribe en la app: **la app se actualiza a sí misma**.

## Protocolo de pines (`pin-update.mjs`, online junto a `vendor.ts`; lo corre `vendor.ts` antes de barrer)

```bash
# <online> = https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/shared/tools
# <reload> = --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/
deno run -A <reload> <online>/vendor.ts vendor.json       # primero el protocolo (pin-update.mjs --nuevo=ultimo --local=<local>), luego el barrido
deno run -A <reload> <online>/pin-update.mjs              # inventario: exit 1 si hay >1 SHA, refs mutables o nombre viejo del repo
deno run -A <reload> <online>/pin-update.mjs --nuevo=<sha40|ultimo> [--local=<ruta>] [--viejo=<sha40>] [--dry-run]
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
| `tools/` | `schemas.ts` (podado), `pruebas.ts` (con `--hijo`), `test-cooldown.ts` (con la cola), `sync-entregable.ts` (`vendor.ts` y `pin-update.mjs` van online, no aquí) |
| `build/` | `index.ts`, `content-hash.ts`, `asset-url(.schemas).ts`, `stamp-hashes.ts`, `bundle-min(.schemas).ts`, `asset-store.ts` |

- Cabecera `// @vendor <ISO> <repo>@<sha|local> <desde>` (+ `// @doc <url>`) y «No editar». Se cambian en el kit y se re-vendorizan con
  `vendor.ts` (pin por fecha ISO: compiten el checkout `local` y el HEAD remoto); el protocolo de pines deja el SHA
  del consumidor en el último publicado.

## Scripts online: siempre `@main` con `--reload` (qué va online y qué se vendoriza, y por qué)

Criterio (Jeff, 2026-10-13): los CLI que los consumidores ejecutan con Deno y cuyos tipos NINGÚN código del consumidor
importa NO se vendorizan: se corren online desde `@main` del kit. Como Deno cachea los módulos remotos para siempre, la
forma canónica lleva `--reload` del origen:

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/<ruta> …
```

Lo que se ejecuta online es un BUNDLE autocontenido en `dist/cdn/…` (`scripts/build-online.mjs`, parte de `deno task build`
y del hook pre-commit cuando cambian las fuentes): sin imports relativos (schemas y pin-update inlineados), `node:*`/`npm:*`
externos, `zod` como `npm:zod`, y sin `fileURLToPath(import.meta.url)` para localizar hermanos (guardián
`meta/skills-online.test.ts`). Las fuentes `.ts` siguen en `src/vendor-distributions/` (y en `dist/cdn/` como copia para
lo que sí se vendoriza).

| Online desde `@main` | Por qué |
| --- | --- |
| `shared/tools/vendor.ts` → bundle `dist/cdn/vendor-distributions/shared/tools/vendor.mjs` (pin-update inlineado) | CLI; nadie importa sus tipos |
| `shared/tools/pin-update.mjs` → bundle `dist/cdn/vendor-distributions/shared/tools/pin-update.mjs` | CLI |
| `client/tools/download-iconify.ts` → bundle `dist/cdn/vendor-distributions/client/tools/download-iconify.mjs` (`assets/dl.js` lo importa; tarea `icons` con `--reload`) | CLI |
| `client/tools/render-lote.ts` → bundle `dist/cdn/vendor-distributions/client/tools/render-lote.mjs` (`docs:diagramas` de ISS/ISW; `--kit=<checkout>` o `ISWC_KIT` obligatorio) | CLI |
| `skills/<skill>/tools/*.ts` → bundles `dist/cdn/skills/<skill>/tools/*.mjs` | CLI de las skills |

| Se vendoriza (barrido por cabecera) | Por qué |
| --- | --- |
| `shared/testing/{pruebas,test-cooldown,jueces,semantica,proveedores-llm}.ts`, `client/testing/stagehand.ts`, `shared/schemas.ts` | los tests los importan con tipos (ISS es Node) |
| `shared/tools/sync-entregable.ts` | ISS lo importa con tsx |
| `dist/cdn/build/*` | lo importa código entregado |

`pin-update.mjs` no cuenta esas URL `raw…/main/src/vendor-distributions/…` ni el `--reload=…/` como refs mutables.
Las carpetas `scripts/vendor/ISU` (ISW) y `src-experimental/vendor/ISU` (ISS) desaparecen: ya no hay `vendor.ts`,
`pin-update.mjs` ni `schemas.ts` vendorizados ahí. Tareas de un consumidor:

```json
"vendor": "deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs scripts/vendor/vendor.json",
"pin": "deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/pin-update.mjs --raices=index.html,src,view",
"docs:diagramas": "deno run -A --no-check --sloppy-imports --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/client/tools/render-lote.mjs --carpeta=… --svg=… --png=… --kit=../../../Personal/apps/is-webcomponents"
```

## Vendor por BARRIDO: `shared/tools/vendor.ts` (cabecera `@vendor` en cada archivo, perfil, pin estático)

Todo lo que un proyecto trae de un repo GitHub (el kit u otro) por vendor strategy lo mantiene
`dist/cdn/vendor-distributions/shared/tools/vendor.ts`, con Deno (`deno task vendor` / `npm run vendor`: el ÚNICO punto;
para estos archivos no se usan imports remotos, ni en un consumidor Deno como el ISW), a partir de un JSON del
proyecto (sección `vendor` de `shared/schemas.ts`) que es solo BOOTSTRAP:

```json
{
  "repo": "Jeff-Aporta/is-webcomponents",
  "local": "C:/ContaPyme/Personal/apps/is-webcomponents",
  "perfil": "server",
  "raices": ["src", "tests", "scripts", "skills"],
  "pin": { "raices": ["index.html", "src", "demo", "docs"] },
  "archivos": [
    { "desde": "skills/iswc-foundation", "hacia": "skills/iswc-foundation", "carpeta": true },
    { "desde": "dist/cdn/vendor-distributions/shared/lib/obj.ts", "hacia": "src/sources/000 Base/ISU/obj.ts", "doc": "src/vendor-distributions/shared/lib/obj.md" },
    { "desde": "dist/cdn/vendor-distributions/shared/schemas.ts", "hacia": "src/sources/000 Base/ISU/schemas.ts" }
  ]
}
```

### Barrido: cada archivo dice de dónde se actualiza

`vendor.ts` recorre el consumidor (`raices`, por defecto la raíz; salta `node_modules`, `.git`, `dist`, `_entregable`,
`.tmp*` y `saltar`), encuentra todo archivo con cabecera `@vendor` (extensiones ts, js, mjs, cjs, md, css, html, json)
y, para cada uno, resuelve su origen DESDE LA PROPIA CABECERA (`<repo>` y `<desde>`): compara la fecha de la cabecera
con la del checkout `local` (si está configurado y existe) y con la web, y si hay una fuente más reciente la baja y
reescribe la cabecera. Una vez bajado, el archivo se mantiene por su cabecera: `vendor.json` NO lo lista. El propio
`vendor.ts` del consumidor lleva cabecera: cuando cambia en el kit se actualiza solo al correr `vendor`
(autoactualización); `pin-update.mjs` y `schemas.ts` igual. El perfil se sigue aplicando en el barrido (un server
nunca baja `client/`). Un archivo con cabecera de OTRO repo no se toca (cada corrida es de un `repo`).

### `vendor.json` es solo bootstrap

`repo`, `rama`, `perfil`, `local`, `raices` (a barrer), `saltar`, `pin` y las ALTAS (`archivos`: lo que aún no existe en
el consumidor, `desde → hacia`; `carpeta: true` trae un árbol completo, p. ej. una skill). Un alta cuyo `hacia` ya
existe SIN cabecera `@vendor` (archivo o skill PROPIA) es un error claro y no se pisa. Las altas ya bajadas pueden
quedarse en el JSON (sirven de documentación) o borrarse: da igual, el barrido las mantiene.

### Formato de cabecera por tipo de archivo

Siempre `<ISO> <repo>@main <desde>` (+ opcional `@doc <url>`): el CANAL que se sigue es la rama, portable entre
máquinas (ni `@local`, que amarra a una ruta de este PC, ni un sha, que ya está en el pin del proyecto y en git; Jeff
2026-10-13). Las cabeceras anteriores con `@local`/`@<sha40>` se siguen leyendo y migran a `@main` al reescribirse:

| Extensión | Cabecera |
| --- | --- |
| `.ts .js .mjs .cjs` | `// @vendor <ISO> <repo>@main <desde>` y `// @doc <url>` |
| `.md .html` | `<!-- @vendor <ISO> <repo>@main <desde> -->` y `<!-- @doc <url> -->` (en un `.md` con front matter YAML, justo después del `---` de cierre: los parsers de skills siguen viendo el front matter primero) |
| `.css` | `/* @vendor <ISO> <repo>@main <desde> */` y `/* @doc <url> */` |
| `.json` | `"$vendor": "<ISO> <repo>@main <desde>"` y `"$doc": "<url>"` como PRIMERAS claves del objeto |

En el kit, el hook `pre-commit` (`scripts/vendor-stamp.mjs`, instalado por `scripts/sync-pins.mjs --install-hook` junto
al post-commit; `deno task vendor:stamp` lo aplica a todo) estampa `@vendor <ISO> Jeff-Aporta/is-webcomponents@main <ruta>`
en lo staged de `src/vendor-distributions/**` y `skills/**` con la hora del commit y lo re-añade al stage; así el
consumidor compara fechas reales leyendo la cabecera (`fechaLocal` prefiere la cabecera del checkout y cae a
`git log -1` solo si falta; «ahora» si hay cambios sin commitear). Los `.json` bajo `templates/` no se estampan.

### Fuentes: checkout local (si está) y la web (main y el pin del proyecto); gana la más reciente

Para cada archivo con cabecera el dl hace AMBAS verificaciones: (1) el checkout `local` SOLO si está en `vendor.json`,
existe y es legible (si no, una línea de log «checkout local omitido» y se sigue; nunca falla); (2) la web: `main`
(fecha del último commit del archivo vía API de GitHub, cacheada por sha en `.tmp/vendor-fechas.json`; sin red o sin
cuota, `Last-Modified` de jsDelivr `@main` como respaldo) y, cuando el consumidor tiene pin estático (el
`<repo>@<sha40>` más citado en el barrido, o `pin.sha` de `vendor.json`), también el pin. Se baja la más nueva que la
fecha de la cabecera, de `https://cdn.jsdelivr.net/gh/<repo>@<sha>/<desde>` (sha del HEAD o del pin; `@main` solo
como respaldo sin API). Cuando el pin cambia (`pin-update.mjs --nuevo=ultimo`, que la CLI corre ANTES de barrer), el
mismo barrido lo tiene en cuenta. Lo que aún no existe en la web (404, p. ej. una skill recién creada) se copia del
checkout local con el aviso «copiado de local, aún no publicado». `skills/**` del kit se sirve tal cual desde el repo
(jsDelivr sirve cualquier ruta; el build además lo copia a `dist/cdn/skills/`): en las altas se usa `skills/<nombre>`.

### Skills como vendor transversal

El consumidor tiene `skills/`: (1) sus skills PROPIAS y (2) las COMUNES del kit, dadas de alta con `carpeta: true`.
Qué skills vendoriza cada perfil (Jeff, 2026-10-13):

| Perfil | Skills comunes |
| --- | --- |
| `client` (app de web components: ISW) | `skills/iswc-foundation` (completa), `skills/is-cdn-install`, `skills/iswc-diagramas-enriquecidos` |
| `server` (API/backend: ISS) | `skills/iswc-server` (carpeta) + estas referencias de `iswc-foundation/references/` archivo por archivo hacia `skills/iswc-server/references/<mismo nombre>.md`: 05-zod-y-tipos, 06-pines-y-vendor, 07-pruebas-y-gate, 08-sync-entregable, 12-jueces, 14-herramientas-de-test; y `skills/iswc-diagramas-enriquecidos` si renderiza docs con el kit. NUNCA `iswc-foundation` entera ni `is-cdn-install` (un server no crea componentes ni es app iswc) |
`skills/README.md` del consumidor lo genera/actualiza el vendor (marca `generado por vendor.ts`): índice de propias (sin
cabecera) y comunes (con su `@vendor`); un README propio sin la marca no se toca. Cada `.ts` vendorizable del kit lleva
en su docblock `Skill: skills/…md` (la skill que lo explica; guardián `meta/vendor-distributions-doc.test.ts` D5) y al
vendorizar esa línea se reescribe a la ruta local del consumidor si tiene la skill, o a la URL jsDelivr del pin si no.

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
- **Pin por fecha ISO**: por archivo compiten el checkout local del kit (cabecera estampada, o «ahora» si tiene cambios sin commitear) y la web en el pin del proyecto; gana el más reciente y solo se escribe si es más nuevo que la copia (`@vendor <ISO>`). Nunca hay regresiones.
- **Cabecera**: `// @vendor <ISO> <repo>@<sha|local> <desde>` (el propio archivo dice desde dónde se actualiza: no hace
  falta un diccionario de rutas) y, opcional, `// @doc <URL jsDelivr de su .md>`. La doc va SIEMPRE por CDN (nunca ruta local): sale de `doc` en `vendor.json` o, si falta, de la `// @doc` con que la fuente abre (todo archivo de `vendor-distributions/` la trae; guardián `meta/vendor-distributions-doc.test.ts`), fijada al SHA ganador (a la rama si ganó el checkout local).
- **Dónde se corre**: el comando vive solo en el `package.json` del mirror `_experimental` (el del entregable no lo define), y el sync al entregable siempre descarga antes de copiar.
- **Pines primero**: la CLI de `vendor.ts` corre el protocolo de pines (arriba) con el `pin-update.mjs` que está junto a
  ella (por URL, online) ANTES de barrer, para leer la web del pin nuevo.

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

## Fichas de los scripts online de esta referencia

### `vendor` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs <vendor.json>
```

- **Qué hace y cuándo**: barrido + altas + protocolo de pines (arriba). `npm run vendor` / `deno task vendor` y `presync:entregable`.
- **Entradas**: `vendor.json`; checkout `local` si existe; red (API de GitHub, jsDelivr; `GITHUB_TOKEN` opcional); archivos con cabecera `@vendor` bajo `raices`.
- **Escribe**: archivos vendorizados, `schemas.ts` podado, `skills/README.md`, `.tmp/vendor-fechas.json`, pines (vía pin-update).
- **Salida y errores típicos**: 0 ok · 1 `faltan`/bloqueado por perfil/«no se pisa»/pines 1-3 · sin red: aviso y se conserva (pines 4) · «Import "zod" not a dependency»: falta `--import-map`.

### `pin-update` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/pin-update.mjs [--nuevo=<sha40|ultimo>] [--local=<ruta>] [--viejo=<sha40>] [--raices=a,b] [--saltar=a,b] [--verificar=<ruta>] [--dry-run]
```

- **Qué hace y cuándo**: inventario de pines y refs mutables; con `--nuevo` fija todos los pines al SHA dado o al último publicado.
- **Entradas**: flags (`--repo`, `--rama`); raíces del consumidor; red; `--local` solo informativo.
- **Escribe**: los archivos de las raíces (reemplazo de `@<sha>`); nada con `--dry-run`.
- **Salida y errores típicos**: 0 · 1 heterogéneo/mutables · 2 uso · 3 no publicado · 4 sin red.
