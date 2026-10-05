---
tag: iswc-doc-editor
tags:
  - iswc-doc-editor
category: forms
status: public
source: ./doc-editor.ts
style: ./doc-editor.css
preview: ./doc-editor.json
---
# `<iswc-doc-editor>`

## PropÃ³sito

Editor de documento por bloques al estilo Notion. Cada bloque es un
`contenteditable` independiente con uno de diez tipos: `paragraph`,
`heading-1`, `heading-2`, `heading-3`, `bullet-list`, `todo`,
`numbered-list`, `quote`, `code` o `divider`. El menÃº de tipos se abre
escribiendo `/` en un bloque vacÃ­o.

Este mÃ³dulo registra `<iswc-doc-editor>`.

## CuÃ¡ndo usarlo

Cuando el usuario necesita redactar contenido estructurado y libre â€”
notas internas, descripciones largas de un producto, observaciones de una
operaciÃ³n â€” y el resultado se guarda como JSON de bloques, no como HTML.

## CuÃ¡ndo no usarlo

- Para texto plano de una o pocas lÃ­neas: usa `<iswc-textarea>` o un
  `<textarea>` nativo.
- Dentro de un `<form>` esperando que el contenido se envÃ­e solo: **no es
  form-associated** (ver [IntegraciÃ³n con formularios](#integraciÃ³n-con-formularios)).
- Para HTML enriquecido con negrita, cursiva o enlaces en lÃ­nea: el
  componente guarda `textContent` plano por bloque, sin formato inline.

## ImportaciÃ³n

```js
import './doc-editor.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-doc-editor placeholder="Escribe algoâ€¦"></iswc-doc-editor>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | DescripciÃ³n |
| --- | --- | --- | --- |
| `value` | string (JSON) | *(sin valor)* | Array de bloques serializado: `[{ "type": "â€¦", "text": "â€¦", "checked": false }]`. Si falta, se lee el `<script type="application/json">` del light DOM; si tampoco existe, arranca con un Ãºnico bloque `paragraph` vacÃ­o. |
| `placeholder` | string | *(sin efecto)* | Declarado en `observedAttributes` pero **nunca leÃ­do** por la implementaciÃ³n. El texto de placeholder de cada bloque viene fijo de la tabla `TYPES` (`Escribe algoâ€¦`, `TÃ­tulo 1`, `Item`, `Hacerâ€¦`, `Citaâ€¦`, `CÃ³digoâ€¦`). |

Cambiar cualquiera de los dos atributos despuÃ©s del montaje vuelve a parsear
el contenido y **re-renderiza el documento entero**, descartando la ediciÃ³n
en curso.

#### Propiedades pÃºblicas

| Propiedad | Acceso | Tipo | DescripciÃ³n |
| --- | --- | --- | --- |
| `value` | lectura/escritura | string (getter) / string \| array (setter) | El getter devuelve `JSON.stringify` del array de bloques (una **cadena**, no un array). El setter acepta cadena o array y lo refleja al atributo `value`. |
| `blocks` | solo lectura | `Array<{id, type, text, checked}>` | Array vivo interno. Mutarlo no re-renderiza; Ãºsalo solo para leer. |

Cada bloque tiene `id` (generado con `crypto.randomUUID()` o un fallback
`b<timestamp>_<i>`), `type`, `text` y `checked` (solo relevante en `todo`).

### Slots

No expone. El shadow root no contiene ningÃºn `<slot>`, asÃ­ que el contenido
en light DOM **no se proyecta**. El Ãºnico uso del light DOM es la semilla
declarativa:

```html
<iswc-doc-editor>
  <script type="application/json">
    [{ "type": "heading-1", "text": "Acta de reuniÃ³n" }]
  </script>
</iswc-doc-editor>
```

La cabecera del `.js` documenta un slot `default`; no existe en el cÃ³digo.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-focus` | Emitido cuando el componente recibe foco. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | `{ blocks }` â€” copia profunda (`structuredClone`) del array de bloques | sÃ­ | sÃ­ | no |
| `iswc-focus` | `{ id }` â€” id del bloque que recibiÃ³ el foco | sÃ­ | sÃ­ | no |

`iswc-change` se emite en cada tecla escrita dentro de un bloque y al marcar o
desmarcar un `todo`. **No** se emite al crear un bloque con Enter, al
borrarlo con Backspace ni al cambiar su tipo desde el menÃº `/`.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-doc-editor');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone mÃ©todos.

La cabecera del `.js` documenta `addBlock(type, after?)`, `removeBlock(id)` y
`updateBlock(id, { text, checked })`. **Ninguno estÃ¡ implementado**: llamarlos
lanza `TypeError`. Para modificar el documento por cÃ³digo, asigna `value`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor externo con borde, fondo y `min-height: 14rem`. |
| `blocks` | Columna flex que contiene todos los bloques. |
| `menu` | Popover del menÃº de tipos que abre `/`. |

Los bloques individuales no exponen `part`; se estilan desde fuera solo a
travÃ©s de `::part(blocks)` y sus tokens.

### Custom states

No expone. El componente no usa `ElementInternals`, asÃ­ que no hay
`:state()`. El estado interno viaja por clases del shadow DOM
(`.block-<tipo>`, `.iswc-checked`), no accesibles desde el light DOM.

### CSS custom properties

Tokens que el `.css` lee realmente:

| Token | Uso |
| --- | --- |
| `--iswc-text` | Color del texto del editor y base del fondo del bloque `code`. |
| `--iswc-control-border` | Color del borde del contenedor; cae a `--iswc-border`. |
| `--iswc-border` | Borde por defecto del contenedor y del menÃº de tipos. |
| `--iswc-control-radius` | Radio del contenedor; default `8px`. |
| `--iswc-bg-elev` | Fondo del contenedor y del menÃº de tipos. |
| `--iswc-accent` | Realce del bloque enfocado, barra de la cita y hover del menÃº. |
| `--iswc-text-soft` | Color del placeholder, de la cita y del texto tachado. |
| `--iswc-border-soft` | LÃ­nea del bloque `divider`. |
| `--iswc-radius` | Radio del menÃº de tipos; default `8px`. |

### IntegraciÃ³n con formularios

**No participa en formularios.** El componente no declara
`static formAssociated`, no llama a `attachInternals()` ni a `setFormValue()`,
y no acepta `name`, `required` ni `disabled`. Colocarlo dentro de un `<form>`
no aporta nada al `FormData` del envÃ­o y `form.reset()` no lo limpia.

Para enviarlo, copia el contenido a un campo oculto:

```html
<form id="acta">
  <iswc-doc-editor id="doc"></iswc-doc-editor>
  <input type="hidden" name="contenido" id="oculto" />
</form>

<script type="module">
  const doc = document.getElementById('doc');
  const oculto = document.getElementById('oculto');
  doc.addEventListener('iswc-change', () => { oculto.value = doc.value; });
</script>
```

## Comportamiento

- **Enter** (sin Shift) crea un bloque nuevo debajo del mismo tipo y lo
  enfoca. Desde un `divider` el bloque nuevo es `paragraph`.
- **Shift+Enter** deja pasar el salto de lÃ­nea nativo dentro del bloque.
- **Backspace** en un bloque vacÃ­o lo elimina y enfoca el anterior. Nunca
  elimina el Ãºltimo bloque que queda.
- **`/`** abre el menÃº de tipos junto al bloque. Al elegir un tipo, el bloque
  cambia de tipo y **se borra su texto**.
- **Escape** cierra el menÃº; un `pointerdown` fuera del componente tambiÃ©n.
- Cada creaciÃ³n, borrado o cambio de tipo vuelve a renderizar todo el
  documento y reenfoca por `id` en el siguiente `requestAnimationFrame`.

Detalles del `/`: la condiciÃ³n usa `el.selectionStart`, propiedad que un
elemento `contenteditable` no tiene (es `undefined`). El resultado prÃ¡ctico es
que `/` abre el menÃº solo cuando **todo** el bloque estÃ¡ vacÃ­o, no cuando el
cursor estÃ¡ al inicio de un bloque con texto.

Los atajos **Tab / Shift+Tab para indentar** que anuncia la cabecera del `.js`
no estÃ¡n implementados: Tab mueve el foco con el comportamiento nativo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del mÃ³dulo: `<iswc-doc-editor>`.

## Accesibilidad

- Cada bloque es un `contenteditable="true"`, foco por Tab en orden de
  documento. Los `todo` anteponen un `<input type="checkbox">` nativo,
  navegable y accionable con teclado.
- El editor **no** declara `role="textbox"` ni `aria-multiline`, y los
  bloques no llevan etiqueta accesible propia: un lector de pantalla anuncia
  el elemento subyacente (`h1`, `p`, `li`, `blockquote`, `pre`).
- El placeholder se pinta con `content: attr(data-placeholder)` en un
  pseudo-elemento, asÃ­ que **no lo lee** la tecnologÃ­a asistiva.
- El menÃº de tipos es una lista de `<button type="button">` sin `role="menu"`
  ni navegaciÃ³n con flechas; se opera con Tab y Enter, y se cierra con Escape.

Si la accesibilidad del editor es un requisito duro del proyecto, aÃ±ade
`role` y etiquetas desde el consumidor sobre el elemento host.

## Ejemplo avanzado

```html
<iswc-doc-editor id="acta">
  <script type="application/json">
    [
      { "type": "heading-1",    "text": "Acta de comitÃ©" },
      { "type": "paragraph",    "text": "ReuniÃ³n de cierre contable." },
      { "type": "todo",         "text": "Conciliar bancos", "checked": true },
      { "type": "todo",         "text": "Revisar cartera vencida" },
      { "type": "divider" },
      { "type": "quote",        "text": "Cerrar antes del dÃ­a 5." },
      { "type": "code",         "text": "SELECT * FROM movimientos;" }
    ]
  </script>
</iswc-doc-editor>

<script type="module">
  import './doc-editor.js';

  const acta = document.getElementById('acta');

  acta.addEventListener('iswc-change', (e) => {
    const pendientes = e.detail.blocks
      .filter((b) => b.type === 'todo' && !b.checked)
      .map((b) => b.text);
    console.log('Pendientes:', pendientes);
  });

  acta.addEventListener('iswc-focus', (e) => {
    console.log('Bloque activo:', e.detail.id);
  });

  // Reemplazar el documento por cÃ³digo (esto re-renderiza todo).
  acta.value = [{ type: 'paragraph', text: 'Documento nuevo' }];
</script>
```

## Errores comunes

- Esperar que `doc.value` devuelva un array: devuelve una **cadena JSON**.
  Usa `JSON.parse(doc.value)` o lee `doc.blocks`.
- Llamar a `addBlock()`, `removeBlock()` o `updateBlock()` porque aparecen en
  la cabecera del `.js`: no existen.
- Poner `placeholder="â€¦"` esperando ver ese texto: el atributo se observa pero
  no se usa.
- Poner el componente en un `<form>` y esperar que se envÃ­e: no es
  form-associated.
- Escribir contenido en light DOM sin envolverlo en
  `<script type="application/json">`: no hay slot, no se ve nada.
- Reasignar `value` mientras el usuario escribe: descarta la ediciÃ³n en curso
  y pierde el foco.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- `value` es cadena JSON al leer; array o cadena al escribir. No confundirlos.
- No inventar mÃ©todos de mutaciÃ³n: solo `value` modifica el documento.
- Los tipos de bloque vÃ¡lidos son los diez de `TYPES`; cualquier otro se
  descarta silenciosamente al parsear.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.
- Crear tamaÃ±os con `font-size` contextual y `em`, nunca con variantes de size.

## Fuentes

- [JavaScript](./doc-editor.ts)
- [CSS](./doc-editor.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./doc-editor.json)
