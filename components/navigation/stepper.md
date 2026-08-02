---
tag: is-stepper
tags:
  - is-stepper
  - is-stepper-step
category: navigation
status: public
source: ./stepper.js
style: ./stepper.css
preview: ../../previews/navigation/is-stepper.html
---
# `<is-stepper>` / `<is-stepper-step>`

## Propósito

Indicador de flujo por pasos. Ideal para wizards y formularios multipaso.
Soporta orientación horizontal y vertical, variantes visualmente
distintas, iconos por slot, descripción y manejo de errores.

Este módulo registra `<is-stepper>`, `<is-stepper-step>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './stepper.js';
```

## Ejemplo mínimo

```html
<is-stepper active="1">
<is-stepper-step label="Cuenta" icon="mdi:account"></is-stepper-step>
<is-stepper-step label="Perfil" icon="mdi:card-account-details"></is-stepper-step>
<is-stepper-step label="Confirmar" icon="mdi:check-circle"></is-stepper-step>
</is-stepper>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | string/según contrato | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `without-line` | boolean | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `description` | string/según contrato | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `error` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-stepper-complete` | no | sí | sí | no |
| `is-stepper-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `next()` | Método público declarado. |
| `prev()` | Método público declarado. |
| `goTo()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--brand` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--brand-fg` | Token leído o definido por componente. |
| `--is-brand-fg` | Token leído o definido por componente. |
| `--text` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--muted` | Token leído o definido por componente. |
| `--border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--success` | Token leído o definido por componente. |
| `--is-success` | Token leído o definido por componente. |
| `--danger` | Token leído o definido por componente. |
| `--is-danger` | Token leído o definido por componente. |
| `--bg-pending` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-stepper> + <is-stepper-step> — Web Components (vanilla, zero dependencies).
> Indicador de flujo por pasos. Ideal para wizards y formularios multipaso.
>   <is-stepper active="1">
>     <is-stepper-step label="Cuenta">…</is-stepper-step>
>     <is-stepper-step label="Perfil">…</is-stepper-step>
>     <is-stepper-step label="Confirmar">…</is-stepper-step>
>   </is-stepper>
> Atributos <is-stepper>
>   active       number  — paso activo (0-indexed).
>   orientation  horizontal | vertical    (default horizontal)
>   without-line boolean  — oculta la línea conectora.
>   variant      default | simple | numbered | glass (default 'default')
> Atributos <is-stepper-step>
>   label       string
>   description string
>   icon        string (iconify id)
>   disabled    boolean
>   error       boolean
> Slots
>   <is-stepper>
>     (default)  steps.
>   <is-stepper-step>
>     (default)  contenido del paso (si el padre lo pinta dentro de un wizard).
>     icon       override del icono del step.
>     label      override del label.
>     description override del description.
> Eventos
>   is-stepper-change  detail: { from, to, step }
>   is-stepper-complete detail: { step } — cuando active >= total.
> CSS Parts
>   is-stepper: ::part(base) ::part(steps)
>   is-stepper-step: ::part(base) ::part(indicator) ::part(label) ::part(line)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-stepper>`, `<is-stepper-step>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<is-stepper active="1">
<is-stepper-step label="Cuenta" icon="mdi:account"></is-stepper-step>
<is-stepper-step label="Perfil" icon="mdi:card-account-details"></is-stepper-step>
<is-stepper-step label="Confirmar" icon="mdi:check-circle"></is-stepper-step>
</is-stepper>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./stepper.js)
- [CSS](./stepper.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/navigation/is-stepper.html)
