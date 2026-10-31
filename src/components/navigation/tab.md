---
tag: iswc-tab
tags:
  - iswc-tab
category: navigation
status: public
source: ./tab-group.ts
style: ./tab-group.scss
preview: ./tab.json
---
# `<iswc-tab>`

## Propósito

Pestaña de `<iswc-tab-group>`. Elige el panel; no sustituye al grupo.

## Importación

```js
import './tab-group.js';
```

Ese módulo registra este tag junto con `<iswc-tab-group>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-tab slot="nav" panel="datos" closable>Datos</iswc-tab>
```

## Atributos

| Atributo | Notas |
| --- | --- |
| `panel` | Nombre del `iswc-tab-panel` que abre. |
| `active` | Lo pone el grupo. |
| `disabled` | Bloquea la pestaña. |
| `closable` | Muestra el botón de cerrar. |

## Slots

| Slot | Uso |
| --- | --- |
| `(default)` | Rótulo. |
| `start` | Antes del rótulo. |
| `end` | Después del rótulo. |
| `close-button` | Botón de cerrar propio. |

## CSS parts

`base`, `start`, `end`, `close-button`, `active-indicator`.

## Eventos

| Evento | Descripción |
| --- | --- |
| — | `iswc-tab-close` con `{ tab, name }` al pulsar cerrar. El grupo decide si la quita. |

## Comportamiento

El grupo le pone `active`, `id` y `aria-controls`, y decide si la quita al recibir `iswc-tab-close`. Va siempre con `slot="nav"`.

## Accesibilidad

El grupo le da `role="tab"`, `aria-selected` y `aria-controls`, y mueve el foco con flechas, `Home` y `End`.

## Reglas para LLM

- Va dentro de `<iswc-tab-group>`, con `slot="nav"` y un `panel` igual al `name` de su panel.
- No se pone `active` a mano: se elige con `active` del grupo.
- El cierre lo decide quien escucha `iswc-tab-close`.
