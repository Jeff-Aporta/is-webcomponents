---
tag: iswc-diagram-lightbox
tags:
  - iswc-diagram-lightbox
category: diagrams
status: public
source: ./diagram-lightbox.js
style: ./diagram-lightbox.css
preview: ./diagram-lightbox.json
---
# `<iswc-diagram-lightbox>`

## Propósito

Visor a pantalla completa pensado para diagramas: hereda del
<iswc-lightbox> genérico el zoom anclado al
cursor, el pan y el dialog top-layer, y le suma la barra de la animación
tortuga (play / pause / prev / next), el anillo de auto-replay, el panel
de código JSON y el enlace compartible con el payload en ?d=.

Este módulo registra `<iswc-diagram-lightbox>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './diagram-lightbox.js';
```

## Ejemplo mínimo

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
| `kind` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `kind` | lectura/escritura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-share` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text-soft` | Token leído o definido por componente. |
| `--iswc-mono` | Token leído o definido por componente. |
| `--iswc-radius-sm` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-code-bg` | Token leído o definido por componente. |
| `--iswc-code-text` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |
| `--iswc-danger-text` | Token leído o definido por componente. |
| `--iswc-control-border` | Token leído o definido por componente. |
| `--iswc-control-bg` | Token leído o definido por componente. |
| `--iswc-control-text` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-on-brand` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-diagram-lightbox> — colore del lightbox para diagramas.
> Es un <iswc-lightbox> con la barra específica de la animación tortuga
> (<< ▶/⏸ ■ >>), el anillo de cuenta regresiva del auto-replay, el botón
> de código JSON y el botón de compartir enlace. El resto del visor
> (zoom, pan, dialog, slots) lo hereda de iswc-lightbox.
> Conceptualmente, un diagrama es "un nodo que tiene un payload JSON y
> expone una API turtle {play,pause,stop,next,prev}". El visor hace de
> puente entre ese contrato y la barra por defecto. Si en algún momento
> hay otro componente con la misma forma, se hace un wrapper igual sin
> tocar el lightbox genérico.
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

Tags del módulo: `<iswc-diagram-lightbox>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-live`.

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

- [JavaScript](./diagram-lightbox.js)
- [CSS](./diagram-lightbox.css)
- [Índice de categoría](./LLM.md)
- [Preview](./diagram-lightbox.json)
