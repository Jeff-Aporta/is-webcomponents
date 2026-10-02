---
tag: iswc-accordion-group
tags:
  - iswc-accordion-group
category: isp
status: public
source: ./accordion-group.js
style: ./accordion-group.css
preview: ./accordion-group.json
---
# `<iswc-accordion-group>`

## Propósito

Coordinador de varios `<iswc-details>`. Port de
`src/lib/navigation/accordion/Accordion.svelte` (ISP-SvelteComponents), donde el
contenedor mantenía la lista de abiertos y el item solo la consultaba.

Este módulo registra `<iswc-accordion-group>`.

## Cuándo usarlo

Cuando varios disclosures deben comportarse como un acordeón: uno abierto a la
vez, o varios con `multiple`.

## Cuándo no usarlo

No usar para un único disclosure: para eso está `<iswc-details>` a secas. Tampoco
para pestañas — eso es `<iswc-tab-group>`.

## Importación

```js
import './accordion-group.js';
```

## Ejemplo mínimo

```html
<iswc-accordion-group>
  <iswc-details summary="Datos básicos" open>…</iswc-details>
  <iswc-details summary="Contacto">…</iswc-details>
</iswc-accordion-group>
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
| `items` | solo lectura | `<iswc-details>` proyectados, en orden. |
| `openItems` | solo lectura | Subconjunto abierto. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Uno o más `<iswc-details>`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-accordion-change` | `{ open, opened, closed }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `showAll()` | Abre todos (solo con `multiple`). |
| `hideAll()` | Cierra todos. |

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-accordion-gap` | Separación vertical entre paneles. |


### Integración con formularios

No declara integración form-associated.
## Comportamiento

El grupo NO reimplementa el disclosure: escucha los `iswc-show` / `iswc-hide`
(composed) de sus `<iswc-details>` hijos y cierra los demás cuando toca. Si el
markup llega con varios `open` y no hay `multiple`, sobrevive el primero.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../layout/details.js`](../layout/details.js)

Tags del módulo: `<iswc-accordion-group>`.

## Accesibilidad

Cada panel conserva el `aria-expanded` y el botón de `<iswc-details>`.

## Ejemplo avanzado

```html
<iswc-accordion-group id="faq" multiple>
  <iswc-details summary="Facturación">Contenido</iswc-details>
  <iswc-details summary="Nómina">Contenido</iswc-details>
</iswc-accordion-group>

<script type="module">
  const faq = document.getElementById('faq');
  faq.addEventListener('iswc-accordion-change', (e) => {
    console.log(e.detail.opened, e.detail.closed);
  });
  faq.showAll();
</script>
```

## Errores comunes

- Anidar los `<iswc-details>` dentro de un wrapper: deben ser hijos directos.
- Usar el atributo `name` de `<iswc-details>` a la vez que el grupo (doble coordinación).

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./accordion-group.js)
- [CSS](./accordion-group.css)
- [Preview](./accordion-group.json)
