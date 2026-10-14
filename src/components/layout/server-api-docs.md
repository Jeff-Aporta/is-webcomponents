---
tag: iswc-server-api-docs
tags:
  - iswc-server-api-docs
category: layout
status: public
source: ./server-api-docs.ts
style: ./server-api-docs.css
preview: ./server-api-docs.json
---
# `<iswc-server-api-docs>`

## Propósito

Expone los **endpoints** de la API de un **server** al estilo Swagger (solo para servers: el ISS la sirve
en `GET /api/docs`). No es documentación en prosa: por endpoint muestra método, ruta, sesión y permiso,
controller, parámetros, cuerpo y respuestas con sus schemas y ejemplos, su diagrama de secuencia (estilo
InSoft) y deja **probarlo** contra el server real, con sesión. Recibe el documento que el server publica
(InSoft `kind:"config"` u OpenAPI 3), lo **valida con Zod**, dice si admite el **parse estricto** (InSoft v2,
`server-api-docs-md.schemas.ts`) y lo pinta sobre `iswc-doc-layout`: la portada es la tabla de endpoints con
filtro y cada fila enlaza al detalle.

Reemplaza al visor `<docs-viewer>` del proyecto `isc-swagger`/`iswc-docs` (retirado): el server ya no
pinea dos CDN, solo el kit.

## Cuándo usarlo

- La página `GET /api/docs` de un server InSoft (ISS) con su documento `doc` incrustado.
- Exponer cualquier API con un OpenAPI 3 (endpoints, parámetros, cuerpos, respuestas, «Probar»).

## Cuándo no usarlo

- Documentación en prosa de un proyecto (`docs/` de hojas markdown): usa `iswc-md-docs-vault`.
- Una sola página de markdown: usa `iswc-md-render`.
- Explicar la arquitectura o el porqué de una API: eso es documentación (`iswc-md-docs-vault`), no endpoints.

## Importación

```js
import './server-api-docs.js'; // o, por el loader: ISWebComponentsLoader.ensure('iswc-server-api-docs')
```

## Ejemplo mínimo

```html
<iswc-server-api-docs style="height: 100dvh">
  <script type="application/json">{ "kind": "config", "info": { "title": "Mi API" }, "paths": { "/salud": { "get": { "summary": "Salud" } } } }</script>
</iswc-server-api-docs>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `src` | string | — | URL del documento JSON (p. ej. `/api/docs?v=json`) si no llega por propiedad ni por script hijo. |
| `api-base` | string | `location.origin + "/api"` | Base de «Probar». Sin `http(s)` (demo local), el primer `viewer.servers` del documento. |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `doc` | objeto | Documento del server. Asignarlo (`el.doc = obj`) valida y repinta. Se acepta antes de que el tag esté definido. |
| `validacion` | `{ ok, formato, errores[] }` (solo lectura) | Resultado de Zod (tolerante): cada error con su ruta JSON (`paths › /x › get › summary: …`). |
| `estricto` | `{ aplica, ok, errores[] }` (solo lectura) | ¿Admite el parse estricto InSoft v2? `aplica: false` para OpenAPI 3. La portada lo muestra (etiqueta y, si no, el error). |
| `modelo` | `ServerApiDocsModelo` (solo lectura) | Documento normalizado (operaciones, grupos, auth, servidores). |
| `layout` | `HTMLElement` (solo lectura) | El `<iswc-doc-layout>` que aloja al visor. |

Entrada (la primera que haya): `doc` → `<script type="application/json">` hijo → `src`.

### Slots

| Slot | Contenido |
| --- | --- |
| `brand` | Marca de la barra. Sin él, la del documento (`viewer.brand` o `info.title`). |
| `actions` | Acciones de la app en la barra (tema, paleta, escoba). |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-server-api-docs-page` | `{ id, titulo, metodo, ruta }` | Al abrir la portada (`id = ''`) o un endpoint. |
| `iswc-server-api-docs-response` | `{ id, url, status, ms }` | Al terminar una petición de «Probar». |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `irA(id)` | Abre el endpoint `id` (`''` = portada). Cambia solo `?s=`: sin recarga. |

### CSS parts

| Part | Elemento |
| --- | --- |
| `bar`, `toc`, `content` | Re-exportados de `iswc-doc-layout`: barra, índice de la página y contenido. |

### Custom states

No expone custom states.

### CSS custom properties

Usa los tokens del kit (`--iswc-text`, `--iswc-text-dim`, `--iswc-border`, `--iswc-bg-soft`, `--iswc-color-brand`).

## Comportamiento

- **Validación (Zod)**: dos niveles. Tolerante (`server-api-docs.schemas.ts`, `.loose()` con integridad
  referencial, InSoft v1/v2 u OpenAPI 3 mínimo) para decidir si se puede pintar; **estricto**
  (`server-api-docs-md.schemas.ts`, InSoft v2, todo `.strict()`) para decir si el documento cumple el
  contrato. Sin formato o sin `paths`: se muestran los errores con su ruta y no se pinta. Materializable con
  problemas: se pinta, la portada los lista y la consola los repite. Sin parse estricto: etiqueta roja y la
  lista de errores con su ruta JSON en la portada.
