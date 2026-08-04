---
tag: is-function-form
tags:
  - is-function-form
category: isp
status: public
source: ./function-form.js
style: ./function-form.css
preview: ../../previews/isp/is-function-form.html
---
# `<is-function-form>`

## Propósito

Formulario de atributos de una "función" del editor enriquecido. Port de
`src/lib/form/richEditor/_FormularioFuncion.svelte` (ISP-SvelteComponents).
Recibe una función con su lista de `atributos`, pinta un control por atributo
según su `tdatributo` y, al enviar, emite una COPIA de la función con los
valores capturados. Igual que el original, trabaja siempre sobre un clon:
mientras no se pulse Aceptar/Guardar, el catálogo de categorías no se toca.

Este módulo registra `<is-function-form>`.

## Cuándo usarlo

Al capturar/editar los atributos de una función del editor de texto enriquecido
(`richEditor`), antes de insertarla como `<customcode>`.

## Importación

```js
import './function-form.js';
```

## Ejemplo mínimo

```html
<is-function-form>
  <script type="application/json">
    { "ifuncion": 1, "label": "Saludo", "tdfuncion": "entidad",
      "atributos": [{ "iatributo": "nombre", "tdatributo": "string", "label": "Nombre", "requerido": true, "valor": "" }] }
  </script>
</is-function-form>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `edicion` | boolean | El botón pasa de "Agregar" a "Guardar". |
| `deletable` | boolean | Añade el botón "Eliminar". |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `funcion` | lectura/escritura | Objeto función completo (ver forma abajo). |
| `valor` | solo lectura | Clon en curso con los valores capturados. |
| `edicion` | lectura/escritura | Refleja el atributo. |
| `deletable` | lectura/escritura | Refleja el atributo. |

### Forma de `funcion`

```
{ ifuncion, icategoria, label, descripcion, tdfuncion, valorpordefecto,
  script?, controlador?,
  atributos: [{ iatributo, tdatributo, label, requerido, descripcion, valor,
                opciones?: [{ opcion, label }] }] }
```

`tdatributo` acepta: `opcion`, `multiSelect`, `string`, `number`, `date`,
`contexto`. `tdfuncion` acepta: `entidad`, `script`, `controlador`. Si un
atributo tiene `tdatributo: opcion|multiSelect` pero no trae `opciones`, cae al
input de texto genérico.

### Slots (contenido)

Se puede pasar la función vía `<script type="application/json">` hijo en lugar
de la propiedad `funcion`; se lee una sola vez en `connectedCallback`.

### Eventos

| Evento | detail | bubbles | composed |
| --- | --- | --- | --- |
| `is-function-submit` | `{ funcion }` | sí | sí |
| `is-function-cancel` | `{ funcion }` | sí | sí |
| `is-function-delete` | `{ funcion }` | sí | sí |

## Exports adicionales del módulo

Además del custom element, `function-form.js` exporta utilidades reusadas del
puerto original:

- `TD_FUNCION`, `TD_ATRIBUTO` — enums equivalentes a `TTDRichEditorFuncion` /
  `TTDRichEditorAtributo` de `$lib/UlConst`.
- `tdEnum(value, table)` — normaliza un valor fuera de enum a `table.none`.
- `cloneFuncion(funcion)` — clon profundo sin prototipos.
- `funcionToCustomCodeNode(funcion, customCodeStyle?)` /
  `funcionToCustomCodeTag(...)` — serializan una función al tag `<customcode>`
  que consume el editor (mismo contrato que el blot `CustomCodeBase.create()`).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./form.js`](./form.js)
- [`../forms/input.js`](../forms/input.js)
- [`../forms/select.js`](../forms/select.js)
- [`../forms/option.js`](../forms/option.js)

Tags del módulo: `<is-function-form>`.

## Errores comunes

- Asignar `select.value` / `select.values` antes de que `<is-select>` tenga sus
  `<is-option>` resueltos: el componente ya lo maneja con
  `requestAnimationFrame`, no hace falta repetirlo desde fuera.
- Olvidar que `valorpordefecto` solo aplica cuando `tdfuncion !== 'script'`.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./function-form.js)
- [CSS](./function-form.css)
- [Preview](../../previews/isp/is-function-form.html)
