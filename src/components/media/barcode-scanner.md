---
tag: is-barcode-scanner
tags:
  - is-barcode-scanner
category: media
status: public
source: ./barcode-scanner.js
style: ./barcode-scanner.css
preview: ../../previews/media/is-barcode-scanner.json
---
# `<is-barcode-scanner>`

## Propósito

Decodifica QR/EAN con `BarcodeDetector` sobre la cámara. No genera códigos: eso es `is-barcode` / `is-qrcode`.

Este módulo registra `<is-barcode-scanner>`.

## Cuándo usarlo

Inventario, escanear un QR de producto.

## Cuándo no usarlo

Para dibujar un código usa `<is-barcode>` o `<is-qrcode>`.

## Importación

```js
import './barcode-scanner.js';
```

## Ejemplo mínimo

```html
<is-barcode-scanner formats="qr_code,ean_13"></is-barcode-scanner>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `formats` | string | CSV de formatos BarcodeDetector |
| `disabled` | boolean |  |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `formats` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno útil.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-detect` | sí `{ rawValue, format, barcodes }` | sí | sí | no |
| `is-error` | sí `{ message }` | sí | sí | no |

### Métodos y propiedades públicas

`start()`, `stop()`, `detect(source)`.

### CSS parts

`preview`, `hint`

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

`getUserMedia` + `detect` cada 400ms. Sin BarcodeDetector emite `is-error`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Botón escanear/detener.

## Ejemplo avanzado

```html
<is-barcode-scanner formats="qr_code"></is-barcode-scanner>
```

## Errores comunes

- Usar `is-barcode` (generador) para escanear.
- HTTP inseguro.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./barcode-scanner.js` · `./barcode-scanner.css`
- Preview: `../../previews/media/is-barcode-scanner.json`
