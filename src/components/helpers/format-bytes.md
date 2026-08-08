---
tag: is-format-bytes
tags:
  - is-format-bytes
category: helpers
status: public
source: ./format-bytes.js
style: ./format-bytes.css
preview: ../../previews/helpers/is-format-bytes.json
---
# `<is-format-bytes>`

## Propósito

Tamaños de archivo legibles. value se interpreta según unit (default byte).

Este módulo registra `<is-format-bytes>`.

## Cuándo usarlo

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Cuándo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## Importación

```js
import './format-bytes.js';
```

## Ejemplo mínimo

```html
<is-format-bytes value="2.5" unit="megabyte"></is-format-bytes>
<is-format-bytes value="1" unit="gigabyte"></is-format-bytes>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | number | Bytes (o según `unit` de entrada). |
| `unit` | string | Unidad del `value`: `byte` (default), `kilobyte`, `megabyte`, … |
| `display` | `short` \| `long` | Forma corta (`KB`) o larga (`kilobytes`). |
| `locale` | BCP 47 | Override; default = `lang` del documento. |
| `autofit` | boolean | Unidad más alta cuyo valor sea **≥ 1** (p. ej. `200 KB`, no `0.2 MB`). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | solo lectura | Declarada por clase. |
| `autofit` | lectura/escritura | Refleja el atributo booleano. |

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `bytes` | Personalizable con `::part(bytes)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-format-bytes> — Web Component (vanilla).
> Formatea tamaños de archivo legibles.
> Atributos
>   value    number — bytes (o según unit)
>   unit     byte | kilobyte | megabyte | … (default byte)
>   display  short | long (default short)
>   locale   override de locale (default document lang)
>   autofit  boolean — unidad más alta con valor ≥ 1 (200 KB, no 0.2 MB)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-format-bytes>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-format-bytes value="1073741824" display="short"></is-format-bytes>
<is-format-bytes value="1073741824" display="long"></is-format-bytes>
<is-format-bytes autofit value="204800"></is-format-bytes>
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

- [JavaScript](./format-bytes.js)
- [CSS](./format-bytes.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-format-bytes.json)
