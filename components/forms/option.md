---
tag: is-option
tags:
  - is-option
category: forms
status: public
source: ./option.js
style: ./option.css
preview: ../../previews/forms/is-combobox.html
---
# `<is-option>`

## Propósito

Input + listbox filtrable con teclado y opciones is-option.

Este módulo registra `<is-option>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './option.js';
```

## Ejemplo mínimo

```html
<is-combobox label="Ciudad" clearable>
<is-option value="bog">Bogotá</is-option>
<is-option value="med">Medellín</is-option>
</is-combobox>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `selected` | boolean | Fuente define default/restricción. |
| `group` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `selected` | lectura/escritura | Declarada por clase. |
| `group` | lectura/escritura | Declarada por clase. |
| `description` | solo lectura | Declarada por clase. |
| `label` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `description` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `description` | Personalizable con `::part(description)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-brand-text` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-option> — Opción para is-combobox / is-select (listboxes).
> Atributos: value, disabled, selected, group
> Slots: default (etiqueta), start (icono/avatar), description (texto secundario)
> Parts: base, start, label, description

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-option>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-selected`, `aria-disabled`.

## Ejemplo avanzado

```html
<is-combobox label="Ciudad" clearable>
<is-option value="bog">Bogotá</is-option>
<is-option value="med">Medellín</is-option>
</is-combobox>
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

- [JavaScript](./option.js)
- [CSS](./option.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-combobox.html)
