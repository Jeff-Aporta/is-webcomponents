# 08 — Sync a entregable (mirror → entregable)

Para apps con par `_experimental/<app>` (mirror de trabajo, remoto personal) y `_entregable/<app>`
(lo que se publica, remoto del equipo).

- **Única vía**: `deno task sync:entregable` (`scripts/gate/sync-to-entregable.mjs` sobre el motor del
  kit `tools/ISSyncEntregable.ts`). Nunca se edita el entregable a mano.
- **Única autorización**: el gate en verde (`scripts/gate/sync-protocolo.mjs` → `run-test-all.mjs` con
  cooldown). No existen `--skip-gate` ni `--aprobado-por` (exit 2). Unidireccional.
- **Modos**: real (gate → copia → checkpoint), `--check` (drift por contenido, exit 1 si hay), `--dry-run` (plan, sin gate).
- **Qué viaja** (`replace`: el destino queda igual al origen): `src` (sin specs), `dist`, `index.html`,
  `view` (sin `demo/` ni `stagehand/`), `README.md`, y lo que la app sirva (manifest, sw, config del hosting).
- **Nunca se toca**: `.git`, `node_modules`, `.gitignore`, `deno.json`/`deno.lock` del entregable (si
  hace falta, un hook `despues` alinea solo los imports que el artefacto necesita).
- **Checkpoint**: commit + push (sin forzar) del MIRROR. El entregable nunca recibe commits ni push
  automáticos: los hace la persona.
- **Guardián de mirrors** (si aplica): el remoto del mirror apunta al repo personal y el del entregable
  al del equipo; nunca cruzados (paso `guardian` del gate).
- Destino por defecto `../../_entregable/<carpeta del mirror>` o `ENTREGABLE=<ruta>`; si no existe, exit 2.
