---
tag: is-diagram-lightbox
tags:
  - is-diagram-lightbox
category: diagrams
status: public
source: ./diagram-lightbox.js
style: ./diagram-lightbox.css
preview: ../../previews/diagrams/is-diagram-lightbox.html
---
# `<is-diagram-lightbox>`

## Propósito

Visor a pantalla completa pensado para diagramas: hereda del
<is-lightbox> genérico el zoom anclado al
cursor, el pan y el dialog top-layer, y le suma la barra de la animación
tortuga (play / pause / prev / next), el anillo de auto-replay, el panel
de código JSON y el enlace compartible con el payload en ?d=.

Este módulo registra `<is-diagram-lightbox>`.

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
<is-diagram-lightbox id="lb" kind="sequence"></is-diagram-lightbox>
<script type="module">
const lb = document.getElementById('lb');
lb.payload = { preset: 'tk1437191' };
lb.open = true;
// O abrirlo con un click:
lb.addEventListener('is-share', (e) => {
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
| `is-share` | sí | sí | sí | no |

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
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-mono` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-code-bg` | Token leído o definido por componente. |
| `--is-code-text` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-diagram-lightbox> — variante del lightbox para diagramas.
> Es un <is-lightbox> con la barra específica de la animación tortuga
> (<< ▶/⏸ ■ >>), el anillo de cuenta regresiva del auto-replay, el botón
> de código JSON y el botón de compartir enlace. El resto del visor
> (zoom, pan, dialog, slots) lo hereda de is-lightbox.
> Conceptualmente, un diagrama es "un nodo que tiene un payload JSON y
> expone una API turtle {play,pause,stop,next,prev}". El visor hace de
> puente entre ese contrato y la barra por defecto. Si en algún momento
> hay otro componente con la misma forma, se hace un wrapper igual sin
> tocar el lightbox genérico.
> Atributos: kind (default "sequence"), open
>             + todos los de <is-lightbox>
> Propiedades: payload, kind, open
>              + todas las de <is-lightbox>
> Eventos: is-close, is-share, is-reposition
>          + is-turtle-state { playing, idx, total, replay }
>          + is-toggle-group { id }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./lightbox.js`](./lightbox.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-diagram-lightbox>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-live`.

## Ejemplo avanzado

```html
<is-diagram-lightbox id="lb" kind="sequence"></is-diagram-lightbox>
<script type="module">
const lb = document.getElementById('lb');
lb.payload = { preset: 'tk1437191' };
lb.open = true;
// O abrirlo con un click:
lb.addEventListener('is-share', (e) => {
console.log('Compartir:', e.detail.url);
});
</script>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

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
- [Preview](../../previews/diagrams/is-diagram-lightbox.html)
