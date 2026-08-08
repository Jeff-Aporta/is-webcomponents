---
tag: is-signature
tags:
  - is-signature
category: forms
status: public
source: ./signature.js
style: ./signature.css
preview: ../../previews/forms/is-signature.json
---
# `<is-signature>`

## Propósito

Pad de firma manuscrita sobre `<canvas>`, con puntero unificado (mouse, touch,
lápiz). Guarda los trazos como puntos y exporta a PNG o SVG.

Este módulo registra `<is-signature>`.

## Cuándo usarlo

Capturar una firma o un trazo libre para adjuntarlo a un documento
(autorizaciones, recibos, actas).

## Cuándo no usarlo

Para dibujo con herramientas y capas usar `<is-image-editor>`; para adjuntar
una imagen ya firmada usar `<is-file-input>` o `<is-dropzone>`.

## Importación

```js
import './signature.js';
```

## Ejemplo mínimo

```html
<is-signature></is-signature>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `width` | number | Ancho en px CSS, default `320`. |
| `height` | number | Alto en px CSS, default `140`. |
| `pen-color` | string | Color del trazo, default `currentColor`. |
| `line-width` | number | Grosor del trazo, default `2`. |
| `background` | string | Color de fondo; `transparent` deja el canvas limpio. |
| `hint` | string | Texto mostrado mientras no hay trazos, default `Firma aquí`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `width` | lectura | Ancho efectivo en px CSS. |
| `height` | lectura | Alto efectivo en px CSS. |
| `isEmpty` | lectura | `true` si no hay trazos. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-stroke-end` | `{ dataURL }` | sí | sí | no |
| `is-change` | `{ strokes }` | sí | sí | no |

`is-change` se emite al terminar cada trazo y también en `clear()`.
`strokes` es el arreglo interno de trazos (`[{ x, y }, ...]` por trazo).

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `clear()` | Borra los trazos, repinta y emite `is-change`. |
| `toDataURL(type = 'image/png')` | Data URL del canvas; con `image/svg+xml` devuelve el SVG codificado. |
| `toSVG()` | SVG inline con un `<path>` por trazo, en coordenadas de px CSS. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `canvas` | Canvas de dibujo. |
| `hint` | Texto de ayuda mientras está vacío. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-bg-elev` | Fondo del pad. |
| `--is-border` | Borde del pad. |
| `--is-radius` | Radio de bordes. |
| `--is-text` | Color por defecto del trazo (`currentColor`). |
| `--is-text-dim` | Color del texto de ayuda. |

El componente fija `--_w` y `--_h` en el host con las dimensiones vigentes.

### Integración con formularios

No es form-associated. Para enviar la firma, escribir `toDataURL()` en un
campo oculto desde `is-change` o `is-stroke-end`.

## Comportamiento

- El canvas se dimensiona por `devicePixelRatio` acotado a 2 y se escala con
  `setTransform`, así el trazo no se ve pixelado en pantallas HiDPI.
- Los puntos se almacenan en px CSS; el repintado interpola con curvas
  cuadráticas entre puntos medios para suavizar el trazo.
- `background` distinto de `transparent` se pinta antes de los trazos, y por
  tanto queda incluido en el PNG.
- Cambiar `width` o `height` redimensiona y repinta conservando los trazos.
- El texto de ayuda se oculta en cuanto hay al menos un trazo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del módulo: `<is-signature>`.

## Accesibilidad

El canvas lleva `aria-label="Pad de firma"`. La captura es exclusivamente por
puntero: si el flujo debe ser operable sin puntero, ofrecer una alternativa
(subir imagen de la firma o confirmar por otro medio) junto al componente.

## Ejemplo avanzado

```html
<is-signature id="firma" width="480" height="180"
              pen-color="#111827" line-width="3"
              background="#ffffff" hint="Firme dentro del recuadro"></is-signature>
<is-button id="limpiar">Limpiar</is-button>

<script type="module">
  const firma = document.getElementById('firma');
  document.getElementById('limpiar').addEventListener('click', () => firma.clear());
  firma.addEventListener('is-stroke-end', (e) => {
    document.querySelector('input[name="firma"]').value = e.detail.dataURL;
  });
  // Exportar como vector
  const svg = firma.toSVG();
</script>
```

## Errores comunes

- Exportar a PNG con `background="transparent"` y esperar fondo blanco en el PDF.
- Mutar el arreglo `strokes` del `detail`: es la referencia interna.
- Cambiar `width`/`height` por CSS en lugar de por atributo: el canvas no se
  redimensiona y el trazo queda desalineado del puntero.
- Enviarlo en un `<form>` sin campo espejo.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./signature.js)
- [CSS](./signature.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-signature.json)
