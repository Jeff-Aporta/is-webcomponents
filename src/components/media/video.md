---
tag: is-video
tags:
  - is-video
category: media
status: public
source: ./video.js
style: ./video.css
preview: ../../previews/media/is-video.html
---
# `<is-video>`

## Propósito

Reproductor con chrome propio al estilo YouTube: barra de progreso con buffer y
scrubber, fila de controles con volumen desplegable, velocidad, picture-in-picture
y pantalla completa. Los controles se ocultan solos mientras reproduce.

Este módulo registra `<is-video>`.

## Cuándo usarlo

Iconos, identidad visual y reproducción de video.

## Cuándo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## Importación

```js
import './video.js';
```

## Ejemplo mínimo

```html
<is-video
controls
playsinline
src="video.mp4"
></is-video>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string/según contrato | Fuente define default/restricción. |
| `poster` | string/según contrato | Fuente define default/restricción. |
| `controls` | boolean | Fuente define default/restricción. |
| `muted` | boolean | Fuente define default/restricción. |
| `loop` | boolean | Fuente define default/restricción. |
| `autoplay` | boolean | Fuente define default/restricción. |
| `playsinline` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | Declarada por clase. |
| `poster` | lectura/escritura | Declarada por clase. |
| `controls` | lectura/escritura | Declarada por clase. |
| `muted` | lectura/escritura | Declarada por clase. |
| `loop` | lectura/escritura | Declarada por clase. |
| `autoplay` | lectura/escritura | Declarada por clase. |
| `playsInline` | lectura/escritura | Declarada por clase. |
| `media` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-play` | no | sí | sí | no |
| `is-pause` | no | sí | sí | no |
| `is-ended` | no | sí | sí | no |
| `play` | no | sí | sí | no |
| `pause` | no | sí | sí | no |
| `ended` | no | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `play()` | Método público declarado. |
| `pause()` | Método público declarado. |
| `toggleFullscreen()` | Método público declarado. |
| `togglePictureInPicture()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `video` | Personalizable con `::part(video)`. |
| `big-play` | Personalizable con `::part(big-play)`. |
| `controls` | Personalizable con `::part(controls)`. |
| `progress` | Personalizable con `::part(progress)`. |
| `seek` | Personalizable con `::part(seek)`. |
| `play-button` | Personalizable con `::part(play-button)`. |
| `volume` | Personalizable con `::part(volume)`. |
| `mute-button` | Personalizable con `::part(mute-button)`. |
| `volume-slider` | Personalizable con `::part(volume-slider)`. |
| `time` | Personalizable con `::part(time)`. |
| `settings-button` | Personalizable con `::part(settings-button)`. |
| `pip-button` | Personalizable con `::part(pip-button)`. |
| `fullscreen-button` | Personalizable con `::part(fullscreen-button)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--played` | Token leído o definido por componente. |
| `--buffered` | Token leído o definido por componente. |
| `--vol` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-video-accent` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-video> — Web Component (vanilla).
> Reproductor con chrome tipo YouTube: barra de progreso propia (con buffer y
> scrubber) sobre la fila de botones, scrim inferior, overlay de play central,
> auto-ocultado mientras reproduce, atajos de teclado, pantalla completa,
> picture-in-picture y menú de velocidad.
> Atributos
>   src, poster
>   controls     boolean (default true)
>   muted, loop, autoplay, playsinline  boolean
> Slots: default — tracks / sources
> Métodos: play(), pause(), toggleFullscreen(), togglePictureInPicture()
> Eventos (bubbles, composed): is-play, is-pause, is-ended
> También reenvía play/pause/ended nativos (bubbles, composed)
> Teclado (con foco en el reproductor)
>   espacio / k  play-pausa      m  silenciar        f  pantalla completa
>   ← →          ±5 s            j l  ±10 s          0-9  salto por decenas
>   ↑ ↓          ±5 % volumen
> CSS Parts: ::part(base) ::part(video) ::part(controls) ::part(play-button)
>            ::part(mute-button) ::part(volume) ::part(volume-slider)
>            ::part(time) ::part(seek) ::part(progress) ::part(big-play)
>            ::part(fullscreen-button) ::part(pip-button) ::part(settings-button)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/check-icon-button.js`](../actions/check-icon-button.js)
- [`./icon.js`](./icon.js)

Tags del módulo: `<is-video>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`, `aria-haspopup`, `aria-expanded`, `aria-checked`.

## Ejemplo avanzado

```html
<is-video
controls
playsinline
src="video.mp4"
></is-video>
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

- [JavaScript](./video.js)
- [CSS](./video.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/media/is-video.html)
