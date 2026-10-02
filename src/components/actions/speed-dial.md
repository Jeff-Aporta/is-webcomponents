---
tag: iswc-speed-dial
tags:
  - iswc-speed-dial
  - iswc-speed-dial-action
category: actions
status: public
source: ./speed-dial.js
style: ./speed-dial.css
preview: ./speed-dial.json
---
# `<iswc-speed-dial>`

## Propósito

FAB que despliega un abanico de acciones. Cada acción es un
`<iswc-speed-dial-action>` hijo con icono y etiqueta. En modo radial reparte
las acciones en anillos concéntricos acotados a un wrapper y, si no caben,
pasa a un reparto por grid.

Este módulo registra `<iswc-speed-dial>` y `<iswc-speed-dial-action>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './speed-dial.js';
```

## Ejemplo mínimo

```html
<iswc-speed-dial label="Acciones">
  <iswc-speed-dial-action icon="mdi:plus" label="Crear"></iswc-speed-dial-action>
  <iswc-speed-dial-action icon="mdi:pencil" label="Editar"></iswc-speed-dial-action>
</iswc-speed-dial>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `open-icon` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `direction` | string/según contrato | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |
| `distance` | string/según contrato | Fuente define default/restricción. |
| `start-angle` | string/según contrato | Fuente define default/restricción. |
| `sweep` | string/según contrato | Fuente define default/restricción. |
| `arc` | string/según contrato | Fuente define default/restricción. |
| `radius` | string/según contrato | Fuente define default/restricción. |
| `boundary` | string/según contrato | Fuente define default/restricción. |
| `data-layout` | string/según contrato | Fuente define default/restricción. |
| `data-wrapper` | string/según contrato | Fuente define default/restricción. |
| `data-start-angle` | string/según contrato | Fuente define default/restricción. |
| `data-sweep` | string/según contrato | Fuente define default/restricción. |
| `data-arc` | string/según contrato | Fuente define default/restricción. |
| `data-radius` | string/según contrato | Fuente define default/restricción. |

Atributos observados de `<iswc-speed-dial-action>`: `icon`, `label`, `color`,
`href`, `disabled`.

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isOpen` | lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado: `<iswc-speed-dial-action>`. |

En `<iswc-speed-dial-action>`: slot `default` (etiqueta) y slot `icon`
(override del icono).

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-toggle` | sí | sí | sí | no |
| `iswc-select` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `open()` | Despliega el abanico. |
| `close()` | Repliega el abanico. |
| `toggle()` | Alterna el estado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `actions` | Personalizable con `::part(actions)`. |
| `trigger` | Personalizable con `::part(trigger)`. |
| `action` | Personalizable con `::part(action)` en `<iswc-speed-dial-action>`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--distance` | Token leído o definido por componente. |
| `--i` | Token leído o definido por componente. |
| `--r` | Token leído o definido por componente. |
| `--sd-x` | Token leído o definido por componente. |
| `--sd-y` | Token leído o definido por componente. |
| `--sd-pack-left` | Token leído o definido por componente. |
| `--sd-pack-top` | Token leído o definido por componente. |
| `--sd-pack-w` | Token leído o definido por componente. |
| `--sd-pack-h` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-on-accent` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-radius-fab` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |
| `--iswc-focus-fallback` | Token leído o definido por componente. |
| `--iswc-focus-offset` | Token leído o definido por componente. |
| `--iswc-success` | Token leído o definido por componente. |
| `--iswc-warning` | Token leído o definido por componente. |
| `--iswc-danger` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-speed-dial> — FAB que despliega un abanico de acciones.
> Atributos
>   icon          icono con el dial CERRADO (default mdi:plus)
>   open-icon     icono con el dial ABIERTO (default mdi:close). El trigger
>                 reusa <iswc-check-icon-button>, que hace el switch entre los
>                 dos iconos en vez de rotar uno solo.
>   label         aria-label del trigger
>   direction     up (default) | down | left | right | radial
>   open          boolean — controlado, refleja estado
>   distance      espacio entre trigger y acciones (default .25rem)
> Data props (mismo espiritu que data-theme / data-palette):
>   data-layout    radial (default con direction="radial") | grid | flex
>   data-wrapper   selector CSS del area que ACOTA las acciones.
>   data-start-angle  grados del primer item; 0 = derecha, -90 = arriba.
>   data-sweep     clockwise (default) | counter-clockwise
>   data-arc       amplitud del abanico en grados (default 360)
>   data-radius    radio en px del primer anillo
> Los nombres sin prefijo (arc, sweep, boundary...) se siguen aceptando.
> Reparto: mientras quepan, las acciones se reparten en ANILLOS concentricos
> (panal) con los anillos alternos desfasados medio paso. Cuando ya no queda
> area radial para todas, el componente marca data-packed y las acciones
> pasan a un GRID dentro del wrapper.
> Slots
>   default    <iswc-speed-dial-action>…
> Eventos
>   iswc-toggle  detail: { open }
>   iswc-select  detail: { action }   — cuando se elige una acción
> Cada <iswc-speed-dial-action> acepta:
>   icon, label, color (brand|neutral|success|warning|danger), href, disabled
>   El clic dispara iswc-select y, si no está disabled ni tiene href, cierra el dial.

El componente escribe `data-rings` en el host como diagnóstico del reparto
radial (`radio x nº de items @ arco` por anillo) y `data-packed` cuando cae al
reparto por layout nativo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/misc-utils.js`](../_shared/misc-utils.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js)
- [`./check-icon-button.js`](./check-icon-button.js) — el trigger es un
  `<iswc-check-icon-button>` que alterna entre `icon` y `open-icon`.

Tags del módulo: `<iswc-speed-dial>`, `<iswc-speed-dial-action>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado:
`aria-expanded` en el trigger, `role="menuitem"` y `aria-label` en cada
acción (se rellena desde `label` o el texto del item).

## Ejemplo avanzado

```html
<div class="lienzo">
  <iswc-speed-dial direction="radial" data-wrapper=".lienzo"
                 data-start-angle="-90" data-arc="180" data-radius="90">
    <iswc-speed-dial-action icon="mdi:file" label="Nuevo"></iswc-speed-dial-action>
    <iswc-speed-dial-action icon="mdi:share" label="Compartir" color="success"></iswc-speed-dial-action>
    <iswc-speed-dial-action icon="mdi:delete" label="Borrar" color="danger"></iswc-speed-dial-action>
  </iswc-speed-dial>
</div>
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

- [JavaScript](./speed-dial.js)
- [CSS](./speed-dial.css)
- [Índice de categoría](./LLM.md)
- [Preview](./speed-dial.json)
