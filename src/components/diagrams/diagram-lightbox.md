---
tag: iswc-diagram-lightbox
tags:
  - iswc-diagram-lightbox
category: diagrams
status: public
source: ./diagram-lightbox.ts
style: ./diagram-lightbox.css
preview: ./diagram-lightbox.json
---
# `<iswc-diagram-lightbox>`

## PropÃ³sito

Visor a pantalla completa pensado para diagramas: hereda del
<iswc-lightbox> genÃ©rico el zoom anclado al
cursor, el pan y el dialog top-layer, y le suma la barra de la animaciÃ³n
tortuga (play / pause / prev / next), el anillo de auto-replay, el panel
de cÃ³digo JSON y el enlace compartible con el payload en ?d=.

Este mÃ³dulo registra `<iswc-diagram-lightbox>`.

## CuÃ¡ndo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## CuÃ¡ndo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## ImportaciÃ³n

```js
import './diagram-lightbox.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-diagram-lightbox id="lb" kind="sequence"></iswc-diagram-lightbox>
<script type="module">
const lb = document.getElementById('lb');
lb.payload = { preset: 'tk1437191' };
lb.open = true;
// O abrirlo con un click:
lb.addEventListener('iswc-share', (e) => {
console.log('Compartir:', e.detail.url);
});
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `kind` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `kind` | lectura/escritura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-share` | Evento personalizado del componente (share). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-share` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-diagram-lightbox');
el.addEventListener('iswc-share', (e) => {
  console.log('iswc-share', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-mono` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-code-bg` | Token leÃ­do o definido por componente. |
| `--iswc-code-text` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-diagram-lightbox> â€” colore del lightbox para diagramas.
> Es un <iswc-lightbox> con la barra especÃ­fica de la animaciÃ³n tortuga
> (<< â–¶/â¸ â–  >>), el anillo de cuenta regresiva del auto-replay, el botÃ³n
> de cÃ³digo JSON y el botÃ³n de compartir enlace. El resto del visor
> (zoom, pan, dialog, slots) lo hereda de iswc-lightbox.
> Conceptualmente, un diagrama es "un nodo que tiene un payload JSON y
> expone una API turtle {play,pause,stop,next,prev}". El visor hace de
> puente entre ese contrato y la barra por defecto. Si en algÃºn momento
> hay otro componente con la misma forma, se hace un wrapper igual sin
> tocar el lightbox genÃ©rico.
> Atributos: kind (default "sequence"), open
>             + todos los de <iswc-lightbox>
> Propiedades: payload, kind, open
>              + todas las de <iswc-lightbox>
> Eventos: iswc-close, iswc-share, iswc-reposition
>          + iswc-turtle-state { playing, idx, total, replay }
>          + iswc-toggle-group { id }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./lightbox.js`](./lightbox.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-diagram-lightbox>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-live`.

## Ejemplo avanzado

```html
<iswc-diagram-lightbox id="lb" kind="sequence"></iswc-diagram-lightbox>
<script type="module">
const lb = document.getElementById('lb');
lb.payload = { preset: 'tk1437191' };
lb.open = true;
// O abrirlo con un click:
lb.addEventListener('iswc-share', (e) => {
console.log('Compartir:', e.detail.url);
});
</script>
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

- [JavaScript](./diagram-lightbox.ts)
- [CSS](./diagram-lightbox.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./diagram-lightbox.json)
