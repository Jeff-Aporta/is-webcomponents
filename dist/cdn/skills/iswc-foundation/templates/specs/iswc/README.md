# specs/iswc — skills del kit iswc-root para esta app

Copias sembradas por `create-iswc-app` desde el kit (`iswc-root/skills/iswc-foundation`). Son el
estándar común de TODAS las apps iswc: si una regla cambia, cambia en el kit y se vuelve a sembrar.

| Skill | Cuándo |
| --- | --- |
| [`kit/SKILL.md`](kit/SKILL.md) · [`kit/catalog.md`](kit/catalog.md) · [`kit/reference.md`](kit/reference.md) | **Primero, siempre**: la skill general del kit con el índice de TODOS los componentes `iswc-*` (catálogo) y el mapa intención → componente. Antes de crear una pieza, busca aquí la que ya existe |
| [`nuevo-componente.md`](nuevo-componente.md) | Crear un componente `__PREFIJO__-*` (4 archivos + registro + props Zod) |
| [`demo-componente.md`](demo-componente.md) | Escribir o ampliar el playground `.json` y la ficha `.md` de un componente |
| [`nueva-vista.md`](nueva-vista.md) | Crear una vista `view/<v>/` (shell, index aislado, demo, utils) |
| [`actualizar-pin.md`](actualizar-pin.md) | Subir el kit a otro SHA (pin + vendor + gate) |

Specs y pruebas se escriben con [`../especificar-what.md`](../especificar-what.md). El estándar
completo (arquitectura, build, estilos, Zod, pruebas, sync):
[iswc-foundation/SKILL.md](https://github.com/__REPO__/blob/__SHA__/skills/iswc-foundation/SKILL.md).
`kit/` es una copia fijada al SHA del pin (no se edita): `deno task vendor:iswc` la refresca al
subir el pin, junto con las herramientas del kit.
