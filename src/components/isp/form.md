---
tag: iswc-form
tags:
  - iswc-form
category: isp
status: public
source: ./form.ts
style: ./form.css
preview: ./form.json
---
# `<iswc-form>`

## PropÃ³sito

Formulario de ficha: cabecera, cuerpo scrolleable y pie Aceptar / Cancelar.
El **cuerpo se define en JSON compacto** (`json2html` / `html2json`), el mismo
lenguaje que usa `<iswc-block-layout>` y el que se persiste en BD.

## CuÃ¡ndo usarlo

Fichas de catÃ¡logo y formularios cuyo cuerpo se declara en JSON y se persiste
en base de datos, con la misma gramÃ¡tica de `<iswc-block-layout>`.

## CuÃ¡ndo no usarlo

Para un `<form>` HTML corriente escrito a mano no hace falta este componente.
Para el listado que abre la ficha usar `<iswc-catalogo-gen>`.

## ImportaciÃ³n

```js
import './form.js';
```

## Ejemplo (JSON â†’ DOM)

```js
form.fromJSON({
  mode: 'edit',
  body: [
    ['h3', { slot: 'header' }, 'Curso'],
    ['div', { slot: 'content' },
      ['iswc-input', { name: 'icurso', label: 'CÃ³digo', required: true }],
      ['iswc-switch', { name: 'activo' }, 'Activo'],
    ],
  ],
  values: { icurso: 'C001', activo: true },
});
```

Formato hyperscript: `[tag, attrs?, ...hijos]` â€” attrs booleanos como `true`.

## API JSON / HTML

| MÃ©todo | Uso |
| --- | --- |
| `json2html(body)` | Monta light DOM desde JSON. |
| `html2json()` | Serializa light DOM. |
| `toJSON()` | `{ mode, submitLabel, cancelLabel, loading, body, values }`. |
| `fromJSON(json)` | Aplica chrome + `body` + `values`. |
| `getValues()` / `setValues(obj)` | Mapa de controles con `name`. |
| `IswcForm.json2html` / `IswcForm.html2json` | EstÃ¡ticos (codec compartido). |

TambiÃ©n: hijo `<script type="application/json">` con el mismo objeto.

## Ejemplo mÃ­nimo

```html
<iswc-form id="ficha">
  <h3 slot="header">Curso</h3>
  <div slot="content">
    <iswc-input name="icurso" label="CÃ³digo" required></iswc-input>
  </div>
</iswc-form>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `mode` | `edit` \| `view` | Default `edit`. |
| `submit-label` | string | Texto del botÃ³n de aceptar. |
| `cancel-label` | string | Texto del botÃ³n de cancelar. |
| `loading` | boolean | Estado de carga en el botÃ³n de aceptar. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `mode` | lectura/escritura | Refleja el atributo. |
| `loading` | lectura/escritura | Refleja el atributo. |

### Slots

| Slot | Uso |
| --- | --- |
| `header` | Cabecera de la ficha. |
| `content` | Cuerpo scrolleable. |
| `pre-buttons` | Contenido antes de los botones del pie. |
| `post-buttons` | Contenido despuÃ©s de los botones del pie. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-submit` | Emitido al enviar el formulario. |
| `iswc-cancel` | Emitido al cancelar la operaciÃ³n. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-submit` | `{ form, values, json }` | sÃ­ | sÃ­ | no |
| `iswc-cancel` | `{ form, values, json }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-form');
el.addEventListener('iswc-submit', (e) => {
  console.log('iswc-submit', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `json2html(body)` | Monta el light DOM desde JSON. |
| `html2json()` | Serializa el light DOM a JSON. |
| `toJSON()` | `{ mode, submitLabel, cancelLabel, loading, body, values }`. |
| `fromJSON(json)` | Aplica chrome, `body` y `values`. |
| `getValues()` | Mapa de controles con `name`. |
| `setValues(obj)` | Asigna valores por `name`. |
| `IswcForm.json2html` / `IswcForm.html2json` | EstÃ¡ticos del codec compartido. |

TambiÃ©n se acepta un hijo `<script type="application/json">` con el mismo
objeto que recibe `fromJSON()`.

### CSS parts

| Part | Uso |
| --- | --- |
| `form` | Elemento `<form>` interno (`novalidate`). |
| `header` | Cabecera. |
| `content` | Cuerpo. |
| `footer` | Pie. |
| `buttons` | Contenedor de los botones de acciÃ³n. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text` | Color del texto. |
| `--iswc-sans` | Familia tipogrÃ¡fica. |

### IntegraciÃ³n con formularios

El `<form>` interno se declara `novalidate`: la validaciÃ³n la aportan los
controles (`<iswc-input>`, `<iswc-switch>`, â€¦), que sÃ­ son form-associated.
`getValues()` recorre los controles con `name` del light DOM.

## Comportamiento

- El cuerpo se declara en el formato hyperscript `[tag, attrs?, ...hijos]`;
  los atributos booleanos van como `true`.
- `fromJSON()` aplica chrome (`mode`, etiquetas, `loading`), monta el `body` y
  luego asigna `values`.
- `mode="view"` presenta la ficha en solo lectura.
- Aceptar emite `iswc-submit` y Cancelar `iswc-cancel`, ambos con el estado
  completo (`form`, `values`, `json`).

## Dependencias y componentes relacionados

- [`../_shared/json-html.js`](../_shared/json-html.js) â€” codec compartido.
- [`block-layout.md`](block-layout.md) â€” misma gramÃ¡tica JSON.
- [`catalogo-gen.md`](catalogo-gen.md) â€” consumidor habitual de la ficha.

Tags del mÃ³dulo: `<iswc-form>`.

## Accesibilidad

La estructura usa `header` / `article` / `footer` nativos. Las etiquetas y
mensajes de error los aportan los controles del cuerpo; conservar `name` y
`label` en cada uno.

## Ejemplo avanzado

```js
const form = document.getElementById('ficha');
form.fromJSON({
  mode: 'edit',
  submitLabel: 'Guardar',
  body: [
    ['h3', { slot: 'header' }, 'Curso'],
    ['div', { slot: 'content' },
      ['iswc-input', { name: 'icurso', label: 'CÃ³digo', required: true }],
      ['iswc-switch', { name: 'activo' }, 'Activo'],
    ],
  ],
  values: { icurso: 'C001', activo: true },
});

form.addEventListener('iswc-submit', async (e) => {
  form.loading = true;
  await fetch('/api/curso', { method: 'POST', body: JSON.stringify(e.detail.values) });
  form.loading = false;
});
console.log(form.html2json());
```

## Errores comunes

- Poner el contenido sin `slot`: debe ir en `header`, `content` o el pie.
- Esperar validaciÃ³n nativa del `<form>`: es `novalidate`, valida cada control.
- Aplicar `values` antes de montar el `body`: `fromJSON()` ya respeta ese orden.
- Omitir `name` en un control y luego buscarlo en `getValues()`.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar el codec de `_shared/json-html.js` antes de escribir otro serializador.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./form.ts)
- [CSS](./form.css)
- [Codec](../_shared/json-html.js)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./form.json)
