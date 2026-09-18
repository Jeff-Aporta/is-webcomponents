# Checkpoint actual — types-strong-2026

## Snapshot

- **WT-ROOT branch**: `wt-root-types-strong-2026`
- **HEAD**: TBD (post-commit T1)
- **Baseline strict audit**: 8,777 errores
- **Después T1**: 8,760 errores (cerró 17)
- **Baseline typecheck**: verde
- **Baseline Playwright**: 21/21 (2 stagehand skipped)

## Tandas cerradas (SHA de cierre)

| Tanda | SHA cierre | WTs mergeados | Errores restantes | Notas |
|---|---|---|---|---|
| 1 | TBD | (directo en WT-ROOT) | 8,760 | Surgical fixes ya aplicados en main → WT-ROOT. Ver `checkpoint-tanda01.md`. |

## WT activos

(Solo WT-ROOT + main)

## Cómo reanudar si algo falla

1. `git -C <wt-root> log wt-root-types-strong-2026 --oneline -10` → ver último SHA de cierre
2. `git -C <wt-root> reset --hard <sha-cierre-tanda-N>` → vuelve al checkpoint
3. Re-arrancar la tanda fallida desde el último SHA válido
4. Si el SHA de cierre no existe (no se cerró ninguna tanda), volver a `df2f4ec92`

## Power-outage recovery

- Si se va la energía a mitad de tanda: el último commit del WT activo es save-point.
- El sub-agente en background debe dejar al menos 1 commit antes de reportar.
- El capitán usa `git -C <wt> log <rama> --oneline -5` para verificar progreso.