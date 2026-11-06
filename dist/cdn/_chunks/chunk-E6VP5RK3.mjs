import{c as g,d as f}from"./chunk-7IBSWVMF.mjs";var b="diagram:";function y(e,o){if(!o)return null;let c=e.getAttribute("persist")||"none";if(c==="none")return null;try{let n=g(b+o,c==="session"?"session":"local");return n?JSON.parse(n):null}catch(n){return console.warn("[diagram-edit] override load failed",n),null}}function L(e,o,c){if(!o)return;let n=e.getAttribute("persist")||"none";n!=="none"&&(f(b+o,JSON.stringify(c),n==="session"?"session":"local")||console.warn("[diagram-edit] override save failed"))}function M(e,o){e.dispatchEvent(new CustomEvent("iswc-layout-change",{detail:o,bubbles:!0,composed:!0}))}function D(e,o,c){let n=0,i=0,t=0,a=0,s=!1;function u(r){!(r instanceof PointerEvent)||r.button!==0||(s=!0,n=r.clientX,i=r.clientY,t=r.clientX,a=r.clientY,e.setPointerCapture?.(r.pointerId),e.classList.add("iswc-dragging"),r.stopPropagation())}function d(r){if(!s||!(r instanceof PointerEvent))return;let m=r.clientX-t,E=r.clientY-a;t=r.clientX,a=r.clientY,o(m,E,r.clientX-n,r.clientY-i)}function l(r){!s||!(r instanceof PointerEvent)||(s=!1,e.releasePointerCapture?.(r.pointerId),e.classList.remove("iswc-dragging"),c?.())}return e.addEventListener("pointerdown",u),e.addEventListener("pointermove",d),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",l),()=>{e.removeEventListener("pointerdown",u),e.removeEventListener("pointermove",d),e.removeEventListener("pointerup",l),e.removeEventListener("pointercancel",l)}}function T({anchor:e,initial:o={},onSave:c,onCancel:n}){p();let i=document.createElement("div");i.className="iswc-diagram-editor",i.style.cssText=`
    position: fixed;
    left: ${Math.round(e.x)}px;
    top: ${Math.round(e.y)}px;
    z-index: 10000;
    background: var(--iswc-bg-elev, #1f2937);
    color: var(--iswc-text, #e2e8f0);
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .5em;
    padding: .6667em;
    box-shadow: 0 .6667em 2em rgba(0,0,0,0.35);
    display: flex;
    gap: .5em;
    align-items: center;
    font: .75em system-ui, sans-serif;
  `;let t=document.createElement("input");t.type="text",t.value=o.label??"",t.placeholder="Etiqueta",t.style.cssText=`
    flex: 1;
    min-width: 10em;
    background: transparent;
    color: inherit;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .3333em;
    padding: .3333em .5em;
    font: inherit;
  `;let a=document.createElement("input");a.type="color",a.value=o.hue!=null?h(o.hue,70,50):"#475569",a.style.cssText=`
    width: 2.6667em;
    height: 2.3333em;
    padding: 0;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .3333em;
    background: transparent;
    cursor: pointer;
  `;let s=document.createElement("button");s.textContent="\u2713",s.style.cssText=v();let u=document.createElement("button");u.textContent="\u2715",u.style.cssText=v();function d(){let m=x(a.value);c?.({label:t.value.trim(),hue:m}),p()}function l(){n?.(),p()}s.addEventListener("click",d),u.addEventListener("click",l),t.addEventListener("keydown",m=>{m.key==="Enter"&&d(),m.key==="Escape"&&l()}),i.append(t,a,s,u),document.body.appendChild(i),t.focus(),t.select(),setTimeout(()=>{document.addEventListener("pointerdown",r,{capture:!0,once:!0})},0);function r(m){i.contains(m.target)||l()}return i}function p(){document.querySelectorAll(".iswc-diagram-editor").forEach(e=>e.remove())}function v(){return`
    width: 2em;
    height: 2em;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .2857em;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 1.1667em;
  `}function h(e,o,c){let n=o/100,i=c/100,t=d=>(d+e/30)%12,a=n*Math.min(i,1-i),s=d=>i-a*Math.max(-1,Math.min(t(d)-3,Math.min(9-t(d),1))),u=d=>Math.round(255*d).toString(16).padStart(2,"0");return`#${u(s(0))}${u(s(8))}${u(s(4))}`}function x(e){let o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);if(!o)return null;let c=parseInt(o[1],16)/255,n=parseInt(o[2],16)/255,i=parseInt(o[3],16)/255,t=Math.max(c,n,i),a=Math.min(c,n,i),s=0,u=0,d=(t+a)/2;if(t!==a){let l=t-a;switch(u=d>.5?l/(2-t-a):l/(t+a),t){case c:s=(n-i)/l+(n<i?6:0);break;case n:s=(i-c)/l+2;break;case i:s=(c-n)/l+4;break}s*=60}return s}export{y as a,L as b,M as c,D as d,T as e};
