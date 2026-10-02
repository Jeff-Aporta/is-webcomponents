---
tag: iswc-dock
tags:
  - iswc-dock
  - iswc-dock-item
category: layout
status: public
source: ./dock.js
style: ./dock.css
preview: ./dock.json
---
# `<iswc-dock>`

## Propósito

Barra de accesos tipo Dock de macOS. Los ítems se magnifican al acercar el
puntero, con caída suave según la distancia al ítem bajo el cursor.

Este módulo registra `<iswc-dock>` y `<iswc-dock-item>`.

## Cuándo usarlo

Barra compacta de accesos frecuentes (navegación secundaria, launcher de
acciones) donde la magnificación aporta señal de foco.

## Cuándo no usarlo

No sustituye navegación principal ni menús jerárquicos: para eso usar
`<iswc-menu>` / `<iswc-mega-menu>` / `<iswc-breadcrumb>`.

## Importación

```js
import './dock.js';
```

## Ejemplo mínimo

```html
<iswc-dock>
  <iswc-dock-item label="Inicio" icon="mdi:home"></iswc-dock-item>
  <iswc-dock-item label="Buscar" icon="mdi:magnify"></iswc-dock-item>
</iswc-dock>
```

## API

### Atributos y propiedades

#### Atributos observados — `<iswc-dock>`

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `position` | `bottom` \| `top` \| `left` \| `right` | Default `bottom`. |
| `max-scale` | number | Factor máximo de magnificación, default `1.6`. |
| `range` | number | Píxeles hasta donde cae la magnificación, default `110`. |

#### Atributos observados — `<iswc-dock-item>`

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
| (default) de `<iswc-dock>` | Ítems `<iswc-dock-item>`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-select` | `{ item }` | sí | sí | no |

`iswc-select` se emite sobre el `<iswc-dock>` contenedor, no sobre el ítem.

### Métodos y propiedades públicas

No expone métodos públicos; el componente es declarativo.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor de la barra (`<iswc-dock>`). |
| `item` | Ancla del ítem (`<iswc-dock-item>`). |
| `label` | Etiqueta del ítem. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo de la barra. |
| `--iswc-bg-soft` | Fondo del ítem en reposo. |
| `--iswc-border` | Borde de la barra. |
| `--iswc-text` | Color de icono y etiqueta. |
| `--iswc-text-soft` | Etiqueta atenuada. |
| `--iswc-accent` | Fondo del ítem activo. |
| `--iswc-on-accent` | Contenido sobre el ítem activo. |
| `--iswc-focus` | Anillo de foco. |

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

Tags del módulo: `<iswc-dock>`, `<iswc-dock-item>`.

## Accesibilidad

El ítem se renderiza como `<a tabindex="0">`, alcanzable con teclado. `label`
alimenta el texto accesible. La magnificación es puramente visual: no cambia
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
- Usar tag sin importar módulo primero.
- Poner elementos que no son `<iswc-dock-item>` en el slot: no reciben escala.
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
- [Preview](./dock.json)
