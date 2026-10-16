<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main src/vendor-distributions/shared/lib/obj.md -->
# `Obj` y `RefObj` — operaciones VIRTUALES y FÍSICAS sobre JSON

Biblioteca común de iswc (sin dependencias de DOM), en dos objetos separados:

- **`Obj` (virtual, `obj.ts`)**: lee y modifica **partes** de un objeto JSON **en memoria**, sin tocar el resto. No lee archivos ni la red. Ningún método muta: todos devuelven un objeto nuevo.
- **`RefObj` (físico, `ref-obj.ts`)**: resuelve referencias `{ path, query, actions }` a **otros** documentos JSON (los lee con `cargar`: fetch en el navegador, fs en Deno/Node) y aplica sobre lo traído las acciones virtuales de `Obj`.

## Consumo

| Cómo | Qué |
| --- | --- |
| Navegador (CDN) | `import { Obj } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/lib/obj.min.js'` y `import { RefObj } from '.../dist/cdn/lib/ref-obj.min.js'` (Zod incluido) |
| Deno por URL (DER) | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/shared/lib/obj.ts` (y `ref-obj.ts`); importan `../schemas.ts` y el `zod` del import map del consumidor. Actualizar con `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/` |
| Vendor (ISS, ISW) | `dist/cdn/vendor-distributions/shared/lib/obj.ts` (+ `ref-obj.ts` si resuelve referencias) y la sección `obj` de `shared/schemas.ts` (usan el `zod` del consumidor), depositados en la carpeta `ISU/` del consumidor por `tools/vendor.ts` (pin por fecha ISO: gana el más reciente) |
| Dentro del kit | `src/vendor-distributions/shared/lib/obj.ts` y `ref-obj.ts` |

## Consulta (`query`)

Copia la forma del dato y marca con un valor **truthy** (`!!x === true`) lo que se pide; una hoja falsy no se pide. Además de las claves normales:

| Clave | Elige |
| --- | --- |
| `"*"` | Todas las claves de un objeto o todos los elementos de un arreglo |
| `"[campo=valor]"` | El primer elemento (de un arreglo o de los valores de un objeto) cuyo `campo` vale `valor`. Así un diccionario en arreglo (`entities`, `classes`…) se consulta por nombre |

## `Obj`: operaciones virtuales

| Método | Hace |
| --- | --- |
| `Obj.get(base, query)` | Conserva la estructura **desde la raíz**, solo con las claves marcadas (varias) |
| `Obj.getValue(base, query)` | El **valor exacto** de la única hoja marcada, sin estructura. Si el camino no existe, `null`. Si la consulta marca cero o varias hojas (o usa `*`), lanza |
| `Obj.insert(base, cambios, schema?)` | Upsert profundo: lo no mencionado se conserva, `undefined` no toca, los arreglos se reemplazan, `null` quita según el schema (opcional → se borra; con default → el default; obligatoria → el primer vacío que acepte; si ninguno, no se toca) |
| `Obj.insertZod(schema, base, cambios)` | `insert` + validación del resultado |
| `Obj.esquemaInsert(schema)` | Schema de un fragmento de insert (claves opcionales que aceptan `null`, anidado); cliente y servidor validan el mismo fragmento |
| `Obj.insertIgnore(base, nuevos)` | Agrega solo lo que **no existe** (nunca pisa) |
| `Obj.update(base, cambios)` | Cambia solo lo que **ya existe** (no crea) |
| `Obj.replace(base, valor)` | Reemplazo directo (`undefined` no toca); lo que aplica sin molde Zod |
| `Obj.delete(base, query)` | Quita lo marcado |
| `Obj.restaurarClaves(v, schema)` | Devuelve `v` con las claves como las declara el schema (sin distinguir mayúsculas); para datos que llegan en minúsculas |
| `Obj.aplicar(base, acciones)` | Las anteriores en orden: `{ op: 'insert' \| 'insertIgnore' \| 'update' \| 'replace', valor }`, `{ op: 'delete' \| 'get' \| 'getValue', query }` |

| Acción | Pisa lo que existe | Crea lo que falta |
| --- | --- | --- |
| `insert` | sí | sí (fusiona por niveles) |
| `insertIgnore` | no | sí |
| `update` | sí | no |
| `replace` | sustituye la base completa | — |

## `RefObj`: operaciones físicas

| Método | Hace |
| --- | --- |
| `RefObj.esRef(v)` | ¿`v` tiene forma de referencia (`path` + `query`)? |
| `RefObj.resolver(valor, { base, cargar, avisar?, profundidad? })` | Cambia cada referencia por su valor (ver abajo) |
| `resolverUrl(path, base)` | `path` relativo a `base` (URL o ruta de archivo) |

Los errores son `ObjError` con `codigo` y `ruta`: virtuales de `Obj` (`consulta`, `varios`, `ninguno`) y físicos de `RefObj` (`no-existe`, `ref`, `ciclo`, `carga`).

## Referencias `{ path, query, actions }`

Cualquier valor (texto, número, booleano, objeto, arreglo) puede ser una referencia a otro JSON:

```json
{
  "table": {
    "path": "./der.json",
    "query": { "payload": { "erDiagram": { "entities": { "[name=patyia_conversaciones]": true } } } },
    "actions": [{ "op": "get", "query": { "name": true, "attributes": { "[name=iconversacion]": true, "[name=titulo]": true } } }]
  }
}
```

- `path` es relativo al documento que contiene la referencia.
- `query` es **siempre un `getValue`**: marca exactamente una hoja y trae ese valor exacto. Si no existe, es un **error** (hay que definirlo en la fuente o ajustar `path`/`query`).
- `actions` adaptan lo traído, en orden.
- Lo traído puede contener a su vez referencias, relativas a su propio archivo. Los ciclos se detectan.
- Props extra en una referencia se ignoran con un aviso.

Los diagramas del kit resuelven las referencias de su payload antes de pintar: en el navegador contra `payload-base` (o la URL del documento) y en el export headless contra `payloadBase` del trabajo (la ruta del editable). Así un único JSON (el DER, el diagrama de clases, el de componentes) es el diccionario de entidades del que todos los diagramas toman nombres, estructuras y valores.
