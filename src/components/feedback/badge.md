---
tag: iswc-badge
tags:
  - iswc-badge
category: feedback
status: public
source: ./badge.ts
style: ./badge.css
preview: ./badge.json
---
# `<iswc-badge>`

## PropÃ³sito

Etiqueta compacta con colores semÃ¡nticas y apariencias.

Este mÃ³dulo registra `<iswc-badge>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './badge.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-badge color="success" variant="filled">OK</iswc-badge>
<iswc-badge pill attention="pulse">Live</iswc-badge>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `pill` | boolean | Fuente define default/restricciÃ³n. |
| `attention` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-badge');
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
| `badge` | Personalizable con `::part(badge)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--pulse-color` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--_bg` | Token leÃ­do o definido por componente. |
| `--iswc-brand-soft` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--_text` | Token leÃ­do o definido por componente. |
| `--iswc-brand-text` | Token leÃ­do o definido por componente. |
| `--_on` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-success-soft` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-success-text` | Token leÃ­do o definido por componente. |
| `--iswc-warning-soft` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-warning-text` | Token leÃ­do o definido por componente. |
| `--iswc-danger-soft` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-badge> â€” Web Component (vanilla).
> Etiqueta compacta con colores semÃ¡nticas.
> Atributos
>   color      brand | neutral | success | warning | danger (default brand)
>   variant   accent | filled | outlined | filled-outlined (default accent)
>   pill         boolean
>   attention    none | pulse | bounce (default none)
> Slots: default, start, end

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-badge>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-badge color="success" variant="filled">OK</iswc-badge>
<iswc-badge pill attention="pulse">Live</iswc-badge>
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

- [JavaScript](./badge.ts)
- [CSS](./badge.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./badge.json)
