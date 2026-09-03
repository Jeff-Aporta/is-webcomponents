---
tag: is-code
tags:
  - is-code
category: code
status: public
source: ./code.js
style: ./code.css
preview: ../../previews/code/is-code.json
---
# `<is-code>`

## Propósito

Editor de código editable al nivel de un IDE ligero: resaltado por lenguaje,
números de línea, word-wrap, temas por JSON, formateo estilo Prettier,
anotaciones externas (highlight de error/advertencia y tooltips de
documentación) y API bidireccional texto ↔ JSON (`code2json` / `json2code`).

Motor: resaltado NATIVO (`_shared/code-highlight.ts`) y editor nativo; sin
CodeMirror ni CDN.

Este módulo registra `<is-code>`.

## Cuándo usarlo

- Editar o revisar snippets HTML/CSS/JS/TS/JSX/Python en la UI.
- Mostrar diagnósticos o docs que produce otro sistema (LSP, linter, IA)
  mediante `marks` en el documento JSON.
- Formular campos de código form-associated (`name` + `value`).

## Cuándo no usarlo

- Solo colorear un `<pre>` de documentación: usar `highlight-code.js` /
  `scripts/highlight-pre.js`.
- Markdown / rich text: `<is-md-editor>` / `<is-rte>` / `<is-doc-editor>`.
- Merge de tres vías (resolver conflictos): no cubierto. Ver un diff o un
  resumen de commit sí lo está (`lang="diff"` / `lang="commit"`).

## Importación

```js
import './code.js';
// o por CDN: dist/cdn/code/code.min.js
```

## Ejemplo mínimo

