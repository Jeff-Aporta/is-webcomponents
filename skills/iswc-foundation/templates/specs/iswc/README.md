# specs/iswc — skills del kit iswc-root para esta app

Copias sembradas por `create-iswc-app` desde el kit (`iswc-root/skills/iswc-foundation`). Son el
estándar común de TODAS las apps iswc: si una regla cambia, cambia en el kit y se vuelve a sembrar.

| Skill | Cuándo |
| --- | --- |
| [`nuevo-componente.md`](nuevo-componente.md) | Crear un componente `__PREFIJO__-*` (4 archivos + registro + props Zod) |
| [`demo-componente.md`](demo-componente.md) | Escribir o ampliar el playground `.json` y la ficha `.md` de un componente |
| [`nueva-vista.md`](nueva-vista.md) | Crear una vista `view/<v>/` (shell, index aislado, demo, utils) |
| [`actualizar-pin.md`](actualizar-pin.md) | Subir el kit a otro SHA (pin + vendor + gate) |

Specs y pruebas se escriben con [`../especificar-what.md`](../especificar-what.md). El estándar
completo (arquitectura, build, estilos, Zod, pruebas, sync):
[iswc-foundation/SKILL.md](https://cdn.jsdelivr.net/gh/__REPO__@__SHA__/dist/cdn/skills/iswc-foundation/SKILL.md).
Catálogo de tags del kit (qué ya existe, no reinventar):
[iswc-root/catalog.md](https://cdn.jsdelivr.net/gh/__REPO__@__SHA__/dist/cdn/skills/iswc-root/catalog.md).
