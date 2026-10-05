#!/usr/bin/env python3
"""
Rename .schema.ts files to .schemas.ts and update imports.
"""
import os
import re
import glob
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

# Find all .schema.ts files
schema_files = glob.glob(os.path.join(SRC, '**/*.schema.ts'), recursive=True)

# Use git mv to rename
for f in schema_files:
    new = f[:-len('.schema.ts')] + '.schemas.ts'
    rel_old = os.path.relpath(f, ROOT)
    rel_new = os.path.relpath(new, ROOT)
    print(f'git mv {rel_old} {rel_new}')
    os.system(f'cd "{ROOT}" && git mv "{rel_old}" "{rel_new}"')

# Now update imports across the codebase
# Pattern: from '.../*.schema.js' or from '.../*.schema.ts'
import re

for f in glob.glob(os.path.join(SRC, '**/*.ts'), recursive=True):
    if '.schemas.' in f or '.d.ts' in f:
        continue
    with open(f, encoding='utf-8') as fp:
        content = fp.read()
    new_content = re.sub(
        r'(from\s+[\'"])([^\'"]+)\.schema\.(js|ts)([\'"])',
        r'\1\2.schemas.js\4',
        content,
    )
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(new_content)
        print(f'Updated imports in {os.path.relpath(f, ROOT)}')

print('Done.')
