---
tag: is-tag
tags:
  - is-tag
category: feedback
status: public
source: ./tag.js
style: ./tag.css
preview: ../../previews/feedback/is-tag.html
---
# `<is-tag>`

## Propósito

Etiqueta interactiva con colores y botón de quitar opcional. Escala con font-size del contexto.

Este módulo registra `<is-tag>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './tag.js';
```

## Ejemplo mínimo

```html
<span style="font-size:1.25rem">
<is-tag pill>Grande</is-tag>
</span>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `pill` | boolean | Fuente define default/restricción. |
| `with-remove` | boolean | Fuente define default/restricción. |
| `remove-label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `withRemove` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-remove` | no | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `tag` | Personalizable con `::part(tag)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |
| `remove-button` | Personalizable con `::part(remove-button)`. |

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
| `--is-font-family` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-color-brand-100` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |
| `--is-color-success-100` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-success-700` | Token leído o definido por componente. |
| `--is-color-warning-100` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-warning-700` | Token leído o definido por componente. |
| `--is-color-danger-100` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-color-danger-700` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-tag> — Web Component (vanilla).
> Similar a is-badge; default variant filled-outlined, color brand.
> Escala con font-size del contexto (métricas en em).
> Atributos
>   color       brand | neutral | info | success | warning | danger (default brand)
>   variant    accent | filled | outlined | filled-outlined (default filled-outlined)
>   pill          boolean
>   with-remove   boolean — muestra botón de quitar
>   remove-label  string — aria-label del botón (default Quitar)
> Eventos
>   is-remove  — click en botón quitar (bubbles, composed)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-tag>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<span style="font-size:1.25rem">
<is-tag pill>Grande</is-tag>
</span>
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

- [JavaScript](./tag.js)
- [CSS](./tag.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-tag.html)
