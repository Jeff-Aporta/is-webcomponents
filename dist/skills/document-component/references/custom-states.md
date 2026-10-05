# Custom states en las fichas iswc

Los custom states (`ElementInternals.states`) son la **API declarativa**
que un componente expone para que el CSS del consumidor reaccione a su
estado sin necesidad de listeners JS. Esta guía explica cómo
documentarlos en `src/components/<carpeta>/<modulo>.md`.

## Cuándo documentar

Documenta custom states solo si el componente los emite. Si no emite
ninguno, **omite la sección entera** — no la dejes como recordatorio
"vacío" ni como "ninguno por ahora". El catálogo detecta "no hay
sección" y asume "no aplica".

## Formato

Tabla obligatoria con dos columnas: `Estado | Uso`.

```md
### Custom states

| Estado | Uso |
| --- | --- |
| `:state(loading)` | Indicador de operación en curso. Cambia fondo y deshabilita interacción. |
| `:state(disabled)` | Estado inerte. Mismo efecto visual que el atributo `disabled`. |
```

## Nomenclatura

- Siempre en kebab-case dentro de `:state(...)`. P.ej. `:state(loading)`,
  `:state(icon-button)`, `:state(without-line)`.
- Sin prefijo `iswc-` ni `is-`. El state es del **host**, no del kit.
- Si el state refleja un atributo, **el nombre coincide** con el
  atributo: `disabled` ↔ `:state(disabled)`.
- Para estados que no son un atributo, usar sustantivos o adjetivos
  cortos que describan la condición: `loading`, `selected`, `open`,
  `active`, `error`.

## Estados vs atributos

| Caso | Cómo se documenta |
| --- | --- |
| El componente tiene `disabled` y también emite `:state(disabled)` | Listar `:state(disabled)` en custom states y `disabled` en atributos observados. Mencionar la equivalencia en la columna "Uso" del state. |
| El componente tiene un atributo pero **no** emite state | Listar solo el atributo. No duplicar en custom states. |
| El componente emite un state sin atributo asociado | Listar el state y dejar claro en "Uso" cómo se activa (p.ej. "se enciende cuando hay `value` no vacío"). |
| Hay fallback `data-state-*` para entornos sin `ElementInternals.states` | Mencionarlo en "Uso", p.ej. "También expuesto como `data-state-loading`". |

## Errores comunes

- Poner `:state(hover)` o `:state(focus)`. Esos ya existen en CSS y no
  son custom states. Si necesitas documentar comportamiento de hover,
  házlo en **Comportamiento**, no aquí.
- Inventar states que el JS no emite. Si dudas, abre `components/<cat>/<modulo>.js`
  y busca `host.states.add(...)` o el patrón equivalente.
- Listar `:state(disabled)` aunque el componente no implemente
  `ElementInternals.states` (algunos heredan de `ElementBase` y aún
  así lo exponen vía `data-state-*`).
- Olvidar la columna "Uso". Un state sin descripción es ruido.
