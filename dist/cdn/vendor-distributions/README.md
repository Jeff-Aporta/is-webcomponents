<!-- @vendor 2026-10-13T13:28:49.065Z Jeff-Aporta/is-webcomponents@local src/vendor-distributions/README.md -->
# `vendor-distributions/` — todo lo que un consumidor trae del kit por vendor, separado por perfil

Fuente: `src/vendor-distributions/`. Publicado por `deno task build` en `dist/cdn/vendor-distributions/`
(mismo árbol). Los consumidores (ISS, ISW…) lo bajan con `shared/tools/vendor.ts` a partir de su
`vendor.json` (`perfil`, y por archivo `desde` = ruta en el repo, `hacia` = su carpeta `ISU/`, `doc` = ruta de la
doc en el repo, que la cabecera `// @doc` convierte en URL jsDelivr fijada al SHA). Pin por fecha ISO: gana el
más reciente; ver [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md).

## Perfiles (desde 2026-10-12)

Un proyecto server no necesita herramientas de navegador; por eso el árbol tiene tres raíces y cada módulo
vive en exactamente una:

| Raíz | Qué va | Puede importar | Lo baja |
| --- | --- | --- | --- |
| `shared/` | Neutro: sin navegador ni dependencias de UI (`node:*`, `fetch`, `zod`) | solo `shared/` | todos |
| `server/` | Exclusivo de proyectos server (hoy vacío: todo lo neutro lo usan ambos) | `shared/`, `server/` | perfil `server` |
| `client/` | Navegador: Playwright/Stagehand, DOM, render visual, íconos de UI | `shared/`, `client/` | perfil `client` |

El consumidor declara `"perfil": "server"` o `"perfil": "client"` en su `vendor.json`; `vendor.ts` BLOQUEA lo
que no corresponde (otro perfil, ruta plana anterior a los perfiles y, en `server`, cualquier archivo que importe
`playwright`, `@browserbasehq/stagehand`, `puppeteer`…). Al aplanar en una carpeta `ISU/`, los relativos entre
perfiles (`../../shared/testing/x.ts`) se reescriben a la ruta entre destinos. Guardián:
`src/utils/health/meta/vendor-perfiles.test.ts` (P1-P6).

## Un solo `schemas.ts` (desde 2026-10-13)

TODOS los contratos (Zod y tipos, regla W54) viven en `shared/schemas.ts`, por secciones delimitadas con marcadores
que `vendor.ts` entiende:

```ts
// ===== @seccion <modulo> [requiere: a, b] =====
…
// ===== @fin <modulo> =====
```

`<modulo>` es el basename del archivo dueño (`obj`, `test-cooldown`, `pruebas`, `jueces`, `render-lote`…); `comun`
siempre se conserva (el `z` de Zod). Una sección solo usa símbolos de `comun` o de las que declara en `requiere`.
Al vendorizar `schemas.ts`, `vendor.ts` lo **poda**: cabecera + `comun` + las secciones de los módulos que la misma
config deposita en la misma carpeta + sus `requiere` transitivos; el resultado y la CLI dicen qué secciones quedaron.
Una config puede traer `schemas.ts` a varias carpetas y cada copia se poda a lo suyo. Calibración: `meta/vendor.test.ts`
V10 (cada módulo compila con su copia podada, `deno check`) y V11 (dos carpetas, dos podas). Los módulos importan de
`../schemas.ts` (o `../../shared/schemas.ts` desde `client/`) y reexportan sus tipos.

Cada archivo de código abre con la cabecera `// @vendor <ISO> Jeff-Aporta/is-webcomponents@local <ruta>` (la estampa el
hook pre-commit del kit, `scripts/vendor-stamp.mjs`) y `// @doc <URL CDN de su .md>`, y lleva en su docblock **qué es**,
**Perfil:**, **Vendor:** (ruta publicada e imports relativos que deben viajar con él), **Skill:** (la skill que lo
explica) y **Doc:** (la misma URL). Al vendorizar, `vendor.ts` reescribe la cabecera `@vendor` con la fecha de la fuente
ganadora y el pin (el propio archivo dice desde dónde se actualiza) y fija la `// @doc` al SHA. `vendor.ts` falla si falta un import relativo. Lo que importa `zod` usa el del consumidor.

