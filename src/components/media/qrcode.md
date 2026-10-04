---
tag: iswc-qrcode
tags:
  - iswc-qrcode
category: media
status: public
source: ./qrcode.ts
style: ./qrcode.css
preview: ./qrcode.json
---
# `<iswc-qrcode>`

## PropÃ³sito

Generador de cÃ³digos QR en SVG.

Este mÃ³dulo registra `<iswc-qrcode>`.

## CuÃ¡ndo usarlo

Enlaces cortos, datos de contacto, referencias de pago: cualquier carga que
deba leerse con la cÃ¡mara de un telÃ©fono.

## CuÃ¡ndo no usarlo

Para cÃ³digos lineales de etiqueta usar `<iswc-barcode>`. En entornos sin salida
a internet, ver la nota de dependencia externa mÃ¡s abajo.

## ImportaciÃ³n

```js
import './qrcode.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-qrcode value="https://contapyme.com"></iswc-qrcode>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Texto a codificar. Requerido. |
| `level` | string | `L` \| `M` \| `Q` \| `H`. CorrecciÃ³n de errores. Default `L`. |
| `cell` | number | TamaÃ±o en px de cada mÃ³dulo. Default `4`. |
| `margin` | number | MÃ³dulos de zona de silencio. Default `2`. |
| `fg` | string | Color de los mÃ³dulos. Default `currentColor`. |
| `bg` | string | Color de fondo. Default `transparent`. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `svg` | lectura | Nodo `<svg>` generado, o `null` si aÃºn no hay render. |

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
| `iswc-render` | `{ svg }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-qrcode');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `dataURL(type = 'image/png')` | Promise con el dataURL del QR rasterizado. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `canvas` | Contenedor del `<svg>`. |
| `status` | `<output>` con el estado de carga o el error. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> `<iswc-qrcode>` â€” Generador de QR en SVG. Usa la librerÃ­a externa
> `qrcode-generator` (Kazuhiko Arase, MIT) cargada dinÃ¡micamente desde
> `esm.sh`. Sin CDN no funciona: es la Ãºnica dependencia externa del kit, y
> se mantiene asÃ­ a propÃ³sito para no engordar el bundle.

Cuando la carga del generador falla, el componente escribe el motivo en
`::part(status)` en vez de quedarse en blanco.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- Externa: `https://esm.sh/qrcode-generator@1.4.4`

Tags del mÃ³dulo: `<iswc-qrcode>`.

## Accesibilidad

El `<svg>` lleva `role="img"`. El estado de carga va en un `<output>`, que es
una live region: el lector de pantalla anuncia el fallo de CDN.

## Ejemplo avanzado

```html
<iswc-qrcode
  value="https://contapyme.com/soporte"
  level="H"
  cell="6"
  margin="3"
></iswc-qrcode>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Asumir que funciona sin acceso a `esm.sh`.
- Llamar `dataURL()` de forma sÃ­ncrona: devuelve una Promise.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./qrcode.ts)
- [CSS](./qrcode.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
