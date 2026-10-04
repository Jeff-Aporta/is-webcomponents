---
tag: iswc-check-icon-button
tags:
  - iswc-check-icon-button
category: actions
status: public
source: ./check-icon-button.ts
style: ./check-icon-button.css
preview: ./check-icon-button.json
---
# `<iswc-check-icon-button>`

## PropÃ³sito

BotÃ³n icon-only con dos estados mutuamente excluyentes: muestra un solo icono
segÃºn checked. Lo usan iswc-video
(play/pausa, mute) e iswc-theme-toggle.

Este mÃ³dulo registra `<iswc-check-icon-button>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './check-icon-button.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-check-icon-button
icon="mdi:play"
checked-icon="mdi:pause"
label="Reproducir"
checked-label="Pausar"
></iswc-check-icon-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `checked` | boolean | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checked-icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checked-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `checked` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |
| `checkedIcon` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `checkedLabel` | lectura/escritura | Declarada por clase. |

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
const el = document.querySelector('iswc-check-icon-button');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `toggle()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |
| `icon` | Personalizable con `::part(icon)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-active` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-check-icon-button> â€” botÃ³n icon-only con dos estados (unchecked / checked).
> Muestra un solo icono a la vez segÃºn `checked`. Similar a un toggle/switch visual.
> Atributos
>   checked         boolean reflected
>   icon            Iconify id cuando unchecked (ej. mdi:play)
>   checked-icon    Iconify id cuando checked (ej. mdi:pause)
>   label           aria-label unchecked
>   checked-label   aria-label checked (fallback: label)
>   variant      "plain" â†’ compacto y hereda color (chrome oscura: vÃ­deo)
>   disabled        boolean
> Events (bubbles, composed)
>   iswc-change  { checked: boolean }  â€” tras cada toggle
> CSS Parts: ::part(button) ::part(icon)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`./button.js`](./button.js) â€” la superficie pintada es un `<iswc-button variant="text">`;
  el control accesible sigue siendo el host.

Tags del mÃ³dulo: `<iswc-check-icon-button>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-pressed`.

## Ejemplo avanzado

```html
<iswc-check-icon-button variant="plain" icon="mdi:volume-high" checked-icon="mdi:volume-off"
label="Silenciar" checked-label="Activar sonido"></iswc-check-icon-button>
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

- [JavaScript](./check-icon-button.ts)
- [CSS](./check-icon-button.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./check-icon-button.json)