Las docs se enlazan SIEMPRE por CDN (jsDelivr; `vendor.ts` fija el SHA en la `// @doc` del consumidor), nunca por ruta local.
Guardián: `src/utils/health/meta/vendor-distributions-doc.test.ts`.

## `shared/` — sirve a server y a client

`shared/index.ts` es el barrel del perfil (dentro del kit o para quien vendorice `shared/` completo).

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `schemas.ts` | TODOS los contratos de `vendor-distributions/`, por secciones (`comun`, `obj`, `test-cooldown`, `deno-test`, `pruebas`, `proveedores-llm`, `jueces`, `semantica`, `sync-entregable`, `vendor`, `stagehand`, `download-iconify`, `static-server`, `render-diagram`, `render-lab`, `render-lote`); `vendor.ts` lo poda al vendorizar | este README |

### `shared/lib/` — utilidades comunes

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `obj.ts` | `Obj`: operaciones parciales sobre objetos JSON (`push`/`update`/`insert`/`delete`/`get`/`getValue`/`aplicar`) y resolución de referencias `{ path, query, actions }` (sección `obj` de `schemas.ts`) | [obj.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/shared/lib/obj.md) |
| `obj.md` | Documentación de `Obj` | — |
| `zod.ts` | Reexporta Zod; es la fuente del bundle único `dist/cdn/lib/zod.min.js` que comparten los componentes | [05-zod-y-tipos.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/05-zod-y-tipos.md) |

Bundles para el navegador (no vendor): `dist/cdn/lib/obj.min.js` (Zod incluido) y `dist/cdn/lib/zod.min.js`.

### `shared/testing/` — sistema común de pruebas, proveedores LLM y jueces

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `pruebas.ts` | `definirPruebas`, `correrCarpeta`, `correrPruebas`: pruebas una por una con cooldown, timeout, nivel y reporte JSON. Incluye el modo hijo de `correrPruebas({ aislar })`: el mismo archivo con `--hijo <json>` (antes `pruebas-hijo.ts`) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `test-cooldown.ts` | Cooldown proporcional (x1440: 1 min → 24 h) con memoria JSON; `record()` fusiona sobre el archivo fresco (varias instancias no se pisan). Incluye la cola estándar de N trabajadores (`runQueue`, `testConcurrency`, `TEST_CONCURRENCY`; antes `test-queue.ts`) y el cooldown de 24 h de las llaves de los jueces (LLM y JEV), con el mismo `-1` manual | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `deno-test.ts` | `deno test` por archivo con cola + cooldown (lee JUnit) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `proveedores-llm.ts` | Pila de proveedores LLM OpenAI-compatible en orden: lectura de llaves (con cooldown), sonda, barrido + cache, `elegirProveedorOpcional`, `normalizarJson` | [11-stagehand.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md) |
| `jueces.ts` | Jueces OPCIONALES de las pruebas: JEV (TypeSafe, preguntas noul/choice/score) y juez LLM sobre la pila de proveedores; nunca lanzan (`{ evaluado:false, motivo }`), `capaOpcional` avisa y sigue, `exigirJuez` salta | [12-jueces.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md) |
| `semantica.ts` | Juez semántico DETERMINISTA: embeddings locales `multilingual-e5-base` (`@huggingface/transformers`, devDependency del consumidor; modelo solo del cache local, nunca descarga): `semanticaDisponible`, `similitud`, `coincide`, `prefiere`, `masCercana`. Sin modelo lanza con motivo claro (la prueba se salta, nunca verde por omisión) | [12-jueces.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md) |

### `shared/tools/` — vendor, pines y sync

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `vendor.ts` | Vendor por BARRIDO: recorre el consumidor, lee la cabecera `@vendor <ISO> <repo>@<sha> <desde>` de cada archivo (ts/js/mjs/cjs/md/css/html/json) y lo actualiza desde el checkout local o la web en el pin estático del proyecto; `vendor.json` es solo bootstrap (altas, `carpeta: true` para skills). Perfiles, poda de `schemas.ts`, reescritura de relativos y de `Skill:`, guardián de imports, `skills/README.md` del consumidor y, antes de barrer, el protocolo de pines (`pin-update.mjs --nuevo=ultimo --local=…`) | [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md) |
| `pin-update.mjs` | Inventario y actualización de pines por SHA del consumidor; `--nuevo=ultimo --local=<ruta>`: último SHA publicado de la rama (jsDelivr), checkout local solo informativo (si no es accesible se omite y se sigue). Va junto a `vendor.ts` | [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md) |
| `sync-entregable.ts` | Sync `_experimental` → `_entregable` con gate, bloqueados y checkpoint | [08-sync-entregable.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/08-sync-entregable.md) |

