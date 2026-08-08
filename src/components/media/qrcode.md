---
tag: is-qrcode
tags:
  - is-qrcode
category: media
status: public
source: ./qrcode.js
style: ./qrcode.css
preview: ../../previews/media/is-qrcode.json
---
# `<is-qrcode>`

## Propósito

Generador de códigos QR en SVG.

Este módulo registra `<is-qrcode>`.

## Cuándo usarlo

Enlaces cortos, datos de contacto, referencias de pago: cualquier carga que
deba leerse con la cámara de un teléfono.

## Cuándo no usarlo

Para códigos lineales de etiqueta usar `<is-barcode>`. En entornos sin salida
a internet, ver la nota de dependencia externa más abajo.

## Importación

```js
import './qrcode.js';
```

## Ejemplo mínimo

```html
<is-qrcode value="https://contapyme.com"></is-qrcode>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Texto a codificar. Requerido. |
| `level` | string | `L` \| `M` \| `Q` \| `H`. Corrección de errores. Default `L`. |
| `cell` | number | Tamaño en px de cada módulo. Default `4`. |
| `margin` | number | Módulos de zona de silencio. Default `2`. |
| `fg` | string | Color de los módulos. Default `currentColor`. |
| `bg` | string | Color de fondo. Default `transparent`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `svg` | lectura | Nodo `<svg>` generado, o `null` si aún no hay render. |

### Slots

| Slot | Uso |
| --- | --- |
| — | No expone slots: el contenido se genera desde `value`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | `{ svg }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
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

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> `<is-qrcode>` — Generador de QR en SVG. Usa la librería externa
> `qrcode-generator` (Kazuhiko Arase, MIT) cargada dinámicamente desde
> `esm.sh`. Sin CDN no funciona: es la única dependencia externa del kit, y
> se mantiene así a propósito para no engordar el bundle.

Cuando la carga del generador falla, el componente escribe el motivo en
`::part(status)` en vez de quedarse en blanco.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- Externa: `https://esm.sh/qrcode-generator@1.4.4`

Tags del módulo: `<is-qrcode>`.

## Accesibilidad

El `<svg>` lleva `role="img"`. El estado de carga va en un `<output>`, que es
una live region: el lector de pantalla anuncia el fallo de CDN.

## Ejemplo avanzado

```html
<is-qrcode
  value="https://contapyme.com/soporte"
  level="H"
  cell="6"
  margin="3"
></is-qrcode>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Asumir que funciona sin acceso a `esm.sh`.
- Llamar `dataURL()` de forma síncrona: devuelve una Promise.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./qrcode.js)
- [CSS](./qrcode.css)
- [Índice de categoría](./LLM.md)
