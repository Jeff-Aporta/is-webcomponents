---
tag: is-md-render
tags:
  - is-md-render
category: helpers
status: public
source: ./md-render.js
style: ./md-render.css
preview: ../../previews/helpers/is-md-render.json
---
# `<is-md-render>`

## Propósito

Render inline de markdown/HTML híbrido con chips `{{variable}}`. Sin toolbar, diálogo ni API. Con `can-edit` permite edición in-place (contenteditable).

Este módulo registra `<is-md-render>`.

## Cuándo usarlo

- Mostrar un bloque MD embebido en una página o card.
- Edición ligera inline sin herramientas de formato ni modal.
- Cuando el shell/app aporta sus propios botones Guardar.

## Cuándo no usarlo

- Editor con toolbar, fullscreen, CRUD o descarga: usar `<is-md-editor>`.
- Texto corto de formulario: `<is-input>` / `<is-textarea>`.

## Importación

```js
import './md-render.js';
```

## Ejemplo mínimo

```html
<is-md-render value="Hola **mundo** y {{nombre}}."></is-md-render>
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
| `is-input` | `{ value }` | Cada cambio en edición (borrador). |
| `is-change` | `{ value }` | Al blur si el valor cambió (o Ctrl/Cmd+S). |
| `is-persist` | `{ value }` | Ctrl/Cmd+S — señal para que el host guarde. |

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

Usa tokens `--is-text`, `--is-code-bg`, `--is-border`, `--is-focus`, etc. Por chip: `--var-tone-h`.

### Integración con formularios

No es form-associated.

## Comportamiento

Solo lectura por defecto. Con `can-edit`: surface contenteditable, chips `{{var}}` al escribir el token completo, atajos Ctrl/Cmd+B/I. Sin toolbar ni modal.

## Dependencias y componentes relacionados

- [`./md-lite.js`](./md-lite.js) — vía `prompt-md`.
- [`../_shared/prompt-md.js`](../_shared/prompt-md.js)
- [`./md-editor.md`](./md-editor.md) — editor completo con herramientas y API.

## Accesibilidad

- Solo lectura: `role="article"`.
- Editable: `role="textbox"` + `aria-multiline="true"`; foco visible.

## Ejemplo avanzado

```html
<is-md-render id="note" can-edit placeholder="Escribe…">
  <script type="text/markdown">
Notas de **{{proyecto}}**.
  </script>
</is-md-render>
<script type="module">
  const el = document.getElementById('note');
  el.addEventListener('is-persist', (e) => console.log('guardar', e.detail.value));
</script>
```

## Errores comunes

- Esperar toolbar o diálogo: eso es `<is-md-editor>`.
- Esperar CRUD/`src`/`api`: no existen aquí; el host escucha `is-persist` / `is-change`.

## Reglas para LLM

- Render/preview embebido → `<is-md-render>`. Editor con tools/API → `<is-md-editor>`.
- No inventar props de API en este tag.

## Fuentes

- [JavaScript](./md-render.js)
- [CSS](./md-render.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-md-render.json)
