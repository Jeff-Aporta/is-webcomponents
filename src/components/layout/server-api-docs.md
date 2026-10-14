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

Documentación interactiva de la API de un **server** (solo para servers: el ISS la sirve en
`GET /api/docs`). Recibe el documento que el server publica (InSoft `kind:"config"` u OpenAPI 3), lo
**valida con Zod**, lo pinta sobre `iswc-doc-layout` (el mismo layout documental de los demos del kit y
de `iswc-md-docs-vault`) y deja **probar** cada operación contra el server real, con sesión.

Reemplaza al visor `<docs-viewer>` del proyecto `isc-swagger`/`iswc-docs` (retirado): el server ya no
pinea dos CDN, solo el kit.

## Cuándo usarlo

- La página `GET /api/docs` de un server InSoft (ISS) con su documento `doc` incrustado.
- Documentar cualquier API con un OpenAPI 3 (operaciones, parámetros, cuerpos, respuestas, «Probar»).

## Cuándo no usarlo

- Documentación en prosa de un proyecto (`docs/` de hojas markdown): usa `iswc-md-docs-vault`.
- Una sola página de markdown: usa `iswc-md-render`.

## Importación

```js
import './server-api-docs.js'; // o, por el loader: ISWebComponentsLoader.ensure('iswc-server-api-docs')
```

## Ejemplo mínimo

```html
<iswc-server-api-docs style="height: 100dvh">
  <script type="application/json">{ "kind": "config", "version": 1, "info": { "title": "Mi API" }, "paths": { "/salud": { "get": { "summary": "Salud" } } } }</script>
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
| `validacion` | `{ ok, formato, errores[] }` (solo lectura) | Resultado de Zod: cada error con su ruta JSON (`paths › /x › get › doc: …`). |
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
| `iswc-server-api-docs-page` | `{ id, titulo, metodo, ruta }` | Al abrir la portada (`id = ''`) o una operación. |
| `iswc-server-api-docs-response` | `{ id, url, status, ms }` | Al terminar una petición de «Probar». |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `irA(id)` | Abre la operación `id` (`''` = portada). Cambia solo `?s=`: sin recarga. |

### CSS parts

| Part | Elemento |
| --- | --- |
| `bar`, `toc`, `content` | Re-exportados de `iswc-doc-layout`: barra, índice de la página y contenido. |

### Custom states

No expone custom states.

### CSS custom properties

Usa los tokens del kit (`--iswc-text`, `--iswc-text-dim`, `--iswc-border`, `--iswc-bg-soft`, `--iswc-color-brand`).

## Comportamiento

- **Validación (Zod)**: `server-api-docs.schemas.ts` describe el documento InSoft (tolerante: `.loose()`,
  con integridad referencial: `op.doc`, `bodyKey`, `payload`, `schema`, `tryitConfirm`,
  `tryitAttachments`, tags y subgrupos que existen) y el OpenAPI 3 mínimo. Documento sin formato o sin
  `paths`: se muestran los errores con su ruta y no se pinta. Materializable con problemas: se pinta, la
  portada los lista en un aviso y la consola los repite.
- **Navegación**: índice (`iswc-doc-index`) por tag → subgrupo, con búsqueda por resumen, ruta, método
  y documentación; una operación por página; `?s=` compartible (atrás/adelante); paginador y ← / →
  en el orden del índice; `/` enfoca la búsqueda.
- **Operación**: método y ruta, descripción y documentación larga en markdown (`iswc-md-render`: admite
  componentes del kit como `iswc-callout` o diagramas), parámetros, cuerpo (ejemplo y schema) y
  respuestas expandidas de los templates InSoft (`ok`, `auth`, `authForbidden`, `authNotFound`,
  `deleteEnvelope`, `raw`).
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

`iswc-doc-layout`, `iswc-doc-index`, `iswc-md-render`, `iswc-code`, `iswc-tag`, `iswc-pager`,
`iswc-input`, `iswc-dialog`, `iswc-copy-button`, `iswc-button-group`, `iswc-callout`; `core/spa-state`
para la URL. Dominio puro en `server-api-docs-model.ts` (ver `server-api-docs-model.md`).

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
visor.addEventListener('iswc-server-api-docs-page', (e) => { document.title = `${e.detail.titulo} · API`; });
```

## Errores comunes

- Incrustar el JSON sin escapar `<` dentro del `<script>`: un `</script>` en un markdown corta la página.
  Escape `<` como `<` al serializar.
- Pinear otro CDN además del kit: el visor vive en el kit (`layout/server-api-docs.min.js`).
- Esperar que `api-base` cambie el login de `patyia-portal`: el login va contra la base activa salvo que
  el documento traiga `viewer.auth.loginUrl`.

## Reglas para LLM

- La página de documentación de la API de un server se arma con este componente y el documento del
  server; no se copia un visor propio ni se vuelve a pinear `isc-swagger`/`iswc-docs`.
- Es un componente de **server**: para la documentación en prosa de un proyecto usa `iswc-md-docs-vault`.
- Las reglas del documento las fija el server con su schema estricto; este schema es el del consumidor.

## Fuentes

- `src/components/layout/server-api-docs.ts`, `server-api-docs.scss`, `server-api-docs.schemas.ts`,
  `server-api-docs-model.ts`.
- Skill: `skills/iswc-server-api-docs/SKILL.md`.
