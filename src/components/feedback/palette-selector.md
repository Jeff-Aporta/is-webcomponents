---
tag: iswc-palette-selector
tags:
  - iswc-palette-selector
category: feedback
status: public
source: ./palette-selector.ts
style: ./palette-selector.css
preview: ./palette-selector.json
---
# `<iswc-palette-selector>`

## Propósito

Selector de las 25 paletas generales del kit (`src/styles/palettes.json`) más
el modificador **Panda**. Cada opción muestra la identidad de su paleta en el
tema activo —fondo, papel, main, contraste y texto—, su nombre y su
origen/ánimo; las opciones van agrupadas por familia de tono (rojos, naranjas
y amarillos, verdes, azules y cianes, violetas y rosas, neutros) y se filtran
con un buscador. El interruptor Panda invierte las superficies (en claro pinta
las oscuras tintadas de la paleta y viceversa) conservando main y contraste.

`scope="root"` escribe `data-palette` / `data-panda` en `<html>`;
`scope="closest"` en el primer ancestro que ya tenga `data-palette`. Con el
target en `<html>` la elección persiste en la config de la app
(`localStorage["iswc:app-cfg"]` → `palette` y `panda`). Admite un catálogo
propio en `palettes`; si una paleta trae `css`, inyecta esa hoja bajo demanda.
Dos selectores con el mismo target quedan sincronizados.

Este módulo registra `<iswc-palette-selector>`.

## Cuándo usarlo

Dejar que el usuario elija la paleta (y Panda) de la app o de un contenedor.

## Cuándo no usarlo

No usar como decoración ni para elegir colores sueltos (usa `iswc-color-picker`).

## Importación

```js
import './palette-selector.js';
```

## Ejemplo mínimo

```html
<html data-theme="dark" data-palette="turquesa">
  …
  <iswc-palette-selector></iswc-palette-selector>
</html>
```

## Paletas

| `value` | Nombre | Familia | Origen | Ánimo |
| --- | --- | --- | --- | --- |
| `delfin` | Delfín | Azules y cianes | dodgerblue | Azul franco y confiable; la paleta por defecto del kit. |
| `cardenal` | Cardenal | Rojos | rojo de marca #e03131 | Rojo de marca sobre superficies neutras, sobrio y directo. |
| `iguana` | Iguana | Verdes | yellowgreen | Verde lima de campo, superficies muy tintadas. |
| `rubi` | Rubí | Rojos | red rgb(200,0,0) | Rojo intenso y apasionado. |
| `esmeralda` | Esmeralda | Verdes | green rgb(0,200,0) | Verde vivo, fresco y natural. |
| `zafiro` | Zafiro | Azules y cianes | blue rgb(0,0,200) | Azul profundo y elegante. |
| `citrino` | Citrino | Naranjas y amarillos | yellow rgb(200,200,0) | Amarillo solar y optimista. |
| `orquidea` | Orquídea | Violetas y rosas | magenta rgb(200,0,200) | Magenta floral, creativo y audaz. |
| `turquesa` | Turquesa | Azules y cianes | cyan rgb(0,200,200) | Cian tropical y limpio; la de Avatar. |
| `marte` | Marte | Naranjas y amarillos | tomato rgb(219,48,0) | Rojo anaranjado, enérgico como el planeta rojo. |
| `granate` | Granate | Rojos | crimson rgb(200,40,80) | Carmesí profundo, serio y cálido. |
| `neptuno` | Neptuno | Azules y cianes | skyGreen rgb(15,146,216) | Azul cielo marino, sereno. |
| `peridoto` | Peridoto | Verdes | lemonGreen rgb(132,233,16) | Verde limón eléctrico y juvenil. |
| `jade` | Jade | Verdes | militaryGreen rgb(26,128,0) | Verde bosque, firme y tranquilo. |
| `aguamarina` | Aguamarina | Azules y cianes | aquaBlue rgb(30,168,202) | Azul agua cristalina. |
| `amatista` | Amatista | Violetas y rosas | purple rgb(128,0,128) | Púrpura profundo y místico. |
| `menta` | Menta | Verdes | springGreen rgb(19,200,132) | Verde menta, fresco y amable. |
| `luna` | Luna | Neutros | gray rgb(128,128,128) | Gris lunar, neutro y silencioso. |
| `jupiter` | Júpiter | Naranjas y amarillos | orange rgb(200,128,0) | Naranja terroso como las bandas de Júpiter. |
| `flamenco` | Flamenco | Violetas y rosas | pink rgb(255,128,200) | Rosa vibrante y festivo. |
| `lapislazuli` | Lapislázuli | Azules y cianes | navy rgb(0,52,163) | Azul marino noble. |
| `cobre` | Cobre | Naranjas y amarillos | brown rgb(143,52,0) | Marrón cobrizo, artesanal. |
| `tanzanita` | Tanzanita | Violetas y rosas | violet rgb(128,43,200) | Violeta azulado, sofisticado. |
| `olivino` | Olivino | Verdes | olive rgb(128,150,0) | Verde oliva, mediterráneo y sereno. |
| `ambar` | Ámbar | Naranjas y amarillos | amber rgb(255,191,0) | Ámbar dorado y cálido. |

