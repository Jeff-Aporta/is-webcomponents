---
name: iswc-server
description: >-
  Estándar transversal para proyectos SERVER que consumen el kit (ISS): vendor y pines, pruebas con
  cooldown, jueces, sync al entregable, Zod y la guía de herramientas de test. Nada de componentes,
  estilos, íconos ni build de front. Usar al alinear o mantener una API/backend que trae piezas del kit
  por vendor (perfil `server`).
---
<!-- @vendor 2026-10-14T00:24:49.822Z Jeff-Aporta/is-webcomponents@main skills/iswc-server/SKILL.md -->

# iswc-server — el kit para un proyecto server (perfil `server`)

Un server (Kit es el ejemplo) **no es una app ISWC**: no crea componentes, no tiene estilos, íconos ni
build de front. Del kit toma solo lo neutro (`vendor-distributions/shared/`): el sistema común de pruebas con
cooldown, los jueces (semántica local, JEV, LLM), el sync al entregable, los contratos Zod y el vendor por barrido.
Esta skill no duplica texto: enlaza a las referencias de `iswc-foundation` que aplican a un server, y nada más.
`iswc-foundation` completa e `is-cdn-install` son para apps de web components (perfil `client`); un server no las
vendoriza.

## Referencias que aplican (en `references/`, vendorizadas desde `skills/iswc-foundation/references/`)

| Tema | Referencia |
| --- | --- |
| Zod y tipos (W54: contratos en `schemas.ts`, `safeParse` para datos externos) | [05-zod-y-tipos.md](references/05-zod-y-tipos.md) |
| Vendor por barrido (`vendor.ts` online desde `@main`), pines por SHA, protocolo de pines, `vendor.json` como bootstrap | [06-pines-y-vendor.md](references/06-pines-y-vendor.md) |
| Pruebas: `pruebas.ts` (una por una, cooldown x1440, reintento, `--hijo`), gate | [07-pruebas-y-gate.md](references/07-pruebas-y-gate.md) |
| Sync `_experimental` → `_entregable` (`sync-entregable.ts`: gate, bloqueados, checkpoint) | [08-sync-entregable.md](references/08-sync-entregable.md) |
| Jueces opcionales: semántica local determinista (`semantica.ts`), JEV y LLM (`jueces.ts`), cooldown de llaves | [12-jueces.md](references/12-jueces.md) |
| Herramientas de test: qué usar y cuándo (guía única para agentes) | [14-herramientas-de-test.md](references/14-herramientas-de-test.md) |

## Qué vendoriza un server

- `shared/testing/`: `pruebas.ts`, `test-cooldown.ts`, `jueces.ts`, `semantica.ts`, `proveedores-llm.ts` → su carpeta de
  tests (ISS: `tests/.audit/ISU/`), con el `shared/schemas.ts` único (podado a esas secciones).
- `shared/tools/sync-entregable.ts` (lo importa el sync con tsx) y `shared/lib/obj.ts` + `schemas.ts` (sección `obj`) si
  el código lo usa.
- Skills: `skills/iswc-server` (esta) y, si renderiza docs con diagramas del kit, `skills/iswc-diagramas-enriquecidos`; si sirve la documentación de su API (`GET /api/docs`), la sección «La página de la API» de esta misma skill (componente `<iswc-server-api-docs>` del kit por CDN, sin vendor).
- Online, nunca vendorizados: `vendor.ts`, `pin-update.mjs` (y `render-lote.ts` para docs), desde `@main` con `--reload`.

`vendor.json` de un server: `"perfil": "server"` (bloquea `client/` y cualquier dependencia de navegador), `raices` =
sus carpetas `ISU/` y `skills/`, y las altas de arriba (las referencias se dan de alta archivo por archivo hacia
`skills/iswc-server/references/<mismo nombre>.md`; su cabecera `@vendor` conserva el origen en `iswc-foundation/references`).

## Scripts online (Deno, siempre `@main` con `--reload`)

