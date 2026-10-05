---
tag: iswc-spinner
tags:
  - iswc-spinner
category: feedback
status: public
source: ./spinner.ts
style: ./spinner.css
preview: ./spinner.json
---
# `<iswc-spinner>`

## PropÃ³sito

Indicador de carga animado. Sin atributos; personalizable vÃ­a CSS vars.

Este mÃ³dulo registra `<iswc-spinner>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './spinner.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-spinner></iswc-spinner>
<iswc-spinner style="font-size:2rem;--indicator-color:#40c057"></iswc-spinner>
```

## API

### Atributos y propiedades

#### Atributos observados

No expone.

#### Propiedades pÃºblicas

No expone.

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-spinner');
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
| `spinner` | Personalizable con `::part(spinner)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-width` | Token leÃ­do o definido por componente. |
| `--track-color` | Token leÃ­do o definido por componente. |
| `--indicator-color` | Token leÃ­do o definido por componente. |
| `--speed` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-spinner> â€” Web Component (vanilla).
> Indicador de carga animado (anillo via border).
> role=status en el host; respeta prefers-reduced-motion.
> CSS Parts: ::part(spinner)
> CSS vars: --track-width, --track-color, --indicator-color, --speed

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-spinner>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-live`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-spinner style="--speed:1.05s"></iswc-spinner>
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

- [JavaScript](./spinner.ts)
- [CSS](./spinner.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./spinner.json)