Default: `delfin` (en `:root`). Cada paleta declara solo semillas (`h/s/b`
del main, tono del contraste, `tint`, `fontTint`); el CSS deriva todo lo demás.

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `palettes` | string JSON | Catálogo propio: `[{ value, label, h, s, b, family?, origin?, mood?, contrastH?, contrastS?, contrastL?, tint?, fontTint?, accent?, css? }]`. Default: las 25 del kit. `accent` (hex) solo si no hay `h/s/b`. |
| `value` | string | Paleta activa; se refleja en `data-palette` del target. |
| `panda` | booleano | Modificador Panda; se refleja en `data-panda` del target. |
| `hide-panda` | booleano | Oculta el interruptor Panda. |
| `scope` | `root` \| `closest` | Dónde escribe (default `root`). |
| `aria-label` | string | Etiqueta del trigger (default «Paleta X — elegir paleta»). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `palettes` | lectura/escritura | Getter devuelve copia; setter escribe el atributo JSON. |
| `value` | lectura/escritura | Activa la paleta y notifica. |
| `panda` | lectura/escritura | Activa/desactiva Panda. |

### Slots

| Slot | Uso |
| --- | --- |
| `trigger` | Sustituye el botón interno; el componente sigue abriendo el panel y emitiendo eventos. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-palette-change` | `{ value, palette, container }` | sí | sí | no |
| `iswc-panda-change` | `{ panda, container }` | sí | sí | no |

### Métodos

| Método | Uso |
| --- | --- |
| `open()` | Abre el panel (enfoca el buscador). |
| `close()` | Cierra el panel. |
| `toggle()` | Alterna el panel. |

### CSS parts

| Part | Uso |
| --- | --- |
| `trigger` | Botón interno (muestra main + contraste y el nombre). |
| `label` | Nombre de la paleta activa en el trigger. |
| `panel` | Superficie flotante. |
| `search` | Buscador. |
| `panda` | Interruptor Panda (`role="switch"`). |
| `menu` | Lista (`role="listbox"`). |
| `group` | Grupo por familia de tono. |
| `option` | Opción de paleta. |

### Custom states

No expone.

### CSS custom properties

Lee los tokens del tema: `--iswc-bg-elev`, `--iswc-border`, `--iswc-border-soft`,
`--iswc-text`, `--iswc-text-soft`, `--iswc-text-dim`, `--iswc-control-*`,
`--iswc-brand-soft`, `--iswc-color-brand`, `--iswc-on-brand`, `--iswc-focus`,
`--iswc-shadow`, `--iswc-radius`. Las muestras se derivan de las semillas de
cada paleta (`--sw-*`, internas) con las mismas recetas que `palette-build.ts`.

## Estilo y escala

Todas las medidas del componente van en `em` (radios, paddings, gaps,
muestras, íconos, interruptor); solo los hairlines usan `1px`. Un
`font-size` en el host o en un ancestro escala el selector completo:

```html
<iswc-palette-selector style="font-size: 0.875em"></iswc-palette-selector>
```

## Comportamiento

- Paleta inicial: la guardada en `iswc:app-cfg` (solo target `<html>`), si no
  el `data-palette` del target, si no `value`, si no la primera del catálogo.
- Panda inicial: el guardado, si no el atributo `panda` o el `data-panda` del target.
- Las muestras usan el juego claro u oscuro que realmente pinta el target
  (tema + Panda).
- Teclado: el buscador recibe el foco al abrir; ↓ pasa a la lista, ↑/↓
  navegan, Enter/Espacio eligen, Escape cierra. Enter en el buscador elige la
  primera coincidencia.
- Una paleta ajena al catálogo en el target no se pisa.

## Dependencias y componentes relacionados

- [`../../core/element-base.ts`](../../core/element-base.ts)
- [`../../core/popup-dismiss.ts`](../../core/popup-dismiss.ts)
- [`../../core/app-cfg.ts`](../../core/app-cfg.ts)
- [`../../styles/palette-build.ts`](../../styles/palette-build.ts)
- [`../media/icon.ts`](../media/icon.ts)
- `<iswc-theme-toggle>` (tema claro/oscuro).

Tags del módulo: `<iswc-palette-selector>`.

## Accesibilidad

Trigger con `aria-haspopup="listbox"` y `aria-expanded`; lista
`role="listbox"` con grupos `role="group"` etiquetados por su familia y
opciones `role="option"` con `aria-selected`. El interruptor Panda es
`role="switch"` con `aria-checked`. Las muestras son `aria-hidden`; el nombre,
origen y ánimo van en texto. Todas las paletas cumplen AA de texto en
claro/oscuro/Panda (contrato `palettes-contrast`).

## Ejemplo avanzado

```html
<div data-theme="light" data-palette="acme">
  <iswc-palette-selector scope="closest" hide-panda
    palettes='[{"value":"acme","label":"Acme","h":262,"s":"70%","b":"52%","origin":"marca propia","css":"/css/acme.css"}]'>
  </iswc-palette-selector>
</div>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Poner `data-panda` en un nodo sin `data-theme`: Panda va junto al tema.
- Escribir colores fijos por paleta: una paleta = semillas en `palettes.json`.
- Usar px/rem en estilos del selector: todo en `em`.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.
- Paletas nuevas: editar `src/styles/palettes.json` y correr `scripts/gen-palettes.mjs`.

## Fuentes

- [JavaScript](./palette-selector.ts)
- [CSS](./palette-selector.css)
- [Paletas](../../styles/palettes.json)
- [Índice de categoría](../../specs/componentes.md)
- [Preview](./palette-selector.json)
