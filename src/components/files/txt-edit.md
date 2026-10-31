---
tag: iswc-txt-edit
tags:
  - iswc-txt-edit
category: files
status: public
source: ./txt-edit.ts
style: ./txt-edit.scss
preview: ./txt-edit.json
---
# `<iswc-txt-edit>`

## Propósito

Editor de texto plano con la misma carga que `iswc-txt-view`; publica cada cambio.

## Cuándo usarlo

- Editar un `.txt` o una nota sin formato.

## Cuándo no usarlo

- Código: `iswc-code`.
- Formulario con etiqueta y validación: `iswc-textarea`.
- Texto con formato: `iswc-rte`.

## Importación

```js
await iswcLoader.load('iswc-txt-edit');
```

## Ejemplo mínimo

```html
<iswc-txt-edit content="editable" height="12em"></iswc-txt-edit>
```

## API

### Atributos

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string (URL) | Archivo a cargar por `fetch`. |
| `content` | string | Contenido en línea; si llegan ambos, gana sobre `src`. |
| `height` | longitud CSS | Alto fijo, por ejemplo `14em`; sin él, crece con el contenido. |
| `readonly` | boolean | Solo lectura. |

### Propiedades

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | Refleja el atributo. |
| `content` | lectura/escritura | Texto actual. |
| `value` | lectura/escritura | Alias de `content`. |
| `height` | lectura/escritura | Refleja el atributo. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-load` | `{ bytes }` | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |
| `iswc-change` | `{ value }` | El usuario editó el texto. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `editor` | Área de texto. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

Ningún componente del kit: el área de texto es interna.

## Accesibilidad

El área de texto lleva `aria-label="Editor de texto"`; `readonly` se traslada a ella.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-txt-edit');
el.addEventListener('iswc-change', (e) => guardar(e.detail.value));
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`txt-edit.ts`](./txt-edit.ts)
- [`txt-edit.scss`](./txt-edit.scss)
- [`txt-edit.json`](./txt-edit.json)
