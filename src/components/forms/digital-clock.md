---
tag: iswc-digital-clock
tags:
  - iswc-digital-clock
category: forms
status: public
source: ./digital-clock.ts
style: ./digital-clock.css
preview: ./digital-clock.json
---
# `<iswc-digital-clock>`

## PropÃ³sito

Reloj analÃ³gico (TimeClock de MUI X). Arrastra la manecilla, haz clic o usa el teclado. Al soltar avanza de horas a minutos.

Este mÃ³dulo registra `<iswc-digital-clock>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './digital-clock.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-digital-clock></iswc-digital-clock>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `layout` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `step` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `minutes-step` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `seconds` | boolean | Fuente define default/restricciÃ³n. |
| `ampm` | boolean | Fuente define default/restricciÃ³n. |
| `hour24` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min-time` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max-time` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `skip-disabled` | boolean | Fuente define default/restricciÃ³n. |
| `locale` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `layout` | lectura/escritura | Declarada por clase. |
| `step` | lectura/escritura | Declarada por clase. |
| `minutesStep` | lectura/escritura | Declarada por clase. |
| `seconds` | lectura/escritura | Declarada por clase. |
| `ampm` | lectura/escritura | Declarada por clase. |
| `skipDisabled` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `time` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-digital-clock');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `scrollToSelection()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `option` | Cada opciÃ³n del listado. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-clock-height` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-600` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-digital-clock> â€” Selector de hora en lista (MUI DigitalClock) o en
> columnas de horas / minutos / segundos / AM-PM (MultiSectionDigitalClock).
> Atributos: value (HH:mm[:ss]), layout (list|sections), step (minutos en
>            lista), minutes-step, seconds, ampm, hour24, min-time, max-time,
>            skip-disabled, locale, disabled, readonly
> Events: iswc-change { value }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)

Tags del mÃ³dulo: `<iswc-digital-clock>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-selected`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-digital-clock></iswc-digital-clock>
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

- [JavaScript](./digital-clock.ts)
- [CSS](./digital-clock.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./digital-clock.json)
