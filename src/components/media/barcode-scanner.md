---
tag: iswc-barcode-scanner
tags:
  - iswc-barcode-scanner
category: media
status: public
source: ./barcode-scanner.ts
style: ./barcode-scanner.css
preview: ./barcode-scanner.json
---
# `<iswc-barcode-scanner>`

## PropÃ³sito

Decodifica QR/EAN con `BarcodeDetector` sobre la cÃ¡mara. No genera cÃ³digos: eso es `iswc-barcode` / `iswc-qrcode`.

Este mÃ³dulo registra `<iswc-barcode-scanner>`.

## CuÃ¡ndo usarlo

Inventario, escanear un QR de producto.

## CuÃ¡ndo no usarlo

Para dibujar un cÃ³digo usa `<iswc-barcode>` o `<iswc-qrcode>`.

## ImportaciÃ³n

```js
import './barcode-scanner.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-barcode-scanner formats="qr_code,ean_13"></iswc-barcode-scanner>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `formats` | string | CSV de formatos BarcodeDetector |
| `disabled` | boolean |  |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `formats` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno Ãºtil.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-detect` | Evento personalizado del componente (detect). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-detect` | sÃ­ `{ rawValue, format, barcodes }` | sÃ­ | sÃ­ | no |
| `iswc-error` | sÃ­ `{ message }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-barcode-scanner');
el.addEventListener('iswc-detect', (e) => {
  console.log('iswc-detect', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

`start()`, `stop()`, `detect(source)`.

### CSS parts

| Part | Uso |
| --- | --- |
| `hint` | Texto de ayuda o instrucciÃ³n. |
| `preview` | PrevisualizaciÃ³n capturada. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

`getUserMedia` + `detect` cada 400ms. Sin BarcodeDetector emite `iswc-error`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

BotÃ³n escanear/detener.

## Ejemplo avanzado

```html
<iswc-barcode-scanner formats="qr_code"></iswc-barcode-scanner>
```

## Errores comunes

- Usar `iswc-barcode` (generador) para escanear.
- HTTP inseguro.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./barcode-scanner.js` Â· `./barcode-scanner.css`
- Preview: `./barcode-scanner.json`
