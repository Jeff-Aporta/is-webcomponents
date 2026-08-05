---
tag: is-video-playlist
tags:
  - is-video-playlist
category: media
status: public
source: ./video-playlist.js
style: ./video-playlist.css
preview: ../../previews/media/is-video-playlist.html
---
# `<is-video-playlist>`

## Propósito

Reproductor de playlist con look YouTube: cabecera con título y canal,
barra inferior overlay con play / seek / vol, lista colapsable debajo.
Las herramientas adicionales (prev / next / autoplay) se proyectan
automáticamente en los slots tools-left
y tools-right del reproductor.

Este módulo registra `<is-video-playlist>`.

## Cuándo usarlo

Iconos, identidad visual y reproducción de video.

## Cuándo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## Importación

```js
import './video-playlist.js';
```

## Ejemplo mínimo

```html
<is-video-playlist autoplay-next placement="bottom">
<is-video title="Big Buck Bunny" channel="Blender" poster="…" src="01.mp4"></is-video>
<is-video title="Sintel" poster="…" src="02.mp4"></is-video>
<is-video title="Elephants Dream" poster="…" src="03.mp4"></is-video>
</is-video-playlist>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `autoplay-next` | boolean | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `channel` | string/según contrato | Fuente define default/restricción. |
| `accordion` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-video-change` | sí | sí | sí | no |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `goTo()` | Método público declarado. |
| `play()` | Método público declarado. |
| `next()` | Método público declarado. |
| `previous()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-accent` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-video-playlist> — player + lista tipo YouTube.
> Cada clip es un <is-video> dentro del slot default. El componente
> renderiza un reproductor con cabecera (título + canal) y una barra
> inferior estilo YouTube con controles + herramientas inyectadas
> (anterior / siguiente / autoplay) mediante slots.
> Atributos
>   placement      left | right | bottom (default: bottom)
>   autoplay-next  boolean — al terminar uno, reproduce el siguiente
>   accordion      auto | open | closed (default auto: cerrado en móvil)
>   channel        caption opcional que se muestra bajo el título
> Slots
>   default        is-video (uno por clip)
>   tools-left     botones / iconos que se muestran a la izquierda del play
>                  (el playlist inyecta prev/next aquí por defecto)
>   tools-right    botones / iconos que se muestran a la derecha del vol
>                  (el playlist inyecta autoplay aquí por defecto)
>   config         botón / menú opcional en la cabecera YouTube
> Métodos: goTo(index), next(), previous(), play(index)
> Eventos: is-video-change, is-change
> Parts: video-playlist, playlist-head, playlist-toggle, playlist-items,
>        playlist-item, playlist-title, playlist-duration, channel,
>        title, header, header-actions, player-toolbar, tools-left,
>        tools-right

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./video.js`](./video.js)
- [`./icon.js`](./icon.js)

Tags del módulo: `<is-video-playlist>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-controls`, `aria-expanded`, `aria-labelledby`, `aria-pressed`, `aria-selected`.

## Ejemplo avanzado

```html
<is-video-playlist placement="right">…</is-video-playlist>
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

- [JavaScript](./video-playlist.js)
- [CSS](./video-playlist.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/media/is-video-playlist.html)
