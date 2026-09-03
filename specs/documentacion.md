# Spec — Documentación para agentes

`AGENTS.md`, MD por tag y skills.

## Contexto

Humanos y agentes consumen el kit vía galería, CDN y markdown raw en GitHub. La documentación debe ser verificable y no contradecir la carta.

## S-D1 Jerarquía

| Capa | Archivo | Rol |
|---|---|---|
| Carta + diario | [`AGENTS.md`](../LLM.md) | DO/DON'T, errores, guardianes, operativa |
| SDD | [`specs/README.md`](README.md) | Contrato por dominio |
| Índice tags | [`src/components/LLM.md`](../src/components/LLM.md) | Mapa categorías → MD |
| Por tag | `src/components/<cat>/<tag>.md` | API del componente |
| Skills | `src/skills/is-webcomponents/` | Prompt + catálogo |

## S-D2 MD por componente

- Un `.md` junto al `.js` del tag (mismo basename).
- Enlazar categoría `LLM.md`; no repetir la carta entera.
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
| AGENTS.md completo | secciones carta/DO/DON'T/errores | `tests/llm-contract.test.ts` |
| Manifest ↔ disco | 0 huérfanos | `tests/manifest-paths.test.ts` |
| Robots | Allow / y sin `Sitemap:` colgado | `tests/robots-sitemap.test.ts` |
| Specs SDD | mapa + enlaces + guardianes citados | `tests/specs-sdd.test.ts` |
