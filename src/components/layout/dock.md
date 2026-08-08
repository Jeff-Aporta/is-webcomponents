---
tag: is-dock
tags:
  - is-dock
  - is-dock-item
category: layout
status: public
source: ./dock.js
style: ./dock.css
preview: ../../previews/layout/is-dock.json
---
# `<is-dock>`

## Propósito

Barra de accesos tipo Dock de macOS. Los ítems se magnifican al acercar el
puntero, con caída suave según la distancia al ítem bajo el cursor.

Este módulo registra `<is-dock>` y `<is-dock-item>`.

## Cuándo usarlo

Barra compacta de accesos frecuentes (navegación secundaria, launcher de
acciones) donde la magnificación aporta señal de foco.

## Cuándo no usarlo

No sustituye navegación principal ni menús jerárquicos: para eso usar
`<is-menu>` / `<is-mega-menu>` / `<is-breadcrumb>`.

## Importación

```js
import './dock.js';
```

## Ejemplo mínimo

```html
<is-dock>
  <is-dock-item label="Inicio" icon="mdi:home"></is-dock-item>
  <is-dock-item label="Buscar" icon="mdi:magnify"></is-dock-item>
</is-dock>
```

## API

### Atributos y propiedades

#### Atributos observados — `<is-dock>`

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `position` | `bottom` \| `top` \| `left` \| `right` | Default `bottom`. |
| `max-scale` | number | Factor máximo de magnificación, default `1.6`. |
| `range` | number | Píxeles hasta donde cae la magnificación, default `110`. |

#### Atributos observados — `<is-dock-item>`

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string | Nombre de icono (colección Iconify del kit). |
| `label` | string | Texto visible y accesible del ítem. |
| `href` | string | Si está presente, el ítem navega como enlace. |
| `active` | boolean | Marca el ítem activo. |

#### Propiedades públicas

No expone propiedades públicas propias; el estado se lee de los atributos.

### Slots

| Slot | Uso |
| --- | --- |
| (default) de `<is-dock>` | Ítems `<is-dock-item>`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-select` | `{ item }` | sí | sí | no |

`is-select` se emite sobre el `<is-dock>` contenedor, no sobre el ítem.

### Métodos y propiedades públicas

No expone métodos públicos; el componente es declarativo.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor de la barra (`<is-dock>`). |
| `item` | Ancla del ítem (`<is-dock-item>`). |
| `label` | Etiqueta del ítem. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-bg-elev` | Fondo de la barra. |
| `--is-bg-soft` | Fondo del ítem en reposo. |
| `--is-border` | Borde de la barra. |
| `--is-text` | Color de icono y etiqueta. |
| `--is-text-soft` | Etiqueta atenuada. |
| `--is-accent` | Fondo del ítem activo. |
| `--is-on-accent` | Contenido sobre el ítem activo. |
| `--is-focus` | Anillo de foco. |

### Integración con formularios

No declara integración form-associated.

## Comportamiento

- `pointermove` sobre la barra recalcula la escala de cada ítem en función de
  la distancia al cursor, aplicada por `--scale` y acotada por `max-scale`.
  El cálculo se agenda en `requestAnimationFrame`.
- `pointerleave` limpia la magnificación.
- `disconnectedCallback` cancela el frame pendiente.
- `position` cambia el eje de la barra y el eje sobre el que se mide la
  distancia.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del módulo: `<is-dock>`, `<is-dock-item>`.

## Accesibilidad

El ítem se renderiza como `<a tabindex="0">`, alcanzable con teclado. `label`
alimenta el texto accesible. La magnificación es puramente visual: no cambia
orden de foco ni contenido anunciado.

## Ejemplo avanzado

```html
<is-dock position="left" max-scale="2" range="140">
  <is-dock-item label="Inicio" icon="mdi:home" href="/" active></is-dock-item>
  <is-dock-item label="Reportes" icon="mdi:chart-bar" href="/reportes"></is-dock-item>
</is-dock>

<script type="module">
  document.querySelector('is-dock')
    .addEventListener('is-select', (e) => console.log(e.detail.item.label));
</script>
```

## Errores comunes

- Escuchar `is-select` en el `<is-dock-item>`: se emite en el contenedor.
- Usar tag sin importar módulo primero.
- Poner elementos que no son `<is-dock-item>` en el slot: no reciben escala.
- Subir `max-scale` sin subir `range`: la magnificación queda abrupta.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./dock.js)
- [CSS](./dock.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-dock.json)
