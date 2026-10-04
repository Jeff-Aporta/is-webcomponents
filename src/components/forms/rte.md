---
tag: iswc-rte
tags:
  - iswc-rte
category: forms
status: public
source: ./rte.ts
style: ./rte.css
preview: ./rte.json
---
# `<iswc-rte>`

## PropÃ³sito

Editor de texto enriquecido sobre `contentEditable`, con toolbar configurable,
modo cÃ³digo fuente HTML y registro de comandos aportados por otros
componentes.

Este mÃ³dulo registra `<iswc-rte>` y exporta `registerRteCommand()`.

## CuÃ¡ndo usarlo

Capturar contenido con formato (notas, descripciones, plantillas de correo)
cuando el destino es HTML.

## CuÃ¡ndo no usarlo

Para texto plano usar `<iswc-textarea>`; para Markdown usar `<iswc-md-editor>`;
para menciones sobre texto plano usar `<iswc-mention>`.

## ImportaciÃ³n

```js
import './rte.js';
// opcional, para aportar botones propios
import { registerRteCommand } from './rte.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-rte placeholder="Escribe aquÃ­"></iswc-rte>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | HTML inicial y actual. |
| `placeholder` | string | Visible mientras el contenido estÃ¡ vacÃ­o. |
| `toolbar` | string | Lista separada por comas; `\|` inserta separador. Default: `bold,italic,underline,strike,\|,h1,h2,h3,\|,ul,ol,\|,link,blockquote,code,\|,undo,redo,clear`. |
| `autofocus` | boolean | Enfoca al conectar. |
| `readonly` | boolean | Desactiva la ediciÃ³n. |
| `source-mode` | boolean | Muestra el HTML crudo en un `textarea`. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | HTML; en modo fuente devuelve el contenido del `textarea`. |
| `text` | lectura | Texto plano (`textContent`) del Ã¡rea WYSIWYG. |
| `sourceMode` | lectura/escritura | Refleja `source-mode`. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-blur` | Emitido cuando el componente pierde foco. |
| `iswc-source-change` | Evento personalizado del componente (source change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sin detail | sÃ­ | sÃ­ | no |
| `iswc-change` | `{ value, text }` | sÃ­ | sÃ­ | no |
| `iswc-blur` | sin detail | sÃ­ | sÃ­ | no |
| `iswc-source-change` | `{ source }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-rte');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` / `blur()` | Sobre el Ã¡rea activa (WYSIWYG o fuente). |
| `exec(cmd, value?)` | Ejecuta un comando de ediciÃ³n. |
| `format(tag)` | `formatBlock` con el tag indicado (`h1`, `blockquote`, `pre`â€¦). |
| `insertHtml(html)` | Inserta HTML en el cursor; respeta el modo fuente. |
| `link()` | Pide una URL y aplica enlace a la selecciÃ³n. |
| `clear()` | Quita formato y devuelve el bloque a `p`. |
| `undo()` / `redo()` | Deshacer / rehacer. |

FunciÃ³n exportada del mÃ³dulo:

| FunciÃ³n | Uso |
| --- | --- |
| `registerRteCommand(name, { icon, title, run })` | Registra un botÃ³n extra invocable desde el atributo `toolbar`. `run` recibe la instancia de `<iswc-rte>`. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de botones. |
| `content` | Ãrea editable WYSIWYG. |
| `source` | `textarea` del modo cÃ³digo fuente. |
| `placeholder` | Texto de ayuda. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-rte-toolbar-bg` | Fondo de la toolbar. |
| `--iswc-rte-content-min-h` | Altura mÃ­nima del Ã¡rea editable. |
| `--iswc-rte-button-radius` | Radio de los botones de la toolbar. |
| `--iswc-rte-token-bg` | Fondo de los tokens insertados por comandos externos. |
| `--iswc-rte-token-color` | Color de esos tokens. |
| `--iswc-rte-token-radius` | Radio de esos tokens. |
| `--iswc-bg` | Fondo del editor. |
| `--iswc-bg-elev` | Fondo elevado de la toolbar. |
| `--iswc-border` | Borde del contenedor. |
| `--iswc-border-soft` | Separadores. |
| `--iswc-control-border` | Borde del `textarea` de fuente. |
| `--iswc-control-radius` | Radio de bordes. |
| `--iswc-text` | Color del contenido. |
| `--iswc-text-soft` | Color del placeholder. |
| `--iswc-accent` | BotÃ³n activo. |
| `--iswc-focus` | Anillo de foco. |

### IntegraciÃ³n con formularios

No es form-associated: reflejar `value` en un campo oculto desde `iswc-change`
si se envÃ­a por formulario nativo.

## Comportamiento

- La toolbar se reconstruye al cambiar el atributo `toolbar`. Los botones
  hacen `preventDefault` en `mousedown` para no perder la selecciÃ³n.
- Comandos base vÃ­a `document.execCommand`: negrita/cursiva/subrayado/tachado,
  `formatBlock` para encabezados, cita, cÃ³digo y `pre`, e `insertUnorderedList`
  / `insertOrderedList` para listas.
- `link()` abre un `prompt` del navegador para pedir la URL.
- `source-mode` alterna entre el Ã¡rea editable y el `textarea` de HTML crudo;
  al alternar se emite `iswc-source-change` y `value` cambia de origen.
- Los comandos registrados con `registerRteCommand()` se resuelven por nombre
  al construir la toolbar, sin que este mÃ³dulo conozca al componente que los
  aporta.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/element-base.js`](../_shared/element-base.js)

Tags del mÃ³dulo: `<iswc-rte>`.

## Accesibilidad

La toolbar declara `role="toolbar"` y cada botÃ³n lleva `title` y `aria-label`.
El Ã¡rea editable es `contenteditable` y participa del orden de foco natural.
`link()` usa un `prompt` del navegador: en flujos que requieran un diÃ¡logo
accesible propio, registrar un comando personalizado que abra `<iswc-dialog>`.

## Ejemplo avanzado

```html
<iswc-rte id="editor"
        toolbar="bold,italic,|,h2,ul,|,firma,|,undo,redo"
        placeholder="Cuerpo del correo"></iswc-rte>

<script type="module">
  import { registerRteCommand } from './rte.js';

  registerRteCommand('firma', {
    icon: 'âœ’ï¸',
    title: 'Insertar firma',
    run: (rte) => rte.insertHtml('<p>Atentamente,<br>ContaPyme</p>'),
  });

  const editor = document.getElementById('editor');
  editor.addEventListener('iswc-change', (e) => console.log(e.detail.value));
  editor.sourceMode = true;   // ver el HTML crudo
</script>
```

## Errores comunes

- Registrar el comando despuÃ©s de que la toolbar ya se construyÃ³: registrarlo
  antes de conectar el componente, o forzar la reconstrucciÃ³n reasignando
  `toolbar`.
- Leer `value` en modo fuente esperando el HTML del WYSIWYG: en ese modo el
  valor sale del `textarea`.
- Insertar HTML sin sanear proveniente del usuario: `insertHtml()` no sanea.
- Enviarlo en un `<form>` sin campo espejo.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./rte.ts)
- [CSS](./rte.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./rte.json)
