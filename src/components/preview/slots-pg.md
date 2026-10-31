---
tag: iswc-slots-pg
tags:
  - iswc-slots-pg
category: preview
status: internal
source: ./slots-pg.ts
style: ./slots-pg.scss
preview: ./slots-pg.json
---
# `<iswc-slots-pg>` — Helper para playgrounds con slots

## Cuándo usarlo

En el demo de un componente con slots, para mostrar la instancia simple y la versión con todos los slots.

## Cuándo no usarlo

En un componente sin slots: basta con un bloque `demo` con `controls`. No va en vistas de producto.

## Importación

```js
import './slots-pg.js';
```

## Ejemplo mínimo

```html
<iswc-slots-pg tag="iswc-button">
  <iswc-button>Texto</iswc-button>
  <iswc-icon slot="start" icon="mdi:check"></iswc-icon>
</iswc-slots-pg>
```

## Propósito

Estándar W11: cualquier componente que tenga slots debe envolver su playground
en `<iswc-slots-pg tag="<iswc-x>">` con dos tabs:

1. **Tab "Simple"**: la instancia viva (1 instancia + controles).
2. **Tab "Slots"**: un segundo ejemplar con TODOS los slots, mostrando:
   - Estructura interna del Shadow DOM (HTML con parts) — read-only.
   - Implementacion real del componente con slots editables.
   - Code dropdown editable por cada slot.
   - Boton "Restart" para resetear todo al estado inicial.

Layout del tab Slots (split horizontal):

- **Izquierda** (read-only): el Shadow DOM template del componente.
- **Derecha** (editable): la implementacion real con slots editables.
- Abajo: un editor por cada slot detectado, dentro de `<details>` colapsables.
- Abajo: boton Restart que reconstruye todo desde el snapshot inicial.

Uso:

```html
<iswc-slots-pg tag="iswc-button">
  <iswc-button>Texto</iswc-button>
  <iswc-icon slot="start" icon="mdi:check"></iswc-icon>
  <iswc-icon slot="end" icon="mdi:arrow-right"></iswc-icon>
</iswc-slots-pg>
```

Los hijos con `slot="X"` son el contenido inicial de cada slot. Los hijos sin
`slot` van al default slot. El componente detecta automaticamente los slots
reales del componente target introspectando su Shadow DOM.

## API

| Atributo | Notas |
| --- | --- |
| `tag` | Componente que se demuestra. |
| `title` | Título. |
| `default-tab` | Pestaña inicial: `simple` o `slots`. |

## Comportamiento

Reparte los hijos en dos pestañas, muestra el template del Shadow DOM y deja editar cada slot. `Restart` vuelve al estado inicial.

## Accesibilidad

Las pestañas usan `role="tablist"`, `role="tab"` y `role="tabpanel"`. Cada editor de slot tiene `aria-label`.

## Reglas para LLM

- Solo para demos.
- `tag` es obligatorio.
