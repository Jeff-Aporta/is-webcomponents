---
tag: iswc-code
tags:
  - iswc-code
category: code
status: public
source: ./code.ts
style: ./code.css
preview: ./code.json
---
# `<iswc-code>`

## PropÃ³sito

Editor de cÃ³digo editable al nivel de un IDE ligero: resaltado por lenguaje,
nÃºmeros de lÃ­nea, word-wrap, temas por JSON, formateo estilo Prettier,
anotaciones externas (highlight de error/advertencia y tooltips de
documentaciÃ³n) y API bidireccional texto â†” JSON (`code2json` / `json2code`).

Motor: resaltado NATIVO (`_shared/code-highlight.ts`) y editor nativo; sin
CodeMirror ni CDN.

Este mÃ³dulo registra `<iswc-code>`.

## CuÃ¡ndo usarlo

- Editar o revisar snippets HTML/CSS/JS/TS/JSX/Python en la UI.
- Mostrar diagnÃ³sticos o docs que produce otro sistema (LSP, linter, IA)
  mediante `marks` en el documento JSON.
- Formular campos de cÃ³digo form-associated (`name` + `value`).

## CuÃ¡ndo no usarlo

- Solo colorear un `<pre>` de documentaciÃ³n: usar `highlight-code.js` /
  `scripts/highlight-pre.js`.
- Markdown / rich text: `<iswc-md-editor>` / `<iswc-rte>` / `<iswc-doc-editor>`.
- Merge de tres vÃ­as (resolver conflictos): no cubierto. Ver un diff o un
  resumen de commit sÃ­ lo estÃ¡ (`lang="diff"` / `lang="commit"`).

## ImportaciÃ³n

```js
import './code.js';
// o por CDN: dist/cdn/code/code.min.js
```

## Ejemplo mÃ­nimo

