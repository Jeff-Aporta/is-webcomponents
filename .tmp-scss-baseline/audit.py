#!/usr/bin/env python3
"""SCSS audit: count repetitive patterns across src/**/*.scss.

Outputs: top patterns with file:line counts and byte estimates.
"""
import re
import glob
import os
import json
from collections import defaultdict

SRC = "src"
patterns = {
    # color-mix alpha usage
    "cm_alpha_18":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 18%, transparent\)", "color-mix 18% transparent"),
    "cm_alpha_28":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 28%, transparent\)", "color-mix 28% transparent"),
    "cm_alpha_40":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 40%, transparent\)", "color-mix 40% transparent"),
    "cm_alpha_35":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 35%, transparent\)", "color-mix 35% transparent"),
    "cm_alpha_12":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 12%, white\)", "color-mix 12% white"),
    "cm_alpha_82":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 82%, black\)", "color-mix 82% black"),
    "cm_alpha_62":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 62%, black\)", "color-mix 62% black"),
    "cm_alpha_45":  (r"color-mix\(in srgb, var\(--_?(\w+)\) 45%, black\)", "color-mix 45% black"),
    "cm_alpha_28w": (r"color-mix\(in srgb, var\(--_?(\w+)\) 28%, white\)", "color-mix 28% white"),
    # color tone roles
    "tone_on_brand":   (r"--_tone-on:\s*var\(--iswc-on-brand\)", "--_tone-on: var(--iswc-on-brand)"),
    "tone_soft":       (r"--_tone-soft:\s*color-mix", "--_tone-soft: color-mix"),
    "tone_soft_active":(r"--_tone-soft-active:\s*color-mix", "--_tone-soft-active: color-mix"),
    # host color attr pattern
    "host_color":      (r":host\(\[color=\"(\w+)\"\]\)", ":host([color=X])"),
    "host_variant":    (r":host\(\[color\]\[variant=\"(\w+)\"\]\)", ":host([color][variant=X])"),
    "host_shape":      (r":host\(\[shape=\"(\w+)\"\]\)", ":host([shape=X])"),
    # iswc button border
    "iswc_btn_bw":     (r"--iswc-button-border-width:\s*1px", "iswc-button-border-width: 1px"),
    # iswc-button-font
    "iswc_btn_ff":     (r"--iswc-button-font-family", "iswc-button-font-family"),
    # tone
    "tone_decl":       (r"--_tone", "--_tone- declarations"),
    # soft/strong references inside :host
    "tone_strong_var": (r"var\(--_tone-strong\)", "var(--_tone-strong)"),
    "tone_stronger_var":(r"var\(--_tone-stronger\)", "var(--_tone-stronger)"),
    "tone_soft_var":   (r"var\(--_tone-soft\)", "var(--_tone-soft)"),
    "tone_text_var":   (r"var\(--_tone-text\)", "var(--_tone-text)"),
    "tone_paler_var":  (r"var\(--_tone-paler\)", "var(--_tone-paler)"),
    "tone_pale_var":   (r"var\(--_tone-pale\)", "var(--_tone-pale)"),
    "tone_strongest_var":(r"var\(--_tone-strongest", "var(--_tone-strongest"),
    "tone_on_var":     (r"var\(--_tone-on\)", "var(--_tone-on)"),
    # display inline-flex
    "inline_flex":     (r"display:\s*inline-flex", "display: inline-flex"),
    "flex_center":     (r"display:\s*flex;\s*\n\s*align-items:\s*center;\s*\n\s*justify-content:\s*center", "flex center trio"),
    # iswc-control references (component internals)
    "iswc_control_bg": (r"var\(--iswc-control-bg\)", "var(--iswc-control-bg)"),
    "iswc_control_border": (r"var\(--iswc-control-border\)", "var(--iswc-control-border)"),
    "iswc_control_text":  (r"var\(--iswc-control-text\)", "var(--iswc-control-text)"),
    # shape patterns
    "shape_round":     (r"--iswc-button-border-radius:\s*var\(--iswc-radius-sm\)", "shape=round (radius-sm)"),
    "shape_pill":      (r"--iswc-button-border-radius:\s*999px", "shape=pill (999px)"),
    "shape_square":    (r"--iswc-button-border-radius:\s*0", "shape=square (0)"),
}

files = sorted(glob.glob("src/**/*.scss", recursive=True))
print(f"Scanning {len(files)} .scss files under src/\n")

# Per-file results
file_results = {pat: [] for pat in patterns}
all_counts = {pat: 0 for pat in patterns}
for fp in files:
    try:
        with open(fp, encoding="utf-8") as f:
            content = f.read()
    except Exception:
        continue
    lines = content.splitlines()
    for pat_name, (regex, _) in patterns.items():
        for m in re.finditer(regex, content, re.MULTILINE):
            all_counts[pat_name] += 1
            # find line number
            line_no = content[:m.start()].count("\n") + 1
            file_results[pat_name].append((fp, line_no))

# Sort patterns by count desc
print("=" * 78)
print("TOP REPETITIVE PATTERNS (by raw count across all .scss files)")
print("=" * 78)
ranked = sorted(all_counts.items(), key=lambda x: -x[1])
for rank, (pat, count) in enumerate(ranked, 1):
    if count == 0:
        continue
    _, desc = patterns[pat]
    # Estimate bytes per occurrence (avg)
    sample_lens = []
    for fp, _ in file_results[pat][:3]:
        try:
            with open(fp, encoding="utf-8") as f:
                content = f.read()
        except Exception:
            continue
        m = re.search(patterns[pat][0], content)
        if m:
            sample_lens.append(len(m.group(0)))
    avg_len = sum(sample_lens) / max(len(sample_lens), 1) if sample_lens else 0
    est_bytes = int(count * avg_len)
    print(f"  #{rank:2d}  {count:4d}×  {desc:48s}  ~{est_bytes:5d} B (avg {avg_len:.0f} B/occ)")

print()
print("=" * 78)
print("PATTERNS BY FILE (top 5 patterns)")
print("=" * 78)
top5 = [p for p, _ in ranked[:5]]
for pat in top5:
    _, desc = patterns[pat]
    by_file = defaultdict(int)
    for fp, _ in file_results[pat]:
        by_file[fp] += 1
    print(f"\n  {desc}:")
    sorted_files = sorted(by_file.items(), key=lambda x: -x[1])
    for fp, cnt in sorted_files[:8]:
        print(f"    {cnt:3d}×  {fp}")
    if len(sorted_files) > 8:
        print(f"    ... and {len(sorted_files) - 8} more files")

# Total file count summary
print()
print("=" * 78)
print(f"SCAN SUMMARY: {len(files)} .scss files in src/")
total_occ = sum(all_counts.values())
print(f"Total matched occurrences across all patterns: {total_occ}")
print("=" * 78)
