---
tag: iswc-file-edit
tags:
  - iswc-file-edit
category: files
status: public
source: ./file-edit.ts
style: ./file-edit.scss
preview: ./file-edit.json
---
# `<iswc-file-edit>`

## Propósito

Elige y monta el editor adecuado según `type`, `name` o la extensión de `src`.

## Cuándo usarlo

- Editar archivos de tipo variable con una sola etiqueta.

## Cuándo no usarlo

- Ya conoces el tipo: usa `iswc-txt-edit` o `iswc-csv-edit`.
- Solo mirar: `iswc-file-view`.

## Importación

```js
await iswcLoader.load('iswc-file-edit');
```

## Ejemplo mínimo

```html
<iswc-file-edit name="notas.txt" content="hola" height="14em"></iswc-file-edit>
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
| `iswc-load` | el del editor montado | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |
| `iswc-change` | `{ value }` | Cambió el contenido. |
| `iswc-dispatch` | `{ tag, kind, mode }` | Se eligió el editor. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `stage` | Donde se monta el editor. |
| `state` | El `<iswc-empty-state>` de tipo no editable. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-txt-edit` e `iswc-csv-edit` bajo demanda; `iswc-empty-state`.

## Accesibilidad

Hereda la del editor montado.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-file-edit');
el.addEventListener('iswc-change', (e) => guardar(e.detail.value));
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`file-edit.ts`](./file-edit.ts)
- [`file-edit.scss`](./file-edit.scss)
- [`file-edit.json`](./file-edit.json)
