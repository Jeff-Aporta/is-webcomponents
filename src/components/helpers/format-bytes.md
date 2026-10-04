---
tag: iswc-format-bytes
tags:
  - iswc-format-bytes
category: helpers
status: public
source: ./format-bytes.ts
style: ./format-bytes.css
preview: ./format-bytes.json
---
# `<iswc-format-bytes>`

## PropÃ³sito

TamaÃ±os de archivo legibles. value se interpreta segÃºn unit (default byte).

Este mÃ³dulo registra `<iswc-format-bytes>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './format-bytes.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-format-bytes value="2.5" unit="megabyte"></iswc-format-bytes>
<iswc-format-bytes value="1" unit="gigabyte"></iswc-format-bytes>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | number | Bytes (o segÃºn `unit` de entrada). |
| `unit` | string | Unidad del `value`: `byte` (default), `kilobyte`, `megabyte`, â€¦ |
| `display` | `short` \| `long` | Forma corta (`KB`) o larga (`kilobytes`). |
| `locale` | BCP 47 | Override; default = `lang` del documento. |
| `autofit` | boolean | Unidad mÃ¡s alta cuyo valor sea **â‰¥ 1** (p. ej. `200 KB`, no `0.2 MB`). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | solo lectura | Declarada por clase. |
| `autofit` | lectura/escritura | Refleja el atributo booleano. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-format-bytes');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `bytes` | Personalizable con `::part(bytes)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-format-bytes> â€” Web Component (vanilla).
> Formatea tamaÃ±os de archivo legibles.
> Atributos
>   value    number â€” bytes (o segÃºn unit)
>   unit     byte | kilobyte | megabyte | â€¦ (default byte)
>   display  short | long (default short)
>   locale   override de locale (default document lang)
>   autofit  boolean â€” unidad mÃ¡s alta con valor â‰¥ 1 (200 KB, no 0.2 MB)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-format-bytes>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-format-bytes value="1073741824" display="short"></iswc-format-bytes>
<iswc-format-bytes value="1073741824" display="long"></iswc-format-bytes>
<iswc-format-bytes autofit value="204800"></iswc-format-bytes>
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

- [JavaScript](./format-bytes.ts)
- [CSS](./format-bytes.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./format-bytes.json)
