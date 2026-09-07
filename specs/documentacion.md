# Spec — Documentación para agentes

[`constraints.md`](constraints.md) / [`lessons.md`](lessons.md), MD por tag y skills.

## Contexto

Humanos y agentes consumen el kit vía galería, CDN y markdown raw en GitHub. La documentación debe ser verificable y no contradecir la carta.

## S-D1 Jerarquía

| Capa | Archivo | Rol |
|---|---|---|
| Carta (DO/DON'T, errores) | [`constraints.md`](constraints.md) + [`lessons.md`](lessons.md) | Registro pagado |
| SDD | [`specs/README.md`](README.md) | Contrato por dominio |
| Inventario tags | [`manifest.ts`](../src/manifest.ts) | Mapa categorías → MD |
| Por tag | `src/components/<cat>/<tag>.md` | API del componente |
| Skills | `src/skills/is-webcomponents/` | Prompt + catálogo |

## S-D2 MD por componente

- Un `.md` junto al `.js` del tag (mismo basename).
- Enlazar la sección de grupo de [`componentes.md`](componentes.md); no repetir la carta entera.
- URLs raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/...`
- No presentar internos (`marks-*`, engines, `_shared` helpers) como tags públicos.

## S-D3 SEO vs agentes

- `docs/` en raíz: HTML plano generado (`npm run docs`) para crawlers.
- `src/docs/`: notas de agente / superpowers; no confundir con `docs/` SEO.

## Contratos

| Pieza | Contrato |
|---|---|
| Generar SEO | `npm run docs` |
| Banner loader | comentario `/*! … */` en bundles + `dist/cdn/loader.md` |
| Catálogo skill | `src/skills/is-webcomponents/catalog.md` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Carta/DO/DON'T/errores en specs | secciones consolidadas | `src/utils/health/meta/llm-contract.test.ts` *(requiere migrar el test a los specs consolidados)* |
| Manifest ↔ disco | 0 huérfanos | `src/utils/health/meta/manifest-paths.test.ts` |
| Robots | Allow / y sin `Sitemap:` colgado | `src/utils/health/meta/robots-sitemap.test.ts` |
| Specs SDD | mapa + enlaces + guardianes citados | `src/utils/health/meta/specs-sdd.test.ts` |
