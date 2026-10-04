---
tag: iswc-theme-img
tags:
  - iswc-theme-img
category: media
status: public
source: ./theme-img.ts
style: ./theme-img.css
preview: ./theme-img.json
---
# `<iswc-theme-img>`

## PropÃ³sito

Una sola imagen que muestra la variante **dark** o **light** segÃºn el contenedor de tema del kit (misma cascada que `<iswc-theme-toggle>`). Escala con `font-size` (`1em Ã— 1em`), como `<iswc-avatar>` / `<iswc-icon>`.

Sirve para logos de marca, favicons en nav y cualquier asset dual-tema sin montar dos `<img>` a la vez.

## CuÃ¡ndo usarlo

- Logo / marca que cambia con dark â†” light.
- Reusar el mismo asset en nav, hero, splash, etc. con tamaÃ±o homogÃ©neo vÃ­a `font-size`.

## CuÃ¡ndo no usarlo

- Una sola imagen sin variante de tema: `<img>` o `<iswc-avatar image>`.
- Iconos vectoriales del set: `<iswc-icon>`.

## Ejemplo mÃ­nimo

```html
<span style="font-size: 2rem">
  <iswc-theme-img
    src-dark="./logo-dark.svg"
    src-light="./logo-light.svg"
    alt="Marca"
    shape="circle"
  ></iswc-theme-img>
</span>
```

## API

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src-dark` | URL | Variante para tema oscuro. |
| `src-light` | URL | Variante para tema claro. |
| `alt` | string | Accesible; vacÃ­o si decorativo. |
| `shape` | `circle` \| `rounded` \| `square` | Opcional. |
| `fit` | `contain` \| `cover` | Default `contain`. |
| `theme` | `dark` \| `light` | Fuerza variante; si falta, lee el contenedor. |
| `loading` | `eager` \| `lazy` | Como `<img>`. |

Propiedades camelCase espejo: `srcDark`, `srcLight`, `activeTheme`, `themeContainer`.

CSS part: `::part(image)`.


## Eventos

| Evento | DescripciÃ³n |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-theme-img');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>


### CSS parts

| Part | Uso |
| --- | --- |
| `image` | El `<img>` interno. |
