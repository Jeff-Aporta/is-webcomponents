---
tag: iswc-prefs-clear
tags:
  - iswc-prefs-clear
category: feedback
status: public
source: ./prefs-clear.ts
style: ./prefs-clear.css
preview: ./prefs-clear.json
---
# `<iswc-prefs-clear>`

## PropÃ³sito

Borra la memoria persistente de los componentes del kit
(`localStorage['iswc-root']`: splits, scrolls, gridsâ€¦).
Ãštil para auditar la carga inicial sin prefs viejas que deformen el layout.

Este mÃ³dulo registra `<iswc-prefs-clear>`.

## CuÃ¡ndo usarlo

AuditorÃ­a UX/UI, demos, o un control de â€œrestablecer panelesâ€ en herramientas internas.

## CuÃ¡ndo no usarlo

No lo pongas como acciÃ³n cotidiana del usuario final si no entiende que perderÃ¡
tamaÃ±os de panel y posiciones de scroll.

## ImportaciÃ³n

```js
import './prefs-clear.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-prefs-clear></iswc-prefs-clear>
<!-- Solo icono. Con etiqueta: <iswc-prefs-clear>Limpiar memoria UI</iswc-prefs-clear> -->
```

## Atributos

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `confirm` | boolean | `false` = no pide confirmaciÃ³n (default true) |
| `reload` | boolean | `false` = no recarga tras limpiar (default true) |
| `variant` / `color` / `shape` | string | Se reenvÃ­an al `iswc-button` interno |
| `title` / `aria-label` | string | Tooltip y nombre accesible (default â€œLimpiar memoria UIâ€) |

## Eventos


| Evento | DescripciÃ³n |
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

- `clear()` â€” ejecuta la limpieza
- `peek()` â€” lee el root de prefs sin borrar


### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |
