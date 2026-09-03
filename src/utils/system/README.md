# src/utils/system — definiciones de sistema (toons, dev-only)

Concentra las **definiciones de sistema** para que la galería, los demos y los
tests (unit + e2e/attack) sean altamente coherentes y **siempre por JSON**:

| Carpeta / archivo | Qué vive aquí |
| --- | --- |
| `toons/*.toon.json` | **Toons** (dev-only): textos/labels de tests por componente y configuración de testers (expectativas, strings, ejemplos). Los consumen los e2e/attack vía `cargarToon(tag)` |
| `toons.ts` | Tipos + cargador tipado de toons (lee el JSON, valida esquema) |
| `controls/` | Esquema canónico (`controls.schema.json`) de los **controles de demo** tipo Storybook declarados en cada preview JSON (`src/previews/<cat>/<tag>.json`, is-preview/v1) |

## Reglas

- **Todo lo que un tester necesite escribir en un test vive en un toon**
  (p. ej. el string `'// e2e nativo'` o el título del tooltip de marks), nunca
  hardcodeado en los `.test.ts`.
- Los toons son **dev-dependencies**: e2e/attack corren solo en dev; nada de
  `src/utils/system` se empaqueta a `dist/cdn`.
- Los controles de los demos se declaran **por JSON** en el preview del
  componente (is-preview/v1) y se aplican **siempre** vía JSON → prop/attr del
  componente (nunca otro sistema).
- No reintroducir carpetas `docs/` ni `src/docs/` (eliminadas el 03-sep-2026).
