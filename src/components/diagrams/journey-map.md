---
tag: is-journey-map
tags:
  - is-journey-map
category: diagrams
status: public
source: ./journey-map.js
style: ./journey-map.css
preview: ../../previews/diagrams/is-journey-map.json
---
# `<is-journey-map>`

## Propósito

Mapa de **recorrido de usuario** en SVG, sin Mermaid: fases arriba, pasos en
orden y la curva de satisfacción que los atraviesa.

Este módulo registra `<is-journey-map>`.

## Cuándo usarlo

Cuando además del orden hay una **medida** por paso: dónde se cae la
experiencia, en qué fase, y de quién es ese paso.

## Cuándo no usarlo

Si solo hay hitos en el tiempo → `<is-timeline>`. Si hay decisiones y
bifurcaciones → `<is-flowchart>`.

## Importación

```js
import './journey-map.js';
```

## Ejemplo mínimo

```html
<is-journey-map>
  <script type="application/json">
    {}
  </script>
</is-journey-map>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isViewer` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `spec` | solo lectura | Declarada por clase. |
| `layout` | solo lectura | Declarada por clase. |
| `hiddenPhases` | lectura/escritura | Fases ocultas por el visor. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-open-viewer` | sí | sí | sí | sí |
| `is-toggle-phase` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `updateComplete()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

La escala por defecto es 1..5 y se cambia con `scale`. Un paso sin `score` se dibuja como aro punteado y la curva no pasa por él: un dato que falta no es un cero.

Documentación de cabecera preservada desde fuente:

> <is-journey-map> — mapa de recorrido (user journey) en SVG, sin Mermaid.
>   <is-journey-map>
>     <script type="application/json">
>       { "journey": { "phases": [...], "steps": [{ "label": "...", "score": 4 }] } }
>     </script>
>   </is-journey-map>
> Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, hiddenPhases
> Eventos: is-render, is-open-viewer, is-toggle-phase

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./journey-spec.js`](./journey-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del módulo: `<is-journey-map>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galería, que trae el payload completo con grupos y estilos:
[`../../previews/diagrams/is-journey-map.json`](../../previews/diagrams/is-journey-map.json).

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./journey-map.js)
- [CSS](./journey-map.css)
- [Spec y layout](./journey-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-journey-map.json)
