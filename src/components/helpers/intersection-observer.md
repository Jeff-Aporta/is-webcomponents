---
tag: iswc-intersection-observer
tags:
  - iswc-intersection-observer
category: helpers
status: public
source: ./intersection-observer.ts
style: ./intersection-observer.css
preview: ./intersection-observer.json
---
# `<iswc-intersection-observer>`

## PropÃ³sito

Responde a una pregunta simple: Â¿este elemento estÃ¡ (parcialmente) visible
dentro de un contenedor? Si sÃ­, aplica una clase y/o dispara el evento
iswc-intersect.

Este mÃ³dulo registra `<iswc-intersection-observer>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './intersection-observer.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-intersection-observer root="#scroller" intersect-class="iswc-in" threshold="0.4" once>
<article class="io-card">â€¦</article>
</iswc-intersection-observer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `intersect-class` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `once` | boolean | Fuente define default/restricciÃ³n. |
| `root` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `root-margin` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `threshold` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `disabled` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-intersect` | Emitido al entrar/salir de la zona observada. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-intersect` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-intersection-observer');
el.addEventListener('iswc-intersect', (e) => {
  console.log('iswc-intersect', e.detail);
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

> <iswc-intersection-observer> â€” Web Component (vanilla).
> display:contents â€” observa hijos directos con IntersectionObserver.
> Atributos
>   disabled         boolean
>   intersect-class  string â€” clase a togglear en el hijo
>   once             boolean â€” deja de observar tras primera intersecciÃ³n
>   root             string â€” selector del root (closest â†’ shadow â†’ document; default viewport)
>   root-margin      string
>   threshold        number 0â€“1
> Eventos
>   iswc-intersect  detail: { entry }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-intersection-observer>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-intersection-observer root="#scroller" intersect-class="iswc-in" threshold="0.4" once>
<article class="io-card">â€¦</article>
</iswc-intersection-observer>
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

- [JavaScript](./intersection-observer.ts)
- [CSS](./intersection-observer.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./intersection-observer.json)
