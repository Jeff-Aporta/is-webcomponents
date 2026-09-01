# Tasks — <dominio o feature>

> Vive en `docs/superpowers/plans/AAAA-MM-DD-<tema>.md` mientras la feature está abierta.
> Al cerrar: lo que sobrevive es el spec, no este archivo.

Spec de origen: `specs/<dominio>/spec.md`.

## Orden

### T1 — <verbo + objeto>

- **Cubre:** S-X1
- **Toca:** `src/...`, `tests/<guardian>.test.ts`
- **Test primero:** el guardián debe fallar por la razón correcta antes del fix.
- **Verificación:**
  ```bash
  node tests/<guardian>.test.ts
  node tests/run-all.ts
  ```
- **Hecho cuando:** exit 0 y spec actualizado si cambió el contrato.

## Cierre

- [ ] `node tests/run-all.ts` verde
- [ ] `specs/<dominio>/spec.md` actualizado
- [ ] Lección en `AGENTS.md` si hubo error nuevo
- [ ] Commit solo si el usuario lo pide