```html
<iswc-code lang="javascript" line-numbers wrap
  value="const n = 1;&#10;console.log(n);"></iswc-code>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | DescripciÃ³n |
| --- | --- | --- | --- |
| `lang` | string | `javascript` | `javascript` Â· `typescript` Â· `jsx` Â· `tsx` Â· `html` Â· `css` Â· `json` Â· `python` Â· `diff` Â· `commit` Â· `plaintext` (y alias). Extensible con `registerLanguage`. |
| `value` | string | `""` | CÃ³digo fuente. |
| `document` | string (JSON) | â€” | Documento `iswc-code-doc/v1`. Si estÃ¡ presente al conectar, manda sobre `value`. |
| `format` | string (JSON) | ver abajo | Opciones tipo Prettier: `tabWidth`, `useTabs`, `printWidth`, `semi`, `singleQuote`, `trailingComma`, `endOfLine`. |
| `theme-config` | string (JSON) | preset dark/light | Colores por rol (`keyword`, `string`, `gutterForeground`, â€¦). |
| `line-numbers` | boolean/`false` | on (block) | Ausente = con nÃºmeros en `block`. En `compact` e `inline` ausente = off. `line-numbers="false"` los oculta. |
| `wrap` | boolean | off | Word wrap. |
| `readonly` | boolean | off | Solo lectura (sin caret; se puede seleccionar/copiar). |
| `compact` | boolean | off | Autofit de altura (snippets de docs / CDN). Sin nÃºmeros salvo `line-numbers` explÃ­cito. |
| `mode` | `block` \| `inline` | `block` | InserciÃ³n en pÃ¡gina: bloque a ancho completo o inline en el flujo de texto. En `inline`/`compact` los nÃºmeros van off salvo `line-numbers` explÃ­cito. |
| `disabled` | boolean | off | Deshabilitado (sin cursor). |
| `autofocus` | boolean | off | Foco al montar. |
| `tab-size` | number | `2` | TamaÃ±o de tab visual. |
| `name` | string | â€” | Nombre form-associated. |
| `placeholder` | string | â€” | Placeholder del editor nativo. |
| `min-height` | CSS length | `12rem` | â†’ `--iswc-code-min-height`. |
| `radius` | CSS | â€” | Style-attr â†’ `--iswc-code-radius`. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Tipo | DescripciÃ³n |
| --- | --- | --- | --- |
| `value` | rw | string | CÃ³digo actual. |
| `lang` | rw | string | Lenguaje activo. |
| `lineNumbers` / `wrap` / `readonly` / `disabled` / `autofocus` / `compact` | rw | boolean | Reflejan atributos. |
| `mode` | rw | `'block'` \| `'inline'` | Modo de inserciÃ³n en pÃ¡gina. |
| `tabSize` | rw | number | Refleja `tab-size`. |
| `formatConfig` | rw | object | Opciones de formateo. |
| `themeConfig` | rw | object \| null | Tema JSON. |
| `marks` | rw | array | Anotaciones actuales. |
| `document` | rw | object | `getDocument()` / `setDocument()`. |
| `ready` | ro | boolean | Editor listo (bootstrap nativo completado). |
| `cm` | ro | `null` (era `CodeMirror \| null`) | Legacy: siempre `null` desde la migraciÃ³n nativa; se conserva por compat de API. |

### Slots

No proyecta light DOM (el texto inicial se lee una vez como semilla si no hay
`value`/`document`).

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-ready` | Emitido cuando el componente estÃ¡ listo. |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-cursor` | Evento personalizado del componente (cursor). |
| `iswc-mark-activate` | Evento personalizado del componente (mark activate). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | Detail | CuÃ¡ndo |
| --- | --- | --- |
| `iswc-ready` | `{ lang, value }` | Editor listo. |
| `iswc-input` | `{ value, change }` | Cada ediciÃ³n. |
| `iswc-change` | `{ value, formatted? }` | EdiciÃ³n o `format()`. |
| `iswc-cursor` | `{ line, ch, index }` | Movimiento de cursor. |
| `iswc-mark-activate` | `{ mark, phase }` | Hover enter/leave sobre un mark. |
| `iswc-error` | `{ error }` | Fallo de bootstrap. |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-code');
el.addEventListener('iswc-ready', (e) => {
  console.log('iswc-ready', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | DescripciÃ³n |
| --- | --- |
| `format()` | Reformatea el buffer con `formatConfig` + `lang`. |
| `getDocument()` / `setDocument(doc)` | Round-trip `iswc-code-doc/v1`. |
| `code2json(opts?)` / `json2code(doc)` | Conversores texto â†” JSON. |
| `setMarks(list)` / `clearMarks()` | Anotaciones externas. |
| `focus()` / `refresh()` | Foco y resincronizaciÃ³n nativa (`refresh()` no hace scrollIntoView). |
| `IswcCode.registerLanguage(def)` | Plugin de lenguaje. |
| `IswcCode.listLanguages()` | Idiomas registrados. |

### CSS parts

| Part | Elemento |
| --- | --- |
| `root` | Contenedor. |
| `editor` | Host del editor (`.editor-host`). |
| `tooltip` | `<iswc-tooltip>` de documentaciÃ³n. |
| `seed` | `<textarea>` semilla (oculto). |

### Custom states

| State | Significado |
| --- | --- |
| `blank` | Buffer vacÃ­o. |
| `inline` | Modo `inline` activo (inserciÃ³n en flujo de texto en vez de bloque a ancho completo). |
| `disabled` | Deshabilitado. |
| `readonly` | Solo lectura. |

### CSS custom properties

Tokens de superficie: `--iswc-code-radius`, `--iswc-code-border`,
`--iswc-code-min-height`, `--iswc-code-font`, `--iswc-code-font-size`.

Tokens de tema (ver `theme-config`): `--iswc-code-bg`, `--iswc-code-fg`,
`--iswc-code-keyword`, `--iswc-code-string`, `--iswc-code-mark-error`, â€¦

Tokens de diff: `--iswc-code-diff-added` / `--iswc-code-diff-added-band`,
`--iswc-code-diff-removed` / `--iswc-code-diff-removed-band`,
`--iswc-code-diff-hunk`, `--iswc-code-diff-file`, `--iswc-code-diff-commit`,
`--iswc-code-diff-path`, `--iswc-code-diff-note`. Cada color va en pareja con su
banda porque el texto contrasta contra la banda, no contra el fondo.

### IntegraciÃ³n con formularios

Form-associated (`ElementInternals`). Participa en submit/reset vÃ­a `name` +
`value`. No incluye validaciÃ³n nativa de sintaxis.

## Diff y resumen de commit

`lang="diff"` (alias `patch`, `udiff`) y `lang="commit"` (alias `git-log`,
`git-show`, `commit-resume`) comparten el modo `iswc-diff`, definido dentro del
kit. Los bloques colorean igual en todos los lados porque todos usan el mismo
motor nativo de resaltado.

Por quÃ© un modo propio y no `javascript`: el `+` y el `-` de la primera columna
no son cÃ³digo, son marcas de lÃ­nea. Un tokenizador de lenguaje los lee como
operadores, arrastra el resto de la lÃ­nea a un estado sintÃ¡ctico inexistente y
el bloque acaba coloreado casi al azar, justo donde el lector solo necesita ver
quÃ© entra y quÃ© sale. `iswc-diff` clasifica por lÃ­nea entera y no interpreta el
lenguaje de dentro.

Reconoce:

| Forma | Ejemplo | Pintado |
| --- | --- | --- |
| Cabecera de commit | `commit 7839bd7`, `Author:` | acento + cabecera |
| Cabecera de archivo | `diff --git`, `--- a/x`, `+++ b/x` | archivo (no add/del) |
| Hunk | `@@ -1,4 +1,6 @@` | banda tenue |
| AÃ±adido / borrado | `+linea` / `-linea` | verde / rojo + banda |
| Comentario de contexto | `// situando el extracto` | comentario |
| AnotaciÃ³n | `(commit 8936adb)` | nota tenue |
| Resumen `--stat` | `src/app.js \| 12 ++++----` | ruta, contador y barra por tramos |
| Total | `2 files changed, 8 insertions(+), 4 deletions(-)` | verde / rojo |

