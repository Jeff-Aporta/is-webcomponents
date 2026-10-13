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
`src/utils/health/meta/vendor-perfiles.test.ts` (P1-P5).

Cada archivo de código empieza con `// @doc <URL CDN de su .md>` y lleva en su cabecera **qué es**, **Perfil:**,
**Vendor:** (ruta publicada e imports relativos que deben viajar con él) y **Doc:** (la misma URL). Al vendorizar,
`vendor.ts` antepone `// @vendor <ISO> <repo>@<sha> <ruta>` y fija la `// @doc` al SHA. Los hermanos `*.schemas.ts`
siempre se vendorizan juntos (`vendor.ts` falla si falta un import relativo). Lo que importa `zod` usa el del consumidor.

Las docs se enlazan SIEMPRE por CDN (jsDelivr; `vendor.ts` fija el SHA en la `// @doc` del consumidor), nunca por ruta local.
Guardián: `src/utils/health/meta/vendor-distributions-doc.test.ts`.

## `shared/` — sirve a server y a client

`shared/index.ts` es el barrel del perfil (dentro del kit o para quien vendorice `shared/` completo).

### `shared/lib/` — utilidades comunes

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `obj.ts` + `obj.schemas.ts` | `Obj`: operaciones parciales sobre objetos JSON (`push`/`update`/`insert`/`delete`/`get`/`getValue`/`aplicar`) y resolución de referencias `{ path, query, actions }` | [obj.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/shared/lib/obj.md) |
| `obj.md` | Documentación de `Obj` | — |
| `zod.ts` | Reexporta Zod; es la fuente del bundle único `dist/cdn/lib/zod.min.js` que comparten los componentes | [05-zod-y-tipos.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/05-zod-y-tipos.md) |

Bundles para el navegador (no vendor): `dist/cdn/lib/obj.min.js` (Zod incluido) y `dist/cdn/lib/zod.min.js`.

### `shared/testing/` — sistema común de pruebas, proveedores LLM y jueces

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `pruebas.ts` + `pruebas.schemas.ts` | `definirPruebas`, `correrCarpeta`, `correrPruebas`: pruebas una por una con cooldown, timeout, nivel y reporte JSON | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `pruebas-hijo.ts` | Proceso hijo de `correrPruebas({ aislar })` (un archivo por proceso) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `test-cooldown.ts` + `test-cooldown.schemas.ts` | Cooldown proporcional (x1440: 1 min → 24 h) con memoria JSON. Incluye el cooldown de 24 h de las llaves de los jueces (LLM y JEV), con el mismo `-1` manual. | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `test-queue.ts` | Cola estándar de N trabajadores (`TEST_CONCURRENCY`) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `deno-test.ts` + `deno-test.schemas.ts` | `deno test` por archivo con cola + cooldown (lee JUnit) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `proveedores-llm.ts` + `proveedores-llm.schemas.ts` | Pila de proveedores LLM OpenAI-compatible en orden: lectura de llaves (con cooldown), sonda, barrido + cache, `elegirProveedorOpcional`, `normalizarJson` | [11-stagehand.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md) |
| `jueces.ts` + `jueces.schemas.ts` | Jueces OPCIONALES de las pruebas: JEV (TypeSafe, preguntas noul/choice/score) y juez LLM sobre la pila de proveedores; nunca lanzan (`{ evaluado:false, motivo }`), `capaOpcional` avisa y sigue, `exigirJuez` salta | [12-jueces.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md) |

### `shared/tools/` — vendor, pines y sync

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `vendor.ts` + `vendor.schemas.ts` | Descarga por vendor strategy (pin por fecha ISO, perfiles, cabecera `@vendor`/`@doc`, reescritura de relativos al aplanar, guardián de imports) | [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md) |
| `pin-update.mjs` | Inventario y actualización de pines por SHA del consumidor | [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md) |
| `sync-entregable.ts` + `sync-entregable.schemas.ts` | Sync `_experimental` → `_entregable` con gate, bloqueados y checkpoint | [08-sync-entregable.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/08-sync-entregable.md) |

## `server/` — exclusivo de proyectos server

Vacío hoy (ver `server/README.md`): lo que usa ISS (pruebas, jueces, sync, vendor, obj) también lo usa ISW, así
que es `shared/`. Aquí va lo que solo un server necesite (BD, colas, Azure Functions…), sin navegador.

## `client/` — navegador, e2e y render visual

`client/index.ts` es el barrel del perfil (labs del kit).

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `testing/stagehand.ts` + `testing/stagehand.schemas.ts` | Controlador de Stagehand: generador con fallback/round-robin para `Stagehand.create`, destino por protocolo, `prepararStagehand`, `unaVezPorProceso` (usa `shared/testing/proveedores-llm.ts`) | [11-stagehand.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md) |
| `tools/render-diagram.ts` + `tools/render-diagram.schemas.ts` | Render headless de diagramas iswc-* → SVG/PNG (Playwright lo inyecta el consumidor) | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/render-lab.ts` + `tools/render-lab.schemas.ts` | Lo común de los `labs/*/render.mjs`: jobs desde editables + lote | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/render-lote.ts` + `tools/render-lote.schemas.ts` | Lote de editables `<slug>.json` con caché por hash (`diagramas-iswc.cache.json`): `planificarLote` (puro: huella sha256 del spec resuelto + pin del kit) y `renderizarLote` (un proceso hijo por diagrama con reintentos, caché atómico por diagrama OK). CLI para el `docs:diagramas` de ISS/ISW | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/static-server.ts`, `tools/hosts.ts`, `tools/sanitize-svg.ts` | Dependencias de `render-diagram` (servidor estático, hosts de diagrama, limpieza del SVG) | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `tools/download-iconify.ts` + `tools/download-iconify.schemas.ts` | Descarga de íconos Iconify de la app y su `iconify.json` | [10-iconos.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/10-iconos.md) |

## Mapa de rutas (anterior → actual)

| Antes (hasta 2026-10-12) | Ahora |
| --- | --- |
| `vendor-distributions/lib/{obj,obj.schemas,zod}.ts`, `obj.md` | `vendor-distributions/shared/lib/…` |
| `vendor-distributions/testing/{pruebas,pruebas-hijo,test-cooldown,test-queue,deno-test,jueces}*.ts` | `vendor-distributions/shared/testing/…` |
| `vendor-distributions/testing/stagehand*.ts` | `vendor-distributions/client/testing/…` (la pila de proveedores LLM pasó a `shared/testing/proveedores-llm*.ts`) |
| `vendor-distributions/tools/{vendor,sync-entregable}*.ts`, `pin-update.mjs` | `vendor-distributions/shared/tools/…` |
| `vendor-distributions/tools/{render-diagram,render-lab,download-iconify,static-server,hosts,sanitize-svg}*.ts` | `vendor-distributions/client/tools/…` |
| `vendor-distributions/index.ts` | `vendor-distributions/shared/index.ts` + `vendor-distributions/client/index.ts` |
| `dist/cdn/lib/obj.ts`, `dist/cdn/tools/*` (más antiguo) | ver filas anteriores |
