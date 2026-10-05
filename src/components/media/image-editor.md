---
tag: iswc-image-editor
tags:
  - iswc-image-editor
category: media
status: public
source: ./image-editor.ts
style: ./image-editor.css
preview: ./image-editor.json
---
# `<iswc-image-editor>`

## PropÃ³sito

Editor de imagen con recorte, zoom y rotaciÃ³n sobre `<canvas>`.

Este mÃ³dulo registra `<iswc-image-editor>`.

## CuÃ¡ndo usarlo

Foto de perfil, logo de empresa, adjuntos que deban recortarse antes de
subirse: cualquier caso donde el usuario ajusta la imagen en el navegador.

## CuÃ¡ndo no usarlo

Para mostrar una imagen sin ediciÃ³n basta un `<img>` o `<iswc-avatar>`.

## ImportaciÃ³n

```js
import './image-editor.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-image-editor src="/uploads/logo.png" aspect="1"></iswc-image-editor>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string | URL de la imagen a editar. Requerido. |
| `zoom` | number | Factor de escala; `1` = 100%. Default `1`. |
| `rotation` | number | Grados de rotaciÃ³n. Default `0`. |
| `aspect` | string | RelaciÃ³n del recorte: `"1"`, `"4/3"`, `"16/9"` o `""` (libre). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `image` | lectura | `HTMLImageElement` ya cargado. |
| `cropped` | lectura | dataURL actual, con zoom + rotaciÃ³n + recorte aplicados. |

### Slots

| Slot | Uso |
| --- | --- |
| `toolbar` | Botones con `data-action="zoom-in" \| "zoom-out" \| "rotate" \| "rotate-ccw" \| "reset" \| "crop"`. El editor delega la acciÃ³n a partir de ese atributo. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-load` | Emitido cuando el recurso se ha cargado. |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-crop` | Evento personalizado del componente (crop). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-load` | `{ image }` | sÃ­ | sÃ­ | no |
| `iswc-change` | `{ crop }` | sÃ­ | sÃ­ | no |
| `iswc-crop` | `{ dataURL, crop }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-image-editor');
el.addEventListener('iswc-load', (e) => {
  console.log('iswc-load', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `crop({ x, y, width, height })` | Fija el recorte en coordenadas de pÃ­xel de la imagen. |
| `applyZoom(delta)` | Suma `delta` al zoom actual. |
| `applyRotation(deg)` | Suma `deg` a la rotaciÃ³n actual. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `viewport` | Ãrea visible sobre la que se arrastra el recorte. |
| `canvas` | Lienzo del editor. |
| `selection` | RectÃ¡ngulo de recorte con sus manejadores. |
| `toolbar` | Barra que aloja el slot `toolbar`. |
| `status` | `<output>` con el estado actual. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo. Para enviar el
resultado, leer `cropped` (o escuchar `iswc-crop`) y volcarlo en un campo
oculto o en un `FormData`.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> `<iswc-image-editor>` â€” Editor de imagen con crop, zoom y rotaciÃ³n. El slot
> `toolbar` delega acciones vÃ­a `data-action`, de modo que los botones los
> pone quien lo usa y el editor solo ejecuta.

El recorte se arrastra desde el interior del rectÃ¡ngulo y se redimensiona
desde los cuatro manejadores de esquina. Con `aspect` fijo, el redimensionado
conserva la relaciÃ³n.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-image-editor>`.

## Accesibilidad

El lienzo lleva `aria-label`. El estado va en un `<output>` (live region).
Los botones de la toolbar los aporta quien integra: usar `<iswc-button>` con
`aria-label` explÃ­cito.

## Ejemplo avanzado

```html
<iswc-image-editor id="ed" src="/uploads/foto.jpg" aspect="1" zoom="1.2">
  <div slot="toolbar">
    <iswc-button data-action="zoom-out" aria-label="Alejar">âˆ’</iswc-button>
    <iswc-button data-action="zoom-in" aria-label="Acercar">+</iswc-button>
    <iswc-button data-action="rotate" aria-label="Rotar">âŸ³</iswc-button>
    <iswc-button data-action="crop">Recortar</iswc-button>
  </div>
</iswc-image-editor>

<script type="module">
  document.getElementById('ed').addEventListener('iswc-crop', (e) => {
    console.log(e.detail.dataURL);
  });
</script>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Leer `cropped` antes del evento `iswc-load`.
- Servir `src` desde otro origen sin CORS: el `<canvas>` queda contaminado y
  `cropped` lanza.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./image-editor.ts)
- [CSS](./image-editor.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
