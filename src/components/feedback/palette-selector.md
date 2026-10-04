---
tag: iswc-palette-selector
tags:
  - iswc-palette-selector
category: feedback
status: public
source: ./palette-selector.js
style: ./palette-selector.css
preview: ./palette-selector.json
---
# `<iswc-palette-selector>`

## Propósito

Selector visual de paletas de marca. Expone por defecto las tres paletas de
`styles/palettes.css` (contapyme, insoft, agrowin) y admite un array JSON
propio en el atributo `palettes`. `scope="root"` escribe `data-palette` en
`<html>`. `scope="closest"` lo escribe en el primer ancestro que ya tenga
`data-palette`. Si el target es `<html>`, persiste en `localStorage`. Si la
paleta trae `css`, inyecta esa hoja bajo demanda. Dos selectores con el mismo
target y la misma paleta en su lista quedan sincronizados.

Este módulo registra `<iswc-palette-selector>`.

## Cuándo usarlo

Comunicar estado, contexto o cambios de apariencia al usuario.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './palette-selector.js';
```

## Ejemplo mínimo

```html
<iswc-palette-selector></iswc-palette-selector>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `palettes` | string JSON | Array de `{ value, label, h, s, b, css?, lead?, accentLabel?, leadColor?, accentColor?, bg?, fg?, accent? }`. `h` `s` `b` arman el swatch; `accent` (hex) solo si no hay HSB. |
| `value` | string/según contrato | Paleta activa; se refleja en `data-palette` de `<html>`. |
| `storage-key` | string/según contrato | Clave de `localStorage` (default `iswc-palette`). |
| `aria-label` | string/según contrato | Etiqueta del trigger (default "Elegir paleta"). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `palettes` | lectura/escritura | Getter devuelve copia; setter escribe el atributo JSON. |
| `value` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `trigger` | Sustituye el botón trigger interno. |
| `option` | `<template>` que sustituye el render de cada item del menú. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-palette-change` | Evento personalizado del componente (palette change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-palette-change` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-palette-selector');
el.addEventListener('iswc-palette-change', (e) => {
  console.log('iswc-palette-change', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `open()` | Abre el menú de paletas. |
| `close()` | Cierra el menú. |
| `toggle()` | Alterna el menú. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `trigger` | Personalizable con `::part(trigger)`. |
| `lead` | Personalizable con `::part(lead)`. |
| `label` | Personalizable con `::part(label)`. |
| `caret` | Personalizable con `::part(caret)`. |
| `menu` | Personalizable con `::part(menu)`. |
| `option` | Personalizable con `::part(option)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--iswc-font-family` | Token leído o definido por componente. |
| `--iswc-logo-bg` | Token leído o definido por componente. |
| `--iswc-logo-fg` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-palette-selector> — Web Component (vanilla).
> Selector visual de paletas de marca. Por defecto expone las 3 paletas
> que viven en `styles/palettes.css` (contapyme, insoft, agrowin) pero
> el consumidor puede pasar un array JSON propio en el atributo
> `palettes` para exponer SU marca / sus paletas / su CSS.
> Cada paleta del array puede traer una propiedad `css` (URL) — el
> componente la inyecta como <link rel="stylesheet"> al seleccionar la
> paleta, de modo que el consumidor no tiene que precargar todas las
> hojas: se cargan bajo demanda.
> Atributos
>   palettes      JSON string con array de { value, label, accent, css?,
>                                              lead?, leadColor?,
>                                              accentColor?, bg?, fg? }.
>   value         string — la paleta activa. Reflect → data-palette en <html>.
>   storage-key   string — clave de localStorage (default 'iswc-palette')
>   aria-label    string — etiqueta del botón trigger (default "Elegir paleta")
> Slots
>   trigger    opcional — sustituye el botón trigger interno.
>   El menu sale del JSON (palettes.json o el array palettes).
> Eventos
>   iswc-palette-change  detail: { value, palette }   bubbles, composed
> Mutaciones que produce
>   <html data-palette="X">   — activa la paleta visualmente
>   localStorage[storageKey]  — persiste la elección
> API JS del consumer
>   el.palettes = [...]      // setter que escribe el atributo JSON
>   el.value    = 'contapyme' // activa paleta y notifica
>   el.open() / close() / toggle()
>   el.addEventListener('iswc-palette-change', e => e.detail)

La paleta inicial se resuelve en este orden: `data-palette` del target,
valor guardado en `localStorage` (solo si el target es `<html>`) y, si nada
aplica, la primera del array. El menu pinta swatch, label y check desde ese JSON.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/element-base.js`](../_shared/element-base.js) — la clase
  extiende `ElementBase` (`onConnected`, `onDisconnected`, `onAttributeChanged`).
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<iswc-palette-selector>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado:
`aria-haspopup="listbox"`, `aria-expanded`, `aria-label`, `role="listbox"`,
`role="option"`, `aria-selected` y `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-palette-selector storage-key="mi-app-paleta"
  palettes='[{"value":"azul","label":"Azul","h":210,"s":"100%","b":"56%","css":"/css/azul.css"}]'>
</iswc-palette-selector>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./palette-selector.js)
- [CSS](./palette-selector.css)
- [Índice de categoría](./LLM.md)
- [Preview](./palette-selector.json)
