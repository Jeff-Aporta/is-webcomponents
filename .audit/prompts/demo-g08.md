# F0.3 propuesta UX/UI exhaustiva — forms (16 demos: checkbox, color-picker, doc-editor, dropzone, duration-picker, file-input, full-calendar, input, mention, rating, rte, select, signature, slider, switch, textarea)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: forms)

### Demos a auditar (16)
  - src/components/forms/checkbox.preview.ts (behavior)
  - src/components/forms/color-picker.preview.ts (behavior)
  - src/components/forms/doc-editor.preview.ts (behavior)
  - src/components/forms/dropzone.preview.ts (behavior)
  - src/components/forms/duration-picker.preview.ts (behavior)
  - src/components/forms/file-input.preview.ts (behavior)
  - src/components/forms/full-calendar.preview.ts (behavior)
  - src/components/forms/input.preview.ts (behavior)
  - src/components/forms/mention.preview.ts (behavior)
  - src/components/forms/rating.preview.ts (behavior)
  - src/components/forms/rte.preview.ts (behavior)
  - src/components/forms/select.preview.ts (behavior)
  - src/components/forms/signature.preview.ts (behavior)
  - src/components/forms/slider.preview.ts (behavior)
  - src/components/forms/switch.preview.ts (behavior)
  - src/components/forms/textarea.preview.ts (behavior)

### JSON de cada demo (estructura + secciones)
  - src/components/forms/checkbox.json (estructura)
  - src/components/forms/color-picker.json (estructura)
  - src/components/forms/doc-editor.json (estructura)
  - src/components/forms/dropzone.json (estructura)
  - src/components/forms/duration-picker.json (estructura)
  - src/components/forms/file-input.json (estructura)
  - src/components/forms/full-calendar.json (estructura)
  - src/components/forms/input.json (estructura)
  - src/components/forms/mention.json (estructura)
  - src/components/forms/rating.json (estructura)
  - src/components/forms/rte.json (estructura)
  - src/components/forms/select.json (estructura)
  - src/components/forms/signature.json (estructura)
  - src/components/forms/slider.json (estructura)
  - src/components/forms/switch.json (estructura)
  - src/components/forms/textarea.json (estructura)

## Misión
Para CADA demo de este grupo, escribe **al menos 12 propuestas de test UX/UI** que NO estén ya cubiertas. Los tests deben ejercitar comportamiento del usuario real (no solo del desarrollador).

## Categorías obligatorias (adapta al tipo de demo)

### 1. Interacción (5+ propuestas por demo)
- Click en cada botón visible: ¿qué hace? ¿cambia el DOM? ¿emite evento?
- Doble-click, click derecho, long-press donde aplique
- Hover: ¿cambia estilo? ¿aparece tooltip?
- Focus: ¿se ve outline? ¿se restaura al cerrar modal?
- Drag & drop si el demo lo soporta

### 2. Teclado (3+ propuestas)
- Tab navega por todos los controles focuseables (¿orden lógico?)
- Shift+Tab regresa
- Enter activa el control focused (botón → click, input → submit)
- Space activa botones/checkboxes
- Escape cierra modales/popovers
- Arrow keys para listas/menus/grids
- Atajos documentados (Alt+X, Ctrl+S, etc.)

### 3. ARIA / a11y (2+ propuestas)
- role="..." correcto en cada landmark
- aria-label o aria-labelledby en botones de icono
- aria-expanded en toggles/menus
- aria-selected en tabs/options
- aria-live polite/assertive en regiones dinámicas (toast, status)
- aria-describedby en inputs con hint/help

### 4. Estados visuales y edge cases (2+ propuestas)
- Estado disabled: opacidad, pointer-events, aria-disabled
- Estado readonly vs disabled (¿son diferentes?)
- Estado loading/skeleton
- Estado error (validación, red, timeout)
- Contenido vacío (0 items, valor vacío)
- Contenido muy largo (texto overflow, scroll interno)
- Tema dark/light toggle

## Forma de la propuesta

Para cada demo, escribe un bloque:

```markdown
### demo: checkbox
#### Tests existentes (resumen, brevísimo)
- ...
#### Propuestas nuevas

1. **<título>** — [categoría]
   - Setup: <cómo preparar la página>
   - Acción: <paso a paso>
   - Assertion: <resultado verificable en código>
   - Cobertura: <edge case / branch>

2. **<título>** — [categoría]
   ...

(12+ propuestas por demo)
```

## Output
Sobrescribe el archivo `.audit/proposals/demo-g08.md` con la salida completa en markdown.

## Reglas duras
- **NO** modifiques archivos del proyecto (src/, dist/, scripts/, etc.).
- **NO** expliques tu razonamiento; el output es SOLO la propuesta.
- **SÍ** incluye el header "### demo: <tag>" para cada demo del grupo.
- **SÍ** escribe 12+ propuestas por demo (no menos).
- **SÍ** adapta las categorías al tipo (botones → click, forms → validación, modales → focus-trap).
