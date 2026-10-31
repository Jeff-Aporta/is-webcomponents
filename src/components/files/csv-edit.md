---
tag: iswc-csv-edit
tags:
  - iswc-csv-edit
category: files
status: public
source: ./csv-edit.ts
style: ./csv-edit.scss
preview: ./csv-edit.json
---
# `<iswc-csv-edit>`

## Propósito

Edita un CSV en una tabla: celdas editables, agregar o quitar la última fila o columna y exportar.

## Cuándo usarlo

- Corregir un CSV en el navegador antes de subirlo o descargarlo.

## Cuándo no usarlo

- Fórmulas o varias hojas: `iswc-spreadsheet`.
- Solo mirarlo: `iswc-csv-view`.

## Importación

```js
await iswcLoader.load('iswc-csv-edit');
```

## Ejemplo mínimo

```html
<iswc-csv-edit content="nombre,edad&#10;Ada,36" height="14em"></iswc-csv-edit>
```

## API

### Atributos

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string (URL) | Archivo a cargar por `fetch`. |
| `content` | string | Contenido en línea; si llegan ambos, gana sobre `src`. |
| `height` | longitud CSS | Alto fijo, por ejemplo `14em`; sin él, crece con el contenido. |

### Propiedades

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | Refleja el atributo. |
| `content` | lectura/escritura | CSV actual. |
| `value` | solo lectura | Alias de `content`. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-load` | `{ rows }` | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |
| `iswc-change` | `{ value, rows }` | Cambió una celda, una fila o una columna. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de acciones. |
| `add-row` | Agregar fila. |
| `add-column` | Agregar columna. |
| `remove-row` | Quitar la última fila. |
| `remove-column` | Quitar la última columna. |
| `export` | Exportar CSV. |
| `stage` | Zona con scroll. |
| `table` | Tabla. |
| `state` | El `<iswc-empty-state>` vacío o de error. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-button`, `iswc-icon` e `iswc-empty-state`.

## Accesibilidad

Las celdas se editan con el teclado (`contenteditable`) y muestran foco; los botones solo de ícono llevan `aria-label`.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-csv-edit');
el.addEventListener('iswc-change', (e) => guardar(e.detail.value));
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`csv-edit.ts`](./csv-edit.ts)
- [`csv-edit.scss`](./csv-edit.scss)
- [`csv-edit.json`](./csv-edit.json)
