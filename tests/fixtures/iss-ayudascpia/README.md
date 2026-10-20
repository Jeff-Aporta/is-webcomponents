# Fixture ISS-AyudasCPIA (mínimo, versionado)

Instantánea de los editables que los tests y los labs de diagramas leen como datos reales:
`docs-experimental/diagramas/{componentes,der,der-conversaciones,clases}.json` y
`docs-experimental/fuentes/codigo.json`.

Origen: `Jeff-Aporta/ISS-AyudasCPIA@a4b693549b11474b2ea082b4fa12c4bb2ffec7bd` (copiado tal cual).
Vive aquí para que el kit sea hermético: ningún test ni lab lee otra carpeta local. Se conserva
la estructura (`diagramas/` y `fuentes/`) porque `clases.json` referencia `../fuentes/codigo.json`.

Para refrescarlo: copiar esos cinco archivos desde un commit publicado del ISS y actualizar el
SHA de arriba. Los editables `ruta-*.json` y de secuencia NO se copian: los genera el lab
(`labs/iss-ayudascpia-flujos/payloads`, `labs/iss-ayudascpia-secuencias/payloads`).
