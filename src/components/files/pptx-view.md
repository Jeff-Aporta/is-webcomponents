---
tag: iswc-pptx-view
tags:
  - iswc-pptx-view
category: files
status: public
source: ./pptx-view.ts
style: ./pptx-view.scss
preview: ./pptx-view.json
---
# `<iswc-pptx-view>`

## Propósito

Previsualiza una presentación (.pptx) como lista de diapositivas con su texto.

## Cuándo usarlo

- Revisar el contenido de un `.pptx` sin abrir PowerPoint.

## Cuándo no usarlo

- Ver el diseño de las diapositivas: descargar el archivo.
- PDF: `iswc-pdf-viewer`.

## Importación

```js
await iswcLoader.load('iswc-pptx-view');
```

## Ejemplo mínimo

```html
<iswc-pptx-view src="ventas.pptx" height="24em"></iswc-pptx-view>
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
| `content` | lectura/escritura | Data-URL, base64 o texto. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-load` | `{ slides }` | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `stage` | Lista de diapositivas. |
| `slide` | Una diapositiva. |
| `state` | El `<iswc-empty-state>` vacío o de error. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-empty-state` para los estados.

## Accesibilidad

Cada diapositiva es un `<article>` con su número.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-pptx-view');
el.addEventListener('iswc-load', (e) => console.log(e.detail.slides));
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.
- Solo muestra texto: imágenes y formas no se pintan.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`pptx-view.ts`](./pptx-view.ts)
- [`pptx-view.scss`](./pptx-view.scss)
- [`pptx-view.json`](./pptx-view.json)
