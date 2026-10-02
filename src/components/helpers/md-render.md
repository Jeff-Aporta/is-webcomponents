---
tag: iswc-md-render
tags:
  - iswc-md-render
category: helpers
status: public
source: ./md-render.js
style: ./md-render.css
preview: ./md-render.json
---
# `<iswc-md-render>`

## Propósito

Render inline de markdown/HTML híbrido con chips `{{variable}}`. Sin toolbar, diálogo ni API. Con `can-edit` permite edición in-place (contenteditable).

Este módulo registra `<iswc-md-render>`.

## Cuándo usarlo

- Mostrar un bloque MD embebido en una página o card.
- Edición ligera inline sin herramientas de formato ni modal.
- Cuando el shell/app aporta sus propios botones Guardar.

## Cuándo no usarlo

- Editor con toolbar, fullscreen, CRUD o descarga: usar `<iswc-md-editor>`.
- Texto corto de formulario: `<iswc-input>` / `<iswc-textarea>`.

## Importación

```js
import './md-render.js';
```

## Ejemplo mínimo

```html
<iswc-md-render value="Hola **mundo** y {{nombre}}."></iswc-md-render>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Markdown/HTML fuente con `{{variables}}`. |
| `can-edit` | boolean | Edición in-place (contenteditable). |
| `readonly` | boolean | Fuerza solo lectura aunque haya `can-edit`. |
| `placeholder` | string | Texto cuando está vacío (solo lectura). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Refleja el atributo `value`. |
| `canEdit` | lectura/escritura | Refleja `can-edit`. |
| `readonly` | lectura/escritura | Refleja `readonly`. |
| `placeholder` | lectura/escritura | Refleja `placeholder`. |

### Slots

No expone. Hidrata desde hijo `<script type="text/markdown">` o `<textarea hidden data-md-source>` si no hay `value`.

### Eventos

| Evento | Detail | Cuándo |
| --- | --- | --- |
| `iswc-input` | `{ value }` | Cada cambio en edición (borrador). |
| `iswc-change` | `{ value }` | Al blur si el valor cambió (o Ctrl/Cmd+S). |
| `iswc-persist` | `{ value }` | Ctrl/Cmd+S — señal para que el host guarde. |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `refresh()` | Re-render desde `value` (descarta borrador sucio). |

### CSS parts

| Part | Uso |
| --- | --- |
| `body` | Contenedor renderizado / editable. |
| `empty` | Placeholder vacío. |

### Custom states

No expone. El host refleja `editable` cuando `can-edit` está activo y no hay `readonly`.

### CSS custom properties

Usa tokens `--iswc-text`, `--iswc-code-bg`, `--iswc-border`, `--iswc-focus`, etc. Por chip: `--var-tone-h`.

### Integración con formularios

No es form-associated.

## Comportamiento

Solo lectura por defecto. Con `can-edit`: surface contenteditable, chips `{{var}}` al escribir el token completo, atajos Ctrl/Cmd+B/I. Sin toolbar ni modal.

Tras pintar el HTML:

1. Detecta tags `is-*` y marcadores `.md-iswc-code` en el contenido.
2. Llama `ISWebComponentsLoader.ensure(tag)` **solo** para lo que hace falta (si `has(tag)` ya, no pide red).
3. Sustituye fences/inline por `<iswc-code>`:
   - inline (`tono`) → `theme="brand-mono"` (sin fondo, un tono)
   - bloque (```lang) → preset dark/light completo (sintaxis coloreada)
4. Fences ` ```iswc-<diagrama> ` + JSON → `<iswc-flowchart|… color="viewer">` en solo lectura.

El loader deduplica módulos (`importOnce` + Cache Storage) y cachea CSS en IndexedDB (`iswc-wc-assets`).

## Dependencias y componentes relacionados

- [`./md-lite.js`](./md-lite.js) — vía `prompt-md` (MD → HTML + fences).
- [`./md-hydrate.js`](./md-hydrate.js) — lazy ensure + upgrade iswc-code.
- [`./md-iswc-fences.js`](./md-iswc-fences.js) — mapa `iswc-*` → tag.
- [`../_shared/prompt-md.js`](../_shared/prompt-md.js)
- [`./md-editor.md`](./md-editor.md) — editor completo con herramientas y API.

## Accesibilidad

- Solo lectura: `role="article"`.
- Editable: `role="textbox"` + `aria-multiline="true"`; foco visible.

## Ejemplo avanzado

```html
<iswc-md-render id="note" can-edit placeholder="Escribe…">
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

- Esperar toolbar o diálogo: eso es `<iswc-md-editor>`.
- Esperar CRUD/`src`/`api`: no existen aquí; el host escucha `iswc-persist` / `iswc-change`.

## Reglas para LLM

- Render/preview embebido → `<iswc-md-render>`. Editor con tools/API → `<iswc-md-editor>`.
- No inventar props de API en este tag.

## Fuentes

- [JavaScript](./md-render.js)
- [CSS](./md-render.css)
- [Índice de categoría](./LLM.md)
- [Preview](./md-render.json)