Regla (Jeff, 2026-10-13): los scripts de `tools/` de una skill y los CLI de `vendor-distributions/` (`vendor.ts`,
`pin-update.mjs`, `download-iconify.ts`, `render-lote.ts`) NO se descargan nunca al consumidor: se ejecutan online con
Deno desde `@main` del kit, y lo que se ejecuta es un BUNDLE autocontenido en `dist/cdn/…` (`scripts/build-online.mjs`:
schemas y pin-update inlineados, `zod` como `npm:`; sin imports relativos). `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`
es obligatorio (Deno cachea los módulos remotos para siempre). Nunca una ruta local del checkout ni un SHA en estos
comandos: el pin del proyecto gobierna lo vendorizado, no los scripts.

### `vendor` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs <vendor.json>
```

- **Qué hace y cuándo**: mantiene al día por BARRIDO todo lo vendorizado (cabecera `@vendor <ISO> <repo>@main <desde>` en cada archivo) y aplica las altas del bootstrap; antes de barrer corre el protocolo de pines. Se corre en `npm run vendor` / `deno task vendor` y dentro del sync (`presync:entregable`).
- **Entradas**: el `vendor.json` (`repo`, `rama`, `perfil`, `local`, `raices`, `saltar`, `pin`, `archivos`); el checkout `local` si existe; red (API de GitHub y jsDelivr; `GITHUB_TOKEN` opcional sube la cuota). Lee todo archivo con cabecera `@vendor` bajo `raices`.
- **Escribe**: los archivos vendorizados (reescribe la cabecera y la `@doc`), `schemas.ts` podado por carpeta, `skills/README.md`, `.tmp/vendor-fechas.json` (caché de fechas por sha) y, vía pin-update, los pines del proyecto.
- **Salida y errores típicos**: 0 ok · 1 si un archivo importa algo no vendorizado (`faltan`), un alta está bloqueada por perfil o choca con un archivo propio sin cabecera («no se pisa»), o el protocolo de pines falla (1 refs mutables, 2 uso, 3 nada publicado) · «sin red»: aviso, se conserva todo (pines 4). el bundle no necesita import map (`zod` va como `npm:`).

### `pin-update` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/pin-update.mjs [--nuevo=<sha40|ultimo>] [--local=<ruta>] [--viejo=<sha40>] [--raices=a,b] [--saltar=a,b] [--verificar=<ruta>] [--dry-run]
```

- **Qué hace y cuándo**: sin `--nuevo`: inventario de pines (`<repo>@<sha40>`) y refs mutables del proyecto. Con `--nuevo=ultimo`: lleva TODOS los pines al último SHA PUBLICADO de la rama (lo lanza `vendor.ts`; a mano tras publicar el kit).
- **Entradas**: flags; `--repo`/`--rama` (default `Jeff-Aporta/is-webcomponents`/`main`); las `--raices` del consumidor (default front típico: `index.html, src, view, demo, public`…); red (API de GitHub + HEAD a jsDelivr); `--local` solo informativo; `GITHUB_TOKEN` opcional.
- **Escribe**: los archivos de las raíces donde reemplaza `@<sha>` (y la forma raw por sha). Con `--dry-run` nada.
- **Salida y errores típicos**: 0 ok · 1 pines heterogéneos o refs mutables (`@main`/`@latest`/sha corto fuera de los scripts online) · 2 uso inválido · 3 ningún commit reciente publicado en jsDelivr (nada se tocó) · 4 sin red (nada se tocó).

## La pagina de la API (`GET /api/docs`)

`<iswc-server-api-docs>` es un componente **solo para servers**: expone al estilo Swagger (tabla de endpoints,
detalle con método, ruta, sesión, permiso, parámetros, cuerpo y respuestas con schema y ejemplo) y deja probar
la API que el server expone. No es documentación en prosa. Vive en el kit (`src/components/layout/server-api-docs.*`) sobre el mismo layout documental
(`iswc-doc-layout`) que los demos del kit y que `iswc-md-docs-vault` (la documentación en prosa de un proyecto).
Ficha completa: [`src/components/layout/server-api-docs.md`](../../src/components/layout/server-api-docs.md).
Dominio puro y documento estricto (validar, parse estricto, normalizar, secuencia, cURL, login, OpenAPI):
[`server-api-docs-md.md`](../../src/components/layout/utils/server-api-docs-md.md).

### Qué distingue a cada componente documental

| Componente | Para | Entrada |
| --- | --- | --- |
| `iswc-doc-layout` | El layout (navegación \| contenido \| índice) que usan todos | Contenido propio en slots |
| `iswc-md-docs-vault` | `docs/index.html` de un proyecto: hojas markdown como un libro | Lista de `.md` (JSON hijo) |
| `iswc-server-api-docs` | `GET /api/docs` de un **server** | Documento ISWC `kind:"config"` u OpenAPI 3 |

