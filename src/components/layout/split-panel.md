---
tag: is-split-panel
tags:
  - is-split-panel
category: layout
status: public
source: ./split-panel.js
style: ./split-panel.css
preview: ../../previews/layout/is-split-panel.json
---
# `<is-split-panel>`

## Propósito

Dos paneles adyacentes separados por un divisor arrastrable.
Componente InSoft accesible, escrito en JavaScript nativo con Shadow DOM, sin frameworks.

Este módulo registra `<is-split-panel>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './split-panel.js';
```

## Ejemplo mínimo

```html
<is-split-panel>
<div slot="start">Start</div>
<div slot="end">End</div>
</is-split-panel>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `position` | string/según contrato | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `primary` | string/según contrato | Fuente define default/restricción. |
| `collapse` | `start` · `end` | Oculta ese panel y el divisor; el otro toma todo el espacio. |
| `disabled` | boolean | Fuente define default/restricción. |
| `snap` | string/según contrato | Fuente define default/restricción. |
| `snap-threshold` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `reposition` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--divider-width` | Token leído o definido por componente. |
| `--divider-hit-area` | Token leído o definido por componente. |
| `--min` | Token leído o definido por componente. |
| `--max` | Token leído o definido por componente. |
| `--_divider-width` | Token leído o definido por componente. |
| `--_divider-hit-area` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-split-panel> — Web Component (vanilla, zero dependencies).
> Dos paneles adyacentes
> separados por un divisor arrastrable. Usa Shadow DOM con CSS propio,
> sin frameworks. Se define automáticamente al importarse.
> Atributos
>   position            number 0-100  (default 50, reflect)  — % desde el borde del panel primario
>   position-in-pixels  number          (sin reflect)        — posición en px (sobrevive a resize)
>   orientation         'horizontal' | 'vertical'  (default horizontal, reflect)
>   primary             'start' | 'end'   (reflect, opcional)
>   collapse            'start' | 'end'   (reflect, opcional) — oculta ese panel
>                       y su divisor; el otro se queda con todo el espacio. No
>                       toca la posición persistida: al quitarlo vuelve el
>                       tamaño anterior. Pensado para layouts responsive que
>                       mudan ese contenido a un <is-drawer>.
>   disabled            boolean  (reflect)
>   snap                string  (espacio-sep "100px 50%")
>   snap-threshold      number  (default 12)  — px ventana de snap
>   storage-key         string  — id único; persiste tamaño en localStorage (`is-components`)
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
>   reposition  CustomEvent<number> bubbles+composed — detail = nueva posición (%)
> Layout: paneles wrapper (.panel) en CSS grid.
>   horizontal (lateral): grid-template-columns = primary | divider | secondary
>   vertical (apilado):   grid-template-rows    = primary / divider / secondary

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/prefs.js`](../_shared/prefs.js)

Tags del módulo: `<is-split-panel>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation`, `aria-label`.

## Ejemplo avanzado

```html
<is-split-panel orientation="horizontal">
...
</is-split-panel>
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

- [JavaScript](./split-panel.js)
- [CSS](./split-panel.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-split-panel.json)
