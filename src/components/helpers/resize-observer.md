---
tag: iswc-resize-observer
tags:
  - iswc-resize-observer
category: helpers
status: public
source: ./resize-observer.ts
style: ./resize-observer.css
preview: ./resize-observer.json
---
# `<iswc-resize-observer>`

## PropÃ³sito

Observa hijos directos y emite iswc-resize con entries.

Este mÃ³dulo registra `<iswc-resize-observer>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './resize-observer.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-resize-observer></iswc-resize-observer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-resize` | Emitido al cambiar el tamaÃ±o del elemento observado. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-resize` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-resize-observer');
el.addEventListener('iswc-resize', (e) => {
  console.log('iswc-resize', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-resize-observer> â€” Web Component (vanilla).
> display:contents â€” observa hijos directos con ResizeObserver.
> Atributos
>   disabled  boolean
> Eventos
>   iswc-resize  detail: { entries }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-resize-observer>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-resize-observer></iswc-resize-observer>
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

- [JavaScript](./resize-observer.ts)
- [CSS](./resize-observer.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./resize-observer.json)
