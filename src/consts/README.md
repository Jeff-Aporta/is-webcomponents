# `src/consts/` — convenciones de homogeneidad con `patyia-api`

Esta carpeta sigue el mismo patrón que `patyia-api/src/consts/`:

```
consts/
├── json/       ← datos compartidos (config, listas, catálogos)
├── types/      ← definiciones de tipos compartidos (interfaces y types)
└── README.md   ← este archivo
```

## Reglas

1. **Nada de archivos sueltos `constantes.ts`, `tipos.ts`, `types.ts`** en `src/` raíz.
2. **Si un tipo se usa desde ≥3 archivos**, vive en `src/consts/types/<nombre>.ts`.
3. **Si un JSON de configuración lo consumen varios componentes**, vive en `src/consts/json/<nombre>.json`.
4. **Tipos específicos de un solo diagrama** (ej. `FlowNode` que solo usa `flowchart.ts`) se quedan inline en su archivo (YAGNI).
5. **Constantes primitivas** (números mágicos, enums pequeños) van inline o en el `_shared/` específico del dominio.

## Estado actual

- `json/` — vacío por ahora (no hay JSONs compartidos identificados).
- `types/` — vacío por ahora (los tipos existentes son específicos de su dominio).

## Auditoría

El guardian `S-TIPOS-FOLDER` del motor auditor detecta tipos declarados fuera de `consts/types/`. La regla está pensada para promover la separación solo cuando tiene sentido; los tipos locales a un componente no sepenalizan.

## Migración desde `_shared/`

No hay archivos `tipos.ts` / `types.ts` sueltos en este proyecto. Los tipos compartidos se han quedado inline en sus implementaciones (p. ej. `grid-types.ts` no existe; los tipos viven donde se usan). Esta convención se respetará a futuro conforme se identifiquen candidatos reales.