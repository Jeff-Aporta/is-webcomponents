---
tag: iswc-md-editor
tags:
  - iswc-md-editor
category: helpers
status: public
source: ./md-editor.ts
style: ./md-editor.css
preview: ./md-editor.json
---
# `<iswc-md-editor>`

## PropÃ³sito

Vista previa de solo lectura (markdown + HTML hÃ­brido + chips `{{variable}}`) que al hacer clic, doble clic o Enter abre un `<iswc-dialog>` a pantalla completa para revisar (solo lectura) o editar (WYSIWYG + texto plano) el contenido. Port de la UX de `PromptBodyEditor` de PatyIA.

Este mÃ³dulo registra `<iswc-md-editor>`.

## CuÃ¡ndo usarlo

- Instrucciones/prompts con `{{variables}}` que hay que revisar o editar en un diÃ¡logo grande.
- Snippets generados (p. ej. `iswc-cdn-snippet`) que solo se revisan y copian, sin ediciÃ³n.
- Cualquier bloque de texto MD/HTML donde una vista embebida (siempre visible) serÃ­a demasiado alta.

## CuÃ¡ndo no usarlo

- Solo pintar MD embebido (sin modal/tools): usar `<iswc-md-render>`.
- EdiciÃ³n ligera in-place: `<iswc-md-render can-edit>`.
- Formularios de texto corto: usar `<iswc-input>`/`<iswc-textarea>`.
- Rich text WYSIWYG de propÃ³sito general sin variables ni preview: usar `<iswc-rte>`.

## ImportaciÃ³n

```js
import './md-editor.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-md-editor
  label="Prompt del sistema"
  value="# InstrucciÃ³n&#10;&#10;Eres un asistente que responde en **espaÃ±ol**."
></iswc-md-editor>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Markdown/HTML fuente con `{{variables}}`. |
| `can-edit` | boolean | Habilita ediciÃ³n (toolbar, contenteditable, texto plano, botÃ³n Guardar). |
| `readonly` | boolean | Fuerza solo lectura aunque haya `can-edit`. |
| `label` | string | TÃ­tulo del diÃ¡logo (o usar el atributo global `title`). |
| `placeholder` | string | Texto cuando la vista previa estÃ¡ vacÃ­a. |
| `edit-block-reason` | string | Tooltip de la vista previa cuando no se puede editar. |
| `open` | boolean | DiÃ¡logo abierto (reflejado); ver `open()`/`close()`. |
| `api` | string (JSON) | Config `IsMdEditorApiConfig` (endpoints HTTP). |
| `src` | string | Atajo GET: equivale a `api.endpoints.get`. |
| `filename` | string | Nombre de archivo en el header del diÃ¡logo. |
| `fullscreen-scope` | `global` \| `local` | Ãmbito del diÃ¡logo fullscreen. |
| `fill` | boolean | El preview estira al 100% del alto del padre (paneles flex / splits). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Refleja el atributo `value`. |
| `canEdit` | lectura/escritura | Refleja `can-edit`. |
| `readonly` | lectura/escritura | Refleja `readonly`. |
| `label` | lectura/escritura | Refleja `label`. |
| `placeholder` | lectura/escritura | Refleja `placeholder`. |
| `editBlockReason` | lectura/escritura | Refleja `edit-block-reason`. |
| `api` | lectura/escritura | `IsMdEditorApiConfig` â€” persistencia por fetch. |
| `actions` | lectura/escritura | `IsMdEditorActions` â€” callbacks custom (JS only; prioridad sobre `api`/`src`). |
| `document` | lectura/escritura | Documento canÃ³nico (meta + content). |
| `src` / `filename` / `fullscreenScope` | lectura/escritura | Reflejan atributos. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-persist` | Evento personalizado del componente (persist). |
| `iswc-load` | Emitido cuando el recurso se ha cargado. |
| `iswc-error` | Emitido cuando se produce un error. |
| `iswc-download` | Emitido al iniciar una descarga. |
| `iswc-open` | Evento personalizado del componente (open). |
| `iswc-close` | Evento personalizado del componente (close). |

