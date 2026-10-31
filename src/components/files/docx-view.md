---
tag: iswc-docx-view
tags:
  - iswc-docx-view
category: files
status: public
source: ./docx-view.ts
style: ./docx-view.scss
preview: ./docx-view.json
---
# `<iswc-docx-view>`

## Propósito

Previsualiza un documento Word (.docx) convertido a HTML con mammoth, cargado desde CDN la primera vez.

## Cuándo usarlo

- Leer un `.docx` sin salir de la app.

## Cuándo no usarlo

- Fidelidad de impresión: descargar el archivo.
- PDF: `iswc-pdf-viewer`.

## Importación

```js
await iswcLoader.load('iswc-docx-view');
```

## Ejemplo mínimo

```html
<iswc-docx-view src="contrato.docx" height="24em"></iswc-docx-view>
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
| `iswc-load` | `{ bytes }` u otro detalle del lector | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `body` | Documento. |
| `state` | El `<iswc-empty-state>` vacío o de error. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-empty-state` para los estados; mammoth por CDN.

## Accesibilidad

Conserva encabezados y listas que mammoth reconoce.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-docx-view');
el.addEventListener('iswc-error', () => avisar('No se pudo abrir'));
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.
- `content` admite data-URL o base64, no el texto del documento.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`docx-view.ts`](./docx-view.ts)
- [`docx-view.scss`](./docx-view.scss)
- [`docx-view.json`](./docx-view.json)
