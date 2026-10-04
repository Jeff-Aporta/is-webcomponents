---
tag: iswc-split-panel
tags:
  - iswc-split-panel
category: layout
status: public
source: ./split-panel.ts
style: ./split-panel.css
preview: ./split-panel.json
---
# `<iswc-split-panel>`

## PropÃ³sito

Dos paneles adyacentes separados por un divisor arrastrable.
Componente InSoft accesible, escrito en JavaScript nativo con Shadow DOM, sin frameworks.

Este mÃ³dulo registra `<iswc-split-panel>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './split-panel.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-split-panel>
<div slot="start">Start</div>
<div slot="end">End</div>
</iswc-split-panel>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `position` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `primary` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `collapse` | `start` Â· `end` | Oculta ese panel y el divisor; el otro toma todo el espacio. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `snap` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `snap-threshold` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `position` | lectura/escritura | Declarada por clase. |
| `positionInPixels` | lectura/escritura | Declarada por clase. |
| `storageKey` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |
| `primary` | lectura/escritura | Declarada por clase. |
| `collapse` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `snap` | lectura/escritura | Declarada por clase. |
| `snapThreshold` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `divider` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `reposition` | Evento `reposition`. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `reposition` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-split-panel');
el.addEventListener('reposition', (e) => {
  console.log('reposition', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `panel` | Personalizable con `::part(panel)`. |
| `start` | Personalizable con `::part(start)`. |
| `divider` | Personalizable con `::part(divider)`. |
| `end` | Personalizable con `::part(end)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--divider-width` | Token leÃ­do o definido por componente. |
| `--divider-hit-area` | Token leÃ­do o definido por componente. |
| `--min` | Token leÃ­do o definido por componente. |
| `--max` | Token leÃ­do o definido por componente. |
| `--_divider-width` | Token leÃ­do o definido por componente. |
| `--_divider-hit-area` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-split-panel> â€” Web Component (vanilla, zero dependencies).
> Dos paneles adyacentes
> separados por un divisor arrastrable. Usa Shadow DOM con CSS propio,
> sin frameworks. Se define automÃ¡ticamente al importarse.
> Atributos
>   position            number 0-100  (default 50, reflect)  â€” % desde el borde del panel primario
>   position-in-pixels  number          (sin reflect)        â€” posiciÃ³n en px (sobrevive a resize)
>   orientation         'horizontal' | 'vertical'  (default horizontal, reflect)
>   primary             'start' | 'end'   (reflect, opcional)
>   collapse            'start' | 'end'   (reflect, opcional) â€” oculta ese panel
>                       y su divisor; el otro se queda con todo el espacio. No
>                       toca la posiciÃ³n persistida: al quitarlo vuelve el
>                       tamaÃ±o anterior. Pensado para layouts responsive que
>                       mudan ese contenido a un <iswc-drawer>.
>   disabled            boolean  (reflect)
>   snap                string  (espacio-sep "100px 50%")
>   snap-threshold      number  (default 12)  â€” px ventana de snap
>   storage-key         string  â€” id Ãºnico; persiste tamaÃ±o en localStorage (`is-components`)
> Slots
>   start     contenido del panel inicial
>   end       contenido del panel final
>   divider   override del divisor (icono, handle custom)
> CSS Parts
>   start, end, panel, divider
> CSS custom properties
>   --divider-width    5px
>   --divider-hit-area 12px
>   --min              0
>   --max              100%
> Eventos
>   reposition  CustomEvent<number> bubbles+composed â€” detail = nueva posiciÃ³n (%)
> Layout: paneles wrapper (.panel) en CSS grid.
>   horizontal (lateral): grid-template-columns = primary | divider | secondary
>   vertical (apilado):   grid-template-rows    = primary / divider / secondary

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/prefs.js`](../_shared/prefs.js)

Tags del mÃ³dulo: `<iswc-split-panel>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-split-panel orientation="horizontal">
...
</iswc-split-panel>
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

- [JavaScript](./split-panel.ts)
- [CSS](./split-panel.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./split-panel.json)
