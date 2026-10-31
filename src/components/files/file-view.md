---
tag: iswc-file-view
tags:
  - iswc-file-view
category: files
status: public
source: ./file-view.ts
style: ./file-view.scss
preview: ./file-view.json
---
# `<iswc-file-view>`

## Propósito

Elige y monta el visor adecuado según `type`, `name` o la extensión de `src`.

## Cuándo usarlo

- Mostrar archivos de tipo variable sin decidir el visor a mano.

## Cuándo no usarlo

- Ya conoces el tipo: usa su visor directo y ahorra la carga dinámica.
- Editar: `iswc-file-edit`.

## Importación

```js
await iswcLoader.load('iswc-file-view');
```

## Ejemplo mínimo

```html
<iswc-file-view name="demo.csv" content="a,b&#10;1,2" height="14em"></iswc-file-view>
```

## API

### Atributos

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string (URL) | Archivo a cargar por `fetch`. |
| `content` | string | Contenido en línea; si llegan ambos, gana sobre `src`. |
| `height` | longitud CSS | Alto fijo, por ejemplo `14em`; sin él, crece con el contenido. |
| `type` | string (MIME) | Tipo del archivo; gana sobre el nombre. |
| `name` | string | Nombre con extensión, cuando `src` no la trae. |

### Propiedades

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | Refleja el atributo. |
| `content` | lectura/escritura | Refleja el atributo. |
| `type` | lectura/escritura | Refleja el atributo. |
| `name` | lectura/escritura | Refleja el atributo. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-load` | el del visor montado | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |
| `iswc-dispatch` | `{ tag, kind, mode }` | Se eligió el visor. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `stage` | Donde se monta el visor. |
| `state` | El `<iswc-empty-state>` de tipo no soportado. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-txt-view`, `iswc-csv-view`, `iswc-docx-view`, `iswc-pptx-view` e `iswc-pdf-viewer` bajo demanda; `iswc-empty-state`.

## Accesibilidad

Hereda la del visor montado.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-file-view');
el.addEventListener('iswc-dispatch', (e) => console.log(e.detail.tag));
el.src = 'informe.docx';
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`file-view.ts`](./file-view.ts)
- [`file-view.scss`](./file-view.scss)
- [`file-view.json`](./file-view.json)
