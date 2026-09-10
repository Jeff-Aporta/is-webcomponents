import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const preview = join(ROOT, 'src', 'components', 'isp', 'heading.preview.ts');
console.log('preview:', preview);
console.log('exists:', existsSync(preview));