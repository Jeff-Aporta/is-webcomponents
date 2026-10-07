import { pathHugsBoxes, pathIllegal } from '../../src/components/diagrams/component-pack.ts';

const pts = [
  { x: 956.67, y: 548 },
  { x: 956.67, y: 635 },
  { x: 1367, y: 635 },
  { x: 1367, y: 775 },
];
const mensaje = { id: 'grp-mensaje-tiquete', x: 830, y: 628, w: 380, h: 91 };
const conv = { id: 'grp-conversacion', x: 830, y: 325, w: 380, h: 223 };
const db = { id: 'db-pg', x: 1394, y: 739, w: 180, h: 72 };
const walls = [mensaje, conv, db];
console.log('hugs', pathHugsBoxes(pts, walls, 'grp-conversacion', 'db-pg', 22));
console.log('illegal', pathIllegal(pts, walls, 'grp-conversacion', 'db-pg', 22));
