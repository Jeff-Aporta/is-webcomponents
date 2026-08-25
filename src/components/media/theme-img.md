---
tag: is-theme-img
tags:
  - is-theme-img
category: media
status: public
source: ./theme-img.js
style: ./theme-img.css
preview: ../../previews/media/is-theme-img.json
---
# `<is-theme-img>`

## Propósito

Una sola imagen que muestra la variante **dark** o **light** según el contenedor de tema del kit (misma cascada que `<is-theme-toggle>`). Escala con `font-size` (`1em × 1em`), como `<is-avatar>` / `<is-icon>`.

Sirve para logos de marca, favicons en nav y cualquier asset dual-tema sin montar dos `<img>` a la vez.

## Cuándo usarlo

- Logo / marca que cambia con dark ↔ light.
- Reusar el mismo asset en nav, hero, splash, etc. con tamaño homogéneo vía `font-size`.

## Cuándo no usarlo

- Una sola imagen sin variante de tema: `<img>` o `<is-avatar image>`.
- Iconos vectoriales del set: `<is-icon>`.

## Ejemplo mínimo

```html
<span style="font-size: 2rem">
  <is-theme-img
    src-dark="./logo-dark.svg"
    src-light="./logo-light.svg"
    alt="Marca"
    shape="circle"
  ></is-theme-img>
</span>
```

## API

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src-dark` | URL | Variante para tema oscuro. |
| `src-light` | URL | Variante para tema claro. |
| `alt` | string | Accesible; vacío si decorativo. |
| `shape` | `circle` \| `rounded` \| `square` | Opcional. |
| `fit` | `contain` \| `cover` | Default `contain`. |
| `theme` | `dark` \| `light` | Fuerza variante; si falta, lee el contenedor. |
| `loading` | `eager` \| `lazy` | Como `<img>`. |

Propiedades camelCase espejo: `srcDark`, `srcLight`, `activeTheme`, `themeContainer`.

CSS part: `::part(image)`.
