---
tag: iswc-progress-bar
tags:
  - iswc-progress-bar
category: feedback
status: public
source: ./progress-bar.ts
style: ./progress-bar.css
preview: ./progress-bar.json
---
# `<iswc-progress-bar>`

## PropÃ³sito

<iswc-progress-bar>

Este mÃ³dulo registra `<iswc-progress-bar>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './progress-bar.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-progress-bar value="65" label="Carga"></iswc-progress-bar>
<iswc-progress-bar indeterminate label="Procesando"></iswc-progress-bar>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `indeterminate` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `indeterminate` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-progress-bar');
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
| `progress-bar` | Personalizable con `::part(progress-bar)`. |
| `indicator` | Personalizable con `::part(indicator)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-height` | Token leÃ­do o definido por componente. |
| `--track-color` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--indicator-color` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-progress-bar> â€” Web Component (vanilla).
> Atributos
>   value           number 0â€“100
>   label           string â€” aria-label
>   indeterminate   boolean
> Slots: default â€” etiqueta interna
> role=progressbar
> CSS Parts: ::part(progress-bar) ::part(indicator) ::part(label)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-progress-bar>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.

## Ejemplo avanzado

```html
<iswc-progress-bar value="65" label="Carga"></iswc-progress-bar>
<iswc-progress-bar indeterminate label="Procesando"></iswc-progress-bar>
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

- [JavaScript](./progress-bar.ts)
- [CSS](./progress-bar.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./progress-bar.json)
