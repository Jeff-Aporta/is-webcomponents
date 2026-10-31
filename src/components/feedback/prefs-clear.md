---
tag: iswc-prefs-clear
tags:
  - iswc-prefs-clear
category: feedback
status: public
source: ./prefs-clear.ts
style: ./prefs-clear.scss
preview: ./prefs-clear.json
---
# `<iswc-prefs-clear>`

## Propósito

Deja la app como en su primera carga: `clearIswcStorage()` (core/iswc-storage) borra
todas las llaves `iswc:` de localStorage y sessionStorage (config de la app `iswc:app-cfg`,
`iswc:root` con splits/scrolls/grids, SVG de iconos `iswc:icon:*`, overrides de diagramas)
y vacia las caches en memoria del kit. `listIswcKeys()` lista lo que hay.
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
| `confirm` | boolean | `false` = no pide confirmación (default true). La pregunta es un `iswc-confirm-modal` que lista lo que se va a borrar. |
| `reload` | boolean | `false` = no recarga tras limpiar (default true) |
| `scope` | `prefs` \| `cache` \| `all` | `prefs` (default): todas las llaves `iswc:` (local y session) y las caches en memoria del kit (`clearIswcStorage()`). `cache`: ademas Cache Storage, IndexedDB y sessionStorage. `all`: ademas todo el localStorage del origen (preferencias y sesion). |
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


### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |

## Comportamiento

Por defecto pide confirmación con `<iswc-confirm-modal>`; `confirm="false"` la quita. Después borra según `scope` y recarga salvo que `reload` diga lo contrario.

## Accesibilidad

Es un `<iswc-button>` con `aria-label`. Sin texto en el slot queda solo el ícono, y `aria-label` o `title` le dan el nombre.

## Reglas para LLM

- `scope="all"` borra además todo el localStorage del origen, sesión incluida: úsalo solo a propósito.
- No uses `window.confirm`: el componente ya trae la confirmación del kit.
- Para limpiar sin interfaz, llama a la API del módulo.