| Evento | Detail | CuÃ¡ndo |
| --- | --- | --- |
| `iswc-change` | `{ value, document? }` | Al cerrar confirmando borrador â€” solo si `can-edit`. |
| `iswc-persist` | `{ value, document? }` | Al pulsar Â«GuardarÂ» (y tras `actions.persist` / PUT remoto). |
| `iswc-load` | `{ document }` | Tras `load()` exitoso. |
| `iswc-error` | `{ action, error }` | Fallo en load/persist/delete. |
| `iswc-download` | `{ filename, bytes }` | Tras `download()`. |
| `iswc-open` | `{}` | DiÃ¡logo abierto. |
| `iswc-close` | `{}` | DiÃ¡logo cerrado. |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-md-editor');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Notas |
| --- | --- |
| `open()` / `close()` | Abre / cierra el diÃ¡logo. |
| `load()` | `actions.load` â†’ `src` / `api.endpoints.get`. |
| `persistRemote()` | `actions.persist` â†’ PUT/POST de `api`. |
| `removeRemote()` | `actions.delete` â†’ DELETE de `api`. |
| `setDocument(doc)` | Aplica documento canÃ³nico. |
| `download()` | Descarga el markdown actual. |

### CSS parts

| Part | Uso |
| --- | --- |
| `preview` | Contenedor de la vista previa (clic para abrir). |
| `preview-body` | Contenido renderizado (markdown + HTML + chips). |
| `preview-empty` | Texto de estado vacÃ­o. |
| `copy` | `<iswc-copy-button>` de la vista previa. |
| `dialog` | El `<iswc-dialog>` interno. |
| `dialog-label` | TÃ­tulo del diÃ¡logo. |
| `toolbar` | Barra de formato (solo si `can-edit`). |
| `toolbar-button` | Cada botÃ³n de la toolbar. |
| `plain-switch` | Switch Â«Texto planoÂ». |
| `vars` / `vars-label` / `vars-list` | Tira de chips `{{variable}}`. |
| `surface` | Superficie editable/preview dentro del diÃ¡logo. |
| `plain` | `<textarea>` del modo texto plano. |
| `footer` / `footer-close` / `footer-discard` / `footer-save` | Pie del diÃ¡logo. |
| `dialog-filename` | SubtÃ­tulo del diÃ¡logo con el nombre del archivo. |
| `footer` | Pie del diÃ¡logo. |
| `footer-discard` | BotÃ³n Â«DescartarÂ» del pie. |
| `footer-download` | BotÃ³n Â«DescargarÂ» del pie. |
| `footer-meta` | Metadatos del archivo en el pie (tamaÃ±o, fecha, etc.). |
| `footer-save` | BotÃ³n Â«GuardarÂ» del pie. |
| `vars` | SecciÃ³n de variables detectadas en el markdown. |
| `vars-label` | TÃ­tulo de la secciÃ³n de variables. |
| `vars-list` | Lista de variables detectadas. |

### Custom states

No expone.

### CSS custom properties

| Propiedad | Notas |
| --- | --- |
| `--preview-max-height` | Alto mÃ¡ximo de la vista previa (default `16em`). |
| `--var-tone-h` | (por chip) tono hsl determinista derivado del nombre de la variable. |

### IntegraciÃ³n con formularios

No es form-associated: es un visor/editor de contenido, no un control de formulario.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> `<iswc-md-editor>` â€” Web Component (vanilla, zero dependencias).
> Vista previa de solo lectura (markdown + HTML hÃ­brido + chips `{{var}}`) que
> al hacer clic/doble clic/Enter abre un `<iswc-dialog>` a pantalla completa
> para revisar (modo solo lectura) o editar (modo WYSIWYG + texto plano).

Con `can-edit=false` (default): abrir el diÃ¡logo es solo revisiÃ³n â€” sin toolbar, contenido no editable, Â«GuardarÂ» deshabilitado; Â«DescartarÂ»/Â«CerrarÂ» solo cierran. El botÃ³n de copiar de la vista previa funciona siempre, con o sin `can-edit`.

