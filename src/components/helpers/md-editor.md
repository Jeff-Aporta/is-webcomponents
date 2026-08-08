---
tag: is-md-editor
tags:
  - is-md-editor
category: helpers
status: public
source: ./md-editor.js
style: ./md-editor.css
preview: ../../previews/helpers/is-md-editor.json
---
# `<is-md-editor>`

## Propósito

Vista previa de solo lectura (markdown + HTML híbrido + chips `{{variable}}`) que al hacer clic, doble clic o Enter abre un `<is-dialog>` a pantalla completa para revisar (solo lectura) o editar (WYSIWYG + texto plano) el contenido. Port de la UX de `PromptBodyEditor` de PatyIA.

Este módulo registra `<is-md-editor>`.

## Cuándo usarlo

- Instrucciones/prompts con `{{variables}}` que hay que revisar o editar en un diálogo grande.
- Snippets generados (p. ej. `is-cdn-snippet`) que solo se revisan y copian, sin edición.
- Cualquier bloque de texto MD/HTML donde una vista embebida (siempre visible) sería demasiado alta.

## Cuándo no usarlo

- Solo pintar MD embebido (sin modal/tools): usar `<is-md-render>`.
- Edición ligera in-place: `<is-md-render can-edit>`.
- Formularios de texto corto: usar `<is-input>`/`<is-textarea>`.
- Rich text WYSIWYG de propósito general sin variables ni preview: usar `<is-rte>`.

## Importación

```js
import './md-editor.js';
```

## Ejemplo mínimo

```html
<is-md-editor
  label="Prompt del sistema"
  value="# Instrucción&#10;&#10;Eres un asistente que responde en **español**."
></is-md-editor>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Markdown/HTML fuente con `{{variables}}`. |
| `can-edit` | boolean | Habilita edición (toolbar, contenteditable, texto plano, botón Guardar). |
| `readonly` | boolean | Fuerza solo lectura aunque haya `can-edit`. |
| `label` | string | Título del diálogo (o usar el atributo global `title`). |
| `placeholder` | string | Texto cuando la vista previa está vacía. |
| `edit-block-reason` | string | Tooltip de la vista previa cuando no se puede editar. |
| `open` | boolean | Diálogo abierto (reflejado); ver `open()`/`close()`. |
| `api` | string (JSON) | Config `IsMdEditorApiConfig` (endpoints HTTP). |
| `src` | string | Atajo GET: equivale a `api.endpoints.get`. |
| `filename` | string | Nombre de archivo en el header del diálogo. |
| `fullscreen-scope` | `global` \| `local` | Ámbito del diálogo fullscreen. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Refleja el atributo `value`. |
| `canEdit` | lectura/escritura | Refleja `can-edit`. |
| `readonly` | lectura/escritura | Refleja `readonly`. |
| `label` | lectura/escritura | Refleja `label`. |
| `placeholder` | lectura/escritura | Refleja `placeholder`. |
| `editBlockReason` | lectura/escritura | Refleja `edit-block-reason`. |
| `api` | lectura/escritura | `IsMdEditorApiConfig` — persistencia por fetch. |
| `actions` | lectura/escritura | `IsMdEditorActions` — callbacks custom (JS only; prioridad sobre `api`/`src`). |
| `document` | lectura/escritura | Documento canónico (meta + content). |
| `src` / `filename` / `fullscreenScope` | lectura/escritura | Reflejan atributos. |

### Slots

No expone.

### Eventos

| Evento | Detail | Cuándo |
| --- | --- | --- |
| `is-change` | `{ value, document? }` | Al cerrar confirmando borrador — solo si `can-edit`. |
| `is-persist` | `{ value, document? }` | Al pulsar «Guardar» (y tras `actions.persist` / PUT remoto). |
| `is-load` | `{ document }` | Tras `load()` exitoso. |
| `is-error` | `{ action, error }` | Fallo en load/persist/delete. |
| `is-download` | `{ filename, bytes }` | Tras `download()`. |
| `is-open` | `{}` | Diálogo abierto. |
| `is-close` | `{}` | Diálogo cerrado. |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `open()` / `close()` | Abre / cierra el diálogo. |
| `load()` | `actions.load` → `src` / `api.endpoints.get`. |
| `persistRemote()` | `actions.persist` → PUT/POST de `api`. |
| `removeRemote()` | `actions.delete` → DELETE de `api`. |
| `setDocument(doc)` | Aplica documento canónico. |
| `download()` | Descarga el markdown actual. |

### CSS parts

| Part | Uso |
| --- | --- |
| `preview` | Contenedor de la vista previa (clic para abrir). |
| `preview-body` | Contenido renderizado (markdown + HTML + chips). |
| `preview-empty` | Texto de estado vacío. |
| `copy` | `<is-copy-button>` de la vista previa. |
| `dialog` | El `<is-dialog>` interno. |
| `dialog-label` | Título del diálogo. |
| `toolbar` | Barra de formato (solo si `can-edit`). |
| `toolbar-button` | Cada botón de la toolbar. |
| `plain-switch` | Switch «Texto plano». |
| `vars` / `vars-label` / `vars-list` | Tira de chips `{{variable}}`. |
| `surface` | Superficie editable/preview dentro del diálogo. |
| `plain` | `<textarea>` del modo texto plano. |
| `footer` / `footer-close` / `footer-discard` / `footer-save` | Pie del diálogo. |

### Custom states

No expone.

### CSS custom properties

| Propiedad | Notas |
| --- | --- |
| `--preview-max-height` | Alto máximo de la vista previa (default `16em`). |
| `--var-tone-h` | (por chip) tono hsl determinista derivado del nombre de la variable. |

### Integración con formularios

No es form-associated: es un visor/editor de contenido, no un control de formulario.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> `<is-md-editor>` — Web Component (vanilla, zero dependencias).
> Vista previa de solo lectura (markdown + HTML híbrido + chips `{{var}}`) que
> al hacer clic/doble clic/Enter abre un `<is-dialog>` a pantalla completa
> para revisar (modo solo lectura) o editar (modo WYSIWYG + texto plano).

Con `can-edit=false` (default): abrir el diálogo es solo revisión — sin toolbar, contenido no editable, «Guardar» deshabilitado; «Descartar»/«Cerrar» solo cierran. El botón de copiar de la vista previa funciona siempre, con o sin `can-edit`.

Con `can-edit`: el contenido es editable en modo WYSIWYG (contenteditable) con toolbar (deshacer/rehacer, negrita, cursiva, H1/H2, lista) y un switch «Texto plano» para editar el markdown fuente sin renderizar. Escribir `{{nombre}}` completo lo convierte automáticamente en chip de color determinista por nombre.

**Persistencia:** elige una vía.

1. **API HTTP** — `api` / `src` con `IsMdEditorApiConfig.endpoints`.
2. **Actions custom** — `el.actions = { load, persist, delete }` (prioridad sobre HTTP; útil sin app URL).
3. **Solo local** — sin `api` ni `actions`: Guardar emite `is-persist` y el host decide.

## Dependencias y componentes relacionados

- [`./md-render.md`](./md-render.md) (`<is-md-render>`) — render inline sin tools
- [`../layout/dialog.js`](../layout/dialog.js) (`<is-dialog>`)
- [`../actions/button.js`](../actions/button.js) (`<is-button>`)
- [`../actions/copy-button.js`](../actions/copy-button.js) (`<is-copy-button>`)
- [`../forms/switch.js`](../forms/switch.js) (`<is-switch>`)
- [`../media/icon.js`](../media/icon.js) (`<is-icon>`)
- [`./md-lite.js`](./md-lite.js) — `mdToHtml()`, markdown ligero sin dependencias npm.
- [`./md-editor-api.js`](./md-editor-api.js) + [`./md-editor-api.d.ts`](./md-editor-api.d.ts)
- [`../_shared/prompt-md.js`](../_shared/prompt-md.js) — variables `{{nombre}}` + render MD/HTML híbrido.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-md-editor>`.

