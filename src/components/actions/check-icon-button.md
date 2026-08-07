---
tag: is-check-icon-button
tags:
  - is-check-icon-button
category: actions
status: public
source: ./check-icon-button.js
style: ./check-icon-button.css
preview: ../../previews/actions/is-check-icon-button.html
---
# `<is-check-icon-button>`

## Propósito

Botón icon-only con dos estados mutuamente excluyentes: muestra un solo icono
según checked. Lo usan is-video
(play/pausa, mute) e is-theme-toggle.

Este módulo registra `<is-check-icon-button>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './check-icon-button.js';
```

## Ejemplo mínimo

```html
<is-check-icon-button
icon="mdi:play"
checked-icon="mdi:pause"
label="Reproducir"
checked-label="Pausar"
></is-check-icon-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `checked` | boolean | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `checked-icon` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `checked-label` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `toggle()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--is-control-text` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-control-bg-active` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-check-icon-button> — botón icon-only con dos estados (unchecked / checked).
> Muestra un solo icono a la vez según `checked`. Similar a un toggle/switch visual.
> Atributos
>   checked         boolean reflected
>   icon            Iconify id cuando unchecked (ej. mdi:play)
>   checked-icon    Iconify id cuando checked (ej. mdi:pause)
>   label           aria-label unchecked
>   checked-label   aria-label checked (fallback: label)
>   variant      "plain" → compacto y hereda color (chrome oscura: vídeo)
>   disabled        boolean
> Events (bubbles, composed)
>   is-change  { checked: boolean }  — tras cada toggle
> CSS Parts: ::part(button) ::part(icon)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`./button.js`](./button.js) — la superficie pintada es un `<is-button variant="text">`;
  el control accesible sigue siendo el host.

Tags del módulo: `<is-check-icon-button>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-pressed`.

## Ejemplo avanzado

```html
<is-check-icon-button variant="plain" icon="mdi:volume-high" checked-icon="mdi:volume-off"
label="Silenciar" checked-label="Activar sonido"></is-check-icon-button>
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

- [JavaScript](./check-icon-button.js)
- [CSS](./check-icon-button.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-check-icon-button.html)
