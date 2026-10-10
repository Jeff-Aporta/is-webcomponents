# `Obj` — operaciones sobre objetos y referencias a fuentes de verdad

Biblioteca común de iswc (sin dependencias de DOM). Lee y modifica **partes** de un objeto JSON sin tocar el resto, y resuelve referencias `{ path, query, actions }` a otros JSON. Ningún método muta: todos devuelven un objeto nuevo.

## Consumo

| Cómo | Qué |
| --- | --- |
| Navegador (CDN) | `import { Obj } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/lib/obj.min.js'` (Zod incluido) |
| Vendor (ISS, ISW) | `dist/cdn/lib/obj.ts` + `obj.schemas.ts` (usan el `zod` del consumidor), depositados en la carpeta `ISU/` del consumidor por `tools/vendor.ts` (pin por fecha ISO: gana el más reciente) |
| Dentro del kit | `src/cdn/lib/obj.ts` |

## Consulta (`query`)

Copia la forma del dato y marca con un valor **truthy** (`!!x === true`) lo que se pide; una hoja falsy no se pide. Además de las claves normales:

| Clave | Elige |
| --- | --- |
| `"*"` | Todas las claves de un objeto o todos los elementos de un arreglo |
| `"[campo=valor]"` | El primer elemento (de un arreglo o de los valores de un objeto) cuyo `campo` vale `valor`. Así un diccionario en arreglo (`entities`, `classes`…) se consulta por nombre |

## Métodos

| Método | Hace |
| --- | --- |
| `Obj.get(base, query)` | Conserva la estructura **desde la raíz**, solo con las claves marcadas (varias) |
| `Obj.getValue(base, query)` | El **valor exacto** de la única hoja marcada, sin estructura. Si el camino no existe, `null`. Si la consulta marca cero o varias hojas (o usa `*`), lanza |
| `Obj.push(base, cambios, schema?)` | Upsert profundo: lo no mencionado se conserva, `undefined` no toca, los arreglos se reemplazan, `null` quita según el schema (opcional → se borra; con default → el default; obligatoria → el primer vacío que acepte; si ninguno, no se toca) |
| `Obj.pushZod(schema, base, cambios)` | `push` + validación del resultado |
| `Obj.esquemaPush(schema)` | Schema de un fragmento de push (claves opcionales que aceptan `null`, anidado); cliente y servidor validan el mismo fragmento |
| `Obj.restaurarClaves(v, schema)` | Devuelve `v` con las claves como las declara el schema (sin distinguir mayúsculas); para datos que llegan en minúsculas |
| `Obj.update(base, cambios)` | Cambia solo lo que **ya existe** |
| `Obj.insert(base, nuevos)` | Agrega solo lo que **no existe** |
| `Obj.delete(base, query)` | Quita lo marcado |
| `Obj.aplicar(base, acciones)` | Las anteriores en orden: `{ op: 'push' \| 'update' \| 'insert', valor }`, `{ op: 'delete' \| 'get' \| 'getValue', query }` |
| `Obj.resolver(valor, { base, cargar, avisar? })` | Cambia cada referencia por su valor (ver abajo) |

Los errores son `ObjError` con `codigo` (`consulta`, `varios`, `ninguno`, `no-existe`, `ref`, `ciclo`, `carga`, `accion`) y `ruta`.

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
