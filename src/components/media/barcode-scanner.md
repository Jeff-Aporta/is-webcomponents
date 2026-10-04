---
tag: iswc-barcode-scanner
tags:
  - iswc-barcode-scanner
category: media
status: public
source: ./barcode-scanner.js
style: ./barcode-scanner.css
preview: ./barcode-scanner.json
---
# `<iswc-barcode-scanner>`

## Propósito

Decodifica QR/EAN con `BarcodeDetector` sobre la cámara. No genera códigos: eso es `iswc-barcode` / `iswc-qrcode`.

Este módulo registra `<iswc-barcode-scanner>`.

## Cuándo usarlo

Inventario, escanear un QR de producto.

## Cuándo no usarlo

Para dibujar un código usa `<iswc-barcode>` o `<iswc-qrcode>`.

## Importación

```js
import './barcode-scanner.js';
```

## Ejemplo mínimo

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

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `formats` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno útil.

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-detect` | Evento personalizado del componente (detect). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-detect` | sí `{ rawValue, format, barcodes }` | sí | sí | no |
| `iswc-error` | sí `{ message }` | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-barcode-scanner');
el.addEventListener('iswc-detect', (e) => {
  console.log('iswc-detect', e.detail);
});
```

</details>

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

`getUserMedia` + `detect` cada 400ms. Sin BarcodeDetector emite `iswc-error`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Botón escanear/detener.

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

- `./barcode-scanner.js` · `./barcode-scanner.css`
- Preview: `./barcode-scanner.json`
