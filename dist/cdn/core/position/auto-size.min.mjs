/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/position/auto-size.ts
 */
import{a as r}from"../../_chunks/chunk-VNNEUB5D.mjs";import"../../_chunks/chunk-CMZVHIC2.mjs";function m(o,i,h,t){if(!t)return{width:null,height:null};let a=i.width,e=i.height;return(t==="horizontal"||t==="both")&&(a=Math.max(0,Math.min(i.width,h.right-Math.max(o.left,h.left)))),(t==="vertical"||t==="both")&&(e=Math.max(0,Math.min(i.height,h.bottom-Math.max(o.top,h.top)))),{width:a,height:e}}r(m);export{m as availableSize};
