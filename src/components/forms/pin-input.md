---
tag: is-pin-input
tags:
  - is-pin-input
category: forms
status: public
source: ./pin-input.js
style: ./pin-input.css
preview: ../../previews/forms/is-pin-input.json
---
# `<is-pin-input>`

## Propósito

Casillas para OTP / PIN de 3 a 8 dígitos. Auto-avance al escribir,
Backspace retrocede, pegar reparte todos los dígitos, navegación con
flechas y soporte para enmascarar el contenido.

Este módulo registra `<is-pin-input>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './pin-input.js';
```

## Ejemplo mínimo

```html
<is-pin-input length="6"></is-pin-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `length` | string/según contrato | Fuente define default/restricción. |
| `type` | string/según contrato | Fuente define default/restricción. |
| `mask` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `invalid` | boolean | Fuente define default/restricción. |
| `placeholder` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `autocomplete` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-pin-change` | sí | sí | sí | no |
| `is-pin-complete` | sí | sí | sí | no |
| `is-pin-invalid` | según cabecera | según cabecera | según cabecera | según cabecera |
| `is-otp` | `{ code }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `reset()` | Método público declarado. |
| `focus()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `cells` | Personalizable con `::part(cells)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--cell-size` | Token leído o definido por componente. |
| `--gap` | Token leído o definido por componente. |
| `--bg` | Token leído o definido por componente. |
| `--is-bg-2` | Token leído o definido por componente. |
| `--fg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--brand` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--danger` | Token leído o definido por componente. |
| `--is-danger` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-pin-input> — Web Component (vanilla, zero dependencies).
> Casillas para OTP / PIN de 4 a 6 dígitos. Auto-avance al escribir, Backspace
> retrocede, pegar distribuye todos los dígitos, focus automático.
>   <is-pin-input length="6" required></is-pin-input>
> Atributos
>   length       number  (3-8, default 6)
>   type         number | text   (default 'number')
>   mask         boolean — si true, muestra asteriscos.
>   disabled     boolean
>   invalid      boolean
>   placeholder  string — carácter para casillas vacías.
>   autocomplete one-time-code | numeric
> Slots
>   (default)  — hijos ignorados (este componente es self-contained).
> Eventos
>   is-pin-change  detail: { value, index }
>   is-pin-complete detail: { value }
>   is-pin-invalid detail: { value }
> API
>   .value         string
>   .reset()       void
>   .focus()       void
>
> Web OTP: con `autocomplete` `one-time-code` (default) rellena las casillas y emite `is-otp`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/web-otp.js`](../_shared/web-otp.js)

Tags del módulo: `<is-pin-input>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`.

## Ejemplo avanzado

```html
<is-pin-input length="6"></is-pin-input>
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

- [JavaScript](./pin-input.js)
- [CSS](./pin-input.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-pin-input.json)
