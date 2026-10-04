---
tag: iswc-speed-dial
tags:
  - iswc-speed-dial
  - iswc-speed-dial-action
category: actions
status: public
source: ./speed-dial.ts
style: ./speed-dial.css
preview: ./speed-dial.json
---
# `<iswc-speed-dial>`

## PropÃ³sito

FAB que despliega un abanico de acciones. Cada acciÃ³n es un
`<iswc-speed-dial-action>` hijo con icono y etiqueta. En modo radial reparte
las acciones en anillos concÃ©ntricos acotados a un wrapper y, si no caben,
pasa a un reparto por grid.

Este mÃ³dulo registra `<iswc-speed-dial>` y `<iswc-speed-dial-action>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './speed-dial.js';
```

## Ejemplo mÃ­nimo

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
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `open-icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `direction` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `distance` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `start-angle` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `sweep` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `arc` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `radius` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `boundary` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data-layout` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data-wrapper` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data-start-angle` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data-sweep` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data-arc` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data-radius` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

Atributos observados de `<iswc-speed-dial-action>`: `icon`, `label`, `color`,
`href`, `disabled`.

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-toggle` | Emitido al alternar el estado abierto/cerrado. |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-toggle` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-select` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-speed-dial');
el.addEventListener('iswc-toggle', (e) => {
  console.log('iswc-toggle', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `open()` | Despliega el abanico. |
| `close()` | Repliega el abanico. |
| `toggle()` | Alterna el estado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--distance` | Token leÃ­do o definido por componente. |
| `--i` | Token leÃ­do o definido por componente. |
| `--r` | Token leÃ­do o definido por componente. |
| `--sd-x` | Token leÃ­do o definido por componente. |
| `--sd-y` | Token leÃ­do o definido por componente. |
| `--sd-pack-left` | Token leÃ­do o definido por componente. |
| `--sd-pack-top` | Token leÃ­do o definido por componente. |
| `--sd-pack-w` | Token leÃ­do o definido por componente. |
| `--sd-pack-h` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-on-accent` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-radius-fab` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus-fallback` | Token leÃ­do o definido por componente. |
| `--iswc-focus-offset` | Token leÃ­do o definido por componente. |
| `--iswc-success` | Token leÃ­do o definido por componente. |
| `--iswc-warning` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-speed-dial> â€” FAB que despliega un abanico de acciones.
> Atributos
>   icon          icono con el dial CERRADO (default mdi:plus)
>   open-icon     icono con el dial ABIERTO (default mdi:close). El trigger
>                 reusa <iswc-check-icon-button>, que hace el switch entre los
>                 dos iconos en vez de rotar uno solo.
>   label         aria-label del trigger
>   direction     up (default) | down | left | right | radial
>   open          boolean â€” controlado, refleja estado
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
>   default    <iswc-speed-dial-action>â€¦
> Eventos
>   iswc-toggle  detail: { open }
>   iswc-select  detail: { action }   â€” cuando se elige una acciÃ³n
> Cada <iswc-speed-dial-action> acepta:
>   icon, label, color (brand|neutral|success|warning|danger), href, disabled
>   El clic dispara iswc-select y, si no estÃ¡ disabled ni tiene href, cierra el dial.

El componente escribe `data-rings` en el host como diagnÃ³stico del reparto
radial (`radio x nÂº de items @ arco` por anillo) y `data-packed` cuando cae al
reparto por layout nativo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/misc-utils.js`](../_shared/misc-utils.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js)
- [`./check-icon-button.js`](./check-icon-button.js) â€” el trigger es un
  `<iswc-check-icon-button>` que alterna entre `icon` y `open-icon`.

Tags del mÃ³dulo: `<iswc-speed-dial>`, `<iswc-speed-dial-action>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado:
`aria-expanded` en el trigger, `role="menuitem"` y `aria-label` en cada
acciÃ³n (se rellena desde `label` o el texto del item).

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

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./speed-dial.ts)
- [CSS](./speed-dial.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./speed-dial.json)
