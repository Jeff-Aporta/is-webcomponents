---
tag: iswc-video
tags:
  - iswc-video
category: media
status: public
source: ./video.ts
style: ./video.css
preview: ./video.json
---
# `<iswc-video>`

## PropÃ³sito

Reproductor con chrome propio al estilo YouTube: barra de progreso con buffer y
scrubber, fila de controles con volumen desplegable, velocidad, picture-in-picture
y pantalla completa. Los controles se ocultan solos mientras reproduce.

Este mÃ³dulo registra `<iswc-video>`.

## CuÃ¡ndo usarlo

Iconos, identidad visual y reproducciÃ³n de video.

## CuÃ¡ndo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## ImportaciÃ³n

```js
import './video.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-video
controls
playsinline
src="video.mp4"
></iswc-video>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `poster` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-controls` | boolean | Oculta la chrome propia. Por defecto se muestra. |
| `muted` | boolean | Fuente define default/restricciÃ³n. |
| `loop` | boolean | Fuente define default/restricciÃ³n. |
| `autoplay` | boolean | Fuente define default/restricciÃ³n. |
| `playsinline` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | Declarada por clase. |
| `poster` | lectura/escritura | Declarada por clase. |
| `withoutControls` | lectura/escritura | Reflejada a `without-controls`. |
| `controls` | lectura/escritura | Conveniencia: inverso de `withoutControls`. |
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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-play` | Evento personalizado del componente (play). |
| `iswc-pause` | Emitido al pausar la operaciÃ³n. |
| `iswc-ended` | Evento personalizado del componente (ended). |
| `play` | Evento `play`. |
| `pause` | Evento `pause`. |
| `ended` | Evento `ended`. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-play` | no | sÃ­ | sÃ­ | no |
| `iswc-pause` | no | sÃ­ | sÃ­ | no |
| `iswc-ended` | no | sÃ­ | sÃ­ | no |
| `play` | no | sÃ­ | sÃ­ | no |
| `pause` | no | sÃ­ | sÃ­ | no |
| `ended` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-video');
el.addEventListener('iswc-play', (e) => {
  console.log('iswc-play', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `play()` | MÃ©todo pÃºblico declarado. |
| `pause()` | MÃ©todo pÃºblico declarado. |
| `toggleFullscreen()` | MÃ©todo pÃºblico declarado. |
| `togglePictureInPicture()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--played` | Token leÃ­do o definido por componente. |
| `--buffered` | Token leÃ­do o definido por componente. |
| `--vol` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-video-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-video> â€” Web Component (vanilla).
> Reproductor con chrome tipo YouTube: barra de progreso propia (con buffer y
> scrubber) sobre la fila de botones, scrim inferior, overlay de play central,
> auto-ocultado mientras reproduce, atajos de teclado, pantalla completa,
> picture-in-picture y menÃº de velocidad.
> Atributos
>   src, poster
>   without-controls  boolean â€” oculta la chrome propia (por defecto se muestra)
>   muted, loop, autoplay, playsinline  boolean
> Slots: default â€” tracks / sources
> MÃ©todos: play(), pause(), toggleFullscreen(), togglePictureInPicture()
> Eventos (bubbles, composed): iswc-play, iswc-pause, iswc-ended
> TambiÃ©n reenvÃ­a play/pause/ended nativos (bubbles, composed)
> Teclado (con foco en el reproductor)
>   espacio / k  play-pausa      m  silenciar        f  pantalla completa
>   â† â†’          Â±5 s            j l  Â±10 s          0-9  salto por decenas
>   â†‘ â†“          Â±5 % volumen
> CSS Parts: ::part(base) ::part(video) ::part(controls) ::part(play-button)
>            ::part(mute-button) ::part(volume) ::part(volume-slider)
>            ::part(time) ::part(seek) ::part(progress) ::part(big-play)
>            ::part(fullscreen-button) ::part(pip-button) ::part(settings-button)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/check-icon-button.js`](../actions/check-icon-button.js)
- [`./icon.js`](./icon.js)

Tags del mÃ³dulo: `<iswc-video>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`, `aria-haspopup`, `aria-expanded`, `aria-checked`.

## Ejemplo avanzado

```html
<iswc-video
controls
playsinline
src="video.mp4"
></iswc-video>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./video.ts)
- [CSS](./video.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./video.json)
