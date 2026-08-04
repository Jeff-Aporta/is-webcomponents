---
tag: is-accordion-group
tags:
  - is-accordion-group
category: isp
status: public
source: ./accordion-group.js
style: ./accordion-group.css
preview: ../../previews/isp/is-accordion-group.html
---
# `<is-accordion-group>`

## Propósito

Coordinador de varios `<is-details>`. Port de
`src/lib/navigation/accordion/Accordion.svelte` (ISP-SvelteComponents), donde el
contenedor mantenía la lista de abiertos y el item solo la consultaba.

Este módulo registra `<is-accordion-group>`.

## Cuándo usarlo

Cuando varios disclosures deben comportarse como un acordeón: uno abierto a la
vez, o varios con `multiple`.

## Cuándo no usarlo

No usar para un único disclosure: para eso está `<is-details>` a secas. Tampoco
para pestañas — eso es `<is-tab-group>`.

## Importación

```js
import './accordion-group.js';
```

## Ejemplo mínimo

```html
<is-accordion-group>
  <is-details summary="Datos básicos" open>…</is-details>
  <is-details summary="Contacto">…</is-details>
</is-accordion-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `multiple` | boolean | Permite varios paneles abiertos. Sin él, abrir uno cierra el resto. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `multiple` | lectura/escritura | Refleja el atributo. |
| `items` | solo lectura | `<is-details>` proyectados, en orden. |
| `openItems` | solo lectura | Subconjunto abierto. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Uno o más `<is-details>`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-accordion-change` | `{ open, opened, closed }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `showAll()` | Abre todos (solo con `multiple`). |
| `hideAll()` | Cierra todos. |

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-accordion-gap` | Separación vertical entre paneles. |

## Comportamiento

El grupo NO reimplementa el disclosure: escucha los `is-show` / `is-hide`
(composed) de sus `<is-details>` hijos y cierra los demás cuando toca. Si el
markup llega con varios `open` y no hay `multiple`, sobrevive el primero.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../layout/details.js`](../layout/details.js)

Tags del módulo: `<is-accordion-group>`.

## Accesibilidad

Cada panel conserva el `aria-expanded` y el botón de `<is-details>`.

## Errores comunes

- Anidar los `<is-details>` dentro de un wrapper: deben ser hijos directos.
- Usar el atributo `name` de `<is-details>` a la vez que el grupo (doble coordinación).

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./accordion-group.js)
- [CSS](./accordion-group.css)
- [Preview](../../previews/isp/is-accordion-group.html)
