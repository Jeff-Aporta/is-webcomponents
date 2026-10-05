---
tag: iswc-time-clock
tags:
  - iswc-time-clock
category: forms
status: public
source: ./time-clock.ts
style: ./time-clock.css
preview: ./time-clock.json
---
# `<iswc-time-clock>`

## PropÃ³sito

Reloj analÃ³gico (TimeClock de MUI X). Arrastra la manecilla, haz clic o usa el teclado. Al soltar avanza de horas a minutos.

Este mÃ³dulo registra `<iswc-time-clock>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './time-clock.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-time-clock></iswc-time-clock>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `view` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `ampm` | boolean | Fuente define default/restricciÃ³n. |
| `hour24` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `seconds` | boolean | Fuente define default/restricciÃ³n. |
| `minutes-step` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min-time` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max-time` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `locale` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `view` | lectura/escritura | Declarada por clase. |
| `ampm` | lectura/escritura | Declarada por clase. |
| `seconds` | lectura/escritura | Declarada por clase. |
| `minutesStep` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `time` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-view-change` | Evento personalizado del componente (view change). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-view-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-time-clock');
el.addEventListener('iswc-view-change', (e) => {
  console.log('iswc-view-change', e.detail);
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
| `header` | Personalizable con `::part(header)`. |
| `hours` | Personalizable con `::part(hours)`. |
| `minutes` | Personalizable con `::part(minutes)`. |
| `seconds` | Personalizable con `::part(seconds)`. |
| `clock` | Personalizable con `::part(clock)`. |
| `hand` | Personalizable con `::part(hand)`. |
| `number` | Cada dÃ­gito numÃ©rico mostrado en el reloj. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--a` | Token leÃ­do o definido por componente. |
| `--iswc-clock-size` | Token leÃ­do o definido por componente. |
| `--iswc-clock-face` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-clock-inset` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--iswc-hand-length` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-600` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-time-clock> â€” Reloj analÃ³gico para elegir hora (MUI TimeClock).
> Vistas encadenadas: horas â†’ minutos â†’ segundos (si `seconds`). El disco es
> un slider: se puede arrastrar, hacer clic o usar el teclado.
> Atributos: value (HH:mm[:ss]), view (hours|minutes|seconds), ampm,
>            hour24, seconds, minutes-step, min-time, max-time, locale,
>            disabled, readonly
> Events: iswc-change { value } Â· iswc-view-change { view }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)

Tags del mÃ³dulo: `<iswc-time-clock>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-orientation`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-disabled`.

## Ejemplo avanzado

```html
<iswc-time-clock></iswc-time-clock>
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

- [JavaScript](./time-clock.ts)
- [CSS](./time-clock.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./time-clock.json)
