---
tag: iswc-dock
tags:
  - iswc-dock
  - iswc-dock-item
category: layout
status: public
source: ./dock.ts
style: ./dock.css
preview: ./dock.json
---
# `<iswc-dock>`

## PropÃ³sito

Barra de accesos tipo Dock de macOS. Los Ã­tems se magnifican al acercar el
puntero, con caÃ­da suave segÃºn la distancia al Ã­tem bajo el cursor.

Este mÃ³dulo registra `<iswc-dock>` y `<iswc-dock-item>`.

## CuÃ¡ndo usarlo

Barra compacta de accesos frecuentes (navegaciÃ³n secundaria, launcher de
acciones) donde la magnificaciÃ³n aporta seÃ±al de foco.

## CuÃ¡ndo no usarlo

No sustituye navegaciÃ³n principal ni menÃºs jerÃ¡rquicos: para eso usar
`<iswc-menu>` / `<iswc-mega-menu>` / `<iswc-breadcrumb>`.

## ImportaciÃ³n

```js
import './dock.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-dock>
  <iswc-dock-item label="Inicio" icon="mdi:home"></iswc-dock-item>
  <iswc-dock-item label="Buscar" icon="mdi:magnify"></iswc-dock-item>
</iswc-dock>
```

## API

### Atributos y propiedades

#### Atributos observados â€” `<iswc-dock>`

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `position` | `bottom` \| `top` \| `left` \| `right` | Default `bottom`. |
| `max-scale` | number | Factor mÃ¡ximo de magnificaciÃ³n, default `1.6`. |
| `range` | number | PÃ­xeles hasta donde cae la magnificaciÃ³n, default `110`. |

#### Atributos observados â€” `<iswc-dock-item>`

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string | Nombre de icono (colecciÃ³n Iconify del kit). |
| `label` | string | Texto visible y accesible del Ã­tem. |
| `href` | string | Si estÃ¡ presente, el Ã­tem navega como enlace. |
| `active` | boolean | Marca el Ã­tem activo. |

#### Propiedades pÃºblicas

No expone propiedades pÃºblicas propias; el estado se lee de los atributos.

### Slots

| Slot | Uso |
| --- | --- |
| (default) de `<iswc-dock>` | Ãtems `<iswc-dock-item>`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-select` | `{ item }` | sÃ­ | sÃ­ | no |

`iswc-select` se emite sobre el `<iswc-dock>` contenedor, no sobre el Ã­tem.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-dock');
el.addEventListener('iswc-select', (e) => {
  console.log('iswc-select', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone mÃ©todos pÃºblicos; el componente es declarativo.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor de la barra (`<iswc-dock>`). |
| `item` | Ancla del Ã­tem (`<iswc-dock-item>`). |
| `label` | Etiqueta del Ã­tem. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo de la barra. |
| `--iswc-bg-soft` | Fondo del Ã­tem en reposo. |
| `--iswc-border` | Borde de la barra. |
| `--iswc-text` | Color de icono y etiqueta. |
| `--iswc-text-soft` | Etiqueta atenuada. |
| `--iswc-accent` | Fondo del Ã­tem activo. |
| `--iswc-on-accent` | Contenido sobre el Ã­tem activo. |
| `--iswc-focus` | Anillo de foco. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.

## Comportamiento

- `pointermove` sobre la barra recalcula la escala de cada Ã­tem en funciÃ³n de
  la distancia al cursor, aplicada por `--scale` y acotada por `max-scale`.
  El cÃ¡lculo se agenda en `requestAnimationFrame`.
- `pointerleave` limpia la magnificaciÃ³n.
- `disconnectedCallback` cancela el frame pendiente.
- `position` cambia el eje de la barra y el eje sobre el que se mide la
  distancia.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del mÃ³dulo: `<iswc-dock>`, `<iswc-dock-item>`.

## Accesibilidad

El Ã­tem se renderiza como `<a tabindex="0">`, alcanzable con teclado. `label`
alimenta el texto accesible. La magnificaciÃ³n es puramente visual: no cambia
orden de foco ni contenido anunciado.

## Ejemplo avanzado

```html
<iswc-dock position="left" max-scale="2" range="140">
  <iswc-dock-item label="Inicio" icon="mdi:home" href="/" active></iswc-dock-item>
  <iswc-dock-item label="Reportes" icon="mdi:chart-bar" href="/reportes"></iswc-dock-item>
</iswc-dock>

<script type="module">
  document.querySelector('iswc-dock')
    .addEventListener('iswc-select', (e) => console.log(e.detail.item.label));
</script>
```

## Errores comunes

- Escuchar `iswc-select` en el `<iswc-dock-item>`: se emite en el contenedor.
- Usar tag sin importar mÃ³dulo primero.
- Poner elementos que no son `<iswc-dock-item>` en el slot: no reciben escala.
- Subir `max-scale` sin subir `range`: la magnificaciÃ³n queda abrupta.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./dock.ts)
- [CSS](./dock.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./dock.json)
