import re
import sys
from collections import Counter

with open("labs/iss-ayudascpia-componentes/out/componentes.svg", encoding="utf-8") as f:
    c = f.read()

paths = re.findall(r'<path[^>]*d="([^"]+)"[^>]*>', c)

def count_turns(d):
    coords = re.findall(r'[ML](\d+),(\d+)', d)
    if len(coords) < 2:
        return 0
    turns = 0
    last_dir = None
    for i in range(1, len(coords)):
        x1, y1 = int(coords[i-1][0]), int(coords[i-1][1])
        x2, y2 = int(coords[i][0]), int(coords[i][1])
        if x1 == x2:
            cur = "v"
        elif y1 == y2:
            cur = "h"
        else:
            cur = "d"
        if last_dir and last_dir != cur and cur != "d" and last_dir != "d":
            turns += 1
        last_dir = cur
    return turns

turns = sorted([count_turns(p) for p in paths])
print(f"Paths: {len(paths)}")
print(f"Max turns: {max(turns) if turns else 0}")
print(f"Median: {turns[len(turns)//2] if turns else 0}")
print(f">4 turns: {sum(1 for t in turns if t > 4)}")

# Cell sharing
cell_count = Counter()
for p in paths:
    coords = [(int(x), int(y)) for x, y in re.findall(r'[ML](\d+),(\d+)', p)]
    for x, y in coords:
        cell_count[(x, y)] += 1

shared = sum(1 for c, n in cell_count.items() if n > 1)
max_share = max(cell_count.values()) if cell_count else 0
print(f"Cells shared by >1 path: {shared}")
print(f"Max paths sharing single cell: {max_share}")
# Top 5 most-shared cells
for cell, count in cell_count.most_common(5):
    print(f"  cell {cell}: {count} paths")

# pkg-db
def crosses_pkgdb(p):
    coords = [(int(x), int(y)) for x, y in re.findall(r'[ML](\d+),(\d+)', p)]
    for x, y in coords:
        if 820 <= x <= 1040 and 280 <= y <= 440:
            return True
    return False

crossers = [p for p in paths if crosses_pkgdb(p)]
print(f"Paths crossing pkg-db: {len(crossers)}")
