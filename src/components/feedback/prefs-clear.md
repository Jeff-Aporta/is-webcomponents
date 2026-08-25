---
tag: is-prefs-clear
tags:
  - is-prefs-clear
category: feedback
status: public
source: ./prefs-clear.js
style: ./prefs-clear.css
preview: ../../previews/feedback/is-prefs-clear.json
---
# `<is-prefs-clear>`

## Propósito

Borra la memoria persistente de los componentes del kit
(`localStorage['is-webcomponents']`: splits, scrolls, grids…).
Útil para auditar la carga inicial sin prefs viejas que deformen el layout.

Este módulo registra `<is-prefs-clear>`.

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
<is-prefs-clear></is-prefs-clear>
```

## Atributos

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `confirm` | boolean | `false` = no pide confirmación (default true) |
| `reload` | boolean | `false` = no recarga tras limpiar (default true) |
| `variant` / `color` / `shape` | string | Se reenvían al `is-button` interno |

## Eventos

| Evento | Detail |
| --- | --- |
| `is-prefs-clear` | `{ tags: string[], reloaded: boolean }` |

## API

- `clear()` — ejecuta la limpieza
- `peek()` — lee el root de prefs sin borrar
