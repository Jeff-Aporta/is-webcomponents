# F0.3 propuesta UX/UI exhaustiva — actions (5 demos: button, button-group, context-menu, dropdown, speed-dial)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: actions)

### Demos a auditar (5)
  - src/components/actions/button.preview.ts (behavior)
  - src/components/actions/button-group.preview.ts (behavior)
  - src/components/actions/context-menu.preview.ts (behavior)
  - src/components/actions/dropdown.preview.ts (behavior)
  - src/components/actions/speed-dial.preview.ts (behavior)

### JSON de cada demo (estructura + secciones)
  - src/components/actions/button.json (estructura)
  - src/components/actions/button-group.json (estructura)
  - src/components/actions/context-menu.json (estructura)
  - src/components/actions/dropdown.json (estructura)
  - src/components/actions/speed-dial.json (estructura)

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
### demo: button
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
Sobrescribe el archivo `.audit/proposals/demo-g01.md` con la salida completa en markdown.

## Reglas duras
- **NO** modifiques archivos del proyecto (src/, dist/, scripts/, etc.).
- **NO** expliques tu razonamiento; el output es SOLO la propuesta.
- **SÍ** incluye el header "### demo: <tag>" para cada demo del grupo.
- **SÍ** escribe 12+ propuestas por demo (no menos).
- **SÍ** adapta las categorías al tipo (botones → click, forms → validación, modales → focus-trap).