## `server/` — exclusivo de proyectos server

Vacío hoy (ver `server/README.md`): lo que usa ISS (pruebas, jueces, sync, vendor, obj) también lo usa ISW, así
que es `shared/`. Aquí va lo que solo un server necesite (BD, colas, Azure Functions…), sin navegador.

## `client/` — navegador, e2e y render visual

`client/index.ts` es el barrel del perfil (labs del kit). Sus contratos son secciones de `shared/schemas.ts`.

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `testing/stagehand.ts` | Controlador de Stagehand: generador con fallback/round-robin para `Stagehand.create`, destino por protocolo, `prepararStagehand`, `unaVezPorProceso` (usa `shared/testing/proveedores-llm.ts`) | [11-stagehand.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md) |
| `tools/render-diagram.ts` | Render headless de diagramas iswc-* → SVG/PNG (Playwright lo inyecta el consumidor) | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/render-lab.ts` | Lo común de los `labs/*/render.mjs`: jobs desde editables + lote | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/render-lote.ts` | Lote de editables `<slug>.json` con caché por hash (`diagramas-iswc.cache.json`): `planificarLote` (puro: huella sha256 del spec resuelto + pin del kit) y `renderizarLote` (un proceso hijo por diagrama con reintentos, caché atómico por diagrama OK). CLI para el `docs:diagramas` de ISS/ISW | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/static-server.ts`, `tools/hosts.ts`, `tools/sanitize-svg.ts` | Dependencias de `render-diagram` (servidor estático, hosts de diagrama, limpieza del SVG) | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/download-iconify.ts` | Descarga de íconos Iconify de la app y su `iconify.json` | [10-iconos.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/10-iconos.md) |

## Mapa de rutas (anterior → actual)

| Antes | Ahora |
| --- | --- |
| `vendor-distributions/lib/{obj,obj.schemas,zod}.ts`, `obj.md` (hasta 2026-10-12) | `vendor-distributions/shared/lib/…` |
| `vendor-distributions/testing/{pruebas,pruebas-hijo,test-cooldown,test-queue,deno-test,jueces}*.ts` (hasta 2026-10-12) | `vendor-distributions/shared/testing/…` |
| `vendor-distributions/testing/stagehand*.ts` (hasta 2026-10-12) | `vendor-distributions/client/testing/…` (la pila de proveedores LLM pasó a `shared/testing/proveedores-llm.ts`) |
| `vendor-distributions/tools/{vendor,sync-entregable}*.ts`, `pin-update.mjs` (hasta 2026-10-12) | `vendor-distributions/shared/tools/…` |
| `vendor-distributions/tools/{render-diagram,render-lab,download-iconify,static-server,hosts,sanitize-svg}*.ts` (hasta 2026-10-12) | `vendor-distributions/client/tools/…` |
| `vendor-distributions/index.ts` | `vendor-distributions/shared/index.ts` + `vendor-distributions/client/index.ts` (el de la raíz queda como compat) |
| Todos los `*.schemas.ts` de `shared/` y `client/` (hasta 2026-10-13) | `shared/schemas.ts` (secciones podadas por `vendor.ts`) |
| `shared/testing/test-queue.ts` (hasta 2026-10-13) | dentro de `shared/testing/test-cooldown.ts` |
| `shared/testing/pruebas-hijo.ts` (hasta 2026-10-13) | `shared/testing/pruebas.ts --hijo <json>` |
| `dist/cdn/lib/obj.ts`, `dist/cdn/tools/*` (más antiguo) | ver filas anteriores |

Las rutas planas anteriores ya no existen en el kit: `vendor.ts` sigue bloqueándolas con el aviso «usa
vendor-distributions/{shared,client}/…» (guardián `meta/vendor.test.ts` V6).
