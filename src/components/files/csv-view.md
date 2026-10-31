---
tag: iswc-csv-view
tags:
  - iswc-csv-view
category: files
status: public
source: ./csv-view.ts
style: ./csv-view.scss
preview: ./csv-view.json
---
# `<iswc-csv-view>`

## Propósito

Muestra un CSV como tabla de solo lectura; la primera fila es el encabezado.

## Cuándo usarlo

- Revisar un `.csv` pequeño o mediano sin editarlo.

## Cuándo no usarlo

- Ordenar, filtrar o paginar: `iswc-data-grid`.
- Editar: `iswc-csv-edit`.
- Tablas dinámicas: `iswc-pivot-table`.

## Importación

```js
await iswcLoader.load('iswc-csv-view');
```

## Ejemplo mínimo

```html
<iswc-csv-view content="nombre,edad&#10;Ada,36" height="14em"></iswc-csv-view>
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
| `content` | lectura/escritura | Refleja el atributo. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-load` | `{ rows }` | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `stage` | Zona con scroll. |
| `table` | Tabla. |
| `state` | El `<iswc-empty-state>` vacío o de error. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-empty-state` para los estados.

## Accesibilidad

Tabla semántica con `<th>` en el encabezado.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-csv-view');
el.addEventListener('iswc-load', (e) => console.log(e.detail.rows));
el.src = 'clientes.csv';
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`csv-view.ts`](./csv-view.ts)
- [`csv-view.scss`](./csv-view.scss)
- [`csv-view.json`](./csv-view.json)
