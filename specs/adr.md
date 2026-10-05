# ADR — decisiones cerradas

Debates que no deben reabrirse cada sesión. Formato breve:

```markdown
## ADR-NNN — Título (AAAA-MM-DD)

**Contexto:** …
**Decisión:** …
**Consecuencias:** …
```

Si el debate solo afecta un dominio, puede vivir como sección fija en `specs/<dominio>/spec.md` en lugar de aquí.


## ADR-001 — Migrar toda la fuente TS a Zod (2026-10-03)

**Contexto:** El kit tenía ~976 declaraciones `interface`/`type` en 657 archivos `.ts`. Las definiciones viven duplicadas entre `.ts` (tipos) y `.json` (validación runtime), con drift silencioso cuando alguien añade un campo al TS y olvida la validación. La librería `@browserbasehq/stagehand` ya arrastraba `zod@^4.4.3` como dependencia transitiva, así que el coste marginal de adoptarlo era bajo.

**Decisión:** Migración total: `interface X` → `XSchema = z.object({...})` + `export type X = z.infer<typeof XSchema>`. Estrategia híbrida: `zod/mini` (~3 KB) inline para shapes puros; `zod` full externalizado solo para los 14 specs de diagramas que requieren `.refine`/`.transform`/`.discriminatedUnion`. Naming `XSchema` para el schema, `X = z.infer<typeof XSchema>` para preservar nombres públicos. Plan de ejecución: `.superpowers/sdd/2026-10-03-zod-migration/plan.md` (10 fases, progresivo por dominio).

**Consecuencias:** Bundle CDN por componente sigue en 1-5 KB actual para `zod/mini`; los 14 specs full de diagramas sumarán ~14 KB gzipped al bundle de diagramas. Elimina drift TS ↔ runtime; mejora inferencia con `z.infer`. El guardián `tests/zod-types-sync.test.ts` detecta declaraciones TS sin schema Zod homólogo. Plan archivado en `.superpowers/sdd/2026-10-03-zod-migration/`.

## ADR-002 — `data-viz` como legacy alias de `charts/` (2026-10-03)

**Contexto:** El manifest usa `data-viz` como categoría para varios componentes de charts (heatmap, maps y la mayoría de los charts clásicos). AGENTS.md §4.1 declaraba "No existe `data-viz`; los charts viven en `charts/`", pero el código y el manifest contradecían esa regla. Auditoría Phase D (#14) y reportes previos (`docs/auditoria-final.md`) insistían en `data-viz` como categoría válida.

**Decisión:** `data-viz` queda en el manifest como **legacy alias** de `charts/`. Sólo conserva dos entradas: `iswc-heatmap` y `iswc-maps`/`iswc-map-marker` (por motivos históricos de folder). Las features nuevas van a `charts/` sin excepción. AGENTS.md §2 (estructura) y §4.1 (categorías) declaran la política en un solo lugar.

**Consecuencias:** No se borra la categoría para no romper links profundos ni manifests externos que ya apuntan a `data-viz`. El guardián (futuro `tests/category-aliases.test.ts`) puede advertir cuando una feature nueva intenta usar `data-viz`. Documentos de planes viejos que mencionan `data-viz` como válida (`docs/auditoria-final.md`, `docs/superpowers/plans/2026-10-03-zod-migration.md` antes de moverlo) ahora se archivan en `.audit/` o se actualizan para referenciar la política vigente.