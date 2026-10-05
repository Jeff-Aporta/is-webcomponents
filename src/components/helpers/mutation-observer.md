---
tag: iswc-mutation-observer
tags:
  - iswc-mutation-observer
category: helpers
status: public
source: ./mutation-observer.ts
style: ./mutation-observer.css
preview: ./mutation-observer.json
---
# `<iswc-mutation-observer>`

## PropÃ³sito

Responde a: Â¿cambiÃ³ el HTML de este nodo?
Cuando alguien aÃ±ade/quita hijos, cambia un atributo o el texto, emite
iswc-mutate con el detalle de quÃ© pasÃ³.

Este mÃ³dulo registra `<iswc-mutation-observer>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './mutation-observer.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-mutation-observer></iswc-mutation-observer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `attr` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `child-list` | boolean | Fuente define default/restricciÃ³n. |
| `character-data` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-mutate` | Emitido al detectarse una mutaciÃ³n en el Ã¡rbol observado. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-mutate` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-mutation-observer');
el.addEventListener('iswc-mutate', (e) => {
  console.log('iswc-mutate', e.detail);
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

> <iswc-mutation-observer> â€” Web Component (vanilla).
> display:contents â€” observa mutaciones en el host y sus hijos.
> Atributos (booleanos salvo attr)
>   disabled         boolean
>   attr             string â€” filtro de atributos
>   child-list       boolean (default true)
>   character-data   boolean
> Eventos
>   iswc-mutate  detail: { records }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-mutation-observer>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-mutation-observer></iswc-mutation-observer>
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

- [JavaScript](./mutation-observer.ts)
- [CSS](./mutation-observer.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./mutation-observer.json)
