/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/animar.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";var a={show:160,hide:120,pulse:220},n={show:[{opacity:0,transform:"translateY(0.5em) scale(0.98)"},{opacity:1,transform:"translateY(0) scale(1)"}],hide:[{opacity:1,transform:"translateY(0) scale(1)"},{opacity:0,transform:"translateY(0.25em) scale(0.98)"}],pulse:[{transform:"scale(1)"},{transform:"scale(1.02)"},{transform:"scale(1)"}]};function t(s,e="show"){return typeof s.animate!="function"?Promise.resolve():s.animate(n[e],{duration:a[e],easing:e==="pulse"?"ease-in-out":"cubic-bezier(0.2, 0, 0, 1)",fill:e==="hide"?"none":"both"}).finished.then(()=>{e==="hide"&&(s.style.display="none")},()=>{})}export{a as DURACION,n as KEYFRAMES,t as animar};
