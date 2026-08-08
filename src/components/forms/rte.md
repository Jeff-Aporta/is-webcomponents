---
tag: is-rte
tags:
  - is-rte
category: forms
status: public
source: ./rte.js
style: ./rte.css
preview: ../../previews/forms/is-rte.json
---
# `<is-rte>`

## Propósito

Editor de texto enriquecido sobre `contentEditable`, con toolbar configurable,
modo código fuente HTML y registro de comandos aportados por otros
componentes.

Este módulo registra `<is-rte>` y exporta `registerRteCommand()`.

## Cuándo usarlo

Capturar contenido con formato (notas, descripciones, plantillas de correo)
cuando el destino es HTML.

## Cuándo no usarlo

Para texto plano usar `<is-textarea>`; para Markdown usar `<is-md-editor>`;
para menciones sobre texto plano usar `<is-mention>`.

## Importación

```js
import './rte.js';
// opcional, para aportar botones propios
import { registerRteCommand } from './rte.js';
```

## Ejemplo mínimo

```html
<is-rte placeholder="Escribe aquí"></is-rte>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | HTML inicial y actual. |
| `placeholder` | string | Visible mientras el contenido está vacío. |
| `toolbar` | string | Lista separada por comas; `\|` inserta separador. Default: `bold,italic,underline,strike,\|,h1,h2,h3,\|,ul,ol,\|,link,blockquote,code,\|,undo,redo,clear`. |
| `autofocus` | boolean | Enfoca al conectar. |
| `readonly` | boolean | Desactiva la edición. |
| `source-mode` | boolean | Muestra el HTML crudo en un `textarea`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | HTML; en modo fuente devuelve el contenido del `textarea`. |
| `text` | lectura | Texto plano (`textContent`) del área WYSIWYG. |
| `sourceMode` | lectura/escritura | Refleja `source-mode`. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-input` | sin detail | sí | sí | no |
| `is-change` | `{ value, text }` | sí | sí | no |
| `is-blur` | sin detail | sí | sí | no |
| `is-source-change` | `{ source }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` / `blur()` | Sobre el área activa (WYSIWYG o fuente). |
| `exec(cmd, value?)` | Ejecuta un comando de edición. |
| `format(tag)` | `formatBlock` con el tag indicado (`h1`, `blockquote`, `pre`…). |
| `insertHtml(html)` | Inserta HTML en el cursor; respeta el modo fuente. |
| `link()` | Pide una URL y aplica enlace a la selección. |
| `clear()` | Quita formato y devuelve el bloque a `p`. |
| `undo()` / `redo()` | Deshacer / rehacer. |

Función exportada del módulo:

| Función | Uso |
| --- | --- |
| `registerRteCommand(name, { icon, title, run })` | Registra un botón extra invocable desde el atributo `toolbar`. `run` recibe la instancia de `<is-rte>`. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de botones. |
| `content` | Área editable WYSIWYG. |
| `source` | `textarea` del modo código fuente. |
| `placeholder` | Texto de ayuda. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-rte-toolbar-bg` | Fondo de la toolbar. |
| `--is-rte-content-min-h` | Altura mínima del área editable. |
| `--is-rte-button-radius` | Radio de los botones de la toolbar. |
| `--is-rte-token-bg` | Fondo de los tokens insertados por comandos externos. |
| `--is-rte-token-color` | Color de esos tokens. |
| `--is-rte-token-radius` | Radio de esos tokens. |
| `--is-bg` | Fondo del editor. |
| `--is-bg-elev` | Fondo elevado de la toolbar. |
| `--is-border` | Borde del contenedor. |
| `--is-border-soft` | Separadores. |
| `--is-control-border` | Borde del `textarea` de fuente. |
| `--is-control-radius` | Radio de bordes. |
| `--is-text` | Color del contenido. |
| `--is-text-soft` | Color del placeholder. |
| `--is-accent` | Botón activo. |
| `--is-focus` | Anillo de foco. |

### Integración con formularios

No es form-associated: reflejar `value` en un campo oculto desde `is-change`
si se envía por formulario nativo.

## Comportamiento

- La toolbar se reconstruye al cambiar el atributo `toolbar`. Los botones
  hacen `preventDefault` en `mousedown` para no perder la selección.
- Comandos base vía `document.execCommand`: negrita/cursiva/subrayado/tachado,
  `formatBlock` para encabezados, cita, código y `pre`, e `insertUnorderedList`
  / `insertOrderedList` para listas.
- `link()` abre un `prompt` del navegador para pedir la URL.
- `source-mode` alterna entre el área editable y el `textarea` de HTML crudo;
  al alternar se emite `is-source-change` y `value` cambia de origen.
- Los comandos registrados con `registerRteCommand()` se resuelven por nombre
  al construir la toolbar, sin que este módulo conozca al componente que los
  aporta.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/element-base.js`](../_shared/element-base.js)

Tags del módulo: `<is-rte>`.

## Accesibilidad

La toolbar declara `role="toolbar"` y cada botón lleva `title` y `aria-label`.
El área editable es `contenteditable` y participa del orden de foco natural.
`link()` usa un `prompt` del navegador: en flujos que requieran un diálogo
accesible propio, registrar un comando personalizado que abra `<is-dialog>`.

## Ejemplo avanzado

```html
<is-rte id="editor"
        toolbar="bold,italic,|,h2,ul,|,firma,|,undo,redo"
        placeholder="Cuerpo del correo"></is-rte>

<script type="module">
  import { registerRteCommand } from './rte.js';

  registerRteCommand('firma', {
    icon: '✒️',
    title: 'Insertar firma',
    run: (rte) => rte.insertHtml('<p>Atentamente,<br>ContaPyme</p>'),
  });

  const editor = document.getElementById('editor');
  editor.addEventListener('is-change', (e) => console.log(e.detail.value));
  editor.sourceMode = true;   // ver el HTML crudo
</script>
```

## Errores comunes

- Registrar el comando después de que la toolbar ya se construyó: registrarlo
  antes de conectar el componente, o forzar la reconstrucción reasignando
  `toolbar`.
- Leer `value` en modo fuente esperando el HTML del WYSIWYG: en ese modo el
  valor sale del `textarea`.
- Insertar HTML sin sanear proveniente del usuario: `insertHtml()` no sanea.
- Enviarlo en un `<form>` sin campo espejo.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./rte.js)
- [CSS](./rte.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-rte.json)
