/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/position/flecha.ts
 */
import{b as x}from"../../_chunks/chunk-VNNEUB5D.mjs";import"../../_chunks/chunk-CMZVHIC2.mjs";function C(l){return l.split("-")[0]}function O(l,h,m,f,o,e,b){let r=C(l),n=b==="anchor"?"anchor":b,i=o*2,s={top:"",left:"",right:"",bottom:""},c=`${-o}px`;if(r==="top"||r==="bottom"){let t;n==="start"?t=e:n==="end"?t=f.width-i-e:n==="center"?t=(f.width-i)/2:(t=h.left+h.width/2-m.left-o,t=Math.max(e,Math.min(f.width-i-e,t))),s.left=`${t}px`,r==="top"?s.bottom=c:s.top=c}else{let t;n==="start"?t=e:n==="end"?t=f.height-i-e:n==="center"?t=(f.height-i)/2:(t=h.top+h.height/2-m.top-o,t=Math.max(e,Math.min(f.height-i-e,t))),s.top=`${t}px`,r==="left"?s.right=c:s.left=c}return s}x(O);export{O as arrowOffset};
