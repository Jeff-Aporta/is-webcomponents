---
tag: iswc-md-render
tags:
  - iswc-md-render
category: helpers
status: public
source: ./md-render.ts
style: ./md-render.css
preview: ./md-render.json
---
# `<iswc-md-render>`

## PropÃ³sito

Render inline de markdown/HTML hÃ­brido con chips `{{variable}}`. Sin toolbar, diÃ¡logo ni API. Con `can-edit` permite ediciÃ³n in-place (contenteditable).

Este mÃ³dulo registra `<iswc-md-render>`.

## CuÃ¡ndo usarlo

- Mostrar un bloque MD embebido en una pÃ¡gina o card.
- EdiciÃ³n ligera inline sin herramientas de formato ni modal.
- Cuando el shell/app aporta sus propios botones Guardar.

## CuÃ¡ndo no usarlo

- Editor con toolbar, fullscreen, CRUD o descarga: usar `<iswc-md-editor>`.
- Texto corto de formulario: `<iswc-input>` / `<iswc-textarea>`.

## ImportaciÃ³n

```js
import './md-render.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-md-render value="Hola **mundo** y {{nombre}}."></iswc-md-render>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Markdown/HTML fuente con `{{variables}}`. |
| `can-edit` | boolean | EdiciÃ³n in-place (contenteditable). |
| `readonly` | boolean | Fuerza solo lectura aunque haya `can-edit`. |
| `placeholder` | string | Texto cuando estÃ¡ vacÃ­o (solo lectura). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Refleja el atributo `value`. |
| `canEdit` | lectura/escritura | Refleja `can-edit`. |
| `readonly` | lectura/escritura | Refleja `readonly`. |
| `placeholder` | lectura/escritura | Refleja `placeholder`. |

### Slots

No expone. Hidrata desde hijo `<script type="text/markdown">` o `<textarea hidden data-md-source>` si no hay `value`.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-persist` | Evento personalizado del componente (persist). |

| Evento | Detail | CuÃ¡ndo |
| --- | --- | --- |
| `iswc-input` | `{ value }` | Cada cambio en ediciÃ³n (borrador). |
| `iswc-change` | `{ value }` | Al blur si el valor cambiÃ³ (o Ctrl/Cmd+S). |
| `iswc-persist` | `{ value }` | Ctrl/Cmd+S â€” seÃ±al para que el host guarde. |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-md-render');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Notas |
| --- | --- |
| `refresh()` | Re-render desde `value` (descarta borrador sucio). |

### CSS parts

| Part | Uso |
| --- | --- |
| `body` | Contenedor renderizado / editable. |
| `empty` | Placeholder vacÃ­o. |

### Custom states

No expone. El host refleja `editable` cuando `can-edit` estÃ¡ activo y no hay `readonly`.

### CSS custom properties

Usa tokens `--iswc-text`, `--iswc-code-bg`, `--iswc-border`, `--iswc-focus`, etc. Por chip: `--var-tone-h`.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

Solo lectura por defecto. Con `can-edit`: surface contenteditable, chips `{{var}}` al escribir el token completo, atajos Ctrl/Cmd+B/I. Sin toolbar ni modal.

Tras pintar el HTML:

1. Detecta tags `is-*` y marcadores `.md-iswc-code` en el contenido.
2. Llama `ISWebComponentsLoader.ensure(tag)` **solo** para lo que hace falta (si `has(tag)` ya, no pide red).
3. Sustituye fences/inline por `<iswc-code>`:
   - inline (`tono`) â†’ `theme="brand-mono"` (sin fondo, un tono)
   - bloque (```lang) â†’ preset dark/light completo (sintaxis coloreada)
4. Fences ` ```iswc-<diagrama> ` + JSON â†’ `<iswc-flowchart|â€¦ color="viewer">` en solo lectura.

El loader deduplica mÃ³dulos (`importOnce` + Cache Storage) y cachea CSS en IndexedDB (`iswc-wc-assets`).

## Dependencias y componentes relacionados

- [`./md-lite.js`](./md-lite.js) â€” vÃ­a `prompt-md` (MD â†’ HTML + fences).
- [`./md-hydrate.js`](./md-hydrate.js) â€” lazy ensure + upgrade iswc-code.
- [`./md-iswc-fences.js`](./md-iswc-fences.js) â€” mapa `iswc-*` â†’ tag.
- [`../_shared/prompt-md.js`](../_shared/prompt-md.js)
- [`./md-editor.md`](./md-editor.md) â€” editor completo con herramientas y API.

## Accesibilidad

- Solo lectura: `role="article"`.
- Editable: `role="textbox"` + `aria-multiline="true"`; foco visible.

## Ejemplo avanzado

```html
<iswc-md-render id="note" can-edit placeholder="Escribeâ€¦">
  <script type="text/markdown">
Notas de **{{proyecto}}**.
  </script>
</iswc-md-render>
<script type="module">
  const el = document.getElementById('note');
  el.addEventListener('iswc-persist', (e) => console.log('guardar', e.detail.value));
</script>
```

## Errores comunes

- Esperar toolbar o diÃ¡logo: eso es `<iswc-md-editor>`.
- Esperar CRUD/`src`/`api`: no existen aquÃ­; el host escucha `iswc-persist` / `iswc-change`.

## Reglas para LLM

- Render/preview embebido â†’ `<iswc-md-render>`. Editor con tools/API â†’ `<iswc-md-editor>`.
- No inventar props de API en este tag.

## Fuentes

- [JavaScript](./md-render.ts)
- [CSS](./md-render.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./md-render.json)