## Accesibilidad

- La vista previa tiene `role="button"` y `tabindex="0"`; Enter/Espacio abren el diálogo.
- El diálogo hereda el manejo de foco, Escape y `aria-modal` de `<is-dialog>`.
- El surface editable usa `role="textbox"` y `aria-multiline="true"`.

## Ejemplo avanzado

```html
<is-md-editor id="tpl" can-edit label="Plantilla"></is-md-editor>
<script type="module">
  const el = document.getElementById('tpl');

  // Opción A — sin app URL: callbacks manuales
  el.actions = {
    async load() {
      return { content: localStorage.getItem('tpl') || 'Hola {{nombre}}', filename: 'tpl.md' };
    },
    async persist(doc) {
      localStorage.setItem('tpl', doc.content);
      return { ...doc, updatedAt: new Date().toISOString() };
    },
  };
  await el.load();

  // Opción B — API HTTP (alternativa)
  // el.api = { baseUrl: 'https://api.ejemplo.com', endpoints: { get: '/docs/1', put: '/docs/1' } };
  // await el.load();
</script>
```

## Errores comunes

- Usar el tag sin importar el módulo primero.
- Esperar que `Descartar` emita algún evento: no emite nada, solo cierra.
- Esperar edición con `can-edit` ausente: por defecto es solo lectura.
- Inventar una propiedad `open` de lectura/escritura: es un atributo reflejado + métodos `open()`/`close()`, no un accessor.
- Usar este tag solo para pintar MD embebido: preferir `<is-md-render>`.
- Copiar preview contra fuente actual; JS/CSS prevalecen.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./md-editor.js)
- [CSS](./md-editor.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-md-editor.json)