- **Portada**: la tabla de endpoints (método, ruta, resumen, grupo, sesión y permiso) con filtro por
  cualquiera de esos campos y conteo; cada ruta enlaza al detalle. En celular quedan método, ruta y resumen.
- **Navegación**: índice (`iswc-doc-index`) por tag → subgrupo, con búsqueda por resumen, ruta, método,
  permiso y controller; un endpoint por página; `?s=` compartible (atrás/adelante); paginador y ← / →
  en el orden del índice; `/` enfoca la búsqueda.
- **Endpoint**: método y ruta, descripción de una línea, ficha de acceso (grupo, sesión, permiso,
  controller), parámetros, cuerpo (schema y ejemplo), respuestas expandidas de los templates InSoft (`ok`,
  `auth`, `authForbidden`, `authNotFound`, `deleteEnvelope`, `raw`) con su schema (el declarado o el deducido
  del ejemplo) y su ejemplo, y el **flujo**: `<iswc-sequence-diagram diagram-style="insoft">` generado del
  propio endpoint (cliente → server → permiso → controller → respuestas; fallas en `alt`).
- **Probar**: base editable (y los `viewer.servers` del documento como atajos), parámetros de ruta y
  query, cuerpo JSON editable (`iswc-code`), adjuntos `tryitAttachments` (imágenes/audios como data
  URL en el campo del cuerpo), confirmación `tryitConfirm`, respuesta con estado, tiempo y cuerpo
  (`text/event-stream` se va mostrando mientras llega) y cURL equivalente.
- **Sesión**: botón de la barra. Login del proveedor del documento (`viewer.auth.provider`:
  `patyia-portal` contra el propio server, u `orquestador`), o token JWT pegado. El token vive en
  `sessionStorage` (`iswc:server-api-docs:sesion`); un 401 reabre el diálogo.
- **Exportar**: el documento tal cual (`viewer.exports.isDownloadName`) y OpenAPI 3.0.3
  (`openApiDownloadName`).

## Dependencias y componentes relacionados

`iswc-doc-layout`, `iswc-doc-index`, `iswc-sequence-diagram`, `iswc-code`, `iswc-tag`, `iswc-pager`,
`iswc-input`, `iswc-dialog`, `iswc-copy-button`, `iswc-button-group`, `iswc-callout`; `core/spa-state`
para la URL. Dominio puro y schema estricto en `server-api-docs-md.ts` / `server-api-docs-md.schemas.ts`
(ver `server-api-docs-md.md`).

## Accesibilidad

- La página es un `article` con `aria-live="polite"`; «esperando» usa `role="status"`.
- Botones de la barra con `aria-label`; el diálogo de sesión es un `iswc-dialog` (foco atrapado, Esc cierra).
- Los atajos no se disparan mientras el foco está en un campo o en el editor de código.

## Ejemplo avanzado

```js
// El server incrusta el documento; la app lo asigna por propiedad (contrato heredado del visor anterior).
const visor = document.querySelector('iswc-server-api-docs');
visor.doc = JSON.parse(document.getElementById('api-doc').textContent);
if (!visor.validacion.ok) console.table(visor.validacion.errores);
if (visor.estricto?.aplica && !visor.estricto.ok) console.table(visor.estricto.errores);
visor.addEventListener('iswc-server-api-docs-page', (e) => { document.title = `${e.detail.titulo} · API`; });
```

## Errores comunes

- Incrustar el JSON sin escapar `<` dentro del `<script>`: un `</script>` en un texto corta la página.
  Escape `<` como `<` al serializar.
- Pinear otro CDN además del kit: el visor vive en el kit (`layout/server-api-docs.min.js`).
- Esperar que `api-base` cambie el login de `patyia-portal`: el login va contra la base activa salvo que
  el documento traiga `viewer.auth.loginUrl`.

## Reglas para LLM

- La página de endpoints de la API de un server se arma con este componente y el documento del
  server; no se copia un visor propio ni se vuelve a pinear `isc-swagger`/`iswc-docs`.
- Es Swagger-like: no se le agrega prosa documental (markdown largo, portadas, diagramas incrustados en el
  documento). Los diagramas los genera el visor, siempre con `diagram-style="insoft"`.
- Es un componente de **server**: para la documentación en prosa de un proyecto usa `iswc-md-docs-vault`.
- El contrato del documento es `server-api-docs-md.schemas.ts`: el server lo vendoriza y lo aplica al
  escribir; no lo redefine.

## Fuentes

- `src/components/layout/server-api-docs.ts`, `server-api-docs.scss`, `server-api-docs.schemas.ts`,
  `server-api-docs-md.ts`, `server-api-docs-md.schemas.ts`.
- Skill: `skills/iswc-server-api-docs/SKILL.md`.
