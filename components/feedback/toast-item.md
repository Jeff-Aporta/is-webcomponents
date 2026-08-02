---
tag: is-toast-item
tags:
  - is-toast-item
category: feedback
status: public
source: ./toast-item.js
style: ./toast-item.css
preview: ../../previews/feedback/is-toast.html
---
# `<is-toast-item>`

## Propósito

Contenedor fijo de notificaciones. Crea ítems con create() o declara <is-toast-item>.

Este módulo registra `<is-toast-item>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './toast-item.js';
```

## Ejemplo mínimo

```html
<is-toast-item></is-toast-item>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `duration` | string/según contrato | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `variant` | lectura/escritura | Declarada por clase. |
| `duration` | lectura/escritura | Declarada por clase. |
| `open` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-after-show` | no | sí | sí | no |
| `is-after-hide` | no | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `message` | Personalizable con `::part(message)`. |
| `close-button` | Personalizable con `::part(close-button)`. |
| `progress` | Personalizable con `::part(progress)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--_text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--_accent` | Token leído o definido por componente. |
| `--is-muted` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-color-brand-50` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |
| `--is-color-success-50` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-success-700` | Token leído o definido por componente. |
| `--is-color-warning-50` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-warning-700` | Token leído o definido por componente. |
| `--is-color-danger-50` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-color-danger-700` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-toast-item> — Web Component (vanilla).
> Ítem individual de toast con countdown y cierre.
> Atributos
>   variant   brand | success | warning | danger | neutral (default brand)
>   duration  number ms (default 5000; 0 = hasta dismiss). Reflect.
>   open      boolean — visible
> Slots: default, icon | start
> Métodos: show(), hide()
> Eventos (bubbles, composed): is-after-show, is-after-hide
> CSS Parts: ::part(base) ::part(icon) ::part(message) ::part(close-button) ::part(progress)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-toast-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-live`, `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<is-toast-item></is-toast-item>
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

- [JavaScript](./toast-item.js)
- [CSS](./toast-item.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-toast.html)
