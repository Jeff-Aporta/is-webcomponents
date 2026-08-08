---
tag: is-image-editor
tags:
  - is-image-editor
category: media
status: public
source: ./image-editor.js
style: ./image-editor.css
preview: ../../previews/media/is-image-editor.json
---
# `<is-image-editor>`

## Propósito

Editor de imagen con recorte, zoom y rotación sobre `<canvas>`.

Este módulo registra `<is-image-editor>`.

## Cuándo usarlo

Foto de perfil, logo de empresa, adjuntos que deban recortarse antes de
subirse: cualquier caso donde el usuario ajusta la imagen en el navegador.

## Cuándo no usarlo

Para mostrar una imagen sin edición basta un `<img>` o `<is-avatar>`.

## Importación

```js
import './image-editor.js';
```

## Ejemplo mínimo

```html
<is-image-editor src="/uploads/logo.png" aspect="1"></is-image-editor>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string | URL de la imagen a editar. Requerido. |
| `zoom` | number | Factor de escala; `1` = 100%. Default `1`. |
| `rotation` | number | Grados de rotación. Default `0`. |
| `aspect` | string | Relación del recorte: `"1"`, `"4/3"`, `"16/9"` o `""` (libre). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `image` | lectura | `HTMLImageElement` ya cargado. |
| `cropped` | lectura | dataURL actual, con zoom + rotación + recorte aplicados. |

### Slots

| Slot | Uso |
| --- | --- |
| `toolbar` | Botones con `data-action="zoom-in" \| "zoom-out" \| "rotate" \| "rotate-ccw" \| "reset" \| "crop"`. El editor delega la acción a partir de ese atributo. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-load` | `{ image }` | sí | sí | no |
| `is-change` | `{ crop }` | sí | sí | no |
| `is-crop` | `{ dataURL, crop }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `crop({ x, y, width, height })` | Fija el recorte en coordenadas de píxel de la imagen. |
| `applyZoom(delta)` | Suma `delta` al zoom actual. |
| `applyRotation(deg)` | Suma `deg` a la rotación actual. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `viewport` | Área visible sobre la que se arrastra el recorte. |
| `canvas` | Lienzo del editor. |
| `selection` | Rectángulo de recorte con sus manejadores. |
| `toolbar` | Barra que aloja el slot `toolbar`. |
| `status` | `<output>` con el estado actual. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo. Para enviar el
resultado, leer `cropped` (o escuchar `is-crop`) y volcarlo en un campo
oculto o en un `FormData`.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> `<is-image-editor>` — Editor de imagen con crop, zoom y rotación. El slot
> `toolbar` delega acciones vía `data-action`, de modo que los botones los
> pone quien lo usa y el editor solo ejecuta.

El recorte se arrastra desde el interior del rectángulo y se redimensiona
desde los cuatro manejadores de esquina. Con `aspect` fijo, el redimensionado
conserva la relación.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-image-editor>`.

## Accesibilidad

El lienzo lleva `aria-label`. El estado va en un `<output>` (live region).
Los botones de la toolbar los aporta quien integra: usar `<is-button>` con
`aria-label` explícito.

## Ejemplo avanzado

```html
<is-image-editor id="ed" src="/uploads/foto.jpg" aspect="1" zoom="1.2">
  <div slot="toolbar">
    <is-button data-action="zoom-out" aria-label="Alejar">−</is-button>
    <is-button data-action="zoom-in" aria-label="Acercar">+</is-button>
    <is-button data-action="rotate" aria-label="Rotar">⟳</is-button>
    <is-button data-action="crop">Recortar</is-button>
  </div>
</is-image-editor>

<script type="module">
  document.getElementById('ed').addEventListener('is-crop', (e) => {
    console.log(e.detail.dataURL);
  });
</script>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Leer `cropped` antes del evento `is-load`.
- Servir `src` desde otro origen sin CORS: el `<canvas>` queda contaminado y
  `cropped` lanza.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./image-editor.js)
- [CSS](./image-editor.css)
- [Índice de categoría](./LLM.md)
