---
tag: iswc-main
tags:
  - iswc-main
category: layout
status: public
source: ./main.ts
style: ./main.css
preview: ./main.json
---
# `<iswc-main>`

## PropÃ³sito

Contenedor scrollable equivalente a <main>.
La persistencia de scroll es opt-in estricta: requiere
remember-scroll y storage-key.

Este mÃ³dulo registra `<iswc-main>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './main.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-main class="main" remember-scroll storage-key="docs-mi-vista">
â€¦
</iswc-main>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `remember-scroll` | boolean | Fuente define default/restricciÃ³n. |
| `storage-key` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `scroll-ttl` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `rememberScroll` | lectura/escritura | Declarada por clase. |
| `storageKey` | lectura/escritura | Declarada por clase. |
| `scrollTtl` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-main');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `clearRememberedScroll()` | MÃ©todo pÃºblico declarado. |
| `saveScroll()` | MÃ©todo pÃºblico declarado. |
| `restoreScroll()` | MÃ©todo pÃºblico declarado. |

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

> <iswc-main> â€” contenedor scrollable tipo <main>.
> Remember-scroll es OPT-IN estricto: hace falta
>   remember-scroll  +  storage-key="â€¦"
> Sin ambos â†’ no lee ni escribe localStorage.
> Attrs
>   remember-scroll   boolean â€” activa persistencia (default: off)
>   storage-key       string  â€” id Ãºnico bajo is-components.iswc-main
>   scroll-ttl        number  â€” ms de validez (default: 3600000 = 1h)
> Methods: scrollToTop(), clearRememberedScroll(), saveScroll(), restoreScroll()
> Restore solo en reload / back_forward. NavegaciÃ³n fresca (p. ej. cambio
> de componente en la galerÃ­a vÃ­a iframe.src) arranca en top.
> storage-key identifica el contenido: cambiarlo en caliente equivale a
> cambiar de vista, asÃ­ que resetea a top en vez de restaurar.

Detalle de la restauraciÃ³n:

- El contenido suele pintarse despuÃ©s de que llega `storage-key`, asÃ­ que la
  restauraciÃ³n reintenta durante 2,5 s hasta alcanzar el top guardado; un
  gesto del usuario (`wheel`, `touchstart`, `pointerdown`, `keydown`) la aborta.
- Cambiar `storage-key` en caliente resetea a top y limpia la lectura
  recordada de la vista entrante, de modo que un F5 inmediato se queda arriba.

## Dependencias y componentes relacionados

- [`../_shared/prefs.js`](../_shared/prefs.js)

Tags del mÃ³dulo: `<iswc-main>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-main class="main" remember-scroll storage-key="docs-mi-vista">
â€¦
</iswc-main>
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

- [JavaScript](./main.ts)
- [CSS](./main.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./main.json)