### La página que sirve el server (contrato)

Un solo CDN: el kit, pineado por SHA de 40 (nunca `@main`). Nada de `isc-swagger`/`iswc-docs`, `boot.js`,
`hojas.js`, `all.min.js` ni listas de tags (`DOCS_KIT_TAGS`): el loader trae el componente y sus dependencias.

```html
<!doctype html>
<html lang="es" data-theme="dark" data-palette="delfin">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mi API · Documentación</title>
<style>html, body { margin: 0; height: 100%; } iswc-server-api-docs { display: block; height: 100dvh; }</style>
<script type="module">
  const { iswcLoader: L } = await import("https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.mjs");
  await L.loadPageStyles(["iswc-palettes-default"]);
  await L.load("iswc-server-api-docs", "iswc-theme-toggle");
</script>
</head>
<body>
<iswc-server-api-docs>
  <iswc-theme-toggle slot="actions" scope="root"></iswc-theme-toggle>
  <script type="application/json">{ …documento, con "<" escapado como <… }</script>
</iswc-server-api-docs>
</body>
</html>
```

- El documento va en un `<script type="application/json">` **hijo** (o por propiedad: `el.doc = obj`, que se
  acepta aunque el tag aún no esté definido; o por `src="/api/docs?v=json"`).
- Al serializar: `JSON.stringify(doc).replace(/</g, "\\u003c")` (y U+2028/U+2029): un `</script>` dentro de un
  markdown no corta la página.
- Sin `api-base`, «Probar» usa `location.origin + "/api"`: el mismo host que sirve la página.
- Login: `viewer.auth.provider` = `patyia-portal` (POST `<base><loginPath>` con la contraseña en claro; el
  server hace md5) u `orquestador` (contraseña envuelta). También se puede pegar un token JWT.

### El documento

- Contrato: `server-api-docs-md.schemas.ts` (ISWC v2, todo `.strict()`, integridad referencial, solo `zod`).
  El server lo **vendoriza** y lo aplica al escribir el documento (ISS: `src/sources/000 Base/ISU/server-api-docs-md.schemas.ts`,
  fila `doc` de `patyia_sys_values` por el controller de sys values). El visor dice si el documento lo admite
  (`estricto`) y, si no, muestra cada error con su ruta.
- Para pintar, el visor también acepta documentos tolerantes (`server-api-docs.schemas.ts`, `.loose()`).
- Sin `kind:"config"`/`openapi` o sin `paths`: el visor muestra cada error con su ruta JSON y no pinta.
  Con problemas pero materializable: pinta y los lista en la portada (y en consola).
- Templates de respuesta ISWC: `ok`, `auth`, `authForbidden`, `authNotFound`, `deleteEnvelope`, `raw`
  (el visor los expande a 200/401/403/404 con el sobre `encabezado`/`respuesta`).
- Nada documental en el documento: `info.description` es una línea; sin `catalog.docs` ni markdown por
  endpoint. Cada endpoint declara `permission` (con sesión) y `controller`; el visor genera su diagrama de
  secuencia con `diagram-style="iswc"`.

### Migrar desde el visor viejo (`<docs-viewer>` de isc-swagger / iswc-docs)

1. Quitar el pin `…/iswc-docs@…` o `…/isc-swagger@…` y los `boot.js`, `hojas.js`, `styles/app.css`,
   `all.min.js` y `DOCS_KIT_TAGS`.
2. Cargar solo el loader del kit y `L.load("iswc-server-api-docs")`.
3. `<docs-viewer>` → `<iswc-server-api-docs>`; el documento como script hijo (o `.doc = obj`, igual que antes).
4. Verificar: la portada es la tabla de endpoints, `validacion.ok` es `true` y `estricto.ok` también.

### Reglas

- Nunca un visor propio ni un segundo CDN para la documentación de la API: el componente vive en el kit.
- Cambios del visor se hacen en el kit (componente + schemas + ficha + demo + pruebas
  `src/utils/health/meta/server-api-docs-*.test.ts`) y se publican con un nuevo SHA; el server solo actualiza su pin.

