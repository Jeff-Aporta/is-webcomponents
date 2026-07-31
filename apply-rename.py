"""
Renombra el componente de wa-button (Web Awesome) a is-button (Insoft).
- Tag custom element:  wa-button   -> is-button
- Clase JS:            WaButton    -> IsButton
- CSS vars:            --wa-*      -> --is-*
- Title / sidebar / textos
"""
import re
import io
import sys

FILES = [
    r"C:\ContaPyme\Personal\apps\AppWebcomponents\components\wa-button.js",
    r"C:\ContaPyme\Personal\apps\AppWebcomponents\index.html",
    r"C:\ContaPyme\Personal\apps\AppWebcomponents\styles\presentation.css",
]

# Mapeo: orden importa (los mas largos primero para evitar colisiones)
# 1) prefijos JS / custom element
RENAMES = [
    # Custom element tag (lower-case con guion)
    ("wa-button",     "is-button"),
    # Clase JS (PascalCase)
    ("WaButton",      "IsButton"),
    # CSS variables
    ("--wa-color-",   "--is-color-"),
    ("--wa-button-",  "--is-button-"),
    ("--wa-font-",    "--is-font-"),
    # CSS keyframe (dentro del componente)
    ("wa-button-spin","is-button-spin"),
    # window export
    ("window.WaButton",  "window.IsButton"),
    # selector CSS  wa-button  (ya cubierto arriba pero aseguramos)
    # Comentario / doc: el archivo dice "Web Awesome" como origen — lo dejo
    # Solo cambio el nombre del clon.
    ("wa-button.js",  "is-button.js"),
    ("components/wa-button.js", "components/is-button.js"),
]

def transform(path):
    with io.open(path, "r", encoding="utf-8") as f:
        original = f.read()
    text = original
    counts = {}
    for old, new in RENAMES:
        n = text.count(old)
        if n:
            text = text.replace(old, new)
            counts[(old, new)] = n
    if text != original:
        with io.open(path, "w", encoding="utf-8") as f:
            f.write(text)
    return counts, text

for p in FILES:
    print(f"\n=== {p} ===")
    counts, new_text = transform(p)
    for (old, new), n in counts.items():
        print(f"  {old!r:32s} -> {new!r:32s}  ({n} hits)")

print("\n--- Verificacion de que no quedan 'wa-button' o 'WaButton' ---")
for p in FILES:
    with io.open(p, "r", encoding="utf-8") as f:
        t = f.read()
    remaining_wa = t.count("wa-button") + t.count("WaButton") + t.count("--wa-")
    print(f"  {p}: {remaining_wa} referencias wa- residuales")
