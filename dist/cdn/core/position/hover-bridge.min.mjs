/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/position/hover-bridge.ts
 */
import"../../_chunks/chunk-CMZVHIC2.mjs";function l(t){if(t.distance<=0)return null;let p=t.anchor,i=t.placement.split("-")[0],o,a,n,e;if(i==="top"?(o=p.top-t.distance,a=Math.min(p.left,t.popupLeft),n=Math.max(p.right,t.popupLeft+t.popupWidth)-a,e=t.distance):i==="bottom"?(o=p.bottom,a=Math.min(p.left,t.popupLeft),n=Math.max(p.right,t.popupLeft+t.popupWidth)-a,e=t.distance):i==="left"?(a=p.left-t.distance,o=Math.min(p.top,t.popupTop),n=t.distance,e=Math.max(p.bottom,t.popupTop+t.popupHeight)-o):(a=p.right,o=Math.min(p.top,t.popupTop),n=t.distance,e=Math.max(p.bottom,t.popupTop+t.popupHeight)-o),t.strategy==="fixed"){let u=t.popupLeft-t.left,h=t.popupTop-t.top;o-=h,a-=u}else o+=t.scrollY,a+=t.scrollX;return{top:o,left:a,width:Math.max(0,n),height:Math.max(0,e)}}export{l as calcularPuente};
