---
tag: iswc-server-api-docs-md
tags: []
category: layout
status: public
source: ./server-api-docs-md.ts
---
# `server-api-docs-md` (módulo)

## Propósito

Dominio puro de `<iswc-server-api-docs>` (sin DOM ni red) y **modelo estricto del documento** que un server
publica para exponer sus endpoints al estilo Swagger. Valida el documento con Zod (modo tolerante para
pintar), dice si admite el **parse estricto** (InSoft `kind:"config"` versión 2), lo normaliza al modelo que
el visor pinta y arma lo que «Probar» necesita, más el diagrama de secuencia de cada endpoint. Lo usan el
componente y las pruebas de caja negra del kit; un server lo vendoriza para validar su documento al escribirlo.

## Importación

```js
import { validarEstricto, validarDocumentoApi, normalizarDocumentoApi } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/layout/server-api-docs-md.min.js';
```

El schema estricto vive aparte, solo con `zod`, para que un server lo vendorice tal cual:
`src/components/layout/server-api-docs-md.schemas.ts` (`ApiDocsDocumentoSchema` y sus piezas, con sus tipos
`z.infer`). El ISS lo baja a `src/sources/000 Base/ISU/server-api-docs-md.schemas.ts` y su controller de
sys values lo aplica al escribir la fila `doc`.

## El documento estricto (InSoft v2)

| Parte | Qué lleva |
| --- | --- |
| `kind`, `version` | `"config"` y `2`. |
| `info` | `title`, `version` semver y una `description` de una línea (sin markdown de bloque ni diagramas). |
| `viewer` | `ns`, `brand` (título e icono `mdi:`), `auth` (proveedor `patyia-portal` u `orquestador`), `exports` (nombres de descarga) y `servers` opcional. |
| `tags` | Grupos con sus subgrupos (`id` kebab, nombre, icono, descripción corta). |
| `paths` | Por ruta y método: `summary`, `description`, `tags` (uno), `subgroup`, `security` (`bearer` o `none`), `permission` (obligatorio con sesión, prohibido sin ella), `controller` (`TClase.metodo`), `parameters`, `requestBody` (schema y `bodyKey` del ejemplo), `responses` (template o `raw`) y `tryitAttachments`. |
| `catalog` | `payloads` (ejemplos de respuesta), `requestBodies` (ejemplos de cuerpo), `schemas` (JSON Schema reutilizable) y plantillas de adjuntos. |

Todo objeto es `.strict()`; los JSON Schema son un subconjunto recursivo estricto (`type`, `properties`,
`items`, `required`, `enum`, `format`, `minimum`, `maximum`, `default`, `example`, `description`); los
ejemplos son JSON. La integridad referencial se cierra en `superRefine`: cada id nombra algo que existe,
los parámetros de ruta coinciden con los `{x}` de la ruta y nada del catálogo
queda huérfano.

## API

| Función | Qué hace |
| --- | --- |
| `validarEstricto(doc)` | `{ aplica, ok, errores[] }`: si el documento admite el parse estricto; cada error con su ruta JSON. OpenAPI 3: `aplica: false`. |
| `validarDocumentoApi(doc)` | Validación tolerante: `{ ok, formato: 'insoft' \| 'openapi' \| 'desconocido', errores[] }`. |
| `esMaterializable(doc)` | `true` si tiene formato y `paths`: se puede pintar aunque traiga avisos. |
| `normalizarDocumentoApi(doc)` | Modelo (`ServerApiDocsModelo`): endpoints con permiso y controller, grupos tag → subgrupo, auth, servidores, exportes. Las respuestas sin schema declarado lo deducen del ejemplo. Lanza si no es materializable. |
| `schemaDeEjemplo(valor)` | JSON Schema deducido de un ejemplo. |
| `secuenciaDeOperacion(op, server?)` | Payload de `<iswc-sequence-diagram>`: cliente → server → permiso → controller → respuestas (las fallas en un fragmento `alt`). El visor lo pinta con `diagram-style="insoft"`. |
| `idDeOperacion(metodo, ruta, operationId?)` | Id estable del endpoint (va en `?s=`). |
| `urlDeOperacion(base, op, { path, query })` | URL final con `{x}` sustituidos y query no vacía. |
| `curlDe(base, op, { path, query, cuerpo, token, ocultarToken })` | cURL equivalente. |
| `peticionLogin(auth, base, usuario, clave, itercero?)` | POST de login del proveedor (`patyia-portal` u `orquestador`). |
| `envolverClave(clave, dia?)` | Contraseña envuelta del orquestador (contrato, no cifrado). |
| `aOpenApi(modelo, base?)` | Modelo → OpenAPI 3.0.3 (con `x-permission` y `x-controller`). |
| `COLOR_METODO`, `colorDeCodigo(codigo)` | Colores del kit por método y por código de respuesta. |

Contratos del modelo (Zod) en `server-api-docs.schemas.ts`; el del documento estricto en
`server-api-docs-md.schemas.ts`.

## Reglas para LLM

- La lógica del documento va aquí (pura y probada), no en el componente.
- El documento es Swagger-like: nada de prosa documental (markdown largo, portadas, diagramas incrustados).
  El diagrama de cada endpoint lo genera el visor desde el propio documento.
- Un server no redefine este schema: lo vendoriza (`server-api-docs-md.schemas.ts`) y lo aplica al escribir.
