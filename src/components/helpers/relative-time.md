---
tag: iswc-relative-time
tags:
  - iswc-relative-time
category: helpers
status: public
source: ./relative-time.ts
style: ./relative-time.css
preview: ./relative-time.json
---
# `<iswc-relative-time>`

## PropÃ³sito

Fechas relativas con Intl.RelativeTimeFormat.

Este mÃ³dulo registra `<iswc-relative-time>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './relative-time.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-relative-time date="2026-07-30T10:00:00" sync></iswc-relative-time>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `date` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `format` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `numeric` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `sync` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `date` | lectura/escritura | Declarada por clase. |
| `format` | solo lectura | Declarada por clase. |
| `numeric` | solo lectura | Declarada por clase. |
| `sync` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-relative-time');
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
| `time` | Personalizable con `::part(time)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-relative-time> â€” Web Component (vanilla).
> Formatea fechas relativas con Intl.RelativeTimeFormat.
> Atributos
>   date      string | number â€” ISO o timestamp
>   format    long | short | narrow (default long)
>   numeric   always | auto (default auto)
>   sync      boolean â€” actualiza periÃ³dicamente

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-relative-time>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-relative-time date="2026-07-30T10:00:00" sync></iswc-relative-time>
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

- [JavaScript](./relative-time.ts)
- [CSS](./relative-time.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./relative-time.json)
