import { readFileSync } from 'node:fs';
const content = readFileSync('dist/cdn/forms/color-picker.min.js', 'utf8');
// Line 38 col 6761
const lines = content.split('\n');
console.log('Total lines:', lines.length);
const ln38 = lines[37];
console.log('Line 38 length:', ln38.length);
console.log('Line 38 around col 6761:', ln38.substring(6700, 6900));
console.log('\nLine 38 around col 7467:', ln38.substring(7400, 7600));
console.log('\nLine 38 around col 3169:', ln38.substring(3100, 3300));