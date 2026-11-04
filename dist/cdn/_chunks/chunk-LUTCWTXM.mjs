import{c as g,d as b,e as v}from"./chunk-7IBSWVMF.mjs";var f="diagram:";function L(t,n){if(!n)return null;let r=t.getAttribute("persist")||"none";if(r==="none")return null;try{let e=g(f+n,r==="session"?"session":"local");return e?JSON.parse(e):null}catch(e){return console.warn("[diagram-edit] override load failed",e),null}}function M(t,n,r){if(!n)return;let e=t.getAttribute("persist")||"none";e!=="none"&&(b(f+n,JSON.stringify(r),e==="session"?"session":"local")||console.warn("[diagram-edit] override save failed"))}function O(t,n){if(!n)return;let r=t.getAttribute("persist")||"none";r!=="none"&&v(f+n,r==="session"?"session":"local")}function I(t,n){t.dispatchEvent(new CustomEvent("iswc-layout-change",{detail:n,bubbles:!0,composed:!0}))}function T(t,n){if(!n)return t;if(n.nodes)for(let r of t.nodes??[]){let e=n.nodes[r.id];e&&(Number.isFinite(e.x)&&(r.x=e.x),Number.isFinite(e.y)&&(r.y=e.y),typeof e.label=="string"&&(r.label=e.label),Number.isFinite(e.hue)&&(r.hue=e.hue))}if(n.edges)for(let r of t.edges??t.relations??[]){let e=n.edges[r.id];e&&(typeof e.label=="string"&&(r.label=e.label),Number.isFinite(e.hue)&&(r.hue=e.hue))}return t}function N(t,n,r){let e=0,s=0,i=0,d=0,a=!1;function u(o){!(o instanceof PointerEvent)||o.button!==0||(a=!0,e=o.clientX,s=o.clientY,i=o.clientX,d=o.clientY,t.setPointerCapture?.(o.pointerId),t.classList.add("iswc-dragging"),o.stopPropagation())}function c(o){if(!a||!(o instanceof PointerEvent))return;let m=o.clientX-i,h=o.clientY-d;i=o.clientX,d=o.clientY,n(m,h,o.clientX-e,o.clientY-s)}function l(o){!a||!(o instanceof PointerEvent)||(a=!1,t.releasePointerCapture?.(o.pointerId),t.classList.remove("iswc-dragging"),r?.())}return t.addEventListener("pointerdown",u),t.addEventListener("pointermove",c),t.addEventListener("pointerup",l),t.addEventListener("pointercancel",l),()=>{t.removeEventListener("pointerdown",u),t.removeEventListener("pointermove",c),t.removeEventListener("pointerup",l),t.removeEventListener("pointercancel",l)}}function D({anchor:t,initial:n={},onSave:r,onCancel:e}){p();let s=document.createElement("div");s.className="iswc-diagram-editor",s.style.cssText=`
    position: fixed;
    left: ${Math.round(t.x)}px;
    top: ${Math.round(t.y)}px;
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
  `;let i=document.createElement("input");i.type="text",i.value=n.label??"",i.placeholder="Etiqueta",i.style.cssText=`
    flex: 1;
    min-width: 10em;
    background: transparent;
    color: inherit;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .3333em;
    padding: .3333em .5em;
    font: inherit;
  `;let d=document.createElement("input");d.type="color",d.value=n.hue!=null?x(n.hue,70,50):"#475569",d.style.cssText=`
    width: 2.6667em;
    height: 2.3333em;
    padding: 0;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .3333em;
    background: transparent;
    cursor: pointer;
  `;let a=document.createElement("button");a.textContent="\u2713",a.style.cssText=E();let u=document.createElement("button");u.textContent="\u2715",u.style.cssText=E();function c(){let m=y(d.value);r?.({label:i.value.trim(),hue:m}),p()}function l(){e?.(),p()}a.addEventListener("click",c),u.addEventListener("click",l),i.addEventListener("keydown",m=>{m.key==="Enter"&&c(),m.key==="Escape"&&l()}),s.append(i,d,a,u),document.body.appendChild(s),i.focus(),i.select(),setTimeout(()=>{document.addEventListener("pointerdown",o,{capture:!0,once:!0})},0);function o(m){s.contains(m.target)||l()}return s}function p(){document.querySelectorAll(".iswc-diagram-editor").forEach(t=>t.remove())}function E(){return`
    width: 2em;
    height: 2em;
    border: 1px solid var(--iswc-border, rgba(255,255,255,0.2));
    border-radius: .2857em;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 1.1667em;
  `}function x(t,n,r){let e=n/100,s=r/100,i=c=>(c+t/30)%12,d=e*Math.min(s,1-s),a=c=>s-d*Math.max(-1,Math.min(i(c)-3,Math.min(9-i(c),1))),u=c=>Math.round(255*c).toString(16).padStart(2,"0");return`#${u(a(0))}${u(a(8))}${u(a(4))}`}function y(t){let n=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t);if(!n)return null;let r=parseInt(n[1],16)/255,e=parseInt(n[2],16)/255,s=parseInt(n[3],16)/255,i=Math.max(r,e,s),d=Math.min(r,e,s),a=0,u=0,c=(i+d)/2;if(i!==d){let l=i-d;switch(u=c>.5?l/(2-i-d):l/(i+d),i){case r:a=(e-s)/l+(e<s?6:0);break;case e:a=(s-r)/l+2;break;case s:a=(r-e)/l+4;break}a*=60}return a}export{L as a,M as b,O as c,I as d,T as e,N as f,D as g,p as h};
