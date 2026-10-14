---
tag: iswc-server-api-docs-model
tags: []
category: layout
status: public
source: ./server-api-docs-model.ts
---
# `server-api-docs-model` (módulo)

## Propósito

Dominio puro de `<iswc-server-api-docs>` (sin DOM ni red): valida el documento de un server con Zod, lo
normaliza al modelo que el visor pinta y arma lo que «Probar» necesita. Lo usan el componente y las
pruebas de caja negra del kit; un server Deno puede importarlo para validar su documento antes de servirlo.

## Importación

```js
import { validarDocumentoApi, normalizarDocumentoApi } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/layout/server-api-docs-model.min.js';
```

## API

| Función | Qué hace |
| --- | --- |
| `validarDocumentoApi(doc)` | `{ ok, formato: 'insoft' \| 'openapi' \| 'desconocido', errores[] }`; cada error con su ruta JSON. |
| `esMaterializable(doc)` | `true` si tiene formato y `paths`: se puede pintar aunque traiga avisos. |
| `normalizarDocumentoApi(doc)` | Modelo (`ServerApiDocsModelo`): operaciones, grupos tag → subgrupo, auth, servidores, exportes. Lanza si no es materializable. |
| `idDeOperacion(metodo, ruta, operationId?)` | Id estable de la operación (va en `?s=`). |
| `urlDeOperacion(base, op, { path, query })` | URL final con `{x}` sustituidos y query no vacía. |
| `curlDe(base, op, { path, query, cuerpo, token, ocultarToken })` | cURL equivalente. |
| `peticionLogin(auth, base, usuario, clave, itercero?)` | POST de login del proveedor (`patyia-portal` u `orquestador`). |
| `envolverClave(clave, dia?)` | Contraseña envuelta del orquestador (contrato, no cifrado). |
| `aOpenApi(modelo, base?)` | Modelo → OpenAPI 3.0.3. |
| `COLOR_METODO`, `colorDeCodigo(codigo)` | Colores del kit por método y por código de respuesta. |

Contratos (Zod) en `server-api-docs.schemas.ts`.

## Reglas para LLM

- La lógica del documento va aquí (pura y probada), no en el componente.
