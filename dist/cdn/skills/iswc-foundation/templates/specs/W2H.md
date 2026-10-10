# W2H — mantener las specs fundación al día (What → How)

> Pasos que sigue el agente que cambia __TITULO__ para dejar `specs/foundation/` al día, con foco en
> el WHAT. Las specs son la fundación desde la que se reconstruye la app ([`FOUNDATION.md`](FOUNDATION.md)).

## 1. Cuándo actualizar

Antes de cerrar cualquier cambio observable: lo que el usuario ve o puede hacer, un estado, un
mensaje, un componente o vista nuevos (o su API pública: tag, atributos, props, eventos), una llamada
a un backend, el build, los pines o una prueba que describe comportamiento.

## 2. Pasos

1. Ubica la spec en el mapa de `FOUNDATION.md` (o crea `foundation/NN-tema.md` con `_BRIEF.md`).
2. **WHAT primero**: un requisito por viñeta con ID nuevo `[W-<AREA>-NN]`.
3. **HOW WEAK** solo si el WHAT no alcanza; **HOW STRONG** solo para contratos y tecnologías.
4. **Componente o vista nuevos**: además de su spec, sus 4 archivos (`ts`, `scss`, `md`, `json`),
   su registro en `src/js/kit-tags.ts` y su línea en `view/demo/manifest.json` (ver `iswc/`).
5. **Pruebas**: actualiza la sección 6 (QUÉ se verifica) y escribe las pruebas con el formato común.
6. Elimina lo obsoleto; deuda y contradicciones en la sección 7.
7. Verifica: `deno task test:all` en verde.

## 3. Checklist de cierre

- [ ] WHAT escrito y con ID; HW/HS solo donde hacía falta
- [ ] Componente/vista: ts + scss + md + json + kit-tags + galería
- [ ] Sección 6 al día y pruebas que nombran sus `[W-*]`
- [ ] `deno task test:all` en verde
