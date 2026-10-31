---
tag: iswc-parallax-collage
tags:
  - iswc-parallax-collage
category: media
status: public
source: ./parallax-collage.ts
style: ./parallax-collage.scss
preview: ./parallax-collage.json
---
# `<iswc-parallax-collage>`

## Propósito

Collage por capas, con imágenes y formas teñidas con la paleta activa. El parallax con el cursor es opcional: sin `efecto`
es una composición estática.

## Cuándo usarlo

Para una ilustración decorativa o de marca en una portada, un estado vacío o una sección de presentación.

## Cuándo no usarlo

- Una sola imagen: `<iswc-figure>`, o `<iswc-theme-img>` si depende del tema.
- Un diagrama o una gráfica con datos: los tags de `diagrams` y `charts`.

## Importación

```js
import './parallax-collage.js';
```

## Ejemplo mínimo

```html
<iswc-parallax-collage efecto="capas" direccion="pegajoso" distancia="2" proporcion="0.8"></iswc-parallax-collage>
```

```js
collage.capas = [
  { tipo: 'forma', forma: 'circulo', color: 'acento', x: 22, y: 30, ancho: 18, anim: 'flotar' },
  { tipo: 'imagen', src: './persona.webp', x: 50, y: 56, ancho: 60, z: 2 },
];
```

## API

### Atributos

| Atributo | Default | Notas |
| --- | --- | --- |
| `efecto` | `ninguno` | `ninguno`, `desplazar`, `rotar` (lámina 3D) o `capas` (rotación más separación en Z) |
| `direccion` | `corriente` | `corriente` sigue al cursor; `pegajoso` va en contra |
| `distancia` | `1.4` | Recorrido en `em`; también escala el ángulo |
| `velocidad` | `1` | Multiplica el seguimiento; 1 asienta en unos 3 s |
| `proporcion` | `1` | Alto / ancho del lienzo |
| `quieto` | — | Apaga las animaciones `anim` de las capas |
| `etiqueta` | — | La anuncia como imagen; sin ella es decorativa |

### Propiedades

`capas` es un arreglo de `Capa`, validable con `ZCapas` de `schemas/parallax-collage.schemas.ts`.

| Campo | Notas |
| --- | --- |
| `tipo` | `imagen` (con `src`) o `forma` (con `forma` y `color`) |
| `x`, `y`, `ancho` | Centro y ancho, en % del lienzo |
| `z` | Orden de apilado |
| `prof` | Profundidad del parallax; 0 la deja quieta y, sin valor, sale de `z` |
| `anim`, `retraso` | `flotar`, `mecer`, `girar`, `latir` o `ninguna`; desfase en segundos |
| `giro` | Giro de reposo, en grados |

### CSS parts

`lienzo`, `capa`.

## Comportamiento

El parallax lo provoca el visitante y es un recorrido corto, así que no depende de `prefers-reduced-motion`. Las animaciones
`anim` corren solas y se apagan con esa preferencia. En táctil no hay cursor que seguir. Todas las instancias comparten un
oyente de `pointermove`, y cada una detiene su bucle al llegar al destino.

## Accesibilidad

Con `etiqueta`, el lienzo es una imagen (`role="img"` con ese `aria-label`). Sin ella es decorativo y lleva `aria-hidden="true"`.
Las animaciones `anim` respetan `prefers-reduced-motion`.

## Reglas para LLM

- Las capas van por la propiedad `capas`, nunca como HTML hijo.
- Valida los datos externos con `ZCapas`.
- Los colores de las formas salen de la paleta: no pases hex.
- Si la imagen comunica algo, pon `etiqueta`.
