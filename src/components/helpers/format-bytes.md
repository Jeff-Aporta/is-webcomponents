---
tag: iswc-format-bytes
tags:
  - iswc-format-bytes
category: helpers
status: public
source: ./format-bytes.js
style: ./format-bytes.css
preview: ./format-bytes.json
---
# `<iswc-format-bytes>`

## Propósito

Tamaños de archivo legibles. value se interpreta según unit (default byte).

Este módulo registra `<iswc-format-bytes>`.

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
<iswc-format-bytes value="2.5" unit="megabyte"></iswc-format-bytes>
<iswc-format-bytes value="1" unit="gigabyte"></iswc-format-bytes>
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

> <iswc-format-bytes> — Web Component (vanilla).
> Formatea tamaños de archivo legibles.
> Atributos
>   value    number — bytes (o según unit)
>   unit     byte | kilobyte | megabyte | … (default byte)
>   display  short | long (default short)
>   locale   override de locale (default document lang)
>   autofit  boolean — unidad más alta con valor ≥ 1 (200 KB, no 0.2 MB)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-format-bytes>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-format-bytes value="1073741824" display="short"></iswc-format-bytes>
<iswc-format-bytes value="1073741824" display="long"></iswc-format-bytes>
<iswc-format-bytes autofit value="204800"></iswc-format-bytes>
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
- [Preview](./format-bytes.json)
