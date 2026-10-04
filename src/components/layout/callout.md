---
tag: iswc-callout
tags:
  - iswc-callout
category: layout
status: public
source: ./callout.ts
style: ./callout.css
preview: ./callout.json
---
# `<iswc-callout>`

## PropÃ³sito

Mensaje en lÃ­nea con borde y fondo suaves. Pensado para tips, info, warnings y
errores que el usuario no debe pasar por alto. Cinco colores y cinco apariencias,
con icono automÃ¡tico segÃºn la colore (sobrescribible vÃ­a icon
o slot icon).

Este mÃ³dulo registra `<iswc-callout>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './callout.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-callout>Esto es un callout estÃ¡ndar.</iswc-callout>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `color` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-callout');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `message` | Personalizable con `::part(message)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--spacing` | Token leÃ­do o definido por componente. |
| `--iswc-space-l` | Token leÃ­do o definido por componente. |
| `--callout-bg` | Token leÃ­do o definido por componente. |
| `--callout-border` | Token leÃ­do o definido por componente. |
| `--callout-text` | Token leÃ­do o definido por componente. |
| `--callout-accent` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--_pad-y` | Token leÃ­do o definido por componente. |
| `--_pad-x` | Token leÃ­do o definido por componente. |
| `--_icon-size` | Token leÃ­do o definido por componente. |
| `--_gap` | Token leÃ­do o definido por componente. |
| `--_radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-700` | Token leÃ­do o definido por componente. |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-700` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-callout> â€” Web Component (vanilla, zero dependencies).
> Mensaje en lÃ­nea con borde y fondo suaves. Pensado para tips, info, warnings
> y errores que el usuario no debe pasar por alto.
> Modelo equivalente a wa-callout (Web Awesome) / v-alert.
> Atributos
>   color     brand | neutral | success | warning | danger
>               (default 'brand', reflected)
>   variant  accent | filled | outlined | filled-outlined | plain
>               (default 'filled-outlined', reflected)
>   icon        nombre Iconify para mostrar a la izquierda (ej. "mdi:bell").
>               Si no se da, se elige uno por colore.
> Slots
>   (default)  mensaje principal
>   icon       icono propio (gana sobre el atributo icon)
> CSS Parts:  ::part(icon)  ::part(message)
> CSS custom properties
>   --spacing        espacio alrededor del callout (default var(--iswc-space-l, 1rem))
>   --callout-bg     fondo computado por color/variant
>   --callout-border color del borde
>   --callout-text   color del texto
>   --callout-accent color del icono
> Eventos: ninguno propio (customizable vÃ­a slotted buttons).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-callout>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-callout color="success">â€¦</iswc-callout>
<iswc-callout color="danger">â€¦</iswc-callout>
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

- [JavaScript](./callout.ts)
- [CSS](./callout.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./callout.json)
