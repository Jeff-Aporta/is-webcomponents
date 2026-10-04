---
tag: iswc-prefs-clear
tags:
  - iswc-prefs-clear
category: feedback
status: public
source: ./prefs-clear.js
style: ./prefs-clear.css
preview: ./prefs-clear.json
---
# `<iswc-prefs-clear>`

## Propósito

Borra la memoria persistente de los componentes del kit
(`localStorage['is-webcomponents']`: splits, scrolls, grids…).
Útil para auditar la carga inicial sin prefs viejas que deformen el layout.

Este módulo registra `<iswc-prefs-clear>`.

## Cuándo usarlo

Auditoría UX/UI, demos, o un control de “restablecer paneles” en herramientas internas.

## Cuándo no usarlo

No lo pongas como acción cotidiana del usuario final si no entiende que perderá
tamaños de panel y posiciones de scroll.

## Importación

```js
import './prefs-clear.js';
```

## Ejemplo mínimo

```html
<iswc-prefs-clear></iswc-prefs-clear>
<!-- Solo icono. Con etiqueta: <iswc-prefs-clear>Limpiar memoria UI</iswc-prefs-clear> -->
```

## Atributos

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `confirm` | boolean | `false` = no pide confirmación (default true) |
| `reload` | boolean | `false` = no recarga tras limpiar (default true) |
| `variant` / `color` / `shape` | string | Se reenvían al `iswc-button` interno |
| `title` / `aria-label` | string | Tooltip y nombre accesible (default “Limpiar memoria UI”) |

## Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-prefs-clear` | Emitido al limpiar la memoria UI persistente. |

| Evento | Detail |
| --- | --- |
| `iswc-prefs-clear` | `{ tags: string[], reloaded: boolean }` |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-prefs-clear');
el.addEventListener('iswc-prefs-clear', (e) => {
  console.log('iswc-prefs-clear', e.detail);
});
```

</details>

## API

- `clear()` — ejecuta la limpieza
- `peek()` — lee el root de prefs sin borrar
