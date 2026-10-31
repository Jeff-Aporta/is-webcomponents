---
tag: iswc-dock-item
tags:
  - iswc-dock-item
category: layout
status: public
source: ./dock.ts
style: ./dock.scss
preview: ./dock-item.json
---
# `<iswc-dock-item>`

## Propósito

Ítem de `<iswc-dock>`. Un acceso del dock, con icono y acción.

## Importación

```js
import './dock.js';
```

Ese módulo registra este tag junto con `<iswc-dock>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-dock-item icon="mdi:home" label="Inicio" href="/" active></iswc-dock-item>
```

## Atributos

| Atributo | Notas |
| --- | --- |
| `icon` | Ícono Iconify. |
| `label` | Rótulo que aparece al acercar el puntero. |
| `href` | Destino; sin él actúa como botón. |
| `active` | Marca el ítem actual. |

## Slots

| Slot | Uso |
| --- | --- |
| `icon` | Ícono propio; gana sobre `icon`. |

## CSS parts

`item`, `label`.

## Eventos

| Evento | Descripción |
| --- | --- |
| — | Al activarse, el `<iswc-dock>` padre emite `iswc-select` con `{ item }`. |

## Comportamiento

Al pulsarlo, o con `Enter` y `Espacio`, el dock emite `iswc-select` con `{ item }`. El dock lo amplía según la cercanía del cursor.

## Accesibilidad

Pinta un enlace enfocable y usa `label` como `aria-label`.

## Reglas para LLM

- Va dentro de `<iswc-dock>`.
- Siempre lleva `label`.
