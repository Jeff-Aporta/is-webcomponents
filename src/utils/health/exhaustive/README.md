# Auditoría exhaustiva de componentes is-webcomponents

Este directorio contiene tests exhaustivos (UI + UX + lógica + edge cases) por componente, organizados por categoría.

## Estructura

```
src/utils/health/exhaustive/
├── actions/       # button, button-group, check-icon-button, icon-button, split-button, toggle-group
├── charts/        # bar, line, pie, doughnut, radar, polar-area, scatter, bubble, sparkline, gauge, treemap, heatmap, waterfall, funnel, chart
├── data/          # data-grid, kanban, pivot-table, spreadsheet, transfer, transfer-item, stat, chart-card
├── diagrams/      # flowchart, sequence-diagram, class-diagram, ...
├── forms/         # input, textarea, select, date-field, color-picker, signature, ...
├── helpers/       # format-date, relative-time, md-render, md-editor, observers, ...
├── isp/           # block-layout, tree-view, ...
├── layout/        # split-panel, demo, preview-component, ...
├── media/         # audio-recorder, video-player, barcode-scanner, speech, ...
├── navigation/    # tabs, breadcrumb, menu, ...
├── preview/       # preview
├── surfaces/      # card, accordion, dialog, drawer, ...
├── feedback/      # alert, toast, badge, ...
├── typography/    # heading, text, ...
└── ai/            # chat, prompt, ...
```

## Reglas para escribir los tests

Cada test exhaustivo por componente cubre, **como mínimo, las 10 dimensiones**:

1. **Render básico** — `customElements.define` registrado, `connectedCallback` se invoca sin errores, Shadow DOM presente.
2. **Atributos observados** — cambiar cada atributo declarado en `observedAttributes` dispara `attributeChangedCallback(name, oldValue, newValue)`.
3. **Eventos** — los eventos declarados (`is-change`, `is-click`, etc.) se emiten con `detail` correcto.
4. **Slots** — slots declarados (`slot="x"`) proyectan children.
5. **Shadow DOM** — partes (`::part(x)`), pseudo-clases `:host`, CSS custom properties (`--var-name`).
6. **JSON payload** — `<script type="application/json">` se parsea y se aplica a `host.config`/`host.data`/etc.
7. **Accessibility (a11y)** — `role`, `aria-*`, navegación por teclado (Tab/Enter/Esc/Space), focus trap si aplica.
8. **Edge cases** — atributos vacíos (`""`), booleanos como string (`"true"`/`"false"`), unicode en labels, valores fuera de rango (e.g. `min > max`), fechas inválidas (`"not-a-date"`).
9. **Integración** — montaje dentro de `document.body` (no detached), coexistencia con otros WC, persistencia tras re-mount.
10. **Performance** — sin memory leaks en `disconnectedCallback`, sin event listeners zombies.

## Plantilla mínima por test

```typescript
// src/utils/health/exhaustive/<categoría>/<componente>.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';

const TAG = 'is-<componente>';

void async () => {
  // Cargar el módulo del componente antes de cualquier test.
  await import('../../../../components/<categoría>/<componente>.ts').catch(() => {});
}();

test(`<componente>: render básico`, async () => {
  const el = document.createElement(TAG);
  document.body.appendChild(el);
  assert.ok(customElements.get(TAG), `${TAG} debe estar registrado`);
  assert.ok(el.shadowRoot, `${TAG} debe tener Shadow DOM`);
  el.remove();
});

test(`<componente>: atributos observados reaccionan`, async () => {
  const el = document.createElement(TAG);
  document.body.appendChild(el);
  // ... probar cada atributo declarado ...
  el.remove();
});

// ... más tests ...
```

## Cómo correr los tests

```bash
# Todos los tests exhaustivos de una categoría
node --import ./scripts/ts-resolve-hook.ts --test src/utils/health/exhaustive/<categoría>/*.test.ts

# Todos los exhaustivos
node --import ./scripts/ts-resolve-hook.ts --test src/utils/health/exhaustive/**/*.test.ts

# Solo un componente
node --import ./scripts/ts-resolve-hook.ts --test src/utils/health/exhaustive/<categoría>/<componente>.test.ts
```

## Estado actual (post-tanda 1)

Ver `docs/AUDITORIA-EXHAUSTIVA-RESULTADOS.md` para los resultados consolidados.
