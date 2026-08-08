---
tag: is-barcode
tags:
  - is-barcode
category: media
status: public
source: ./barcode.js
style: ./barcode.css
preview: ../../previews/media/is-barcode.json
---
# `<is-barcode>`

## Propósito

Generador de códigos de barras en SVG, sin dependencias externas.

Este módulo registra `<is-barcode>`.

## Cuándo usarlo

Etiquetas de producto, tiquetes, remisiones: cualquier caso que necesite un
código lineal legible por lector láser.

## Cuándo no usarlo

Para códigos bidimensionales usar `<is-qrcode>`. Para una imagen ya generada
en servidor basta un `<img>`.

## Importación

```js
import './barcode.js';
```

## Ejemplo mínimo

```html
<is-barcode value="7701234567890" type="ean13"></is-barcode>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Texto a codificar. Requerido. |
| `type` | string | `ean13` \| `code128`. Default `code128`. |
| `height` | number | Alto del módulo en px. Default `60`. |
| `fg` | string | Color de las barras. Default `var(--is-text)`. |
| `bg` | string | Color de fondo. Default `transparent`. |
| `show-text` | boolean | Imprime el texto debajo. `true` por defecto en `ean13`. |
| `quiet` | number | Zonas de silencio en módulos, solo EAN13. Default `9`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| — | — | No expone propiedades adicionales documentadas. |

### Slots

| Slot | Uso |
| --- | --- |
| — | No expone slots: el contenido se genera desde `value`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| — | No expone métodos públicos propios. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `canvas` | El `<svg>` generado. |
| `text` | Línea de texto bajo el código. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> `<is-barcode>` — Generador de códigos de barras en SVG. `type` elige entre
> EAN13 y Code128; el SVG se rehace en cada cambio de atributo observado.

En `ean13` el `value` debe tener 12 o 13 dígitos; el dígito de control se
calcula si falta.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del módulo: `<is-barcode>`.

## Accesibilidad

El `<svg>` lleva `role="img"` y `aria-label`. Preservar semántica, foco,
teclado, labels y ARIA.

## Ejemplo avanzado

```html
<is-barcode
  value="ABC-00219"
  type="code128"
  height="80"
  show-text
></is-barcode>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Pasar a `ean13` un valor con letras o con longitud distinta de 12/13.
- Inventar API por similitud con otro componente.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./barcode.js)
- [CSS](./barcode.css)
- [Índice de categoría](./LLM.md)
