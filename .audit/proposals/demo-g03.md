# F0.3 propuesta UX/UI exhaustiva — code (1 demos: code)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: code)

### Demos a auditar (1)
- src/components/code/code.preview.ts (behavior)
- src/components/code/code.json (estructura)

---

### demo: code

#### Tests existentes (resumen, brevísimo)
- (No se han identificado tests UX/UI previos sobre `<is-code>`; la cobertura previa —si existe— se limita a smoke rendering de CodeMirror dentro del Shadow DOM.)

#### Propuestas nuevas

1. **Selector de lenguaje visible y operable por teclado** — [interacción]
   - Setup: Cargar la página del demo `code` y esperar a que `<is-code>` esté en `DOMContentLoaded`; localizar el control `<select>` o combobox interno de CodeMirror para elegir lenguaje (HTML, JS, TS, CSS, JSON, Markdown).
   - Acción: Hacer click en el selector, elegir la opción "JavaScript" en la lista desplegable; luego cerrar con Escape y reabrir con Enter.
   - Assertion: El panel de código se re-sintaxis-tiza (los tokens cambian de color/clase), y el atributo `data-language` (o equivalente interno) refleja `javascript`.
   - Cobertura: Cambio de lenguaje en caliente sin perder el contenido editado.

2. **Botón de formato (re-indentar) responde y persiste visualmente** — [interacción]
   - Setup: Cargar el demo con un snippet mal indentado (p. ej. pegado desde un minificado).
   - Acción: Click en el botón "Format" / "Re-indent".
   - Assertion: El contenido del editor reescribe con indentación consistente; no hay pérdida de líneas; el scroll vertical se reajusta.
   - Cobertura: Idempotencia (segundo click no rompe el código), bloque vacío no lanza excepción visible en consola.

3. **Theme switcher (light/dark) aplicado sin parpadeo de tokens rotos** — [interacción / estados]
   - Setup: Renderizar el demo en tema claro por defecto.
   - Acción: Click en el toggle de tema; alternar a dark y volver a light varias veces.
   - Assertion: Todos los tokens de sintaxis, gutter, línea actual y selección siguen siendo legibles en ambos temas (contraste WCAG AA en `--is-code-fg` y `--is-code-bg`).
   - Cobertura: Sin parpadeo blanco/negro; sin "unstyled flash" del Shadow DOM durante el swap.

4. **Tooltips en los marks (decoraciones de líneas) se muestran al hover** — [interacción]
   - Setup: Localizar las marks (`CodeMirror.markText` / `gutter`) en el gutter lateral; el demo debe incluir al menos una marca con `attributes.title`.
   - Acción: Hover con puntero sobre el icono/decoración de la marca.
   - Assertion: Aparece `title` nativo o popover con texto descriptivo (`aria-describedby` opcional) y desaparece al mover fuera.
   - Cobertura: Múltiples marks en la misma línea no se solapan; tooltip no queda huérfano.

5. **Roundtrip json2code → code2json preserva contenido** — [interacción / edge]
   - Setup: Cargar el editor con un JSON de ejemplo serializado desde el modelo interno.
   - Acción: Editar manualmente una propiedad (cambiar un valor), pulsar el botón "Export JSON" o consumir el evento `code-change`; copiar la salida; invertir el proceso cargando ese JSON.
   - Assertion: El editor reconstruye el mismo texto original (mismas líneas, mismo orden, mismos comentarios `#`).
   - Cobertura: Saltos de línea CRLF/LF normalizados; caracteres no-ASCII (acentos, emojis) preservados.

6. **Scroll vertical en snippets largos mantiene la línea actual visible** — [interacción / teclado]
   - Setup: Cargar un snippet > 500 líneas (o generarlo en runtime con `setValue`).
   - Acción: Pulsar `Ctrl+End` para ir al final; luego `Ctrl+Home` para volver al inicio; pulsar `Page Down`/`Page Up`.
   - Assertion: La línea activa siempre queda visible (no queda fuera del viewport); el scroll sigue al cursor.
   - Cobertura: Scroll suave sin "saltos" en `<scroll-wrapper>` del Shadow DOM.

7. **Numeración de líneas estable al insertar/borrar** — [interacción]
   - Setup: Cargar snippet con 20 líneas numeradas.
   - Acción: Insertar una línea nueva en la mitad (`Enter` sobre línea 10); borrar otra línea con `Shift+End` + `Backspace`.
   - Assertion: El gutter actualiza el contador de manera incremental; las líneas siguientes se renumeran sin "1, 2, 3, 3, 5…" (off-by-one).
   - Cobertura: Numeración continua tras undo/redo (`Ctrl+Z` / `Ctrl+Y`).

8. **Botón "Copy" copia al portapapeles y muestra feedback visual** — [interacción / ARIA]
   - Setup: Renderizar demo con un botón "Copy" que invoca `navigator.clipboard.writeText`.
   - Acción: Click en "Copy"; verificar permiso/contenido del portapapeles; hacer foco y activar con `Enter` y `Space`.
   - Assertion: El portapapeles contiene exactamente el texto visible del editor; un toast/label ARIA-live anuncia "Copied" en < 1.5 s.
   - Cobertura: Cambia el icono/literal del botón a "Copied" durante ~1.5 s y vuelve al original; texto seleccionado se mantiene.

