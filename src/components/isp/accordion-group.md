---
tag: iswc-accordion-group
tags:
  - iswc-accordion-group
category: isp
status: public
source: ./accordion-group.ts
style: ./accordion-group.css
preview: ./accordion-group.json
---
# `<iswc-accordion-group>`

## PropÃ³sito

Coordinador de varios `<iswc-details>`. Port de
`src/lib/navigation/accordion/Accordion.svelte` (ISP-SvelteComponents), donde el
contenedor mantenÃ­a la lista de abiertos y el item solo la consultaba.

Este mÃ³dulo registra `<iswc-accordion-group>`.

## CuÃ¡ndo usarlo

Cuando varios disclosures deben comportarse como un acordeÃ³n: uno abierto a la
vez, o varios con `multiple`.

## CuÃ¡ndo no usarlo

No usar para un Ãºnico disclosure: para eso estÃ¡ `<iswc-details>` a secas. Tampoco
para pestaÃ±as â€” eso es `<iswc-tab-group>`.

## ImportaciÃ³n

```js
import './accordion-group.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-accordion-group>
  <iswc-details summary="Datos bÃ¡sicos" open>â€¦</iswc-details>
  <iswc-details summary="Contacto">â€¦</iswc-details>
</iswc-accordion-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `multiple` | boolean | Permite varios paneles abiertos. Sin Ã©l, abrir uno cierra el resto. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `multiple` | lectura/escritura | Refleja el atributo. |
| `items` | solo lectura | `<iswc-details>` proyectados, en orden. |
| `openItems` | solo lectura | Subconjunto abierto. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Uno o mÃ¡s `<iswc-details>`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-accordion-change` | Evento personalizado del componente (accordion change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-accordion-change` | `{ open, opened, closed }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-accordion-group');
el.addEventListener('iswc-accordion-change', (e) => {
  console.log('iswc-accordion-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
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
| `--iswc-accordion-gap` | SeparaciÃ³n vertical entre paneles. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

El grupo NO reimplementa el disclosure: escucha los `iswc-show` / `iswc-hide`
(composed) de sus `<iswc-details>` hijos y cierra los demÃ¡s cuando toca. Si el
markup llega con varios `open` y no hay `multiple`, sobrevive el primero.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../layout/details.js`](../layout/details.js)

Tags del mÃ³dulo: `<iswc-accordion-group>`.

## Accesibilidad

Cada panel conserva el `aria-expanded` y el botÃ³n de `<iswc-details>`.

## Ejemplo avanzado

```html
<iswc-accordion-group id="faq" multiple>
  <iswc-details summary="FacturaciÃ³n">Contenido</iswc-details>
  <iswc-details summary="NÃ³mina">Contenido</iswc-details>
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
- Usar el atributo `name` de `<iswc-details>` a la vez que el grupo (doble coordinaciÃ³n).

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./accordion-group.ts)
- [CSS](./accordion-group.css)
- [Preview](./accordion-group.json)
