---
tag: iswc-video-playlist
tags:
  - iswc-video-playlist
category: media
status: public
source: ./video-playlist.ts
style: ./video-playlist.css
preview: ./video-playlist.json
---
# `<iswc-video-playlist>`

## PropÃ³sito

Reproductor de playlist con look YouTube: cabecera con tÃ­tulo y canal,
barra inferior overlay con play / seek / vol, lista colapsable debajo.
Las herramientas adicionales (prev / next / autoplay) se proyectan
automÃ¡ticamente en los slots tools-left
y tools-right del reproductor.

Este mÃ³dulo registra `<iswc-video-playlist>`.

## CuÃ¡ndo usarlo

Iconos, identidad visual y reproducciÃ³n de video.

## CuÃ¡ndo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## ImportaciÃ³n

```js
import './video-playlist.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-video-playlist autoplay-next placement="bottom">
<iswc-video title="Big Buck Bunny" channel="Blender" poster="â€¦" src="01.mp4"></iswc-video>
<iswc-video title="Sintel" poster="â€¦" src="02.mp4"></iswc-video>
<iswc-video title="Elephants Dream" poster="â€¦" src="03.mp4"></iswc-video>
</iswc-video-playlist>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `autoplay-next` | boolean | Fuente define default/restricciÃ³n. |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `channel` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `accordion` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `autoplayNext` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `channel` | lectura/escritura | Declarada por clase. |
| `accordion` | lectura/escritura | Declarada por clase. |
| `index` | solo lectura | Declarada por clase. |
| `videos` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `config` | Contenido proyectado. |
| `tools-left` | Contenido proyectado. |
| `tools-right` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-video-change` | Evento personalizado del componente (video change). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-video-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-video-playlist');
el.addEventListener('iswc-video-change', (e) => {
  console.log('iswc-video-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `goTo()` | MÃ©todo pÃºblico declarado. |
| `play()` | MÃ©todo pÃºblico declarado. |
| `next()` | MÃ©todo pÃºblico declarado. |
| `previous()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `video-playlist` | Personalizable con `::part(video-playlist)`. |
| `header` | Personalizable con `::part(header)`. |
| `title` | Personalizable con `::part(title)`. |
| `channel` | Personalizable con `::part(channel)`. |
| `header-actions` | Personalizable con `::part(header-actions)`. |
| `player-toolbar` | Personalizable con `::part(player-toolbar)`. |
| `tools-left` | Personalizable con `::part(tools-left)`. |
| `play-button` | Personalizable con `::part(play-button)`. |
| `seek` | Personalizable con `::part(seek)`. |
| `time` | Personalizable con `::part(time)`. |
| `mute-button` | Personalizable con `::part(mute-button)`. |
| `volume-slider` | Personalizable con `::part(volume-slider)`. |
| `tools-right` | Personalizable con `::part(tools-right)`. |
| `playlist` | Personalizable con `::part(playlist)`. |
| `status` | Personalizable con `::part(status)`. |
| `playlist-toggle` | Personalizable con `::part(playlist-toggle)`. |
| `playlist-items` | Personalizable con `::part(playlist-items)`. |
| `playlist-duration` | DuraciÃ³n de cada vÃ­deo en la lista. |
| `playlist-item` | Cada fila individual del listado. |
| `playlist-thumbnail` | Miniatura de cada vÃ­deo. |
| `playlist-title` | TÃ­tulo de cada vÃ­deo. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-accent` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-video-playlist> â€” player + lista tipo YouTube.
> Cada clip es un <iswc-video> dentro del slot default. El componente
> renderiza un reproductor con cabecera (tÃ­tulo + canal) y una barra
> inferior estilo YouTube con controles + herramientas inyectadas
> (anterior / siguiente / autoplay) mediante slots.
> Atributos
>   placement      left | right | bottom (default: bottom)
>   autoplay-next  boolean â€” al terminar uno, reproduce el siguiente
>   accordion      auto | open | closed (default auto: cerrado en mÃ³vil)
>   channel        caption opcional que se muestra bajo el tÃ­tulo
> Slots
>   default        iswc-video (uno por clip)
>   tools-left     botones / iconos que se muestran a la izquierda del play
>                  (el playlist inyecta prev/next aquÃ­ por defecto)
>   tools-right    botones / iconos que se muestran a la derecha del vol
>                  (el playlist inyecta autoplay aquÃ­ por defecto)
>   config         botÃ³n / menÃº opcional en la cabecera YouTube
> MÃ©todos: goTo(index), next(), previous(), play(index)
> Eventos: iswc-video-change, iswc-change
> Parts: video-playlist, playlist-head, playlist-toggle, playlist-items,
>        playlist-item, playlist-title, playlist-duration, channel,
>        title, header, header-actions, player-toolbar, tools-left,
>        tools-right

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./video.js`](./video.js)
- [`./icon.js`](./icon.js)

Tags del mÃ³dulo: `<iswc-video-playlist>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-controls`, `aria-expanded`, `aria-labelledby`, `aria-pressed`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-video-playlist placement="right">â€¦</iswc-video-playlist>
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

- [JavaScript](./video-playlist.ts)
- [CSS](./video-playlist.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./video-playlist.json)
