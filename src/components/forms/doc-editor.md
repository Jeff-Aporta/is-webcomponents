---
tag: is-doc-editor
tags:
  - is-doc-editor
category: forms
status: public
source: ./doc-editor.js
style: ./doc-editor.css
preview: ../../previews/forms/is-doc-editor.json
---
# `<is-doc-editor>`

## Propósito

Editor de documento por bloques al estilo Notion. Cada bloque es un
`contenteditable` independiente con uno de diez tipos: `paragraph`,
`heading-1`, `heading-2`, `heading-3`, `bullet-list`, `todo`,
`numbered-list`, `quote`, `code` o `divider`. El menú de tipos se abre
escribiendo `/` en un bloque vacío.

Este módulo registra `<is-doc-editor>`.

## Cuándo usarlo

Cuando el usuario necesita redactar contenido estructurado y libre —
notas internas, descripciones largas de un producto, observaciones de una
operación — y el resultado se guarda como JSON de bloques, no como HTML.

## Cuándo no usarlo

- Para texto plano de una o pocas líneas: usa `<is-textarea>` o un
  `<textarea>` nativo.
- Dentro de un `<form>` esperando que el contenido se envíe solo: **no es
  form-associated** (ver [Integración con formularios](#integración-con-formularios)).
- Para HTML enriquecido con negrita, cursiva o enlaces en línea: el
  componente guarda `textContent` plano por bloque, sin formato inline.

## Importación

```js
import './doc-editor.js';
```

## Ejemplo mínimo

```html
<is-doc-editor placeholder="Escribe algo…"></is-doc-editor>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `value` | string (JSON) | *(sin valor)* | Array de bloques serializado: `[{ "type": "…", "text": "…", "checked": false }]`. Si falta, se lee el `<script type="application/json">` del light DOM; si tampoco existe, arranca con un único bloque `paragraph` vacío. |
| `placeholder` | string | *(sin efecto)* | Declarado en `observedAttributes` pero **nunca leído** por la implementación. El texto de placeholder de cada bloque viene fijo de la tabla `TYPES` (`Escribe algo…`, `Título 1`, `Item`, `Hacer…`, `Cita…`, `Código…`). |

Cambiar cualquiera de los dos atributos después del montaje vuelve a parsear
el contenido y **re-renderiza el documento entero**, descartando la edición
en curso.

#### Propiedades públicas

| Propiedad | Acceso | Tipo | Descripción |
| --- | --- | --- | --- |
| `value` | lectura/escritura | string (getter) / string \| array (setter) | El getter devuelve `JSON.stringify` del array de bloques (una **cadena**, no un array). El setter acepta cadena o array y lo refleja al atributo `value`. |
| `blocks` | solo lectura | `Array<{id, type, text, checked}>` | Array vivo interno. Mutarlo no re-renderiza; úsalo solo para leer. |

Cada bloque tiene `id` (generado con `crypto.randomUUID()` o un fallback
`b<timestamp>_<i>`), `type`, `text` y `checked` (solo relevante en `todo`).

### Slots

No expone. El shadow root no contiene ningún `<slot>`, así que el contenido
en light DOM **no se proyecta**. El único uso del light DOM es la semilla
declarativa:

```html
<is-doc-editor>
  <script type="application/json">
    [{ "type": "heading-1", "text": "Acta de reunión" }]
  </script>
</is-doc-editor>
```

La cabecera del `.js` documenta un slot `default`; no existe en el código.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | `{ blocks }` — copia profunda (`structuredClone`) del array de bloques | sí | sí | no |
| `is-focus` | `{ id }` — id del bloque que recibió el foco | sí | sí | no |

`is-change` se emite en cada tecla escrita dentro de un bloque y al marcar o
desmarcar un `todo`. **No** se emite al crear un bloque con Enter, al
borrarlo con Backspace ni al cambiar su tipo desde el menú `/`.

### Métodos y propiedades públicas

No expone métodos.

La cabecera del `.js` documenta `addBlock(type, after?)`, `removeBlock(id)` y
`updateBlock(id, { text, checked })`. **Ninguno está implementado**: llamarlos
lanza `TypeError`. Para modificar el documento por código, asigna `value`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor externo con borde, fondo y `min-height: 14rem`. |
| `blocks` | Columna flex que contiene todos los bloques. |
| `menu` | Popover del menú de tipos que abre `/`. |

Los bloques individuales no exponen `part`; se estilan desde fuera solo a
través de `::part(blocks)` y sus tokens.

### Custom states

No expone. El componente no usa `ElementInternals`, así que no hay
`:state()`. El estado interno viaja por clases del shadow DOM
(`.block-<tipo>`, `.is-checked`), no accesibles desde el light DOM.

### CSS custom properties

Tokens que el `.css` lee realmente:

| Token | Uso |
| --- | --- |
| `--is-text` | Color del texto del editor y base del fondo del bloque `code`. |
| `--is-control-border` | Color del borde del contenedor; cae a `--is-border`. |
| `--is-border` | Borde por defecto del contenedor y del menú de tipos. |
| `--is-control-radius` | Radio del contenedor; default `8px`. |
| `--is-bg-elev` | Fondo del contenedor y del menú de tipos. |
| `--is-accent` | Realce del bloque enfocado, barra de la cita y hover del menú. |
| `--is-text-soft` | Color del placeholder, de la cita y del texto tachado. |
| `--is-border-soft` | Línea del bloque `divider`. |
| `--is-radius` | Radio del menú de tipos; default `8px`. |

### Integración con formularios

**No participa en formularios.** El componente no declara
`static formAssociated`, no llama a `attachInternals()` ni a `setFormValue()`,
y no acepta `name`, `required` ni `disabled`. Colocarlo dentro de un `<form>`
no aporta nada al `FormData` del envío y `form.reset()` no lo limpia.

Para enviarlo, copia el contenido a un campo oculto:

```html
<form id="acta">
  <is-doc-editor id="doc"></is-doc-editor>
  <input type="hidden" name="contenido" id="oculto" />
</form>

<script type="module">
  const doc = document.getElementById('doc');
  const oculto = document.getElementById('oculto');
  doc.addEventListener('is-change', () => { oculto.value = doc.value; });
</script>
```

## Comportamiento

- **Enter** (sin Shift) crea un bloque nuevo debajo del mismo tipo y lo
  enfoca. Desde un `divider` el bloque nuevo es `paragraph`.
- **Shift+Enter** deja pasar el salto de línea nativo dentro del bloque.
- **Backspace** en un bloque vacío lo elimina y enfoca el anterior. Nunca
  elimina el último bloque que queda.
- **`/`** abre el menú de tipos junto al bloque. Al elegir un tipo, el bloque
  cambia de tipo y **se borra su texto**.
- **Escape** cierra el menú; un `pointerdown` fuera del componente también.
- Cada creación, borrado o cambio de tipo vuelve a renderizar todo el
  documento y reenfoca por `id` en el siguiente `requestAnimationFrame`.

Detalles del `/`: la condición usa `el.selectionStart`, propiedad que un
elemento `contenteditable` no tiene (es `undefined`). El resultado práctico es
que `/` abre el menú solo cuando **todo** el bloque está vacío, no cuando el
cursor está al inicio de un bloque con texto.

Los atajos **Tab / Shift+Tab para indentar** que anuncia la cabecera del `.js`
no están implementados: Tab mueve el foco con el comportamiento nativo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del módulo: `<is-doc-editor>`.

## Accesibilidad

- Cada bloque es un `contenteditable="true"`, foco por Tab en orden de
  documento. Los `todo` anteponen un `<input type="checkbox">` nativo,
  navegable y accionable con teclado.
- El editor **no** declara `role="textbox"` ni `aria-multiline`, y los
  bloques no llevan etiqueta accesible propia: un lector de pantalla anuncia
  el elemento subyacente (`h1`, `p`, `li`, `blockquote`, `pre`).
- El placeholder se pinta con `content: attr(data-placeholder)` en un
  pseudo-elemento, así que **no lo lee** la tecnología asistiva.
- El menú de tipos es una lista de `<button type="button">` sin `role="menu"`
  ni navegación con flechas; se opera con Tab y Enter, y se cierra con Escape.

Si la accesibilidad del editor es un requisito duro del proyecto, añade
`role` y etiquetas desde el consumidor sobre el elemento host.

## Ejemplo avanzado

```html
<is-doc-editor id="acta">
  <script type="application/json">
    [
      { "type": "heading-1",    "text": "Acta de comité" },
      { "type": "paragraph",    "text": "Reunión de cierre contable." },
      { "type": "todo",         "text": "Conciliar bancos", "checked": true },
      { "type": "todo",         "text": "Revisar cartera vencida" },
      { "type": "divider" },
      { "type": "quote",        "text": "Cerrar antes del día 5." },
      { "type": "code",         "text": "SELECT * FROM movimientos;" }
    ]
  </script>
</is-doc-editor>

<script type="module">
  import './doc-editor.js';

  const acta = document.getElementById('acta');

  acta.addEventListener('is-change', (e) => {
    const pendientes = e.detail.blocks
      .filter((b) => b.type === 'todo' && !b.checked)
      .map((b) => b.text);
    console.log('Pendientes:', pendientes);
  });

  acta.addEventListener('is-focus', (e) => {
    console.log('Bloque activo:', e.detail.id);
  });

  // Reemplazar el documento por código (esto re-renderiza todo).
  acta.value = [{ type: 'paragraph', text: 'Documento nuevo' }];
</script>
```

## Errores comunes

- Esperar que `doc.value` devuelva un array: devuelve una **cadena JSON**.
  Usa `JSON.parse(doc.value)` o lee `doc.blocks`.
- Llamar a `addBlock()`, `removeBlock()` o `updateBlock()` porque aparecen en
  la cabecera del `.js`: no existen.
- Poner `placeholder="…"` esperando ver ese texto: el atributo se observa pero
  no se usa.
- Poner el componente en un `<form>` y esperar que se envíe: no es
  form-associated.
- Escribir contenido en light DOM sin envolverlo en
  `<script type="application/json">`: no hay slot, no se ve nada.
- Reasignar `value` mientras el usuario escribe: descarta la edición en curso
  y pierde el foco.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- `value` es cadena JSON al leer; array o cadena al escribir. No confundirlos.
- No inventar métodos de mutación: solo `value` modifica el documento.
- Los tipos de bloque válidos son los diez de `TYPES`; cualquier otro se
  descarta silenciosamente al parsear.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.
- Crear tamaños con `font-size` contextual y `em`, nunca con variantes de size.

## Fuentes

- [JavaScript](./doc-editor.js)
- [CSS](./doc-editor.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-doc-editor.json)
