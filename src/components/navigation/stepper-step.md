---
tag: iswc-stepper-step
tags:
  - iswc-stepper-step
category: navigation
status: public
source: ./stepper.ts
style: ./stepper.scss
preview: ./stepper-step.json
---
# `<iswc-stepper-step>`

## Propósito

Paso de `<iswc-stepper>`. Marca una etapa; el stepper lleva el estado activo.

## Importación

```js
import './stepper.js';
```

Ese módulo registra este tag junto con `<iswc-stepper>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-stepper-step label="Pago" description="Tarjeta o transferencia"></iswc-stepper-step>
```

## Atributos

| Atributo | Notas |
| --- | --- |
| `label` | Título del paso. |
| `description` | Línea secundaria. |
| `icon` | Ícono en lugar del número. |
| `disabled` | Paso bloqueado. |
| `error` | Marca el paso con error. |

## Slots

| Slot | Uso |
| --- | --- |
| `label` | Título propio. |
| `description` | Descripción propia. |
| `icon` | Contenido del punto. |

## CSS parts

`base`, `indicator`, `label`, `description`, `line`.

## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-stepper>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-stepper');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>

## Comportamiento

Muestra su número o `icon`, `label` y `description`. El estado (activo, hecho) lo pone el stepper.

## Accesibilidad

Tiene `role="listitem"`. El paso activo lleva `aria-current="step"`, con `aria-posinset` y `aria-setsize`.

## Reglas para LLM

- Va dentro de `<iswc-stepper>`.
- El rótulo es `label`: `title` no es un atributo del paso.
- El paso activo se elige con `active` del stepper.
