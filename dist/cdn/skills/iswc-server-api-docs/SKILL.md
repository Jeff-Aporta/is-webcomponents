---
name: iswc-server-api-docs
description: >-
  Cómo un SERVER (ISS u otro backend InSoft) publica la documentación interactiva de su API con el kit iswc:
  el documento InSoft kind:"config" (u OpenAPI 3) validado con Zod y pintado por <iswc-server-api-docs> en
  GET /api/docs, cargando SOLO el kit por CDN con pin por SHA. Usar al crear o tocar la página /api/docs de un
  server, al cambiar el documento `doc`, al migrar del visor viejo <docs-viewer> (isc-swagger / iswc-docs) o al
  depurar por qué la documentación de la API no se ve.
---
<!-- @vendor 2026-10-14T00:35:24.801Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-server-api-docs/SKILL.md -->

# iswc-server-api-docs — la documentación de la API de un server

`<iswc-server-api-docs>` es un componente **solo para servers**: documenta y deja probar la API que el server
expone. Vive en el kit (`src/components/layout/server-api-docs.*`) sobre el mismo layout documental
(`iswc-doc-layout`) que los demos del kit y que `iswc-md-docs-vault` (la documentación en prosa de un proyecto).
Ficha completa: [`src/components/layout/server-api-docs.md`](../../src/components/layout/server-api-docs.md).
Dominio puro (validar, normalizar, cURL, login, OpenAPI): [`server-api-docs-model.md`](../../src/components/layout/server-api-docs-model.md).

## Qué distingue a cada componente documental

| Componente | Para | Entrada |
| --- | --- | --- |
| `iswc-doc-layout` | El layout (navegación \| contenido \| índice) que usan todos | Contenido propio en slots |
| `iswc-md-docs-vault` | `docs/index.html` de un proyecto: hojas markdown como un libro | Lista de `.md` (JSON hijo) |
| `iswc-server-api-docs` | `GET /api/docs` de un **server** | Documento InSoft `kind:"config"` u OpenAPI 3 |

## La página que sirve el server (contrato)

Un solo CDN: el kit, pineado por SHA de 40 (nunca `@main`). Nada de `isc-swagger`/`iswc-docs`, `boot.js`,
`hojas.js`, `all.min.js` ni listas de tags (`DOCS_KIT_TAGS`): el loader trae el componente y sus dependencias.

```html
<!doctype html>
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mi API · Documentación</title>
<style>html, body { margin: 0; height: 100%; } iswc-server-api-docs { display: block; height: 100dvh; }</style>
<script type="module">
  const { ISWebComponentsLoader: L } = await import("https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.js");
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

## El documento

- Lo valida `server-api-docs.schemas.ts` (Zod, tolerante `.loose()` + integridad referencial). El server
  aplica además su schema estricto (ISS: `ZDocJValue` en `010 Objetos/schemas/sysValue.ts`).
- Sin `kind:"config"`/`openapi` o sin `paths`: el visor muestra cada error con su ruta JSON y no pinta.
  Con problemas pero materializable: pinta y los lista en la portada (y en consola).
- Templates de respuesta InSoft: `ok`, `auth`, `authForbidden`, `authNotFound`, `deleteEnvelope`, `raw`
  (el visor los expande a 200/401/403/404 con el sobre `encabezado`/`respuesta`).
- Markdown (`info.description`, `catalog.docs[*]`): `iswc-md-render`, así que admite componentes del kit
  (`<iswc-callout>`, `<iswc-er-diagram>` con su JSON hijo, …).

## Migrar desde el visor viejo (`<docs-viewer>` de isc-swagger / iswc-docs)

1. Quitar el pin `…/iswc-docs@…` o `…/isc-swagger@…` y los `boot.js`, `hojas.js`, `styles/app.css`,
   `all.min.js` y `DOCS_KIT_TAGS`.
2. Cargar solo el loader del kit y `L.load("iswc-server-api-docs")`.
3. `<docs-viewer>` → `<iswc-server-api-docs>`; el documento como script hijo (o `.doc = obj`, igual que antes).
4. Verificar: la portada lista las operaciones y `validacion.ok` es `true` (o los avisos esperados).

## Reglas

- Nunca un visor propio ni un segundo CDN para la documentación de la API: el componente vive en el kit.
- Cambios del visor se hacen en el kit (componente + schemas + ficha + demo + pruebas
  `src/utils/health/meta/server-api-docs-*.test.ts`) y se publican con un nuevo SHA; el server solo actualiza su pin.
