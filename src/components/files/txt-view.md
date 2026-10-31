---
tag: iswc-txt-view
tags:
  - iswc-txt-view
category: files
status: public
source: ./txt-view.ts
style: ./txt-view.scss
preview: ./txt-view.json
---
# `<iswc-txt-view>`

## Propósito

Muestra un archivo de texto plano en monoespaciada, con saltos respetados y estado vacío o de error.

## Cuándo usarlo

- Ver un `.txt`, un log o cualquier texto sin formato.

## Cuándo no usarlo

- Código con resaltado: `iswc-code`.
- Markdown: `iswc-md-render`.
- Editarlo: `iswc-txt-edit`.

## Importación

```js
await iswcLoader.load('iswc-txt-view');
```

## Ejemplo mínimo

```html
<iswc-txt-view content="Hola desde content" height="12em"></iswc-txt-view>
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
| `height` | lectura/escritura | Refleja el atributo. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-load` | `{ bytes }` | El contenido quedó pintado. |
| `iswc-error` | `{ reason }` | Falló la carga; `reason` es `fetch` u otro motivo del lector. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `body` | Texto. |
| `empty` | Caja del estado vacío o de error. |
| `state` | El `<iswc-empty-state>` de ese estado. |

## Comportamiento

- Si llegan `src` y `content`, gana `content`.
- Cada cambio de atributo recarga; una respuesta vieja se descarta.
- Vacío y error se pintan con `<iswc-empty-state>`.

## Dependencias y componentes relacionados

`iswc-empty-state` para los estados.

## Accesibilidad

El texto es seleccionable; los estados los anuncia `iswc-empty-state`.

## Ejemplo avanzado

```js
const el = document.querySelector('iswc-txt-view');
el.addEventListener('iswc-load', (e) => console.log(e.detail.bytes));
el.src = 'notas.txt';
```

## Errores comunes

- `height` usa unidades relativas al contexto: `14em`, no `px` ni `rem`.
- `src` de otro origen necesita CORS.

## Reglas para LLM

- No inventar atributos: solo los de esta ficha.
- Escuchar `iswc-error` cuando el archivo viene de una URL.

## Fuentes

- [`txt-view.ts`](./txt-view.ts)
- [`txt-view.scss`](./txt-view.scss)
- [`txt-view.json`](./txt-view.json)
