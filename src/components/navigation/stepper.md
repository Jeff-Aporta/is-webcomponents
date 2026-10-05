---
tag: iswc-stepper
tags:
  - iswc-stepper
  - iswc-stepper-step
category: navigation
status: public
source: ./stepper.ts
style: ./stepper.css
preview: ./stepper.json
---
# `<iswc-stepper>` / `<iswc-stepper-step>`

## PropÃ³sito

Indicador de flujo por pasos. Ideal para wizards y formularios multipaso.
Soporta orientaciÃ³n horizontal y vertical, colores visualmente
distintas, iconos por slot, descripciÃ³n y manejo de errores.

Este mÃ³dulo registra `<iswc-stepper>`, `<iswc-stepper-step>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './stepper.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-stepper active="1">
<iswc-stepper-step label="Cuenta" icon="mdi:account"></iswc-stepper-step>
<iswc-stepper-step label="Perfil" icon="mdi:card-account-details"></iswc-stepper-step>
<iswc-stepper-step label="Confirmar" icon="mdi:check-circle"></iswc-stepper-step>
</iswc-stepper>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-line` | boolean | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `description` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `error` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `icon` | Contenido proyectado. |
| `label` | Contenido proyectado. |
| `description` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-stepper-complete` | Evento personalizado del componente (stepper complete). |
| `iswc-stepper-change` | Evento personalizado del componente (stepper change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-stepper-complete` | no | sÃ­ | sÃ­ | no |
| `iswc-stepper-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-stepper');
el.addEventListener('iswc-stepper-complete', (e) => {
  console.log('iswc-stepper-complete', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `next()` | MÃ©todo pÃºblico declarado. |
| `prev()` | MÃ©todo pÃºblico declarado. |
| `goTo()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `indicator` | Personalizable con `::part(indicator)`. |
| `line` | Personalizable con `::part(line)`. |
| `label` | Personalizable con `::part(label)`. |
| `description` | Personalizable con `::part(description)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--brand-fg` | Token leÃ­do o definido por componente. |
| `--iswc-brand-fg` | Token leÃ­do o definido por componente. |
| `--text` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--muted` | Token leÃ­do o definido por componente. |
| `--border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--success` | Token leÃ­do o definido por componente. |
| `--iswc-success` | Token leÃ­do o definido por componente. |
| `--danger` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |
| `--bg-pending` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-stepper> + <iswc-stepper-step> â€” Web Components (vanilla, zero dependencies).
> Indicador de flujo por pasos. Ideal para wizards y formularios multipaso.
>   <iswc-stepper active="1">
>     <iswc-stepper-step label="Cuenta">â€¦</iswc-stepper-step>
>     <iswc-stepper-step label="Perfil">â€¦</iswc-stepper-step>
>     <iswc-stepper-step label="Confirmar">â€¦</iswc-stepper-step>
>   </iswc-stepper>
> Atributos <iswc-stepper>
>   active       number  â€” paso activo (0-indexed).
>   orientation  horizontal | vertical    (default horizontal)
>   without-line boolean  â€” oculta la lÃ­nea conectora.
>   color      default | simple | numbered | glass (default 'default')
> Atributos <iswc-stepper-step>
>   label       string
>   description string
>   icon        string (iconify id)
>   disabled    boolean
>   error       boolean
> Slots
>   <iswc-stepper>
>     (default)  steps.
>   <iswc-stepper-step>
>     (default)  contenido del paso (si el padre lo pinta dentro de un wizard).
>     icon       override del icono del step.
>     label      override del label.
>     description override del description.
> Eventos
>   iswc-stepper-change  detail: { from, to, step }
>   iswc-stepper-complete detail: { step } â€” cuando active >= total.
> CSS Parts
>   iswc-stepper: ::part(base) ::part(steps)
>   iswc-stepper-step: ::part(base) ::part(indicator) ::part(label) ::part(line)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-stepper>`, `<iswc-stepper-step>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-stepper active="1">
<iswc-stepper-step label="Cuenta" icon="mdi:account"></iswc-stepper-step>
<iswc-stepper-step label="Perfil" icon="mdi:card-account-details"></iswc-stepper-step>
<iswc-stepper-step label="Confirmar" icon="mdi:check-circle"></iswc-stepper-step>
</iswc-stepper>
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

- [JavaScript](./stepper.ts)
- [CSS](./stepper.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./stepper.json)