```html
<is-code lang="javascript" line-numbers wrap
  value="const n = 1;&#10;console.log(n);"></is-code>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `lang` | string | `javascript` | `javascript` · `typescript` · `jsx` · `tsx` · `html` · `css` · `json` · `python` · `diff` · `commit` · `plaintext` (y alias). Extensible con `registerLanguage`. |
| `value` | string | `""` | Código fuente. |
| `document` | string (JSON) | — | Documento `is-code-doc/v1`. Si está presente al conectar, manda sobre `value`. |
| `format` | string (JSON) | ver abajo | Opciones tipo Prettier: `tabWidth`, `useTabs`, `printWidth`, `semi`, `singleQuote`, `trailingComma`, `endOfLine`. |
| `theme-config` | string (JSON) | preset dark/light | Colores por rol (`keyword`, `string`, `gutterForeground`, …). |
| `line-numbers` | boolean/`false` | on (block) | Ausente = con números en `block`. En `compact` e `inline` ausente = off. `line-numbers="false"` los oculta. |
| `wrap` | boolean | off | Word wrap. |
| `readonly` | boolean | off | Solo lectura (sin caret; se puede seleccionar/copiar). |
| `compact` | boolean | off | Autofit de altura (snippets de docs / CDN). Sin números salvo `line-numbers` explícito. |
| `mode` | `block` \| `inline` | `block` | Inserción en página: bloque a ancho completo o inline en el flujo de texto. En `inline`/`compact` los números van off salvo `line-numbers` explícito. |
| `disabled` | boolean | off | Deshabilitado (sin cursor). |
| `autofocus` | boolean | off | Foco al montar. |
| `tab-size` | number | `2` | Tamaño de tab visual. |
| `name` | string | — | Nombre form-associated. |
| `placeholder` | string | — | Placeholder del editor nativo. |
| `min-height` | CSS length | `12rem` | → `--is-code-min-height`. |
| `radius` | CSS | — | Style-attr → `--is-code-radius`. |

#### Propiedades públicas

| Propiedad | Acceso | Tipo | Descripción |
| --- | --- | --- | --- |
| `value` | rw | string | Código actual. |
| `lang` | rw | string | Lenguaje activo. |
| `lineNumbers` / `wrap` / `readonly` / `disabled` / `autofocus` / `compact` | rw | boolean | Reflejan atributos. |
| `mode` | rw | `'block'` \| `'inline'` | Modo de inserción en página. |
| `tabSize` | rw | number | Refleja `tab-size`. |
| `formatConfig` | rw | object | Opciones de formateo. |
| `themeConfig` | rw | object \| null | Tema JSON. |
| `marks` | rw | array | Anotaciones actuales. |
| `document` | rw | object | `getDocument()` / `setDocument()`. |
| `ready` | ro | boolean | Editor listo (bootstrap nativo completado). |
| `cm` | ro | `null` (era `CodeMirror \| null`) | Legacy: siempre `null` desde la migración nativa; se conserva por compat de API. |

### Slots

No proyecta light DOM (el texto inicial se lee una vez como semilla si no hay
`value`/`document`).

### Eventos

| Evento | Detail | Cuándo |
| --- | --- | --- |
| `is-ready` | `{ lang, value }` | Editor listo. |
| `is-input` | `{ value, change }` | Cada edición. |
| `is-change` | `{ value, formatted? }` | Edición o `format()`. |
| `is-cursor` | `{ line, ch, index }` | Movimiento de cursor. |
| `is-mark-activate` | `{ mark, phase }` | Hover enter/leave sobre un mark. |
| `is-error` | `{ error }` | Fallo de bootstrap. |

### Métodos y propiedades públicas

| Método | Descripción |
| --- | --- |
| `format()` | Reformatea el buffer con `formatConfig` + `lang`. |
| `getDocument()` / `setDocument(doc)` | Round-trip `is-code-doc/v1`. |
| `code2json(opts?)` / `json2code(doc)` | Conversores texto ↔ JSON. |
| `setMarks(list)` / `clearMarks()` | Anotaciones externas. |
| `focus()` / `refresh()` | Foco y resincronización nativa (`refresh()` no hace scrollIntoView). |
| `IsCode.registerLanguage(def)` | Plugin de lenguaje. |
| `IsCode.listLanguages()` | Idiomas registrados. |

### CSS parts

| Part | Elemento |
| --- | --- |
| `root` | Contenedor. |
| `editor` | Host del editor (`.editor-host`). |
| `tooltip` | `<is-tooltip>` de documentación. |
| `seed` | `<textarea>` semilla (oculto). |

### Custom states

| State | Significado |
| --- | --- |
| `blank` | Buffer vacío. |
| `disabled` | Deshabilitado. |
| `readonly` | Solo lectura. |

### CSS custom properties

Tokens de superficie: `--is-code-radius`, `--is-code-border`,
`--is-code-min-height`, `--is-code-font`, `--is-code-font-size`.

Tokens de tema (ver `theme-config`): `--is-code-bg`, `--is-code-fg`,
`--is-code-keyword`, `--is-code-string`, `--is-code-mark-error`, …

Tokens de diff: `--is-code-diff-added` / `--is-code-diff-added-band`,
`--is-code-diff-removed` / `--is-code-diff-removed-band`,
`--is-code-diff-hunk`, `--is-code-diff-file`, `--is-code-diff-commit`,
`--is-code-diff-path`, `--is-code-diff-note`. Cada color va en pareja con su
banda porque el texto contrasta contra la banda, no contra el fondo.

### Integración con formularios

Form-associated (`ElementInternals`). Participa en submit/reset vía `name` +
`value`. No incluye validación nativa de sintaxis.

## Diff y resumen de commit

`lang="diff"` (alias `patch`, `udiff`) y `lang="commit"` (alias `git-log`,
`git-show`, `commit-resume`) comparten el modo `is-diff`, definido dentro del
kit. Los bloques colorean igual en todos los lados porque todos usan el mismo
motor nativo de resaltado.

Por qué un modo propio y no `javascript`: el `+` y el `-` de la primera columna
no son código, son marcas de línea. Un tokenizador de lenguaje los lee como
operadores, arrastra el resto de la línea a un estado sintáctico inexistente y
el bloque acaba coloreado casi al azar, justo donde el lector solo necesita ver
qué entra y qué sale. `is-diff` clasifica por línea entera y no interpreta el
lenguaje de dentro.

Reconoce:

| Forma | Ejemplo | Pintado |
| --- | --- | --- |
| Cabecera de commit | `commit 7839bd7`, `Author:` | acento + cabecera |
| Cabecera de archivo | `diff --git`, `--- a/x`, `+++ b/x` | archivo (no add/del) |
| Hunk | `@@ -1,4 +1,6 @@` | banda tenue |
| Añadido / borrado | `+linea` / `-linea` | verde / rojo + banda |
| Comentario de contexto | `// situando el extracto` | comentario |
| Anotación | `(commit 8936adb)` | nota tenue |
| Resumen `--stat` | `src/app.js \| 12 ++++----` | ruta, contador y barra por tramos |
| Total | `2 files changed, 8 insertions(+), 4 deletions(-)` | verde / rojo |

`--- a/x` y `+++ b/x` se comprueban **antes** que `+`/`-`: empiezan por esos
signos pero son cabeceras, no contenido cambiado. Del mismo modo `+// nota` es
una línea añadida, no un comentario suelto.

Cada línea con significado propio recibe además una banda de fondo
(`CodeLangDef.lineClass`), porque el color de texto solo no basta cuando hay
muchas líneas seguidas: la banda es la que deja ver el tamaño del cambio de un
vistazo.

