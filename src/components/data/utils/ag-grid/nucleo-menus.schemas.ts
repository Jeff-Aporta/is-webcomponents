/** Tipos de menus.ts. */
import type { crearMenus } from './nucleo-menus.js';

export type MenuKit = HTMLElement & { openAt: (x: number, y: number) => void; openAtElement: (el: HTMLElement) => void; close: () => void; };

export type Menus = ReturnType<typeof crearMenus>;
