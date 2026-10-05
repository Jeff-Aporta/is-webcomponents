---
tag: iswc-barcode
tags:
  - iswc-barcode
category: media
status: public
source: ./barcode.ts
style: ./barcode.css
preview: ./barcode.json
---
# `<iswc-barcode>`

## PropÃ³sito

Generador de cÃ³digos de barras en SVG, sin dependencias externas.

Este mÃ³dulo registra `<iswc-barcode>`.

## CuÃ¡ndo usarlo

Etiquetas de producto, tiquetes, remisiones: cualquier caso que necesite un
cÃ³digo lineal legible por lector lÃ¡ser.

## CuÃ¡ndo no usarlo

Para cÃ³digos bidimensionales usar `<iswc-qrcode>`. Para una imagen ya generada
en servidor basta un `<img>`.

## ImportaciÃ³n

```js
import './barcode.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-barcode value="7701234567890" type="ean13"></iswc-barcode>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Texto a codificar. Requerido. |
| `type` | string | `ean13` \| `code128`. Default `code128`. |
| `height` | number | Alto del mÃ³dulo en px. Default `60`. |
| `fg` | string | Color de las barras. Default `var(--iswc-text)`. |
| `bg` | string | Color de fondo. Default `transparent`. |
| `show-text` | boolean | Imprime el texto debajo. `true` por defecto en `ean13`. |
| `quiet` | number | Zonas de silencio en mÃ³dulos, solo EAN13. Default `9`. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| â€” | â€” | No expone propiedades adicionales documentadas. |

### Slots

| Slot | Uso |
| --- | --- |
| â€” | No expone slots: el contenido se genera desde `value`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-barcode');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| â€” | No expone mÃ©todos pÃºblicos propios. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `canvas` | El `<svg>` generado. |
| `text` | LÃ­nea de texto bajo el cÃ³digo. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> `<iswc-barcode>` â€” Generador de cÃ³digos de barras en SVG. `type` elige entre
> EAN13 y Code128; el SVG se rehace en cada cambio de atributo observado.

En `ean13` el `value` debe tener 12 o 13 dÃ­gitos; el dÃ­gito de control se
calcula si falta.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del mÃ³dulo: `<iswc-barcode>`.

## Accesibilidad

El `<svg>` lleva `role="img"` y `aria-label`. Preservar semÃ¡ntica, foco,
teclado, labels y ARIA.

## Ejemplo avanzado

```html
<iswc-barcode
  value="ABC-00219"
  type="code128"
  height="80"
  show-text
></iswc-barcode>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Pasar a `ean13` un valor con letras o con longitud distinta de 12/13.
- Inventar API por similitud con otro componente.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./barcode.ts)
- [CSS](./barcode.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
