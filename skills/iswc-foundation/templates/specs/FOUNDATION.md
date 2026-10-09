# FOUNDATION — reconstruir __TITULO__ desde las specs

> Prompt guía para lanzar agentes HOW «ciegos» que reconstruyan `src/` y `view/` SOLO a partir de
> `specs/foundation/`, cumpliendo cada `[W-*]`, usando los `[HW-*]` como guía y los `[HS-*]` como
> contrato exacto. Para mantener estas specs al día: [`W2H.md`](W2H.md).

## 0. Reglas para todos los agentes

1. **Fuente única**: `specs/foundation/*.md`. El estándar de cómo se escriben: [`especificar-what.md`](especificar-what.md).
2. **Prioridad**: `[W-*]` primero; `[HW-*]` como guía con libertad; `[HS-*]` contrato exacto.
3. **HOW STRONG obligatorios** (estándar iswc-foundation, no se relajan):
   - Deno; vanilla + Web Components (sin React/MUI/JSX/Babel ni bundler en runtime).
   - Kit iswc-root por CDN pineado a un SHA de 40 hex; herramientas del kit vendorizadas al mismo SHA.
   - UI con `iswc-*` y tokens `--iswc-*`; estilos en SCSS.
   - Cada componente: `.ts` + `.scss` + `.md` (6 secciones) + `.json` (playground) + registro en
     `kit-tags.ts` y en la galería; cada vista con su `index.html`, `README.md` y demo.
   - Zod para todos los tipos, con schemas en `*.schemas.ts` aparte de la lógica.
   - Cache busting `?v=<hash>`; una sola URL por módulo.
4. **No inventes contratos**: los huecos van a la sección 7 de la spec y a `W2H.md`.
5. **Cada agente entrega con pruebas** de la sección 6 de su spec, en el formato común del kit.
6. **Hecho = verde**: `deno task test:all`.

## 1. Mapa de las specs fundación

| Archivo | Qué define |
| --- | --- |
| [`foundation/10-plataforma.md`](foundation/10-plataforma.md) | Producto, tareas Deno, build, pines, shell |
| [`foundation/20-componentes-y-vistas.md`](foundation/20-componentes-y-vistas.md) | Anatomía, registro, catálogo de componentes y vistas |
| [`foundation/70-pruebas-gate-y-sync.md`](foundation/70-pruebas-gate-y-sync.md) | Pruebas, gate y sync |

Añade una spec por dominio de la app (`30-…`, `40-…`) con el formato de `foundation/_BRIEF.md`.

## 2. Orden de reconstrucción

1. Plataforma (`10`): proyecto Deno, build, pines, shell que carga vacío.
2. Componentes y vistas (`20`): base de componentes, registro, galería, primera vista.
3. Dominios (`30+`), en paralelo.
4. Pruebas, gate y sync (`70`).
5. Integración: un revisor recorre cada requisito hasta `deno task test:all` en verde.