9. **Tab navega por los controles focuseables del Shadow DOM en orden lógico** — [teclado / a11y]
   - Setup: Poner foco en la raíz del host `<is-code>` con `tabindex=0` o en el editor.
   - Acción: Pulsar `Tab` repetidamente; capturar el orden y los elementos focuseables (selector de lenguaje, botón format, botón copy, theme toggle, code mirror).
   - Assertion: El orden sigue la lectura visual (left-to-right, top-to-bottom); cada `Tab`/`Shift+Tab` cicla sin trampas de foco.
   - Cobertura: Foco no se escapa al `<body>` ni queda atrapado en el editor (puede salir con `Shift+Tab`).

10. **Atajos de teclado documentados funcionan (Save / Format / Find)** — [teclado]
    - Setup: Revisar la spec/JSON del demo para listar atajos declarados (p. ej. `Ctrl+S`, `Ctrl+Shift+F`, `Ctrl+/`).
    - Acción: Pulsar cada atajo con código en el editor.
    - Assertion: Se dispara el evento correspondiente (`format`, `save`, `find`) o se abre el panel de búsqueda; el editor no pierde foco; la búsqueda resalta el match y `Enter` navega al siguiente.
    - Cobertura: Atajos no pisan los nativos del navegador fuera del editor.

11. **Roles ARIA y atributos en el host y sus controles internos** — [a11y]
    - Setup: Localizar el host `<is-code>` y los slots/controles internos.
    - Acción: Inspeccionar el árbol de accesibilidad con `getByRole`/`getByLabel`; verificar `role="textbox"` o `role="code"` en el editor; `role="combobox"` + `aria-expanded` en el selector de lenguaje; `aria-label` en cada botón de icono.
    - Assertion: Cada control tiene un nombre accesible (`accessibleName` no vacío); el editor expone `aria-multiline="true"` y `aria-label="Code editor"` o equivalente.
    - Cobertura: Lector de pantalla (NVDA/VoiceOver simulado) lee "Code editor, JavaScript, 12 lines".

12. **Estados visuales: disabled, readonly, loading y error** — [estados / edge]
    - Setup: Forzar mediante atributo (`disabled`, `readonly`) o prop en el host.
    - Acción: Renderizar el editor en cada estado; intentar escribir, copiar y formatear.
    - Assertion: En `disabled`: `aria-disabled="true"`, opacidad reducida (CSS `--is-code-disabled-opacity`), no responde a teclado ni click. En `readonly`: el cursor se posiciona pero la edición está bloqueada y se anuncia con `aria-readonly="true"`. Estado `loading`: skeleton/spinner en el slot del editor; `aria-busy="true"`. Estado `error`: borde rojo + mensaje visible y `role="alert"`.
    - Cobertura: Cambio entre estados no destruye contenido ya cargado.

13. **Contenido vacío y muy largo no rompe el layout del host** — [estados / edge]
    - Setup: Cargar editor con `value=""`; después con un string de 50 000 caracteres sin saltos de línea.
    - Acción: Medir altura del host antes y después; capturar overflow visible.
    - Assertion: Vacío: gutter muestra "1" sin error; el `min-height` del editor se respeta. Muy largo: aparece scroll horizontal interno (no rompe el layout externo); no se desborda el host `<is-code>`.
    - Cobertura: Caracteres CJK y emojis se renderizan con la misma métrica que ASCII (no se colapsa el gutter).

14. **Tema oscuro persistente entre demos / cross-component** — [estados / tema]
    - Setup: Activar `data-theme="dark"` en `<html>`; refrescar.
    - Acción: Navegar desde el demo `code` al demo `editor` (o a otro componente que use tokens `--is-*`) y volver.
    - Assertion: Las variables CSS `--is-code-bg` y `--is-code-fg` se mantienen; sin "flash of unstyled theme" (FOUT); los tokens cambian al alternar el toggle.
    - Cobertura: El host `<is-code>` no define estilos `!important` que pisen el toggle global.

15. **Eventos personalizados (`code-change`, `language-change`, `format`) son confiables** — [interacción]
   - Setup: Suscribirse en `page.exposeFunction` o vía `addEventListener` sobre el host.
   - Acción: Realizar cambios mínimos (escribir un carácter, cambiar lenguaje, pulsar format) y contar emisiones (`detail.value`, `detail.language`, etc.).
   - Assertion: Cada acción emite exactamente un evento con `bubbles: true` y `composed: true` (atraviesa Shadow DOM); payload sincrónico con el DOM.
   - Cobertura: Eventos no se duplican en `mouseup` + `keyup`; undo/redo emiten `code-change` con el texto restaurado.

16. **Foco visible y restauración tras interacciones** — [teclado / a11y]
    - Setup: Poner foco en el editor; abrir un popover (p. ej. find) y cerrarlo con Escape.
    - Acción: Pulsar `Tab` para entrar y `Shift+Tab` para salir; verificar `focus-visible` con la pseudoclase CSS.
    - Assertion: Existe outline visible (`outline: 2px solid var(--is-focus-ring)`) sólo cuando el foco viene de teclado, no de click; tras cerrar el popover el foco vuelve al editor original.
    - Cobertura: Foco no se pierde al cambiar de lenguaje o tema.

---

(Fin del grupo `code` — 16 propuestas para 1 demo.)
