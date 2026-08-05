---
tag: is-form
tags:
  - is-form
category: isp
status: public
source: ./form.js
style: ./form.css
preview: ../../previews/isp/is-form.html
---
# `<is-form>`

## Propósito

Formulario de ficha portado de `src/lib/form/Form.svelte` (ISP-SvelteComponents):
cabecera, cuerpo scrolleable y un pie que ya trae los botones Aceptar / Cancelar.

Este módulo registra `<is-form>`.

## Cuándo usarlo

Fichas de creación / edición / consulta con la misma estructura y el mismo par de
botones en todas las pantallas.

## Cuándo no usarlo

No usar como contenedor genérico de campos sueltos: si no hay acción de aceptar
ni de cancelar, basta con un `<form>` nativo o un layout.

## Importación

```js
import './form.js';
```

## Ejemplo mínimo

```html
<is-form mode="edit">
  <h3 slot="header">Nuevo tercero</h3>
  <div slot="content">
    <is-input label="Nombre" label-placement="float" required></is-input>
  </div>
</is-form>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `mode` | `edit` / `view` | Default `edit`. `view` oculta el botón Aceptar. |
| `submit-label` | string | Default `Aceptar`. |
| `cancel-label` | string | Default `Cancelar`. |
| `loading` | boolean | Pone el botón Aceptar en estado de carga. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `mode` | lectura/escritura | Refleja el atributo. |
| `submitLabel` | lectura/escritura | Refleja `submit-label`. |
| `cancelLabel` | lectura/escritura | Refleja `cancel-label`. |
| `loading` | lectura/escritura | Refleja el atributo. |
| `form` | solo lectura | `<form>` interno del shadow. |

### Slots

| Slot | Uso |
| --- | --- |
| `header` | Cabecera del formulario. |
| `content` | Cuerpo; crece y hace scroll. |
| `pre-buttons` | Contenido a la izquierda del bloque de botones. |
| `post-buttons` | Contenido bajo el bloque de botones. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-submit` | `{ form }` | sí | sí | sí |
| `is-cancel` | `{ form }` | sí | sí | sí |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `submit()` | Equivale a pulsar Aceptar. |
| `reset()` | Restablece los controles nativos del formulario. |

### CSS parts

| Part | Uso |
| --- | --- |
| `form` | Personalizable con `::part(form)`. |
| `header` | Personalizable con `::part(header)`. |
| `content` | Personalizable con `::part(content)`. |
| `footer` | Personalizable con `::part(footer)`. |
| `buttons` | Personalizable con `::part(buttons)`. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Familia tipográfica heredada del tema. |
| `--is-text` | Color de texto del tema. |

## Comportamiento

El envío nativo SIEMPRE se detiene con `preventDefault()`: el componente emite
`is-submit` y el consumidor decide (fetch, router…). El `<button type="submit">`
real vive en el shadow de `<is-button>` y los formularios no cruzan shadow roots,
por eso el clic pide el envío con `requestSubmit()`.

El breakpoint de 600px es una **container query** sobre el ancho propio del
formulario, no del viewport: la ficha suele vivir dentro de un panel estrecho.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)

Tags del módulo: `<is-form>`.

## Accesibilidad

Es un `<form>` real: los controles proyectados conservan su semántica, foco y
orden de tabulación.

## Errores comunes

- Esperar que `is-submit` navegue: nunca lo hace.
- Poner los campos fuera del slot `content` (quedan sin el scroll del cuerpo).
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./form.js)
- [CSS](./form.css)
- [Preview](../../previews/isp/is-form.html)