`--- a/x` y `+++ b/x` se comprueban **antes** que `+`/`-`: empiezan por esos
signos pero son cabeceras, no contenido cambiado. Del mismo modo `+// nota` es
una lÃ­nea aÃ±adida, no un comentario suelto.

Cada lÃ­nea con significado propio recibe ademÃ¡s una banda de fondo
(`CodeLangDef.lineClass`), porque el color de texto solo no basta cuando hay
muchas lÃ­neas seguidas: la banda es la que deja ver el tamaÃ±o del cambio de un
vistazo.

### `format()` sobre un diff

Un diff no se re-indenta ni se re-comilla â€” sus columnas son datos. Lo Ãºnico que
`format()` toca es la rejilla del `--stat`: alinea ruta, contador y barra en
columnas fijas y junta las barras partidas (`++ --` â†’ `++--`). El ancho se
calcula por bloque contiguo, asÃ­ que dos tablas separadas por prosa no se
contaminan entre sÃ­, y las lÃ­neas que no son `--stat` quedan intactas.

```html
<iswc-code lang="commit" readonly compact wrap="false"
  value="src/app.js | 12 ++++----&#10;src/lib/parse.ts | 2 +-"></iswc-code>
```

## Comportamiento

- Todos los langs usan el motor nativo compartido con el pintor de docs
  (`highlight-code` / `code-highlight`): no hay modos CDN que descargar.
- `python` lo tokeniza el motor nativo como plaintext (sin descargas).
- Los marks que intersectan una ediciÃ³n del usuario se descartan; el sistema
  externo debe reaplicar diagnÃ³sticos.
- Sin `theme-config`, el preset sigue `data-theme` del documento
  (`dark` / `light`).

Documento JSON (`iswc-code-doc/v1`):

```json
{
  "$schema": "iswc-code-doc/v1",
  "lang": "javascript",
  "value": "function add(a, b) {\n  return a + b;\n}",
  "marks": [
    {
      "id": "t1",
      "from": 9,
      "to": 12,
      "kind": "tooltip",
      "title": "add()",
      "body": "Suma dos nÃºmeros."
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

- [`../_shared/code-highlight.ts`](../_shared/code-highlight.ts) â€” motor nativo de resaltado (tokens)
- [`../_shared/code-langs.js`](../_shared/code-langs.js)
- [`../_shared/code-format.js`](../_shared/code-format.js)
- [`../_shared/code-theme.js`](../_shared/code-theme.js)
- [`../_shared/code-model.js`](../_shared/code-model.js)
- [`../_shared/highlight-code.js`](../_shared/highlight-code.js)
- [`../feedback/tooltip.js`](../feedback/tooltip.js) â€” tooltips de marks

Tags del mÃ³dulo: `<iswc-code>`.

Sin dependencias externas: el resaltado y el editor son nativos; no hay que
cargar CodeMirror ni ningÃºn CSS/JS de CDN.

Los snippets de la galerÃ­a (`pre.code`, CDN, Â«Ver cÃ³digoÂ») se montan como
`<iswc-code readonly compact>` vÃ­a `highlight-code.js` â€” los colorea el motor
nativo, igual que cualquier otro snippet.

## Accesibilidad

El Ã¡rea editable es un `<textarea>` transparente sobre el `<pre>` resaltado
(`.ic-edit`), con rol de cÃ³digo.
Soporta navegaciÃ³n por teclado del editor. Los marks exponen `title` nativo
y tooltip IS al hover. Respetar `disabled` / `readonly` (`aria-readonly`).
Con `readonly` no hay caret ni lÃ­nea activa; se puede seleccionar y copiar.

## Ejemplo avanzado

```html
<iswc-code id="ed" lang="typescript" wrap line-numbers></iswc-code>
<script type="module">
  const ed = document.getElementById('ed');
  ed.addEventListener('iswc-ready', () => {
    ed.setDocument({
      $schema: 'iswc-code-doc/v1',
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
- Creer que el tag necesita red o CDN: no â€” resaltado y editor son nativos, no
  se carga nada externo.

## Reglas para LLM

- Reusar `_shared/code-*` y `highlight-code` antes de otro highlighter.
- No inventar langs: registrar con `registerLanguage` o usar built-ins.
- Documentar marks con offsets UTF-16 (como `String` en JS).
- No meter Prettier npm: el formateo es el de `code-format.js`.

## Fuentes

- [JavaScript](code.md)
- [CSS](./code.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./code.json)
