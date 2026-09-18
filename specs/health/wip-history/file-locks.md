# File locks — types-strong-2026

## Locks permanentes (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | Solo lectura |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Solo lectura |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Solo añadir al final |
| `src/components/_shared/grid-types.ts` | (read-only post-T4) | T4 | Solo lectura |

## Locks activos

(Ninguno — T10 cerrada con STRICT_NOW=0)

## Locks de T7 (histórico — liberados al cierre de T7)

| Archivo | WT que lo lockeó | Notas |
|---|---|---|
| `src/components/forms/select.ts` | WT-0071 | 79 errores — cerrado |
| `src/components/forms/combobox.ts` | WT-0071 | 58 — cerrado |
| `src/components/forms/slider.ts` | WT-0071 | 57 — cerrado |
| `src/components/forms/input.ts` | WT-0071 | 47 — cerrado |

## Locks de T10 — WT-0106 dispatch (histórico — liberados)

37 archivos en 3 hojas (a/b/c), todos cerrados con STRICT_NOW=62→0:

**WT-0106-a** (9 archivos, 14 errores) — tree-view + ISP core
**WT-0106-b** (14 archivos, 19 errores) — diagrams + diagrams-spec
**WT-0106-c** (14 archivos, 29 errores) — actions + forms + feedback + helpers + data + charts + previews/_kit

Detalle completo en `checkpoint-tanda10.md`.

## Locks liberados

- ✅ T1 cerrada
- ✅ T2 cerrada
- ✅ T3 cerrada
- ✅ T4 cerrada
- ✅ T5 cerrada
- ✅ T6 cerrada
- ✅ T7 cerrada
- ✅ T8 cerrada
- ✅ T9 cerrada
- ✅ T10 cerrada (STRICT_NOW=0)

## Estrategia T+ — sin nuevos worktrees

Sub-agentes trabajaron directamente en WT-ROOT con file partitioning. WT-0106 a/b/c NO crearon worktrees nuevos.