### `format()` sobre un diff

Un diff no se re-indenta ni se re-comilla — sus columnas son datos. Lo único que
`format()` toca es la rejilla del `--stat`: alinea ruta, contador y barra en
columnas fijas y junta las barras partidas (`++ --` → `++--`). El ancho se
calcula por bloque contiguo, así que dos tablas separadas por prosa no se
contaminan entre sí, y las líneas que no son `--stat` quedan intactas.

```html
<is-code lang="commit" readonly compact wrap="false"
  value="src/app.js | 12 ++++----&#10;src/lib/parse.ts | 2 +-"></is-code>
```

## Comportamiento

- Todos los langs usan el motor nativo compartido con el pintor de docs
  (`highlight-code` / `code-highlight`): no hay modos CDN que descargar.
- `python` lo tokeniza el motor nativo como plaintext (sin descargas).
- Los marks que intersectan una edición del usuario se descartan; el sistema
  externo debe reaplicar diagnósticos.
- Sin `theme-config`, el preset sigue `data-theme` del documento
  (`dark` / `light`).

Documento JSON (`is-code-doc/v1`):

```json
{
  "$schema": "is-code-doc/v1",
  "lang": "javascript",
  "value": "function add(a, b) {\n  return a + b;\n}",
  "marks": [
    {
      "id": "t1",
      "from": 9,
      "to": 12,
      "kind": "tooltip",
      "title": "add()",
      "body": "Suma dos números."
    },
    {
      "id": "e1",
      "from": 26,
      "to": 27,
      "kind": "highlight",
      "tone": "warning",
      "message": "Prefer const"
    }
  ],
  "format": { "tabWidth": 2, "semi": true },
  "theme": { "keyword": "#c792ea" }
}
```

## Dependencias y componentes relacionados

- [`../_shared/code-highlight.ts`](../_shared/code-highlight.ts) — motor nativo de resaltado (tokens)
- [`../_shared/code-langs.js`](../_shared/code-langs.js)
- [`../_shared/code-format.js`](../_shared/code-format.js)
- [`../_shared/code-theme.js`](../_shared/code-theme.js)
- [`../_shared/code-model.js`](../_shared/code-model.js)
- [`../_shared/highlight-code.js`](../_shared/highlight-code.js)
- [`../feedback/tooltip.js`](../feedback/tooltip.js) — tooltips de marks

Tags del módulo: `<is-code>`.

Sin dependencias externas: el resaltado y el editor son nativos; no hay que
cargar CodeMirror ni ningún CSS/JS de CDN.

Los snippets de la galería (`pre.code`, CDN, «Ver código») se montan como
`<is-code readonly compact>` vía `highlight-code.js` — los colorea el motor
nativo, igual que cualquier otro snippet.

## Accesibilidad

El área editable es un `<textarea>` transparente sobre el `<pre>` resaltado
(`.ic-edit`), con rol de código.
Soporta navegación por teclado del editor. Los marks exponen `title` nativo
y tooltip IS al hover. Respetar `disabled` / `readonly` (`aria-readonly`).
Con `readonly` no hay caret ni línea activa; se puede seleccionar y copiar.

## Ejemplo avanzado

```html
<is-code id="ed" lang="typescript" wrap line-numbers></is-code>
<script type="module">
  const ed = document.getElementById('ed');
  ed.addEventListener('is-ready', () => {
    ed.setDocument({
      $schema: 'is-code-doc/v1',
      lang: 'typescript',
      value: 'const x: number = 1;',
      marks: [
        { from: 6, to: 7, kind: 'tooltip', title: 'x', body: 'number' },
      ],
    });
    ed.format();
  });
</script>
```

## Errores comunes

- No reintroducir CodeMirror (ni 5 ni 6 / `@codemirror/*`): el resaltado y el
  editor son nativos.
- Pasar `theme-config` malformado: se ignora y queda el preset.
- Confiar en que los marks sobrevivan a ediciones locales: se rebasan o
  invalidan; reaplicar desde el analizador externo.
- Creer que el tag necesita red o CDN: no — resaltado y editor son nativos, no
  se carga nada externo.

## Reglas para LLM

- Reusar `_shared/code-*` y `highlight-code` antes de otro highlighter.
- No inventar langs: registrar con `registerLanguage` o usar built-ins.
- Documentar marks con offsets UTF-16 (como `String` en JS).
- No meter Prettier npm: el formateo es el de `code-format.js`.

## Fuentes

- [JavaScript](code.md)
- [CSS](./code.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/code/is-code.json)
