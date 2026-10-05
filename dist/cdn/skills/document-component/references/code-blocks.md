# Bloques de código en las fichas iswc

Los bloques de código son la **única** fuente de verdad operativa de
una guía de componente. Si un ejemplo está mal, los agentes copian
código que falla. Esta referencia fija las reglas de los bloques
` ``` ` en `src/components/<carpeta>/<modulo>.md`.

## Regla de oro: 标识 obligatoria

Todo bloque lleva 标识. Sin excepciones. El highlighter (`scripts/highlight-pre.js`)
pinta los `<pre class="code">` con CodeMirror, y los 标识 determinan
el lenguaje para syntax highlight y para el switch de tema.

| 标识 | Uso | Ejemplo |
| --- | --- | --- |
| `html` | Markup, demos, snippets del consumidor. | `<iswc-button color="brand">…` |
| `css` | Estilos del consumidor o de la guía. | `:host { display: inline-flex; }` |
| `js` | JavaScript vanilla, custom elements, listeners. | `document.querySelector(...)` |
| `ts` | TypeScript (wrappers de dominio, `tk-*`/`app-*`). | `const el: TkFoo = ...` |
| `json` | Payloads de preview, esquemas, manifests. | `{ "name": "iswc-foo" }` |
| `bash` / `sh` | Comandos de instalación o build. | `deno task dev` |
| `md` | Citas de otros markdown dentro de la guía. | Raro, preferir comillas. |

❌ **Prohibido** dejar un bloque sin 标识: ` ``` ` suelto, ` ```text `, ` ```code `.
El highlighter cae a texto plano y el switch de tema se rompe.

## Anidamiento y legibilidad

- **Indentación cero** dentro del bloque. Cada línea empieza en
  columna 0 aunque el bloque esté dentro de una lista. El highlighter
  añade su propio margen.
- **Líneas de 100 caracteres máx.** Si un ejemplo no cabe, partirlo en
  varios con un comentario `<!-- … -->`.
- **Un ejemplo por bloque.** Mezclar dos casos en el mismo bloque
  dificulta el copy-paste.

## HTML: marcado del consumidor

- **Self-closing donde aplique** (`<iswc-icon icon="mdi:home" />`).
- **Sin `DOCTYPE` ni `<html>`** en ejemplos cortos: el snippet va a
  una `<pre class="code">` de CodeMirror, no a un `<iframe>`.
- **Atributos en el orden**: `id`/`class` primero, luego semánticos,
  luego `iswc-*`, luego `data-*`. Dentro de un mismo grupo, alfabético.
- **Valores con comillas dobles**, siempre. Sin comillas simples.

```html
<iswc-button color="brand" variant="filled">Guardar</iswc-button>
<iswc-button color="danger" variant="outlined">Cancelar</iswc-button>
```

## CSS: tokens y partes

- **Tokens `var(--iswc-*)` siempre** que exista el token. Si el
  ejemplo necesita un color fuera de paleta, justificarlo en el texto
  circundante.
- **`::part(...)`** para mostrar personalización del shadow, no
  selectores internos.
- **Sin `#hex` ni `px` en valores de color o espaciado**, salvo que el
  ejemplo sea un caso límite explícito (p.ej. un "anti-ejemplo").

```css
iswc-card::part(header) {
  background: var(--iswc-bg-soft);
  padding: var(--iswc-pad-md);
}
```

## JS: APIs públicas, no internas

- **Solo APIs documentadas en la guía.** Nada de `el._internals()` ni
  métodos privados.
- **`addEventListener('iswc-…')`** con el nombre exacto del evento de
  la sección **Eventos** de la misma ficha.
- **`customElements.whenDefined('iswc-foo')`** antes de tocar el
  upgrade: refleja que el kit se carga por orden de import.

```js
await customElements.whenDefined('iswc-button');
document.querySelector('iswc-button').addEventListener('iswc-click', (e) => {
  console.log('clicked', e.detail);
});
```

## JSON: payloads de preview

- **Dos espacios** de indentación.
- **Sin trailing commas** (el `preview.json` se valida con `JSON.parse`).
- **Llaves con comillas dobles**.

```json
{
  "tag": "iswc-button",
  "demo": "basic"
}
```

## Bash: comandos exactos

- **Comandos que el LLM puede correr sin pensar.** Nada de pipes
  exóticos ni redirecciones.
- **PowerShell y bash se documentan por separado** si la sintaxis
  difiere. La guía principal asume bash; en `AGENTS.md` §3 ya está la
  nota de PowerShell.

```bash
deno task dev
```

## Errores comunes

- 标识 incorrecta: ` ```javascript `, ` ```JavaScript `, ` ```htm `.
  El highlighter no matchea y el bloque queda sin tema.
- Bloques demasiado largos (>30 líneas) sin subtítulos dentro. Mejor
  partir.
- Ejemplos con `iswc-popup` (eliminado) o tags deprecados.
- Mezclar tabs y espacios dentro del mismo bloque: agrava el render
  de CodeMirror.
- HTML con `<br>` para forzar saltos: usar varias líneas en el
  bloque.