Con `can-edit`: el contenido es editable en modo WYSIWYG (contenteditable) con toolbar (deshacer/rehacer, negrita, cursiva, H1/H2, lista) y un switch Â«Texto planoÂ» para editar el markdown fuente sin renderizar. Escribir `{{nombre}}` completo lo convierte automÃ¡ticamente en chip de color determinista por nombre.

El **preview** (y la superficie readonly del diÃ¡logo) usa el mismo hydrate que `<iswc-md-render>`: fences/`inline` â†’ `iswc-code`, ` ```iswc-* ` â†’ diagramas viewer, HTML `is-*` con `ensure` lazy. Clic en embeds no abre el diÃ¡logo.

**Persistencia:** elige una vÃ­a.

1. **API HTTP** â€” `api` / `src` con `IsMdEditorApiConfig.endpoints`.
2. **Actions custom** â€” `el.actions = { load, persist, delete }` (prioridad sobre HTTP; Ãºtil sin app URL).
3. **Solo local** â€” sin `api` ni `actions`: Guardar emite `iswc-persist` y el host decide.

## Dependencias y componentes relacionados

- [`./md-render.md`](./md-render.md) (`<iswc-md-render>`) â€” render inline sin tools
- [`./md-hydrate.js`](./md-hydrate.js) â€” lazy ensure + upgrade iswc-code / diagramas
- [`./md-iswc-fences.js`](./md-iswc-fences.js) â€” mapa `iswc-*` â†’ tag
- [`../layout/dialog.js`](../layout/dialog.js) (`<iswc-dialog>`)
- [`../actions/button.js`](../actions/button.js) (`<iswc-button>`)
- [`../actions/copy-button.js`](../actions/copy-button.js) (`<iswc-copy-button>`)
- [`../forms/switch.js`](../forms/switch.js) (`<iswc-switch>`)
- [`../media/icon.js`](../media/icon.js) (`<iswc-icon>`)
- [`./md-lite.js`](./md-lite.js) â€” `mdToHtml()`, markdown ligero sin dependencias npm.
- [`./md-editor-api.js`](./md-editor-api.js) + [`./md-editor-api.d.ts`](./md-editor-api.d.ts)
- [`../_shared/prompt-md.js`](../_shared/prompt-md.js) â€” variables `{{nombre}}` + render MD/HTML hÃ­brido.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-md-editor>`.

## Accesibilidad

- La vista previa tiene `role="button"` y `tabindex="0"`; Enter/Espacio abren el diÃ¡logo.
- El diÃ¡logo hereda el manejo de foco, Escape y `aria-modal` de `<iswc-dialog>`.
- El surface editable usa `role="textbox"` y `aria-multiline="true"`.

## Ejemplo avanzado

```html
<iswc-md-editor id="tpl" can-edit label="Plantilla"></iswc-md-editor>
<script type="module">
  const el = document.getElementById('tpl');

  // OpciÃ³n A â€” sin app URL: callbacks manuales
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

  // OpciÃ³n B â€” API HTTP (alternativa)
  // el.api = { baseUrl: 'https://api.ejemplo.com', endpoints: { get: '/docs/1', put: '/docs/1' } };
  // await el.load();
</script>
```

## Errores comunes

- Usar el tag sin importar el mÃ³dulo primero.
- Esperar que `Descartar` emita algÃºn evento: no emite nada, solo cierra.
- Esperar ediciÃ³n con `can-edit` ausente: por defecto es solo lectura.
- Inventar una propiedad `open` de lectura/escritura: es un atributo reflejado + mÃ©todos `open()`/`close()`, no un accessor.
- Usar este tag solo para pintar MD embebido: preferir `<iswc-md-render>`.
- Copiar preview contra fuente actual; JS/CSS prevalecen.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./md-editor.ts)
- [CSS](./md-editor.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./md-editor.json)
