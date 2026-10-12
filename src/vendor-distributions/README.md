# `vendor-distributions/` — todo lo que un consumidor trae del kit por vendor

Fuente: `src/vendor-distributions/`. Publicado por `deno task build` en `dist/cdn/vendor-distributions/`
(mismos nombres). Los consumidores (ISS, ISW…) lo bajan con `tools/vendor.ts` a partir de su
`vendor.json` (`desde` = ruta en el repo, `hacia` = su carpeta `ISU/`, `doc` = ruta de la doc en el
repo, que la cabecera `// @doc` convierte en URL jsDelivr fijada al SHA). Pin por fecha ISO: gana el
más reciente; ver [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md).

Cada archivo de código empieza con `// @doc <URL CDN de su .md>` y lleva en su cabecera **qué es**, **Vendor:**
(ruta publicada e imports relativos que deben viajar con él) y **Doc:** (la misma URL). Al vendorizar, `vendor.ts`
antepone `// @vendor <ISO> <repo>@<sha> <ruta>` y fija la `// @doc` al SHA. Los hermanos `*.schemas.ts` siempre se vendorizan juntos
(`vendor.ts` falla si falta un import relativo). Lo que importa `zod` usa el del consumidor.

Las docs se enlazan SIEMPRE por CDN (jsDelivr; `vendor.ts` fija el SHA en la `// @doc` del consumidor), nunca por ruta local.
Guardián: `src/utils/health/meta/vendor-distributions-doc.test.ts`.

## `lib/` — utilidades comunes

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `obj.ts` + `obj.schemas.ts` | `Obj`: operaciones parciales sobre objetos JSON (`push`/`update`/`insert`/`delete`/`get`/`getValue`/`aplicar`) y resolución de referencias `{ path, query, actions }` | [obj.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/lib/obj.md) |
| `obj.md` | Documentación de `Obj` | — |
| `zod.ts` | Reexporta Zod; es la fuente del bundle único `dist/cdn/lib/zod.min.js` que comparten los componentes | [05-zod-y-tipos.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/05-zod-y-tipos.md) |

Bundles para el navegador (no vendor): `dist/cdn/lib/obj.min.js` (Zod incluido) y `dist/cdn/lib/zod.min.js`.

## `testing/` — sistema común de pruebas y Stagehand

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `pruebas.ts` + `pruebas.schemas.ts` | `definirPruebas`, `correrCarpeta`, `correrPruebas`: pruebas una por una con cooldown, timeout, nivel y reporte JSON | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `pruebas-hijo.ts` | Proceso hijo de `correrPruebas({ aislar })` (un archivo por proceso) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `test-cooldown.ts` + `test-cooldown.schemas.ts` | Cooldown proporcional (x600) con memoria JSON. Incluye el cooldown de 24 h de las llaves de los jueces (LLM y JEV), con el mismo `-1` manual. | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `test-queue.ts` | Cola estándar de N trabajadores (`TEST_CONCURRENCY`) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `deno-test.ts` + `deno-test.schemas.ts` | `deno test` por archivo con cola + cooldown (lee JUnit) | [07-pruebas-y-gate.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md) |
| `stagehand.ts` + `stagehand.schemas.ts` | Controlador compartido de Stagehand: proveedores LLM en orden, barrido + cache, generador con fallback/round-robin, destino por protocolo, `prepararStagehand` | [11-stagehand.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md) |
| `jueces.ts` + `jueces.schemas.ts` | Jueces OPCIONALES de las pruebas: JEV (TypeSafe, preguntas noul/choice/score) y juez LLM sobre la pila de proveedores; nunca lanzan (`{ evaluado:false, motivo }`), `capaOpcional` avisa y sigue, `exigirJuez` salta | [12-jueces.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md) |

## `tools/` — herramientas de build, vendor, sync y render

| Archivo | Propósito | Doc |
| --- | --- | --- |
| `vendor.ts` + `vendor.schemas.ts` | Descarga por vendor strategy (pin por fecha ISO, cabecera `@vendor`/`@doc`, guardián de imports) | [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md) |
| `pin-update.mjs` | Inventario y actualización de pines por SHA del consumidor | [06-pines-y-vendor.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md) |
| `sync-entregable.ts` + `sync-entregable.schemas.ts` | Sync `_experimental` → `_entregable` con gate, bloqueados y checkpoint | [08-sync-entregable.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/08-sync-entregable.md) |
| `download-iconify.ts` + `download-iconify.schemas.ts` | Descarga de íconos Iconify de la app y su `iconify.json` | [10-iconos.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/10-iconos.md) |
| `render-diagram.ts` + `render-diagram.schemas.ts` | Render headless de diagramas iswc-* → SVG/PNG (Playwright lo inyecta el consumidor) | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `render-lab.ts` + `render-lab.schemas.ts` | Lo común de los `labs/*/render.mjs`: jobs desde editables + lote | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |
| `static-server.ts`, `hosts.ts`, `sanitize-svg.ts` | Dependencias de `render-diagram` (servidor estático, hosts de diagrama, limpieza del SVG) | [loader.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md) |

`index.ts` (raíz) es el barrel para quien vendorice las tres carpetas completas o para los labs del kit.

## Mapa de rutas (anterior → actual)

| Antes | Ahora |
| --- | --- |
| `dist/cdn/lib/obj.ts`, `obj.schemas.ts`, `obj.md` | `dist/cdn/vendor-distributions/lib/…` |
| `dist/cdn/tools/{pruebas,pruebas-hijo,test-cooldown,test-queue,deno-test}*.ts` | `dist/cdn/vendor-distributions/testing/…` |
| `dist/cdn/tools/{vendor,sync-entregable,render-diagram,render-lab,download-iconify,static-server,hosts,sanitize-svg}*.ts`, `pin-update.mjs` | `dist/cdn/vendor-distributions/tools/…` |
| `dist/cdn/tools/index.ts` | `dist/cdn/vendor-distributions/index.ts` |
