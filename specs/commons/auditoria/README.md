# Auditoría recíproca — sistema feedback

## Persona

> El sistema de auto-mejora del auditor se comporta según
> [`automation/profile.md`](automation/profile.md). Antes de emitir una regla seguimos los
> principios §4 y respetamos los anti-patrones §13.
>

Zona pactada entre el harness de auditoría y el agente que revisa los casos.
El harness coloca este sistema automáticamente al iniciar una corrida (solo si
falta; nunca pisa contenido). El revisor alimenta el ciclo con observaciones.

- **Corridas e informes**: `corpus/grupos/<grupo>/runs/<run_id>/` (cada corrida
  con su `informe-auditoria.md` y su `feedback.md` de cierre).
- **Formato**: [plantilla-feedback.md](plantilla-feedback.md) — estable por
  hallazgo: id + `regla` + `archivo` + veredicto (`resuelto` | `improcedente` |
  `real`) + evidencia del repo + ajuste esperado del harness.
- **Improcedente ≠ ignorar**: sin evidencia (guard de health, ADR, deviaciones,
  tests, comentario de intención) un hallazgo no se marca improcedente: es real.
- **El harness entrena**: la corrida deep juzga con los `feedback.md` previos del
  proyecto; un caso marcado improcedente con evidencia se descarta salvo que el
  repo cambie su decisión.

Regla de gobernanza: spec `auditor/specs/auditoria-reciproca.md` (S-AREC-*).